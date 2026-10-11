import uuid
from decimal import Decimal
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from .models import AuctionItem, Bid, Order, Address, Shipment
from .payment_service import PaymentService
import hmac
import hashlib
from unittest.mock import patch

class Phase6PaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(username='seller1', email='seller@a.com', password='pw')
        self.buyer = User.objects.create_user(username='buyer1', email='buyer@a.com', password='pw')
        self.hacker = User.objects.create_user(username='hacker', email='hacker@a.com', password='pw')

        self.auction = AuctionItem.objects.create(
            seller=self.seller, title="Test Item", description="Test",
            starting_price=Decimal('100.00'), current_highest_bid=Decimal('150.00'),
            end_time="2025-01-01T00:00:00Z", moderation_status="APPROVED", status="active"
        )
        self.bid = Bid.objects.create(auction_item=self.auction, bidder=self.buyer, amount=Decimal('150.00'))
        self.auction.status = 'ended'
        self.auction.save()

        self.address = Address.objects.create(
            user=self.buyer, full_name="Buyer Name", phone="1234567890",
            address_line_1="123 Main St", city="City", state="State",
            postal_code="12345", country="Country"
        )
        self.order = Order.objects.create(
            auction=self.auction, winning_bid=self.bid, buyer=self.buyer, seller=self.seller,
            delivery_address=self.address, winning_amount=Decimal('150.00'),
            shipping_charge=Decimal('50.00'), total_amount=Decimal('200.00'),
            payment_status='PENDING', order_status='AWAITING_PAYMENT',
            razorpay_order_id='order_mock123'
        )

    def test_inr_to_paise_conversion(self):
        amount_inr = Decimal('199.99')
        # Simulate paise conversion
        paise = int((amount_inr * Decimal('100')).to_integral_value())
        self.assertEqual(paise, 19999)

    @patch.dict('os.environ', {'RAZORPAY_KEY_ID': '', 'RAZORPAY_KEY_SECRET': ''}, clear=True)
    def test_missing_credentials_fails(self):
        with self.assertRaises(ValueError):
            PaymentService.create_payment_order(self.order.id, self.order.total_amount)
        
        # Also verification should fail securely
        self.assertFalse(PaymentService.verify_payment_signature("order_id", "pay_id", "sig"))

    @patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'test_id', 'RAZORPAY_KEY_SECRET': 'test_secret'})
    @patch('razorpay.Client')
    def test_provider_order_creation(self, mock_client):
        # Mock successful creation
        mock_instance = mock_client.return_value
        mock_instance.order.create.return_value = {'id': 'order_real123'}
        
        rp_order_id = PaymentService.create_payment_order(self.order.id, self.order.total_amount)
        self.assertEqual(rp_order_id, 'order_real123')
        # Check conversion to paise was called with correct amount (200.00 -> 20000)
        mock_instance.order.create.assert_called_once_with(data={
            'amount': 20000, 'currency': 'INR', 'receipt': str(self.order.id)
        })

    @patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'test_id', 'RAZORPAY_KEY_SECRET': 'test_secret'})
    def test_valid_signature_verification(self):
        secret = 'test_secret'
        order_id = 'order_mock123'
        payment_id = 'pay_mock123'
        msg = f"{order_id}|{payment_id}"
        sig = hmac.new(secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
        
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.post(f'/api/orders/{self.order.id}/verify-payment/', {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': sig
        })
        self.assertEqual(resp.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'PAID')
        self.assertTrue(hasattr(self.order, 'shipment'))

    @patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'test_id', 'RAZORPAY_KEY_SECRET': 'test_secret'})
    def test_mismatched_order_id(self):
        # Client tries to verify a signature for a DIFFERENT order ID
        secret = 'test_secret'
        other_order_id = 'order_HACKED'
        payment_id = 'pay_mock123'
        msg = f"{other_order_id}|{payment_id}"
        sig = hmac.new(secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
        
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.post(f'/api/orders/{self.order.id}/verify-payment/', {
            'razorpay_order_id': other_order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': sig
        })
        self.assertEqual(resp.status_code, 400) # Order ID mismatch
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'PENDING') # NOT PAID!

    @patch.dict('os.environ', {'RAZORPAY_WEBHOOK_SECRET': 'webhook_secret'})
    def test_webhook_payment_verification(self):
        # Test valid webhook signature
        payload = b'{"event":"order.paid","payload":{"order":{"entity":{"id":"order_mock123"}}}}'
        sig = hmac.new(b'webhook_secret', payload, hashlib.sha256).hexdigest()
        
        resp = self.client.post('/api/webhooks/razorpay/', data=payload, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=sig)
        self.assertEqual(resp.status_code, 200)
        
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'PAID')
        self.assertEqual(self.order.order_status, 'PROCESSING')
        self.assertTrue(Shipment.objects.filter(order=self.order).exists())

    @patch.dict('os.environ', {'RAZORPAY_WEBHOOK_SECRET': 'webhook_secret'})
    def test_invalid_webhook_signature(self):
        payload = b'{"event":"order.paid","payload":{"order":{"entity":{"id":"order_mock123"}}}}'
        
        resp = self.client.post('/api/webhooks/razorpay/', data=payload, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE='bad_sig')
        self.assertEqual(resp.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'PENDING')

    def test_unauthorized_buyer_payment(self):
        # Hacker tries to verify buyer's order payment
        self.client.force_authenticate(user=self.hacker)
        resp = self.client.post(f'/api/orders/{self.order.id}/verify-payment/', {
            'razorpay_order_id': 'order_mock123',
            'razorpay_payment_id': 'pay_mock123',
            'razorpay_signature': 'sig'
        })
        self.assertEqual(resp.status_code, 404) # Order not found for this user

    @patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'test_id', 'RAZORPAY_KEY_SECRET': 'test_secret'})
    def test_repeated_verification(self):
        secret = 'test_secret'
        order_id = 'order_mock123'
        payment_id = 'pay_mock123'
        msg = f"{order_id}|{payment_id}"
        sig = hmac.new(secret.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
        
        self.client.force_authenticate(user=self.buyer)
        
        # First verification
        resp = self.client.post(f'/api/orders/{self.order.id}/verify-payment/', {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': sig
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Shipment.objects.filter(order=self.order).count(), 1)
        
        # Second verification
        resp2 = self.client.post(f'/api/orders/{self.order.id}/verify-payment/', {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': sig
        })
        self.assertEqual(resp2.status_code, 400) # Should fail as already paid
        self.assertIn('already paid', resp2.data['error'])
        
        # Ensure duplicate shipment was NOT created
        self.assertEqual(Shipment.objects.filter(order=self.order).count(), 1)
