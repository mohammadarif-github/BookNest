from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

TYPE = (
    ('A', 'Air Conditioned'),
    ('NA', 'Non Air Conditioned'),
)

BOOKING_STATUS = (
    ('pending', 'Pending Payment'),
    ('payment_pending', 'Payment in Progress'),
    ('awaiting_approval', 'Awaiting Admin Approval'),
    ('confirmed', 'Confirmed'),
    ('cancellation_requested', 'Cancellation Requested'),
    ('cancelled', 'Cancelled'),
    ('checked_in', 'Checked In'),
    ('checked_out', 'Checked Out'),
    ('no_show', 'No Show'),
)

ROLE_CHOICES = (
    ('admin', 'Administrator'),
    ('manager', 'Manager'),
    ('staff', 'Staff'),
    ('guest', 'Guest'),
)


def room_images_upload_path(instance, file_name):
    return f"{instance.room_slug}/room_cover/{file_name}"


def room_display_images_upload_path(instance, file_name):
    return f"{instance.room.room_slug}/room_display/{file_name}"


class UserRole(models.Model):
    """
    Extended user roles for BookNest management
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='booknest_role')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='guest')
    department = models.CharField(max_length=50, blank=True, null=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_roles')
    assigned_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    permissions = models.JSONField(default=dict, blank=True, null=True)  # For storing custom permissions
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    def has_permission(self, permission_name):
        """Check if user has specific permission"""
        if self.role == 'admin':
            return True  # Admin has all permissions
        
        default_permissions = {
            'manager': [
                'view_dashboard',
                'manage_bookings',
                'view_rooms',
                'view_guests',
                'confirm_bookings',
                'cancel_bookings',
            ],
            'staff': [
                'view_dashboard',
                'view_bookings',
                'view_rooms',
            ],
            'guest': []
        }
        
        role_permissions = default_permissions.get(self.role, [])
        custom_permissions = self.permissions.get('permissions', []) if self.permissions else []
        
        return permission_name in role_permissions + custom_permissions
    
    class Meta:
        verbose_name = "User Role"
        verbose_name_plural = "User Roles"


class Room(models.Model):
    title = models.CharField(max_length=30)
    category = models.ForeignKey('Category', on_delete=models.CASCADE)
    price_per_night = models.DecimalField(max_digits=8, decimal_places=3)
    room_slug = models.SlugField()
    is_booked = models.BooleanField(default=False)
    capacity = models.IntegerField()
    room_size = models.CharField(max_length=5)
    cover_image = models.ImageField(upload_to=room_images_upload_path)
    featured = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class Category(models.Model):
    category_name = models.CharField(max_length=30)

    def __str__(self):
        return self.category_name


class Customer(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.customer.username


class GuestProfile(models.Model):
    """
    Extended guest profile for BookNest management
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='guest_profile')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    id_number = models.CharField(max_length=50, blank=True, null=True)  # Government ID
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    special_requests = models.TextField(blank=True, null=True)
    vip_status = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - Guest Profile"
    
    @property
    def total_bookings(self):
        return Booking.objects.filter(customer=self.user).count()
    
    @property
    def completed_stays(self):
        return Booking.objects.filter(customer=self.user, status='checked_out').count()
    
    class Meta:
        verbose_name = "Guest Profile"
        verbose_name_plural = "Guest Profiles"


class Booking(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey('Room', on_delete=models.CASCADE)
    booking_date = models.DateTimeField(auto_now_add=True)
    checking_date = models.DateTimeField(blank=True, null=True)
    checkout_date = models.DateTimeField(null=True, blank=True)
    phone_number = models.CharField(max_length=14, null=True)
    email = models.EmailField()
    status = models.CharField(max_length=25, choices=BOOKING_STATUS, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_bookings')
    approval_date = models.DateTimeField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nights_count = models.IntegerField(null=True, blank=True)
    special_requests = models.TextField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    cancellation_requested_date = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_bookings')
    notes = models.TextField(blank=True, null=True)  # Staff notes
    payment_status = models.CharField(max_length=20, default='unpaid', choices=[
        ('unpaid', 'Unpaid'),
        ('pending', 'Payment Pending'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
        ('partial_refund', 'Partial Refund'),
    ])
    payment_due_date = models.DateTimeField(null=True, blank=True)  # When payment expires
    
    def __str__(self):
        return f"{self.customer.username} - {self.room.title} ({self.get_status_display()})"
    
    def calculate_total_amount(self):
        if self.checking_date and self.checkout_date:
            nights = (self.checkout_date.date() - self.checking_date.date()).days
            return float(self.room.price_per_night) * nights
        return float(self.room.price_per_night)
    
    def calculate_nights(self):
        if self.checking_date and self.checkout_date:
            return (self.checkout_date.date() - self.checking_date.date()).days
        return 1
    
    @property
    def is_current_guest(self):
        """Check if this booking represents a current guest"""
        return self.status == 'checked_in'
    
    @property
    def display_status(self):
        """Get smart status display considering both booking and payment status"""
        # If booking is confirmed but payment is unpaid, show as Pending Payment
        if self.status == 'confirmed' and self.payment_status == 'unpaid':
            return 'Pending Payment'
        
        # Otherwise, return the normal status display
        return self.get_status_display()
    
    @property
    def can_be_cancelled(self):
        """Check if booking can be cancelled by user"""
        return self.status in ['pending', 'payment_pending', 'awaiting_approval', 'confirmed'] and \
               self.checking_date and self.checking_date.date() > timezone.now().date()

    @property
    def is_overlapping(self):
        """Check if this booking overlaps with other confirmed bookings for the same room"""
        if not self.checking_date or not self.checkout_date:
            return False
            
        overlapping_bookings = Booking.objects.filter(
            room=self.room,
            status__in=['confirmed', 'checked_in', 'awaiting_approval']
        ).exclude(id=self.id)
        
        for booking in overlapping_bookings:
            if booking.checking_date and booking.checkout_date:
                if (self.checking_date < booking.checkout_date and 
                    self.checkout_date > booking.checking_date):
                    return True
        return False
    
    def save(self, *args, **kwargs):
        # Calculate total amount and nights if not set
        if not self.total_amount:
            self.total_amount = self.calculate_total_amount()
        if not self.nights_count:
            self.nights_count = self.calculate_nights()
        
        # Set payment due date (24 hours from booking)
        if not self.payment_due_date and self.status == 'pending':
            self.payment_due_date = timezone.now() + timedelta(hours=24)
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-booking_date']


PAYMENT_STATUS = (
    ('pending', 'Pending'),
    ('processing', 'Processing'),
    ('paid', 'Paid'),
    ('failed', 'Failed'),
    ('cancelled', 'Cancelled'),
    ('refunded', 'Refunded'),
)

PAYMENT_METHOD = (
    ('visa', 'Visa'),
    ('master', 'MasterCard'),
    ('amex', 'American Express'),
    ('bkash', 'bKash'),
    ('rocket', 'Rocket'),
    ('nagad', 'Nagad'),
    ('upay', 'Upay'),
    ('nexus', 'Nexus'),
    ('city_touch', 'City Touch'),
    ('bank', 'Bank Transfer'),
    ('mobile_banking', 'Mobile Banking'),
    ('other', 'Other'),
)


class Payment(models.Model):
    """
    Enhanced Payment model for SSLCommerz integration with admin tracking
    """
    # Basic Information
    booking = models.OneToOneField('Booking', on_delete=models.CASCADE, related_name='payment')
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Payment Details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='BDT')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, blank=True, null=True)
    
    # SSLCommerz Transaction Details
    transaction_id = models.CharField(max_length=255, unique=True)  # Our generated transaction ID
    sslcommerz_transaction_id = models.CharField(max_length=255, blank=True, null=True)  # SSLCommerz transaction ID
    session_key = models.CharField(max_length=255, blank=True, null=True)  # SSLCommerz session key
    gateway_page_url = models.URLField(blank=True, null=True)  # Payment gateway URL
    
    # Payment Response Data
    bank_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    card_type = models.CharField(max_length=50, blank=True, null=True)
    card_no = models.CharField(max_length=20, blank=True, null=True)  # Masked card number
    card_issuer = models.CharField(max_length=100, blank=True, null=True)
    card_brand = models.CharField(max_length=50, blank=True, null=True)
    card_issuer_country = models.CharField(max_length=50, blank=True, null=True)
    
    # Risk Management
    risk_level = models.CharField(max_length=10, blank=True, null=True)
    risk_title = models.CharField(max_length=100, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    
    # Admin Tracking
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, 
                                   related_name='processed_payments')
    refunded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, 
                                  related_name='refunded_payments')
    refund_reason = models.TextField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    
    # Additional Data Storage
    raw_response = models.JSONField(blank=True, null=True)  # Store complete SSLCommerz response
    
    def __str__(self):
        return f"Payment {self.transaction_id} - {self.customer.username} - {self.get_status_display()}"
    
    @property
    def is_successful(self):
        return self.status == 'paid'
    
    @property
    def is_pending(self):
        return self.status in ['pending', 'processing']
    
    @property
    def can_be_refunded(self):
        return self.status == 'paid'
    
    def get_masked_card_info(self):
        """Return masked card information for display"""
        if self.card_no:
            return f"**** **** **** {self.card_no[-4:]}"
        return "N/A"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"


class CheckIn(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey('Room', on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=14, null=True)
    email = models.EmailField(null=True)
    checked_in_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer.username} - {self.room.room_slug}"


class CheckOut(models.Model):
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    check_out_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.customer


class RoomDisplayImages(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    display_images = models.ImageField(upload_to=room_display_images_upload_path)

    def __str__(self):
        return self.room.room_slug
