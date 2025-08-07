from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.core import mail
import json

class PasswordResetTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='oldpassword123'
        )
    
    def test_password_reset_request(self):
        """Test password reset request endpoint"""
        url = reverse('accounts_app:password_reset_request')
        data = {'email': 'test@example.com'}
        
        response = self.client.post(
            url, 
            json.dumps(data), 
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertIn('message', response_data)
        
        # Check that email was sent (in test mode, it goes to mail.outbox)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('Password Reset', email.subject)
        self.assertEqual(email.to, ['test@example.com'])
        
        print("✅ Password reset request test passed")
    
    def test_password_reset_invalid_email(self):
        """Test password reset with invalid email"""
        url = reverse('accounts_app:password_reset_request')
        data = {'email': 'nonexistent@example.com'}
        
        response = self.client.post(
            url, 
            json.dumps(data), 
            content_type='application/json'
        )
        
        # Should still return success for security reasons
        self.assertEqual(response.status_code, 200)
        
        # But no email should be sent
        self.assertEqual(len(mail.outbox), 0)
        
        print("✅ Invalid email test passed")
    
    def test_password_reset_endpoints_exist(self):
        """Test that all password reset URLs are accessible"""
        urls_to_test = [
            ('accounts_app:password_reset_request', '/accounts/password-reset/'),
            ('accounts_app:password_reset_confirm', '/accounts/password-reset/confirm/'),
            ('accounts_app:change_password', '/accounts/change-password/')
        ]
        
        for name, expected_url in urls_to_test:
            url = reverse(name)
            self.assertEqual(url, expected_url)
            
            response = self.client.post(url)
            # Should not be 404
            self.assertNotEqual(response.status_code, 404)
            print(f"✅ URL {name} -> {expected_url} is accessible")
