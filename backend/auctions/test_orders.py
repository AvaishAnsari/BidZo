from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from django.utils import timezone
import datetime
from decimal import Decimal
from .models import AuctionItem, Bid, Order, Address
import uuid
from unittest.mock import patch

class OrderPhase2Tests(APITestCase):

    def setUp(self):
        patcher1 = patch('auctions.payment_service.PaymentService.create_payment_order', return_value='mock_rp_order_123')
        patcher2 = patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=True)
        self.addCleanup(patcher1.stop)
        self.addCleanup(patcher2.stop)
        patcher1.start()
        patcher2.start()
        
        self.seller = User.objects.create_user(username='seller1', password='pw')
        self.buyer1 = User.objects.create_user(username='buyer1', password='pw')
        self.buyer2 = User.objects.create_user(username='buyer2', password='pw')

        self.live_auction = AuctionItem.objects.create(
            seller=self.seller,
            title="Live Item",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('50.00'),
            start_time=timezone.now() - datetime.timedelta(hours=1),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            status='active',
            moderation_status='APPROVED'
        )

        self.upcoming_auction = AuctionItem.objects.create(
            seller=self.seller,
            title="Upcoming Item",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('50.00'),
            start_time=timezone.now() + datetime.timedelta(hours=1),
            end_time=timezone.now() + datetime.timedelta(hours=2),
            status='active',
            moderation_status='APPROVED'
        )

        self.ended_no_bids = AuctionItem.objects.create(
            seller=self.seller,
            title="Ended No Bids",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('50.00'),
            start_time=timezone.now() - datetime.timedelta(hours=2),
            end_time=timezone.now() - datetime.timedelta(hours=1),
            status='active',
            moderation_status='APPROVED'
        )

        self.ended_with_bids = AuctionItem.objects.create(
            seller=self.seller,
            title="Ended With Bids",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('100.00'),
            start_time=timezone.now() - datetime.timedelta(hours=2),
            end_time=timezone.now() - datetime.timedelta(hours=1),
            status='active',
            moderation_status='APPROVED'
        )
        self.bid1 = Bid.objects.create(auction_item=self.ended_with_bids, bidder=self.buyer1, amount=Decimal('90.00'))
        self.bid2 = Bid.objects.create(auction_item=self.ended_with_bids, bidder=self.buyer2, amount=Decimal('100.00'))

        self.buyer2_address = Address.objects.create(
            user=self.buyer2,
            full_name="Buyer 2",
            address_line_1="123",
            city="City",
            state="State",
            postal_code="12345",
            phone="12345"
        )

        self.buyer1_address = Address.objects.create(
            user=self.buyer1,
            full_name="Buyer 1",
            address_line_1="456",
            city="City",
            state="State",
            postal_code="54321",
            phone="54321"
        )


    def test_1_live_auction_no_order(self):
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.live_auction.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("has not ended yet", resp.data['error'])

    def test_2_upcoming_auction_no_order(self):
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.upcoming_auction.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("has not ended yet", resp.data['error'])

    def test_3_ended_no_bids_no_order(self):
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.ended_no_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("no winner", resp.data['error'])

    def test_4_winner_can_create_order(self):
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['payment_status'], 'PENDING')
        self.assertIsNotNone(resp.data['data']['razorpay_order_id'])

    def test_5_non_winner_cannot_create_order(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer1_address.id
        })
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Only the auction winner", resp.data['error'])

    def test_6_unauth_user_cannot_create(self):
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/')
        self.assertEqual(resp.status_code, 401)

    def test_7_8_11_order_ownership_and_amounts(self):
        self.client.force_authenticate(user=self.buyer2)
        # Attempt to manipulate amount/seller
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id,
            'winning_amount': '5.00',
            'seller': self.buyer1.id
        })
        self.assertEqual(resp.status_code, 201)

        order = Order.objects.get(id=resp.data['data']['id'])
        self.assertEqual(order.seller, self.seller) # Recorded correctly, not manipulated
        self.assertEqual(order.buyer, self.buyer2)
        self.assertEqual(order.winning_amount, Decimal('100.00')) # Exact winning bid, ignored frontend payload

    def test_9_no_duplicate_orders(self):
        self.client.force_authenticate(user=self.buyer2)
        self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        # Try again
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("already exists", resp.data['error'])
        self.assertEqual(Order.objects.count(), 1)

    def test_10_privacy_of_orders(self):
        # Buyer2 creates order
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        order_id = resp.data['data']['id']

        # Buyer1 tries to access it
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.get(f'/api/orders/{order_id}/')
        self.assertEqual(resp.status_code, 404)

        # Seller can access it
        self.client.force_authenticate(user=self.seller)
        resp = self.client.get(f'/api/orders/{order_id}/')
        self.assertEqual(resp.status_code, 200)

    def test_12_13_payment_verification(self):
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.ended_with_bids.id}/order/', {
            'delivery_address_id': self.buyer2_address.id
        })
        order_id = resp.data['data']['id']
        rp_order_id = resp.data['data']['razorpay_order_id']

        # Invalid verification
        with patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=False):
            resp2 = self.client.post(f'/api/orders/{order_id}/verify-payment/', {
                'razorpay_payment_id': 'pay_fake',
                'razorpay_order_id': rp_order_id,
                'razorpay_signature': 'invalid_sig'
            })
            self.assertEqual(resp2.status_code, 400)
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.payment_status, 'FAILED') # Payment failure

        # Note: True mock testing of success signature would require mocking the hmac,
        # but since we fall back to returning True if keys aren't configured in test:
        # Note: True mock testing of success signature would require mocking the hmac,
        # but since we fall back to returning True if keys aren't configured in test:
        with patch('auctions.payment_service.PaymentService.verify_payment_signature', return_value=True):
            resp3 = self.client.post(f'/api/orders/{order_id}/verify-payment/', {
                'razorpay_payment_id': 'pay_mock',
                'razorpay_order_id': rp_order_id,
                'razorpay_signature': 'mock_sig'
            })
        self.assertEqual(resp3.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'PAID')

        # Try to pay again
        resp4 = self.client.post(f'/api/orders/{order_id}/verify-payment/', {
            'razorpay_payment_id': 'pay_mock2',
            'razorpay_order_id': rp_order_id,
            'razorpay_signature': 'mock_sig2'
        })
        self.assertEqual(resp4.status_code, 400)
        self.assertIn("already paid", resp4.data['error'])
