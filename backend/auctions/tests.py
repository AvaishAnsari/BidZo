from rest_framework.test import APITransactionTestCase
from django.contrib.auth.models import User
from django.utils import timezone
import datetime
from decimal import Decimal
from .models import AuctionItem, Bid, UserProfile
import concurrent.futures
from django.db import connection

class AuctionPhase1Tests(APITransactionTestCase):
    # Use APITransactionTestCase because it doesn't wrap each test in a transaction,
    # allowing us to test real transaction commits and select_for_update concurrency.

    def setUp(self):
        # Create users
        self.buyer1 = User.objects.create_user(username='buyer1', password='password123')
        self.buyer1.profile.role = 'buyer'
        self.buyer1.profile.save()

        self.buyer2 = User.objects.create_user(username='buyer2', password='password123')
        self.buyer2.profile.role = 'buyer'
        self.buyer2.profile.save()

        self.seller_a = User.objects.create_user(username='seller_a', password='password123')
        self.seller_a.profile.role = 'seller'
        self.seller_a.profile.save()

        self.seller_b = User.objects.create_user(username='seller_b', password='password123')
        self.seller_b.profile.role = 'seller'
        self.seller_b.profile.save()

        self.auction_a = AuctionItem.objects.create(
            seller=self.seller_a,
            title="Seller A Item",
            description="Test",
            starting_price=Decimal('50.00'),
            current_highest_bid=Decimal('50.00'),
            start_time=timezone.now() - datetime.timedelta(hours=1),
            end_time=timezone.now() + datetime.timedelta(hours=1),
            status='active',
            moderation_status='APPROVED'
        )

    def test_1_normal_buyer_bid(self):
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '100.00'})
        self.assertEqual(resp.status_code, 201)
        self.auction_a.refresh_from_db()
        self.assertEqual(self.auction_a.current_highest_bid, 100.00)
        self.assertEqual(self.auction_a.bids.count(), 1)

    def test_2_lower_bid(self):
        self.client.force_authenticate(user=self.buyer1)
        self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '100.00'})
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '90.00'})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Bid must be higher", resp.data['error'])

    def test_3_equal_bid(self):
        self.client.force_authenticate(user=self.buyer1)
        self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '100.00'})
        self.client.force_authenticate(user=self.buyer2)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '100.00'})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Bid must be higher", resp.data['error'])

    def test_4_seller_bids_on_another_sellers_auction(self):
        self.client.force_authenticate(user=self.seller_b)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '120.00'})
        self.assertEqual(resp.status_code, 201)

    def test_5_seller_bids_on_own_auction(self):
        self.client.force_authenticate(user=self.seller_a)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '150.00'})
        self.assertEqual(resp.status_code, 403)
        self.assertIn("cannot bid on your own auction", resp.data['error'])

    def test_6_bid_after_auction_end(self):
        self.auction_a.end_time = timezone.now() - datetime.timedelta(seconds=1)
        self.auction_a.save()
        self.client.force_authenticate(user=self.buyer1)
        resp = self.client.post(f'/api/auctions/{self.auction_a.id}/bids/', {'amount': '200.00'})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("already ended", resp.data['error'])

    def test_7_winner_determination(self):
        Bid.objects.create(auction_item=self.auction_a, bidder=self.buyer1, amount=Decimal('100.00'))
        Bid.objects.create(auction_item=self.auction_a, bidder=self.buyer2, amount=Decimal('150.00'))
        Bid.objects.create(auction_item=self.auction_a, bidder=self.seller_b, amount=Decimal('125.00'))
        self.auction_a.end_time = timezone.now() - datetime.timedelta(minutes=1)
        self.auction_a.save()
        self.assertEqual(self.auction_a.winner, self.buyer2)

    def test_8_equal_bid_ordering(self):
        # Even though tests 2 and 3 prevent equal bids from REST API,
        # we still test the model ordering tie-breaking logic directly.
        b1 = Bid.objects.create(auction_item=self.auction_a, bidder=self.buyer1, amount=Decimal('150.00'))
        b1.timestamp = timezone.now() - datetime.timedelta(seconds=10)
        b1.save(update_fields=['timestamp'])

        b2 = Bid.objects.create(auction_item=self.auction_a, bidder=self.buyer2, amount=Decimal('150.00'))
        b2.timestamp = timezone.now() - datetime.timedelta(seconds=5)
        b2.save(update_fields=['timestamp'])

        self.auction_a.end_time = timezone.now() - datetime.timedelta(minutes=1)
        self.auction_a.save()

        # buyer1 should win because earlier timestamp
        self.assertEqual(self.auction_a.winner, self.buyer1)

    def test_9_no_bids(self):
        self.auction_a.end_time = timezone.now() - datetime.timedelta(minutes=1)
        self.auction_a.save()
        self.assertIsNone(self.auction_a.winner)

    def test_10_concurrent_bidding(self):
        # Simulate concurrent requests
        def place_bid(username, amount):
            from django.test.client import Client
            from rest_framework_simplejwt.tokens import RefreshToken
            from django.db import connection as thread_connection

            try:
                user = User.objects.get(username=username)
                token = str(RefreshToken.for_user(user).access_token)

                # Using fresh client in thread
                c = Client()
                return c.post(f'/api/auctions/{self.auction_a.id}/bids/',
                              {'amount': str(amount)},
                              HTTP_AUTHORIZATION=f'Bearer {token}')
            finally:
                # Ensure the thread's DB connection is closed so teardown can drop the test DB
                thread_connection.close()

        # Close connections before spawning threads so they get their own connection
        connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # We want them to execute as close to simultaneously as possible
            f1 = executor.submit(place_bid, 'buyer1', 150.00)
            f2 = executor.submit(place_bid, 'buyer2', 160.00)

            resp1 = f1.result()
            resp2 = f2.result()

        self.auction_a.refresh_from_db()

        # One bid might fail if 160.00 locked and saved first (causing 150.00 to be lower than current).
        # Or both might succeed if 150.00 locked first, saved, then 160.00 locked and saved.
        # But in NO case should 150.00 overwrite 160.00.
        self.assertEqual(self.auction_a.current_highest_bid, Decimal('160.00'))
