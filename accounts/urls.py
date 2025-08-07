from django.urls import path

from rest_framework_simplejwt import views as jwt_views

from .views import (
    UserView, 
    MyTokenObtainPairView, 
    PasswordResetRequestView, 
    PasswordResetConfirmView, 
    PasswordResetWithEmailUpdateView,
    ChangePasswordView,
    UserProfileView
)

app_name = 'accounts_app'

urlpatterns = [
    path('register/', UserView.as_view(), name='user_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh_token/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'),
    
    # Password Reset URLs
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/with-email-update/', PasswordResetWithEmailUpdateView.as_view(), name='password_reset_with_email_update'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Profile Management
    path('profile/', UserProfileView.as_view(), name='user_profile'),
]

