from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Room,
    Booking,
    CheckIn,
    UserRole,
    Category,
    GuestProfile,
    Payment
)


class RoomSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name')

    class Meta:
        model = Room
        fields = '__all__'

    def create(self, validated_data):
        return super().create(self.category_name)


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_full_name = serializers.SerializerMethodField()
    room_title = serializers.CharField(source='room.title', read_only=True)
    room_category = serializers.CharField(source='room.category.category_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    nights_count = serializers.ReadOnlyField()
    is_current_guest = serializers.ReadOnlyField()
    
    class Meta:
        model = Booking
        fields = '__all__'
    
    def get_customer_full_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip() or obj.customer.username


class UserRoleSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserRole
        fields = '__all__'
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class GuestProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    total_bookings = serializers.ReadOnlyField()
    completed_stays = serializers.ReadOnlyField()
    
    class Meta:
        model = GuestProfile
        fields = '__all__'
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class UserSerializer(serializers.ModelSerializer):
    hotel_role = UserRoleSerializer(read_only=True)
    guest_profile = GuestProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'hotel_role', 'guest_profile']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class RoomDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    category = CategorySerializer(read_only=True)
    current_guest = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = '__all__'
    
    def get_current_guest(self, obj):
        try:
            checkin = CheckIn.objects.filter(room=obj).first()
            if checkin:
                return {
                    'guest_name': checkin.customer.username,
                    'guest_email': checkin.email,
                    'phone_number': checkin.phone_number,
                    'checked_in_date': checkin.checked_in_date
                }
        except:
            pass
        return None


class CheckinSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(source='room.pk')
    room_slug = serializers.SlugField(source='room.room_slug')
    customer_id = serializers.IntegerField(source='customer.pk')
    customer_name = serializers.CharField(source='customer.username')

    class Meta:
        model = CheckIn
        fields = ('phone_number', 'email', 'customer_id', 'customer_name', 'room_id', 'room_slug',)


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment model with admin/manager tracking information
    """
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_full_name = serializers.SerializerMethodField()
    
    # Booking information
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    room_title = serializers.CharField(source='booking.room.title', read_only=True)
    room_category = serializers.CharField(source='booking.room.category.category_name', read_only=True)
    
    # Status and display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    # Admin tracking
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)
    refunded_by_name = serializers.CharField(source='refunded_by.username', read_only=True)
    
    # Card information (masked)
    masked_card_number = serializers.SerializerMethodField()
    
    # Calculated fields
    nights_count = serializers.SerializerMethodField()
    is_refundable = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'transaction_id', 'amount', 'currency', 'status', 'status_display',
            'payment_method', 'payment_method_display', 'created_at', 'updated_at', 'paid_at',
            
            # Customer info
            'customer_name', 'customer_email', 'customer_full_name',
            
            # Booking info  
            'booking_id', 'room_title', 'room_category', 'nights_count',
            
            # SSLCommerz details
            'sslcommerz_transaction_id', 'bank_transaction_id', 'card_type',
            'masked_card_number', 'card_issuer', 'card_brand', 'card_issuer_country',
            
            # Risk management
            'risk_level', 'risk_title',
            
            # Admin tracking
            'processed_by_name', 'refunded_by_name', 'refund_reason', 'admin_notes',
            'is_refundable'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'created_at', 'updated_at', 'paid_at',
            'sslcommerz_transaction_id', 'bank_transaction_id'
        ]
    
    def get_customer_full_name(self, obj):
        """Get customer's full name or username"""
        if obj.customer.first_name and obj.customer.last_name:
            return f"{obj.customer.first_name} {obj.customer.last_name}"
        return obj.customer.username
    
    def get_masked_card_number(self, obj):
        """Get masked card number for display"""
        return obj.get_masked_card_info()
    
    def get_nights_count(self, obj):
        """Get number of nights for the booking"""
        return obj.booking.nights_count
    
    def get_is_refundable(self, obj):
        """Check if payment can be refunded"""
        return obj.can_be_refunded
