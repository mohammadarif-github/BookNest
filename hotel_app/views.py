from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.utils import timezone
import logging

from .models import Room, Booking, CheckIn
from .email_notifications import send_booking_confirmation_email, send_booking_cancellation_email
from .serializer import (
    RoomSerializer,
    BookingSerializer,
    CheckinSerializer
)
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser
)
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Set up logging
logger = logging.getLogger(__name__)


class RoomView(APIView):
    """
    List all available rooms with their details, supports filtering
    """
    
    @swagger_auto_schema(
        operation_description="Get a list of all rooms with their details including category, price, capacity, and availability. Supports filtering by category, capacity, price range, and availability.",
        operation_summary="List All Rooms with Filters",
        manual_parameters=[
            openapi.Parameter('category', openapi.IN_QUERY, description="Filter by room category", type=openapi.TYPE_STRING),
            openapi.Parameter('capacity', openapi.IN_QUERY, description="Filter by minimum capacity", type=openapi.TYPE_INTEGER),
            openapi.Parameter('max_price', openapi.IN_QUERY, description="Filter by maximum price", type=openapi.TYPE_NUMBER),
            openapi.Parameter('min_price', openapi.IN_QUERY, description="Filter by minimum price", type=openapi.TYPE_NUMBER),
            openapi.Parameter('available_only', openapi.IN_QUERY, description="Show only available rooms (true/false)", type=openapi.TYPE_BOOLEAN),
            openapi.Parameter('featured_only', openapi.IN_QUERY, description="Show only featured rooms (true/false)", type=openapi.TYPE_BOOLEAN),
        ],
        responses={
            200: openapi.Response(
                description="List of rooms retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Rooms retrieved successfully",
                        "data": [
                            {
                                "id": 1,
                                "title": "Ocean View Deluxe",
                                "category_name": "Deluxe Suite",
                                "price_per_night": "250.000",
                                "room_slug": "ocean-view-deluxe",
                                "is_booked": False,
                                "capacity": 2,
                                "room_size": "50m²",
                                "featured": True
                            }
                        ],
                        "count": 1
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Failed to retrieve rooms",
                        "error": "Internal server error"
                    }
                }
            )
        },
        tags=['Room Management']
    )
    def get(self, request, *args, **kwargs):
        """Get all rooms with filtering support"""
        try:
            # Start with all rooms
            queryset = Room.objects.select_related('category').order_by('-id')
            
            # Apply filters based on query parameters
            category = request.GET.get('category')
            capacity = request.GET.get('capacity')
            max_price = request.GET.get('max_price')
            min_price = request.GET.get('min_price')
            available_only = request.GET.get('available_only', '').lower() == 'true'
            featured_only = request.GET.get('featured_only', '').lower() == 'true'
            
            # Filter by category
            if category and category.lower() != 'all':
                queryset = queryset.filter(category__category_name__icontains=category)
            
            # Filter by minimum capacity
            if capacity:
                try:
                    capacity_int = int(capacity)
                    if capacity_int > 0:
                        queryset = queryset.filter(capacity__gte=capacity_int)
                except ValueError:
                    pass
            
            # Filter by price range
            if max_price:
                try:
                    max_price_float = float(max_price)
                    queryset = queryset.filter(price_per_night__lte=max_price_float)
                except ValueError:
                    pass
                    
            if min_price:
                try:
                    min_price_float = float(min_price)
                    queryset = queryset.filter(price_per_night__gte=min_price_float)
                except ValueError:
                    pass
            
            # Filter by availability
            if available_only:
                queryset = queryset.filter(is_booked=False)
            
            # Filter by featured
            if featured_only:
                queryset = queryset.filter(featured=True)
            
            serializer = RoomSerializer(queryset, many=True)
            
            return Response({
                'success': True,
                'message': 'Rooms retrieved successfully',
                'data': serializer.data,
                'count': queryset.count(),
                'filters_applied': {
                    'category': category,
                    'capacity': capacity,
                    'max_price': max_price,
                    'min_price': min_price,
                    'available_only': available_only,
                    'featured_only': featured_only
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving rooms: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve rooms',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoomDetailView(APIView):
    """
    Retrieve details of a specific room by slug
    """
    
    @swagger_auto_schema(
        operation_description="Get detailed information about a specific room using its slug",
        operation_summary="Get Room Details",
        manual_parameters=[
            openapi.Parameter(
                'room_slug',
                openapi.IN_PATH,
                description="Room slug identifier",
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        responses={
            200: openapi.Response(
                description="Room details retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Room details retrieved successfully",
                        "data": {
                            "id": 1,
                            "title": "Ocean View Deluxe",
                            "category_name": "Deluxe Suite",
                            "price_per_night": "250.000",
                            "room_slug": "ocean-view-deluxe",
                            "is_booked": False,
                            "capacity": 2,
                            "room_size": "50m²",
                            "featured": True
                        }
                    }
                }
            ),
            404: openapi.Response(
                description="Room not found",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Room not found",
                        "error": "No room found with the provided slug"
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Failed to retrieve room details",
                        "error": "Internal server error"
                    }
                }
            )
        },
        tags=['Room Management']
    )
    def get(self, request, room_slug, *args, **kwargs):
        """Get room details by slug with proper error handling"""
        try:
            room = get_object_or_404(Room, room_slug=room_slug)
            serializer = RoomSerializer(room)
            
            return Response({
                'success': True,
                'message': 'Room details retrieved successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Room.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Room not found',
                'error': 'No room found with the provided slug'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error retrieving room details for slug {room_slug}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve room details',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='post')
class BookingCreateApiView(APIView):
    """
    Create a new room booking with proper error handling
    """
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        operation_description="Create a new booking for a room. The room will be marked as booked and a check-in record will be created.",
        operation_summary="Create Room Booking",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['room', 'phone_number', 'email'],
            properties={
                'room': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room ID'),
                'phone_number': openapi.Schema(type=openapi.TYPE_STRING, description='Customer phone number'),
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='Customer email'),
                'checking_date': openapi.Schema(type=openapi.TYPE_STRING, format='date-time', description='Check-in date (optional)'),
                'checkout_date': openapi.Schema(type=openapi.TYPE_STRING, format='date-time', description='Check-out date (optional)'),
            },
            example={
                "room": 1,
                "phone_number": "+1234567890",
                "email": "customer@example.com"
            }
        ),
        responses={
            201: openapi.Response(
                description="Booking created successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Room booked successfully",
                        "data": {
                            "booking": {
                                "id": 1,
                                "customer": 1,
                                "room": 1,
                                "phone_number": "+1234567890",
                                "email": "customer@example.com"
                            },
                            "checkin": {
                                "id": 1,
                                "customer": 1,
                                "room": 1,
                                "phone_number": "+1234567890",
                                "email": "customer@example.com"
                            }
                        }
                    }
                }
            ),
            400: openapi.Response(
                description="Bad request - Room already booked or validation error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Room is already booked",
                        "error": "This room has already been reserved"
                    }
                }
            ),
            401: openapi.Response(
                description="Authentication required",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Authentication required",
                        "error": "You must be logged in to make a booking"
                    }
                }
            ),
            404: openapi.Response(
                description="Room not found",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Room not found",
                        "error": "No room found with the provided ID"
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Booking failed",
                        "error": "Internal server error occurred"
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def post(self, request, *args, **kwargs):
        """Create a new booking with comprehensive error handling and availability checking"""
        try:
            # Validate required fields
            room_id = request.data.get('room')
            phone_number = request.data.get('phone_number')
            email = request.data.get('email')
            checking_date = request.data.get('checking_date')
            checkout_date = request.data.get('checkout_date')
            
            if not all([room_id, phone_number, email]):
                return Response({
                    'success': False,
                    'message': 'Missing required fields',
                    'error': 'room, phone_number, and email are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get room and check if it exists
            try:
                room = Room.objects.get(pk=room_id)
            except Room.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Room not found',
                    'error': 'No room found with the provided ID'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check for date overlap if dates are provided
            if checking_date and checkout_date:
                from datetime import datetime
                check_in = datetime.fromisoformat(checking_date.replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(checkout_date.replace('Z', '+00:00'))
                
                # Check for overlapping bookings
                overlapping_bookings = Booking.objects.filter(
                    room=room,
                    status__in=['confirmed', 'checked_in', 'awaiting_approval', 'pending']
                ).filter(
                    checking_date__lt=check_out,
                    checkout_date__gt=check_in
                )
                
                if overlapping_bookings.exists():
                    return Response({
                        'success': False,
                        'message': 'Room is not available for selected dates',
                        'error': 'This room is already booked for the selected date range'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Use database transaction to ensure data consistency
            with transaction.atomic():
                # Create booking with pending status
                booking_data = {
                    'customer': request.user.id,
                    'room': room_id,
                    'phone_number': phone_number,
                    'email': email,
                    'status': 'pending',  # New bookings start as pending payment
                    'payment_status': 'unpaid'
                }
                
                # Add optional fields if provided
                if checking_date:
                    booking_data['checking_date'] = checking_date
                if checkout_date:
                    booking_data['checkout_date'] = checkout_date
                if request.data.get('special_requests'):
                    booking_data['special_requests'] = request.data['special_requests']
                
                booking_serializer = BookingSerializer(data=booking_data)
                if not booking_serializer.is_valid():
                    return Response({
                        'success': False,
                        'message': 'Invalid booking data',
                        'error': booking_serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                booking = booking_serializer.save()
                
                # Calculate total amount and nights
                booking.total_amount = booking.calculate_total_amount()
                booking.nights_count = booking.calculate_nights()
                booking.save()
                
                # Send email notification for booking confirmation
                try:
                    send_booking_confirmation_email(booking)
                except Exception as email_error:
                    # Log email error but don't fail the booking
                    logger.error(f"Failed to send booking confirmation email for booking {booking.id}: {str(email_error)}")
                
                # Don't mark room as booked until payment is confirmed
                # Only mark as booked when status becomes 'confirmed'
                
                # Log successful booking
                logger.info(f"Booking created successfully - Room: {room_id}, User: {request.user.id}, Status: pending")
                
                return Response({
                    'success': True,
                    'message': 'Booking created successfully. Please complete payment within 24 hours.',
                    'booking_data': booking_serializer.data,
                    'data': {
                        'booking_id': booking.id,
                        'status': 'pending',
                        'payment_status': 'unpaid',
                        'total_amount': str(booking.total_amount),
                        'nights_count': booking.nights_count,
                        'payment_due_date': booking.payment_due_date.isoformat() if booking.payment_due_date else None
                    }
                }, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            logger.error(f"Validation error during booking: {str(e)}")
            return Response({
                'success': False,
                'message': 'Validation error',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except IntegrityError as e:
            logger.error(f"Database integrity error during booking: {str(e)}")
            return Response({
                'success': False,
                'message': 'Database error',
                'error': 'A database constraint was violated'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Unexpected error during booking: {str(e)}")
            return Response({
                'success': False,
                'message': 'Booking failed',
                'error': 'Internal server error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckoutView(APIView):
    """
    Checkout a room and free it for new bookings
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Checkout from a room, making it available for new bookings",
        operation_summary="Checkout Room",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['pk'],
            properties={
                'pk': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room ID to checkout from'),
            },
            example={"pk": 1}
        ),
        responses={
            200: openapi.Response(
                description="Checkout successful",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Checkout completed successfully",
                        "data": {
                            "room_id": 1,
                            "room_title": "Ocean View Deluxe"
                        }
                    }
                }
            ),
            400: openapi.Response(
                description="Bad request",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Room ID is required",
                        "error": "Missing room ID in request"
                    }
                }
            ),
            404: openapi.Response(
                description="Room or check-in record not found",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Room not found or not checked in",
                        "error": "No active check-in found for this room"
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Checkout failed",
                        "error": "Internal server error occurred"
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def post(self, request):
        """Checkout from a room with proper error handling"""
        try:
            room_id = request.data.get('pk')
            
            if not room_id:
                return Response({
                    'success': False,
                    'message': 'Room ID is required',
                    'error': 'Missing room ID in request'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get room and check if it exists
            try:
                room = Room.objects.get(pk=room_id)
            except Room.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Room not found',
                    'error': 'No room found with the provided ID'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get check-in record
            try:
                checked_in_room = CheckIn.objects.get(room__pk=room_id)
            except CheckIn.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Room not found or not checked in',
                    'error': 'No active check-in found for this room'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Use database transaction for consistency
            with transaction.atomic():
                # Mark room as available
                room.is_booked = False
                room.save()
                
                # Delete check-in record
                checked_in_room.delete()
                
                # Log successful checkout
                logger.info(f"Checkout completed - Room: {room_id}, User: {request.user.id}")
                
                return Response({
                    'success': True,
                    'message': 'Checkout completed successfully',
                    'data': {
                        'room_id': room.id,
                        'room_title': room.title
                    }
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error during checkout for room {room_id}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Checkout failed',
                'error': 'Internal server error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckedInView(APIView):
    """
    List all currently checked-in guests (Admin only)
    """
    permission_classes = (IsAdminUser,)
    
    @swagger_auto_schema(
        operation_description="Get a list of all currently checked-in guests. Admin access required.",
        operation_summary="List Checked-in Guests",
        responses={
            200: openapi.Response(
                description="Checked-in guests retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Checked-in guests retrieved successfully",
                        "data": [
                            {
                                "id": 1,
                                "customer": 1,
                                "room": 1,
                                "phone_number": "+1234567890",
                                "email": "customer@example.com",
                                "checked_in_date": "2024-01-01T10:00:00Z"
                            }
                        ],
                        "count": 1
                    }
                }
            ),
            401: openapi.Response(
                description="Authentication required",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Authentication required",
                        "error": "You must be logged in to access this resource"
                    }
                }
            ),
            403: openapi.Response(
                description="Admin access required",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Admin access required",
                        "error": "You do not have permission to access this resource"
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Failed to retrieve checked-in guests",
                        "error": "Internal server error"
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def get(self, request, *args, **kwargs):
        """Get all checked-in guests with proper error handling"""
        try:
            # Check if user has admin permissions
            if not request.user.is_staff:
                return Response({
                    'success': False,
                    'message': 'Admin access required',
                    'error': 'You do not have permission to access this resource'
                }, status=status.HTTP_403_FORBIDDEN)
            
            checked_in_guests = CheckIn.objects.order_by('-id')
            serializer = CheckinSerializer(checked_in_guests, many=True)
            
            return Response({
                'success': True,
                'message': 'Checked-in guests retrieved successfully',
                'data': serializer.data,
                'count': checked_in_guests.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving checked-in guests: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve checked-in guests',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserBookingsView(APIView):
    """
    Get bookings for the authenticated user
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Get all bookings for the currently authenticated user",
        operation_summary="Get User Bookings",
        responses={
            200: openapi.Response(
                description="User bookings retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Bookings retrieved successfully",
                        "data": [
                            {
                                "id": 1,
                                "room_title": "Ocean View Deluxe",
                                "room_slug": "ocean-view-deluxe",
                                "booking_date": "2024-01-01T10:00:00Z",
                                "checking_date": "2024-01-01T15:00:00Z",
                                "checkout_date": "2024-01-03T11:00:00Z",
                                "phone_number": "+1234567890",
                                "email": "user@example.com",
                                "status": "confirmed",
                                "total_amount": "500.00"
                            }
                        ],
                        "count": 1
                    }
                }
            ),
            401: openapi.Response(
                description="Authentication required",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Authentication required",
                        "error": "You must be logged in to view your bookings"
                    }
                }
            ),
            500: openapi.Response(
                description="Internal server error",
                examples={
                    "application/json": {
                        "success": False,
                        "message": "Failed to retrieve bookings",
                        "error": "Internal server error"
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def get(self, request, *args, **kwargs):
        """Get user bookings with proper error handling"""
        try:
            # Get all bookings for the authenticated user
            user_bookings = Booking.objects.filter(customer=request.user).order_by('-booking_date')
            
            # Prepare booking data with room information
            bookings_data = []
            for booking in user_bookings:
                booking_info = {
                    'id': booking.id,
                    'room_title': booking.room.title,
                    'room_slug': booking.room.room_slug,
                    'room_category': booking.room.category.category_name if booking.room.category else '',
                    'booking_date': booking.booking_date,
                    'checking_date': booking.checking_date,
                    'checkout_date': booking.checkout_date,
                    'phone_number': booking.phone_number,
                    'email': booking.email,
                    'status': booking.status,
                    'status_display': booking.display_status,
                    'payment_status': booking.payment_status,
                    'total_amount': str(booking.total_amount) if booking.total_amount else None,
                    'nights_count': booking.nights_count,
                    'payment_due_date': booking.payment_due_date.isoformat() if booking.payment_due_date else None,
                    'can_be_cancelled': booking.can_be_cancelled,
                    'room_price': str(booking.room.price_per_night),
                    'room_image': booking.room.cover_image.url if booking.room.cover_image else '/media/default/room_default.jpg'
                }
                bookings_data.append(booking_info)
            
            return Response({
                'success': True,
                'message': 'Bookings retrieved successfully',
                'data': bookings_data,
                'count': len(bookings_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving bookings for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve bookings',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoomAvailabilityView(APIView):
    """
    Check room availability for specific dates
    """
    
    @swagger_auto_schema(
        operation_description="Check room availability for specific dates",
        operation_summary="Check Room Availability",
        manual_parameters=[
            openapi.Parameter(
                'check_in',
                openapi.IN_QUERY,
                description="Check-in date (YYYY-MM-DD)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE,
                required=True
            ),
            openapi.Parameter(
                'check_out',
                openapi.IN_QUERY,
                description="Check-out date (YYYY-MM-DD)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE,
                required=True
            ),
            openapi.Parameter(
                'room_id',
                openapi.IN_QUERY,
                description="Specific room ID (optional)",
                type=openapi.TYPE_INTEGER,
                required=False
            ),
        ],
        responses={
            200: openapi.Response(
                description="Room availability information",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Room availability checked successfully",
                        "data": {
                            "available_rooms": [1, 2, 3],
                            "unavailable_rooms": [4, 5],
                            "total_rooms": 5,
                            "available_count": 3
                        }
                    }
                }
            )
        },
        tags=['Room Management']
    )
    def get(self, request, *args, **kwargs):
        """Check room availability for given dates"""
        try:
            check_in = request.query_params.get('check_in')
            check_out = request.query_params.get('check_out')
            room_id = request.query_params.get('room_id')
            
            if not check_in or not check_out:
                return Response({
                    'success': False,
                    'message': 'Missing required parameters',
                    'error': 'check_in and check_out dates are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from datetime import datetime
            try:
                check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
                check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
            except ValueError:
                return Response({
                    'success': False,
                    'message': 'Invalid date format',
                    'error': 'Dates must be in YYYY-MM-DD format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if check_in_date >= check_out_date:
                return Response({
                    'success': False,
                    'message': 'Invalid date range',
                    'error': 'Check-out date must be after check-in date'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all rooms or specific room
            if room_id:
                rooms = Room.objects.filter(id=room_id)
            else:
                rooms = Room.objects.all()
            
            available_rooms = []
            unavailable_rooms = []
            
            for room in rooms:
                # Check for overlapping bookings
                overlapping_bookings = Booking.objects.filter(
                    room=room,
                    status__in=['confirmed', 'checked_in', 'awaiting_approval', 'pending']
                ).filter(
                    checking_date__lt=check_out_date,
                    checkout_date__gt=check_in_date
                )
                
                if overlapping_bookings.exists():
                    unavailable_rooms.append({
                        'id': room.id,
                        'title': room.title,
                        'reason': 'Already booked for selected dates'
                    })
                else:
                    available_rooms.append({
                        'id': room.id,
                        'title': room.title,
                        'price_per_night': str(room.price_per_night),
                        'capacity': room.capacity
                    })
            
            return Response({
                'success': True,
                'message': 'Room availability checked successfully',
                'data': {
                    'check_in': check_in,
                    'check_out': check_out,
                    'available_rooms': available_rooms,
                    'unavailable_rooms': unavailable_rooms,
                    'total_rooms': len(rooms),
                    'available_count': len(available_rooms),
                    'unavailable_count': len(unavailable_rooms)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking room availability: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to check room availability',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingDetailView(APIView):
    """
    Get detailed booking information for user
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Get detailed booking information",
        operation_summary="Get Booking Details",
        responses={
            200: openapi.Response(
                description="Booking details retrieved successfully"
            ),
            404: openapi.Response(
                description="Booking not found"
            )
        },
        tags=['Booking Management']
    )
    def get(self, request, booking_id, *args, **kwargs):
        """Get detailed booking information"""
        try:
            booking = get_object_or_404(
                Booking, 
                id=booking_id, 
                customer=request.user
            )
            
            # Get related payment information if exists
            payment_info = None
            try:
                from .models import Payment
                payment = Payment.objects.filter(booking=booking).first()
                if payment:
                    payment_info = {
                        'transaction_id': payment.transaction_id,
                        'amount': str(payment.amount),
                        'status': payment.status,
                        'payment_method': payment.payment_method,
                        'created_at': payment.created_at.isoformat()
                    }
            except:
                pass
            
            booking_data = {
                'id': booking.id,
                'room': {
                    'id': booking.room.id,
                    'title': booking.room.title,
                    'price_per_night': str(booking.room.price_per_night),
                    'capacity': booking.room.capacity,
                    'cover_image': booking.room.cover_image.url if booking.room.cover_image else None
                },
                'customer': {
                    'username': booking.customer.username,
                    'email': booking.customer.email
                },
                'booking_date': booking.booking_date.isoformat(),
                'checking_date': booking.checking_date.isoformat() if booking.checking_date else None,
                'checkout_date': booking.checkout_date.isoformat() if booking.checkout_date else None,
                'nights_count': booking.nights_count,
                'phone_number': booking.phone_number,
                'email': booking.email,
                'status': booking.status,
                'status_display': booking.display_status,
                'payment_status': booking.payment_status,
                'total_amount': str(booking.total_amount) if booking.total_amount else None,
                'special_requests': booking.special_requests,
                'can_be_cancelled': booking.can_be_cancelled,
                'payment_due_date': booking.payment_due_date.isoformat() if booking.payment_due_date else None,
                'payment_info': payment_info,
                'notes': booking.notes
            }
            
            return Response({
                'success': True,
                'message': 'Booking details retrieved successfully',
                'data': booking_data
            }, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Booking not found',
                'error': 'No booking found with the provided ID'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error retrieving booking details for ID {booking_id}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve booking details',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingCancellationRequestView(APIView):
    """
    Request booking cancellation
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_description="Request booking cancellation",
        operation_summary="Request Booking Cancellation",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'reason': openapi.Schema(type=openapi.TYPE_STRING, description='Cancellation reason'),
            },
            example={
                "reason": "Emergency - cannot travel"
            }
        ),
        responses={
            200: openapi.Response(
                description="Cancellation requested successfully"
            ),
            400: openapi.Response(
                description="Cannot cancel booking"
            )
        },
        tags=['Booking Management']
    )
    def post(self, request, booking_id, *args, **kwargs):
        """Request booking cancellation"""
        try:
            booking = get_object_or_404(
                Booking, 
                id=booking_id, 
                customer=request.user
            )
            
            if not booking.can_be_cancelled:
                return Response({
                    'success': False,
                    'message': 'Booking cannot be cancelled',
                    'error': 'This booking cannot be cancelled at this time. Please contact support.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if booking.status in ['cancelled', 'cancellation_requested']:
                return Response({
                    'success': False,
                    'message': 'Booking already cancelled or cancellation already requested',
                    'error': 'This booking is already in cancellation process'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update booking status to request cancellation
            booking.status = 'cancellation_requested'
            booking.cancellation_reason = request.data.get('reason', 'No reason provided')
            booking.cancellation_requested_date = timezone.now()
            booking.save()
            
            # Send email notification for booking cancellation
            try:
                send_booking_cancellation_email(booking, booking.cancellation_reason)
            except Exception as email_error:
                # Log email error but don't fail the cancellation
                logger.error(f"Failed to send booking cancellation email for booking {booking.id}: {str(email_error)}")
            
            logger.info(f"Cancellation requested for booking {booking_id} by user {request.user.id}")
            
            return Response({
                'success': True,
                'message': 'Cancellation request submitted successfully',
                'data': {
                    'booking_id': booking.id,
                    'status': booking.status,
                    'cancellation_reason': booking.cancellation_reason
                }
            }, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Booking not found',
                'error': 'No booking found with the provided ID'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error requesting cancellation for booking {booking_id}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to request cancellation',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
