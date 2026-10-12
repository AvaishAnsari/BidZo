from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from decimal import Decimal
from django.utils import timezone
import datetime
from .models import AuctionItem, UserProfile

class Phase4VerificationTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin', password='pw')

        self.seller = User.objects.create_user(username='seller1', password='pw')
        self.seller_profile = self.seller.profile
        self.seller_profile.role = 'seller'
        self.seller_profile.save()

        self.buyer = User.objects.create_user(username='buyer1', password='pw')

        self.seller2 = User.objects.create_user(username='seller2', password='pw')
        self.seller2.profile.role = 'seller'
        self.seller2.profile.verification_status = 'VERIFIED'
        self.seller2.profile.save()

    def test_1_seller_submission(self):
        self.client.force_authenticate(user=self.seller)
        resp = self.client.patch('/api/users/me/', {
            'business_name': 'My Business',
            'business_registration_number': '12345'
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['verification_status'], 'PENDING')

        # User shouldn't be able to self-verify
        resp = self.client.patch('/api/users/me/', {
            'verification_status': 'VERIFIED'
        })
        self.assertEqual(resp.data['verification_status'], 'PENDING')

    def test_2_admin_seller_approval(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/admin/users/{self.seller.id}/verify/', {
            'verification_status': 'VERIFIED'
        })
        self.assertEqual(resp.status_code, 200)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.verification_status, 'VERIFIED')

    def test_3_unauthorized_seller_approval(self):
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.patch(f'/api/admin/users/{self.seller.id}/verify/', {
            'verification_status': 'VERIFIED'
        })
        self.assertEqual(resp.status_code, 403)

    def test_4_unverified_seller_cannot_create_auction(self):
        self.client.force_authenticate(user=self.seller)
        resp = self.client.post('/api/auctions/', {
            'title': 'Test',
            'description': 'Test',
            'starting_price': '10.00',
            'end_time': (timezone.now() + datetime.timedelta(hours=1)).isoformat()
        })
        self.assertEqual(resp.status_code, 403)
        self.assertIn("verified", resp.data['error'])

    def test_5_verified_seller_creates_pending_auction(self):
        self.client.force_authenticate(user=self.seller2)
        resp = self.client.post('/api/auctions/', {
            'title': 'Test Auction',
            'description': 'Test',
            'starting_price': '10.00',
            'end_time': (timezone.now() + datetime.timedelta(hours=1)).isoformat()
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['moderation_status'], 'PENDING_REVIEW')

    def test_6_unapproved_listing_visibility(self):
        auction = AuctionItem.objects.create(
            seller=self.seller2,
            title="Pending Auction",
            description="Pending",
            starting_price=Decimal('10.00'),
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            moderation_status='PENDING_REVIEW'
        )

        # Buyer cannot see it
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.get('/api/auctions/')
        self.assertEqual(len(resp.data), 0)

        resp = self.client.get(f'/api/auctions/{auction.id}/')
        self.assertEqual(resp.status_code, 404)

        # Seller can see their own
        self.client.force_authenticate(user=self.seller2)
        resp = self.client.get(f'/api/auctions/{auction.id}/')
        self.assertEqual(resp.status_code, 200)

        # Admin can see it
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f'/api/auctions/{auction.id}/')
        self.assertEqual(resp.status_code, 200)

    def test_7_admin_auction_approval(self):
        auction = AuctionItem.objects.create(
            seller=self.seller2,
            title="Pending Auction",
            description="Pending",
            starting_price=Decimal('10.00'),
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            moderation_status='PENDING_REVIEW'
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/admin/auctions/{auction.id}/moderate/', {
            'moderation_status': 'APPROVED'
        })
        self.assertEqual(resp.status_code, 200)

        self.client.force_authenticate(user=self.buyer)
        resp2 = self.client.get(f'/api/auctions/{auction.id}/')
        self.assertEqual(resp2.status_code, 200)

    def test_8_unapproved_cannot_receive_bids(self):
        auction = AuctionItem.objects.create(
            seller=self.seller2,
            title="Pending Auction",
            description="Pending",
            starting_price=Decimal('10.00'),
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            moderation_status='PENDING_REVIEW'
        )
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.post(f'/api/auctions/{auction.id}/bids/', {
            'amount': 20.00
        })
        self.assertEqual(resp.status_code, 403)
        self.assertIn("unapproved", resp.data['error'])

    def test_9_rejected_listing_hidden(self):
        auction = AuctionItem.objects.create(
            seller=self.seller2,
            title="Rejected Auction",
            description="Rejected",
            starting_price=Decimal('10.00'),
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            moderation_status='REJECTED'
        )
        self.client.force_authenticate(user=self.buyer)
        resp = self.client.get(f'/api/auctions/{auction.id}/bids/')
        self.assertEqual(resp.status_code, 403)

    def test_10_verification_revocation_suspends_listings(self):
        auction = AuctionItem.objects.create(
            seller=self.seller2,
            title="Approved Auction",
            description="Approved",
            starting_price=Decimal('10.00'),
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            moderation_status='APPROVED'
        )

        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/admin/users/{self.seller2.id}/verify/', {
            'verification_status': 'REJECTED'
        })
        self.assertEqual(resp.status_code, 200)

        auction.refresh_from_db()
        self.assertEqual(auction.moderation_status, 'REJECTED')
        self.assertIn('revocation', auction.moderation_notes)
