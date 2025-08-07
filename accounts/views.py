from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import logging

from .serializers import UserSerializer, PasswordResetSerializer, PasswordResetConfirmSerializer
from django.contrib.auth.models import User

# Import mask_email function from hotel_app (BookNest email utilities)
try:
    from hotel_app.email_notifications import mask_email
except ImportError:
    def mask_email(email):
        """Fallback mask_email function if import fails"""
        if not email or '@' not in email:
            return email
        local, domain = email.split('@', 1)
        if len(local) <= 3:
            return email
        masked_local = local[:3] + '*' * (len(local) - 5) + local[-2:] if len(local) > 5 else local[:1] + '*' * (len(local) - 1)
        return f"{masked_local}@{domain}"

# Set up logging
logger = logging.getLogger(__name__)


class MyTokenObtainSerilizer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        # Add your required response and other parameters here
        data['username'] = self.user.username
        data['user_id'] = self.user.pk
        data['is_admin'] = self.user.is_staff
        data['message'] = "login successful"

        return data


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='post')
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainSerilizer


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST'), name='post')
class UserView(APIView):
    """
    Create a new user account with proper error handling
    """
    
    def post(self, request, *args, **kwargs):
        """Create a new user with comprehensive validation"""
        try:
            serializer = UserSerializer(data=request.data)
            
            if not serializer.is_valid():
                logger.warning(f"User registration failed - validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Registration failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Additional validation
            username = serializer.validated_data.get('username')
            email = serializer.validated_data.get('email')
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                return Response({
                    'success': False,
                    'message': 'Registration failed',
                    'error': 'Username already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(email=email).exists():
                return Response({
                    'success': False,
                    'message': 'Registration failed',
                    'error': 'Email already registered'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create user
            user = serializer.save()
            logger.info(f"New user registered: {username} ({email})")
            
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'data': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }, status=status.HTTP_201_CREATED)
            
        except IntegrityError as e:
            logger.error(f"Database integrity error during registration: {str(e)}")
            return Response({
                'success': False,
                'message': 'Registration failed',
                'error': 'A user with this information already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except ValidationError as e:
            logger.error(f"Validation error during registration: {str(e)}")
            return Response({
                'success': False,
                'message': 'Registration failed',
                'error': 'Invalid user data provided'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Unexpected error during registration: {str(e)}")
            return Response({
                'success': False,
                'message': 'Registration failed',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST'), name='post')
class PasswordResetRequestView(APIView):
    """
    Request password reset by email with improved error handling
    """
    def post(self, request):
        """Send password reset email with comprehensive validation"""
        try:
            serializer = PasswordResetSerializer(data=request.data)
            
            if not serializer.is_valid():
                logger.warning(f"Password reset request failed - validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Invalid email format',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                
                # Check if user actually has a valid email
                if not user.email or user.email.strip() == '':
                    logger.warning(f"User {user.username} found but has no valid email address")
                    return Response({
                        'success': False,
                        'message': 'The account associated with this email does not have a valid email address configured.',
                        'error': 'Please contact support to update your email address',
                        'requires_email_update': True,
                        'username': user.username
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate reset token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Create reset link
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
                
                # Email content
                subject = 'Password Reset - BookNest'
                html_message = f"""
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #007bff;">🏨 BookNest</h2>
                        <h3 style="color: #333;">Password Reset Request</h3>
                        
                        <p>Hello {user.first_name or user.username},</p>
                        
                        <p>You have requested to reset your password for your Hotel Reservation account.</p>
                        
                        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Reset Link:</strong></p>
                            <a href="{reset_link}" 
                               style="background-color: #007bff; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            This link will expire in 1 hour for security reasons.
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">
                            If you didn't request this password reset, please ignore this email.
                        </p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="color: #888; font-size: 12px;">
                            Best regards,<br>
                            BookNest Team
                        </p>
                    </div>
                </body>
                </html>
                """
                
                plain_message = f"""
                Hi {user.first_name or user.username},

                You requested to reset your password for BookNest.

                Click the link below to reset your password:
                {reset_link}

                This link will expire in 1 hour for security reasons.

                If you didn't request this, please ignore this email.

                Thanks,
                BookNest Team
                """
                
                # Send email
                from django.core.mail import EmailMultiAlternatives
                
                msg = EmailMultiAlternatives(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email]
                )
                msg.attach_alternative(html_message, "text/html")
                msg.send(fail_silently=False)
                
                logger.info(f"Password reset email sent to: {email}")
                
                return Response({
                    'success': True,
                    'message': f'Password reset email sent to {mask_email(user.email)}',
                    'data': {
                        'email_sent_to': mask_email(user.email),
                        'reset_link_expires': '1 hour'
                    }
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                # Don't reveal if email exists or not for security
                logger.info(f"Password reset requested for non-existent email: {email}")
                return Response({
                    'success': True,
                    'message': 'If an account with this email exists, you will receive password reset instructions.',
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to send password reset email',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST'), name='post')
class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token and improved error handling
    """
    def post(self, request):
        """Confirm password reset with comprehensive validation"""
        try:
            serializer = PasswordResetConfirmSerializer(data=request.data)
            
            if not serializer.is_valid():
                logger.warning(f"Password reset confirm failed - validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Invalid reset data',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            uid = serializer.validated_data['uid']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            try:
                # Decode user ID
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
                
                # Verify token
                if not default_token_generator.check_token(user, token):
                    logger.warning(f"Invalid password reset token for user {user_id}")
                    return Response({
                        'success': False,
                        'message': 'Invalid or expired reset token',
                        'error': 'The password reset link is invalid or has expired'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Set new password
                user.set_password(new_password)
                user.save()
                
                logger.info(f"Password reset successful for user: {user.username}")
                
                return Response({
                    'success': True,
                    'message': 'Password reset successful',
                    'data': {
                        'username': user.username,
                        'email': user.email
                    }
                }, status=status.HTTP_200_OK)
                
            except (User.DoesNotExist, ValueError, TypeError) as e:
                logger.warning(f"Invalid password reset attempt - user lookup failed: {str(e)}")
                return Response({
                    'success': False,
                    'message': 'Invalid reset token',
                    'error': 'The password reset link is invalid'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Unexpected error during password reset confirm: {str(e)}")
            return Response({
                'success': False,
                'message': 'Password reset failed',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST'), name='post')
class PasswordResetWithEmailUpdateView(APIView):
    """
    Handle password reset for users who don't have email in database
    """
    def post(self, request):
        """Update user email and send reset password link"""
        try:
            username = request.data.get('username')
            email = request.data.get('email')
            
            if not username or not email:
                return Response({
                    'success': False,
                    'message': 'Username and email are required',
                    'errors': {'username': 'Required', 'email': 'Required'}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate email format
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError as DjangoValidationError
            
            try:
                validate_email(email)
            except DjangoValidationError:
                return Response({
                    'success': False,
                    'message': 'Invalid email format',
                    'errors': {'email': 'Please enter a valid email address'}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Find user by username
                user = User.objects.get(username=username)
                
                # Check if email is already used by another user
                if User.objects.filter(email=email).exclude(id=user.id).exists():
                    return Response({
                        'success': False,
                        'message': 'Email already in use',
                        'error': 'This email is already associated with another account'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Update user email
                user.email = email
                user.save()
                
                # Generate reset token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Create reset link
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
                
                # Email content
                subject = 'Password Reset - BookNest'
                html_message = f"""
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #007bff;">🏨 BookNest</h2>
                        <h3 style="color: #333;">Password Reset Request</h3>
                        
                        <p>Hello {user.first_name or user.username},</p>
                        
                        <p>We've updated your email address and are sending you password reset instructions.</p>
                        
                        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Reset Link:</strong></p>
                            <a href="{reset_link}" 
                               style="background-color: #007bff; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            This link will expire in 1 hour for security reasons.
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">
                            Your email address has been updated to: <strong>{email}</strong>
                        </p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="color: #888; font-size: 12px;">
                            Best regards,<br>
                            BookNest Team
                        </p>
                    </div>
                </body>
                </html>
                """
                
                plain_message = f"""
                Hi {user.first_name or user.username},

                We've updated your email address and are sending you password reset instructions.

                Click the link below to reset your password:
                {reset_link}

                This link will expire in 1 hour for security reasons.

                Your email address has been updated to: {email}

                Thanks,
                BookNest Team
                """
                
                # Send email
                from django.core.mail import EmailMultiAlternatives
                
                msg = EmailMultiAlternatives(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email]
                )
                msg.attach_alternative(html_message, "text/html")
                msg.send(fail_silently=False)
                
                logger.info(f"Password reset email sent to updated email: {mask_email(email)} for user: {username}")
                
                return Response({
                    'success': True,
                    'message': f'Email updated and password reset instructions sent to {mask_email(email)}',
                    'data': {
                        'email_updated': True,
                        'email_sent_to': mask_email(email),
                        'reset_link_expires': '1 hour'
                    }
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'User not found',
                    'error': 'No account found with this username'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error in password reset with email update: {str(e)}")
            return Response({
                'success': False,
                'message': 'Password reset failed',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    """
    Change password for authenticated users with improved validation
    """
    def post(self, request):
        """Change password with comprehensive validation"""
        try:
            # Check authentication
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'message': 'Authentication required',
                    'error': 'You must be logged in to change your password'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            # Validate required fields
            if not all([old_password, new_password]):
                return Response({
                    'success': False,
                    'message': 'Missing required fields',
                    'error': 'Both old_password and new_password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check old password
            if not request.user.check_password(old_password):
                logger.warning(f"Incorrect old password attempt for user {request.user.username}")
                return Response({
                    'success': False,
                    'message': 'Current password is incorrect',
                    'error': 'The current password you entered is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate new password strength (basic validation)
            if len(new_password) < 8:
                return Response({
                    'success': False,
                    'message': 'Password too weak',
                    'error': 'New password must be at least 8 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if new password is same as old password
            if old_password == new_password:
                return Response({
                    'success': False,
                    'message': 'Password unchanged',
                    'error': 'New password must be different from current password'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Optional: Check password confirmation
            if confirm_password and new_password != confirm_password:
                return Response({
                    'success': False,
                    'message': 'Password confirmation mismatch',
                    'error': 'New password and confirmation password do not match'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            request.user.set_password(new_password)
            request.user.save()
            
            logger.info(f"Password changed successfully for user: {request.user.username}")
            
            return Response({
                'success': True,
                'message': 'Password changed successfully',
                'data': {
                    'username': request.user.username,
                    'email': request.user.email
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Unexpected error during password change for user {request.user.username}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Password change failed',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='10/m', method=['GET', 'PUT']), name='dispatch')
class UserProfileView(APIView):
    """
    View for managing user profile information
    """
    
    def get(self, request):
        """Get user profile information"""
        try:
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'message': 'Authentication required',
                    'error': 'You must be logged in to view your profile'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get or create profile
            from .models import UserProfile
            from .serializers import UserProfileViewSerializer
            
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            if created:
                logger.info(f"Created new profile for user: {request.user.username}")
            
            serializer = UserProfileViewSerializer(profile)
            
            return Response({
                'success': True,
                'message': 'Profile retrieved successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving profile for user {request.user.username}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve profile',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Update user profile information"""
        try:
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'message': 'Authentication required',
                    'error': 'You must be logged in to update your profile'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get or create profile
            from .models import UserProfile
            from .serializers import UserProfileSerializer
            
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            
            if not serializer.is_valid():
                logger.warning(f"Profile update failed for user {request.user.username} - validation errors: {serializer.errors}")
                return Response({
                    'success': False,
                    'message': 'Invalid profile data',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Save the profile
            serializer.save()
            
            logger.info(f"Profile updated successfully for user: {request.user.username}")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating profile for user {request.user.username}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to update profile',
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

