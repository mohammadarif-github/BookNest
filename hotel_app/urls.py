from django.urls import path

from .views import (
    RoomView, RoomDetailView,
    BookingCreateApiView, CheckoutView, CheckedInView, UserBookingsView,
    RoomAvailabilityView, BookingDetailView, BookingCancellationRequestView
)
from .bulk_operations import (
    BulkDataUploadView, BulkUpdateView, BulkDeleteView, DataExportView
)
from .management_views import (
    ManagerDashboardView, BookingManagementView, 
    RoomManagementView, StaffManagementView,
    GuestManagementView, AdminDashboardView, ManagerAssignmentView,
    CategoriesView
)
from .payment_views import (
    InitiatePaymentView, PaymentSuccessView, PaymentFailView, 
    PaymentCancelView, PaymentIPNView, PaymentManagementView, PaymentStatusView
)

app_name = 'hotel_app'

urlpatterns = [
    path('get_room_list/', RoomView.as_view(), name="room_list"),
    path('get_a_room_detail/<str:room_slug>/', RoomDetailView.as_view(), name="single_room"),
    path('book/', BookingCreateApiView.as_view(), name='book_room'),
    path('checkout/', CheckoutView.as_view(), name="checkout"),
    path('get_current_checked_in_rooms/', CheckedInView.as_view(), name="checked_in_rooms"),
    path('user-bookings/', UserBookingsView.as_view(), name="user_bookings"),
    path('room-availability/', RoomAvailabilityView.as_view(), name="room_availability"),
    path('booking-detail/<int:booking_id>/', BookingDetailView.as_view(), name="booking_detail"),
    path('booking-cancel/<int:booking_id>/', BookingCancellationRequestView.as_view(), name="booking_cancel_request"),
    
    # Bulk operations endpoints
    path('bulk/upload/', BulkDataUploadView.as_view(), name="bulk_upload"),
    path('bulk/update/', BulkUpdateView.as_view(), name="bulk_update"),
    path('bulk/delete/', BulkDeleteView.as_view(), name="bulk_delete"),
    path('bulk/export/', DataExportView.as_view(), name="bulk_export"),
    
    # Management endpoints
    path('management/dashboard/', ManagerDashboardView.as_view(), name="manager_dashboard"),
    path('management/bookings/', BookingManagementView.as_view(), name="booking_management"),
    path('management/rooms/', RoomManagementView.as_view(), name="room_management"),
    path('management/rooms/<int:room_id>/', RoomManagementView.as_view(), name="room_management_detail"),
    path('management/categories/', CategoriesView.as_view(), name="categories_list"),
    path('management/staff/', StaffManagementView.as_view(), name="staff_management"),
    path('management/guests/', GuestManagementView.as_view(), name="guest_management"),
    
    # Admin-only endpoints
    path('admin/dashboard/', AdminDashboardView.as_view(), name="admin_dashboard"),
    path('admin/assign-manager/', ManagerAssignmentView.as_view(), name="manager_assignment"),
    path('admin/remove-manager/', ManagerAssignmentView.as_view(), name="manager_removal"),
    
    # Payment endpoints
    path('payment/initiate/', InitiatePaymentView.as_view(), name="initiate_payment"),
    path('payment/success/', PaymentSuccessView.as_view(), name="payment_success"),
    path('payment/fail/', PaymentFailView.as_view(), name="payment_fail"),
    path('payment/cancel/', PaymentCancelView.as_view(), name="payment_cancel"),
    path('payment/ipn/', PaymentIPNView.as_view(), name="payment_ipn"),
    path('payment/status/', PaymentStatusView.as_view(), name="payment_status"),
    
    # Payment management endpoints (admin/manager only)
    path('management/payments/', PaymentManagementView.as_view(), name="payment_management"),
]
