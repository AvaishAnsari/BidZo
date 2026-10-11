from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from decimal import Decimal
from unittest.mock import patch
from django.utils import timezone
import datetime

class Phase5AuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username='testbuyer', email='test@buyer.com', password='testpassword')
        
    def test_1_login_throttling(self):
        # Fire 15 login requests to trigger the 10/min throttle
        for i in range(11):
            resp = self.client.post('/api/login/', {
                'username': 'testbuyer',
                'password': 'wrongpassword'
            })
            if resp.status_code == 429: # Throttled
                break
        
        self.assertEqual(resp.status_code, 429)

    @override_settings(RECAPTCHA_SECRET_KEY='fake-secret-key')
    @patch('auctions.views.requests.post')
    def test_2_missing_recaptcha(self, mock_post):
        # We override settings to require recaptcha
        resp = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@user.com',
            'password': 'pw',
            'role': 'buyer'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Missing reCAPTCHA token", resp.data['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='fake-secret-key')
    @patch('auctions.views.requests.post')
    def test_3_invalid_recaptcha(self, mock_post):
        mock_post.return_value.json.return_value = {
            'success': False
        }
        
        resp = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@user.com',
            'password': 'pw',
            'role': 'buyer',
            'recaptcha_token': 'bad-token'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid reCAPTCHA token", resp.data['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='fake-secret-key')
    @patch('auctions.views.requests.post')
    def test_4_valid_recaptcha_wrong_action(self, mock_post):
        mock_post.return_value.json.return_value = {
            'success': True,
            'action': 'login', # Expected register
            'score': 0.9
        }
        
        resp = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@user.com',
            'password': 'pw',
            'role': 'buyer',
            'recaptcha_token': 'good-token'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("action mismatch", resp.data['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='fake-secret-key')
    @patch('auctions.views.requests.post')
    def test_5_valid_recaptcha_low_score(self, mock_post):
        mock_post.return_value.json.return_value = {
            'success': True,
            'action': 'register',
            'score': 0.1 # < 0.5
        }
        
        resp = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@user.com',
            'password': 'pw',
            'role': 'buyer',
            'recaptcha_token': 'good-token'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("score too low", resp.data['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='fake-secret-key')
    @patch('auctions.views.requests.post')
    def test_6_valid_recaptcha_success(self, mock_post):
        mock_post.return_value.json.return_value = {
            'success': True,
            'action': 'register',
            'score': 0.9
        }
        
        resp = self.client.post('/api/register/', {
            'username': 'newuser123',
            'email': 'new123@user.com',
            'password': 'pw',
            'role': 'buyer',
            'recaptcha_token': 'good-token'
        })
        self.assertEqual(resp.status_code, 201)

    @override_settings(RECAPTCHA_BYPASS_IN_DEV=True)
    def test_7_role_escalation_prevented(self):
        resp = self.client.post('/api/register/', {
            'username': 'hacker',
            'email': 'hacker@user.com',
            'password': 'pw',
            'role': 'admin' # Attempts to register as admin
        })
        self.assertEqual(resp.status_code, 201) # Registration succeeds
        
        # But role should fall back to 'buyer' or 'seller' or just not 'admin'
        # Wait, the code says: `if role in ['buyer', 'seller']: profile.role = role`
        # Since 'admin' is not in the list, it defaults to the model's default ('buyer')
        
        user = User.objects.get(username='hacker')
        self.assertNotEqual(user.profile.role, 'admin')
        self.assertEqual(user.profile.role, 'buyer')
