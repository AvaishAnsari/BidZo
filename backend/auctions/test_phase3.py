from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from django.utils import timezone
import datetime
from decimal import Decimal
from unittest.mock import patch
from .models import AuctionItem, Bid, Order, Address, Shipment

class Phase3Tests(APITestCase):

    def setUp(self):
        patcher1 = patch('auctions.payment_service.PaymentService.create_payment_order', return_value='mock_rp_order_123')
        patcher2 = patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=True)
        self.addCleanup(patcher1.stop)
        self.addCleanup(patcher2.stop)
        patcher1.start()
        patcher2.start()
        
        self.seller = User.objects.create_user(username='seller3', password='pw')
        self.seller2 = User.objects.create_user(username='seller4', password='pw')
        self.buyer1 = User.objects.create_user(username='buyer3', password='pw')
        self.buyer2 = User.objects.create_user(username='buyer4', password='pw')

        self.ended_auction = AuctionItem.objects.create(
            seller=self.seller,
            title="Ended Phase 3",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('100.00'),
            start_time=timezone.now() - datetime.timedelta(hours=2),
            end_time=timezone.now() - datetime.timedelta(hours=1),
            status='active',
            moderation_status='APPROVED'
        )
        self.bid1 = Bid.objects.create(auction_item=self.ended_auction, bidder=self.buyer1, amount=Decimal('100.00'))

        # Test 1 & 2 Address
        self.buyer1_address = Address.objects.create(
            user=self.buyer1,
            full_name="Buyer 1 Name",
            address_line_1="123 Street",
            city="City",
            state="State",
            postal_code="12345",
            phone="1234567890"
        )

        self.buyer2_address = Address.objects.create(
            user=self.buyer2,
            full_name="Buyer 2 Name",
            address_line_1="456 Ave",
            city="City",
            state="State",
            postal_code="54321",
            phone="0987654321"
        )

    def test_1_create_list_own_address(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.get('/api/users/me/addresses/')
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['full_name'], "Buyer 1 Name")

    def test_2_cannot_view_others_address(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.get(f'/api/users/me/addresses/{self.buyer2_address.id}/')
        self.assertEqual(resp.status_code, 404)

    def test_3_cannot_use_others_address_for_checkout(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid delivery address", resp.data['error'])

    def test_4_5_6_shipping_charge_and_total(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        self.assertEqual(resp.status_code, 201)

        # Shipping logic default is 100.00 INR for India, or whatever is set in test env
        order_data = resp.data['data']
        self.assertIsNotNone(order_data['shipping_charge'])

        order = Order.objects.get(id=order_data['id'])
        self.assertIsInstance(order.shipping_charge, Decimal)
        self.assertIsInstance(order.total_amount, Decimal)
        self.assertEqual(order.total_amount, order.winning_amount + order.shipping_charge)
        self.assertEqual(order.winning_amount, Decimal('100.00'))

    def test_7_8_paid_orders_and_shipment_creation(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        order_id = resp.data['data']['id']
        rp_order_id = resp.data['data']['razorpay_order_id']

        # No shipment initially
        order = Order.objects.get(id=order_id)
        with self.assertRaises(Shipment.DoesNotExist):
            s = order.shipment

        # Complete payment with mocked success
        with patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=True):
            self.client.post(f'/api/orders/{order_id}/verify-payment/', {
                'razorpay_payment_id': 'pay_mock',
                'razorpay_order_id': rp_order_id,
                'razorpay_signature': 'mock_sig'
            })

        # Shipment should now be created
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'PAID')
        self.assertTrue(hasattr(order, 'shipment'))
        self.assertEqual(order.shipment.status, 'READY_TO_SHIP')

        # Try changing address on paid order via the create endpoint -> should fail
        resp2 = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        self.assertEqual(resp2.status_code, 400) # Order already exists

    def test_9_unrelated_user_shipment_privacy(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        order_id = resp.data['data']['id']
        order = Order.objects.get(id=order_id)
        Shipment.objects.create(order=order, status='SHIPPED')

        self.client.force_authenticate(user=self.buyer2)
        resp2 = self.client.get(f'/api/orders/{order_id}/')
        self.assertEqual(resp2.status_code, 404)

    def test_10_buyers_cannot_update_shipment(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        order_id = resp.data['data']['id']
        order = Order.objects.get(id=order_id)
        shipment = Shipment.objects.create(order=order, status='READY_TO_SHIP')

        # Buyer attempts update
        resp2 = self.client.patch(f'/api/shipments/{shipment.id}/', {'status': 'DELIVERED'})
        self.assertEqual(resp2.status_code, 404) # Or 403, queryset filters by seller so 404 is returned because buyer != seller

    def test_11_sellers_cannot_update_others_shipment(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        order = Order.objects.get(id=resp.data['data']['id'])
        shipment = Shipment.objects.create(order=order, status='READY_TO_SHIP')

        self.client.force_authenticate(user=self.seller2)
        resp2 = self.client.patch(f'/api/shipments/{shipment.id}/', {'status': 'SHIPPED'})
        self.assertEqual(resp2.status_code, 404)

        # But correct seller CAN update it
        self.client.force_authenticate(user=self.seller)
        resp3 = self.client.patch(f'/api/shipments/{shipment.id}/', {'status': 'SHIPPED'})
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.data['status'], 'SHIPPED')

    def test_12_missing_courier_no_fake_tracking(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_auction.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        order = Order.objects.get(id=resp.data['data']['id'])
        with patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=True):
            self.client.post(f'/api/orders/{order.id}/verify-payment/', {
                'razorpay_payment_id': 'pay_mock',
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_signature': 'mock_sig'
            })
        order.refresh_from_db()
        shipment = order.shipment

        # Ensure tracking number and courier are blank by default
        self.assertIsNone(shipment.tracking_number)
        self.assertIsNone(shipment.courier_name)
