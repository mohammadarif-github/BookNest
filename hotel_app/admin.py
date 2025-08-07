from django.contrib import admin
from .models import (
    Room,
    Category,
    Customer,
    Booking,
    Payment,
    CheckIn,
    CheckOut,
    RoomDisplayImages,
    UserRole,
    GuestProfile
)


def update_room_is_booked_to_false(model_admin, request, query_set):
    query_set.update(is_booked=False)


update_room_is_booked_to_false.short_description_message = "Update all is_booked to False"


class RoomDisplayImagesStacked(admin.StackedInline):
    model = RoomDisplayImages


class RoomAdmin(admin.ModelAdmin):
    inlines = [RoomDisplayImagesStacked]

    class Meta:
        model = Room

    list_display = ['__str__', 'is_booked']    
    actions = [update_room_is_booked_to_false]


class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'department', 'assigned_by', 'assigned_date', 'is_active']
    list_filter = ['role', 'is_active', 'assigned_date']
    search_fields = ['user__username', 'user__email', 'department']
    readonly_fields = ['assigned_date']


class BookingAdmin(admin.ModelAdmin):
    list_display = ['customer', 'room', 'status', 'booking_date', 'checking_date', 'checkout_date', 'approved_by']
    list_filter = ['status', 'booking_date', 'approval_date']
    search_fields = ['customer__username', 'room__title', 'email']
    readonly_fields = ['booking_date', 'approval_date']


class GuestProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'vip_status', 'total_bookings', 'created_date']
    list_filter = ['vip_status', 'created_date']
    search_fields = ['user__username', 'user__email', 'phone_number', 'id_number']
    readonly_fields = ['created_date', 'updated_date', 'total_bookings', 'completed_stays']


admin.site.register(Room, RoomAdmin)
admin.site.register(Category)
admin.site.register(Customer)
admin.site.register(Booking, BookingAdmin)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_id', 'customer', 'booking_room', 'amount', 'status', 
        'payment_method', 'created_at', 'paid_at', 'processed_by'
    ]
    list_filter = [
        'status', 'payment_method', 'created_at', 'paid_at', 'currency',
        'card_type', 'risk_level'
    ]
    search_fields = [
        'transaction_id', 'sslcommerz_transaction_id', 'bank_transaction_id',
        'customer__username', 'customer__email', 'booking__room__title'
    ]
    readonly_fields = [
        'transaction_id', 'sslcommerz_transaction_id', 'session_key', 
        'bank_transaction_id', 'created_at', 'updated_at', 'paid_at',
        'card_no', 'card_issuer', 'card_brand', 'raw_response'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('customer', 'booking', 'amount', 'currency', 'status')
        }),
        ('Transaction Details', {
            'fields': ('transaction_id', 'sslcommerz_transaction_id', 'session_key', 'gateway_page_url')
        }),
        ('Payment Method Details', {
            'fields': ('payment_method', 'card_type', 'card_no', 'card_issuer', 'card_brand', 'card_issuer_country')
        }),
        ('Bank Information', {
            'fields': ('bank_transaction_id', 'risk_level', 'risk_title')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at')
        }),
        ('Admin Management', {
            'fields': ('processed_by', 'refunded_by', 'refund_reason', 'admin_notes')
        }),
        ('Raw Data', {
            'fields': ('raw_response',),
            'classes': ('collapse',)
        })
    )
    
    def booking_room(self, obj):
        return f"{obj.booking.room.title} (#{obj.booking.id})"
    booking_room.short_description = 'Room & Booking'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'customer', 'booking', 'booking__room', 'processed_by', 'refunded_by'
        )


admin.site.register(Payment, PaymentAdmin)
admin.site.register(CheckIn)
admin.site.register(CheckOut)
admin.site.register(RoomDisplayImages)
admin.site.register(UserRole, UserRoleAdmin)
admin.site.register(GuestProfile, GuestProfileAdmin)
