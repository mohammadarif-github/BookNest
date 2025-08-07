from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging

from .models import Room, Booking, CheckIn, UserRole, User, GuestProfile
from .serializer import (
    BookingSerializer, 
    RoomDetailSerializer, 
    UserRoleSerializer,
    UserSerializer,
    GuestProfileSerializer
)
from .permissions import IsManagerOrAdmin, IsAdminUser, get_user_role

logger = logging.getLogger(__name__)


class ManagerDashboardView(APIView):
    """
    Manager Dashboard - Overview of hotel operations
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get comprehensive dashboard data for managers",
        operation_summary="Manager Dashboard Overview",
        responses={
            200: openapi.Response(
                description="Dashboard data retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Dashboard data retrieved successfully",
                        "data": {
                            "overview": {
                                "total_rooms": 50,
                                "booked_rooms": 25,
                                "available_rooms": 25,
                                "pending_bookings": 5,
                                "checked_in_guests": 20
                            },
                            "recent_bookings": [],
                            "room_status": []
                        }
                    }
                }
            )
        },
        tags=['Management Dashboard']
    )
    def get(self, request):
        """Get manager dashboard overview"""
        try:
            # Overview statistics
            total_rooms = Room.objects.count()
            booked_rooms = Room.objects.filter(is_booked=True).count()
            available_rooms = total_rooms - booked_rooms
            pending_bookings = Booking.objects.filter(status='pending').count()
            checked_in_guests = Booking.objects.filter(status='checked_in').count()
            confirmed_bookings = Booking.objects.filter(status='confirmed').count()
            
            # Additional metrics for manager
            total_bookings_today = Booking.objects.filter(booking_date__date=timezone.now().date()).count()
            revenue_this_month = Booking.objects.filter(
                status__in=['confirmed', 'checked_in', 'checked_out'],
                booking_date__month=timezone.now().month,
                booking_date__year=timezone.now().year
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Recent bookings (last 10)
            recent_bookings = Booking.objects.select_related(
                'customer', 'room', 'room__category'
            ).order_by('-booking_date')[:10]
            
            # Room status breakdown
            room_status = Room.objects.select_related('category').all()
            
            # Current guests information
            current_guests = Booking.objects.filter(
                status='checked_in'
            ).select_related('customer', 'room', 'room__category')
            
            # Bookings pending approval
            pending_approvals = Booking.objects.filter(
                status='pending'
            ).select_related('customer', 'room', 'room__category')
            
            dashboard_data = {
                'overview': {
                    'total_rooms': total_rooms,
                    'booked_rooms': booked_rooms,
                    'available_rooms': available_rooms,
                    'pending_bookings': pending_bookings,
                    'checked_in_guests': checked_in_guests,
                    'confirmed_bookings': confirmed_bookings,
                    'total_bookings_today': total_bookings_today,
                    'revenue_this_month': float(revenue_this_month),
                    'occupancy_rate': round((booked_rooms / total_rooms * 100), 2) if total_rooms > 0 else 0
                },
                'recent_bookings': BookingSerializer(recent_bookings, many=True).data,
                'room_status': RoomDetailSerializer(room_status, many=True).data,
                'current_guests': BookingSerializer(current_guests, many=True).data,
                'pending_approvals': BookingSerializer(pending_approvals, many=True).data
            }
            
            return Response({
                'success': True,
                'message': 'Dashboard data retrieved successfully',
                'data': dashboard_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving dashboard data: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve dashboard data',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingManagementView(APIView):
    """
    Booking Management - Confirm/Cancel bookings
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get all bookings with filtering options",
        operation_summary="Get All Bookings",
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by booking status", type=openapi.TYPE_STRING),
            openapi.Parameter('date_from', openapi.IN_QUERY, description="Filter from date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('date_to', openapi.IN_QUERY, description="Filter to date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response(
                description="Bookings retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Bookings retrieved successfully",
                        "data": [],
                        "count": 0
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def get(self, request):
        """Get all bookings with filtering"""
        try:
            bookings = Booking.objects.select_related(
                'customer', 'room', 'room__category', 'approved_by'
            ).order_by('-booking_date')
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                bookings = bookings.filter(status=status_filter)
            
            date_from = request.query_params.get('date_from')
            if date_from:
                bookings = bookings.filter(booking_date__date__gte=date_from)
            
            date_to = request.query_params.get('date_to')
            if date_to:
                bookings = bookings.filter(booking_date__date__lte=date_to)
            
            serializer = BookingSerializer(bookings, many=True)
            
            return Response({
                'success': True,
                'message': 'Bookings retrieved successfully',
                'data': serializer.data,
                'count': bookings.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving bookings: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve bookings',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Update booking status (confirm/cancel)",
        operation_summary="Update Booking Status",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['booking_id', 'action'],
            properties={
                'booking_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Booking ID'),
                'action': openapi.Schema(type=openapi.TYPE_STRING, description='Action: confirm or cancel'),
                'reason': openapi.Schema(type=openapi.TYPE_STRING, description='Reason for action (optional)'),
            }
        ),
        responses={
            200: openapi.Response(
                description="Booking status updated successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Booking confirmed successfully",
                        "data": {}
                    }
                }
            )
        },
        tags=['Booking Management']
    )
    def patch(self, request):
        """Update booking status"""
        try:
            booking_id = request.data.get('booking_id')
            action = request.data.get('action')
            reason = request.data.get('reason', '')
            
            if not booking_id or not action:
                return Response({
                    'success': False,
                    'message': 'Booking ID and action are required',
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            booking = get_object_or_404(Booking, id=booking_id)
            
            if action == 'confirm':
                booking.status = 'confirmed'
                booking.approved_by = request.user
                booking.approval_date = timezone.now()
                booking.total_amount = booking.calculate_total_amount()
                message = 'Booking confirmed successfully'
                
                # Mark room as booked
                booking.room.is_booked = True
                booking.room.save()
                
            elif action == 'cancel':
                booking.status = 'cancelled'
                booking.approved_by = request.user
                booking.approval_date = timezone.now()
                message = 'Booking cancelled successfully'
                
                # Free up the room if it was booked
                booking.room.is_booked = False
                booking.room.save()
                
            else:
                return Response({
                    'success': False,
                    'message': 'Invalid action. Use "confirm" or "cancel"',
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            booking.save()
            
            return Response({
                'success': True,
                'message': message,
                'data': {
                    'booking_id': booking.id,
                    'new_status': booking.status,
                    'approved_by': request.user.username
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating booking status: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to update booking status',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoomManagementView(APIView):
    """
    Room Management - View all rooms with guest information
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get all rooms with current guest information",
        operation_summary="Get All Rooms with Guest Info",
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by room status: available, booked", type=openapi.TYPE_STRING),
            openapi.Parameter('category', openapi.IN_QUERY, description="Filter by room category", type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response(
                description="Rooms retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Rooms retrieved successfully",
                        "data": [],
                        "count": 0
                    }
                }
            )
        },
        tags=['Room Management']
    )
    def get(self, request):
        """Get all rooms with guest information"""
        try:
            rooms = Room.objects.select_related('category').prefetch_related('checkin_set').all()
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter == 'available':
                rooms = rooms.filter(is_booked=False)
            elif status_filter == 'booked':
                rooms = rooms.filter(is_booked=True)
            
            category_filter = request.query_params.get('category')
            if category_filter:
                rooms = rooms.filter(category__category_name__icontains=category_filter)
            
            serializer = RoomDetailSerializer(rooms, many=True)
            
            return Response({
                'success': True,
                'message': 'Rooms retrieved successfully',
                'data': serializer.data,
                'count': rooms.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving rooms: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve rooms',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_description="Create a new room",
        operation_summary="Create New Room",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['title', 'category_id', 'price_per_night', 'capacity', 'room_size'],
            properties={
                'title': openapi.Schema(type=openapi.TYPE_STRING, description='Room title'),
                'category_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Category ID'),
                'price_per_night': openapi.Schema(type=openapi.TYPE_NUMBER, description='Price per night'),
                'capacity': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room capacity'),
                'room_size': openapi.Schema(type=openapi.TYPE_STRING, description='Room size (e.g., 30m²)'),
                'description': openapi.Schema(type=openapi.TYPE_STRING, description='Room description'),
                'featured': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Is featured room', default=False),
                'cover_image': openapi.Schema(type=openapi.TYPE_FILE, description='Room cover image (optional)'),
            }
        ),
        responses={
            201: openapi.Response(description="Room created successfully"),
            400: openapi.Response(description="Bad request - validation errors")
        },
        tags=['Room Management']
    )
    def post(self, request):
        """Create a new room"""
        try:
            from django.utils.text import slugify
            from hotel_app.models import Category
            
            data = request.data
            
            # Validate required fields
            required_fields = ['title', 'category_id', 'price_per_night', 'capacity', 'room_size']
            for field in required_fields:
                if field not in data or not data[field]:
                    return Response({
                        'success': False,
                        'message': f'Field {field} is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate category exists
            try:
                category = Category.objects.get(id=data['category_id'])
            except Category.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Invalid category ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate slug from title
            room_slug = slugify(data['title'])
            
            # Check if slug already exists
            if Room.objects.filter(room_slug=room_slug).exists():
                counter = 1
                while Room.objects.filter(room_slug=f"{room_slug}-{counter}").exists():
                    counter += 1
                room_slug = f"{room_slug}-{counter}"
            
            # Handle cover image
            cover_image = request.FILES.get('cover_image')
            default_image = '/media/default/room_default.jpg'
            
            # Create room
            room = Room.objects.create(
                title=data['title'],
                room_slug=room_slug,
                category=category,
                price_per_night=data['price_per_night'],
                capacity=data['capacity'],
                room_size=data['room_size'],
                description=data.get('description', ''),
                featured=data.get('featured', False),
                cover_image=cover_image if cover_image else default_image
            )
            
            serializer = RoomDetailSerializer(room)
            
            return Response({
                'success': True,
                'message': 'Room created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating room: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to create room',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_description="Update an existing room",
        operation_summary="Update Room",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['room_id'],
            properties={
                'room_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room ID to update'),
                'title': openapi.Schema(type=openapi.TYPE_STRING, description='Room title'),
                'category_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Category ID'),
                'price_per_night': openapi.Schema(type=openapi.TYPE_NUMBER, description='Price per night'),
                'capacity': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room capacity'),
                'room_size': openapi.Schema(type=openapi.TYPE_STRING, description='Room size'),
                'description': openapi.Schema(type=openapi.TYPE_STRING, description='Room description'),
                'featured': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Is featured room'),
            }
        ),
        responses={
            200: openapi.Response(description="Room updated successfully"),
            404: openapi.Response(description="Room not found")
        },
        tags=['Room Management']
    )
    def put(self, request, room_id=None):
        """Update an existing room"""
        try:
            from hotel_app.models import Category
            
            data = request.data
            
            # Get room_id from URL parameter if not in data
            if not room_id:
                room_id = data.get('room_id')
            
            if not room_id:
                return Response({
                    'success': False,
                    'message': 'Room ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                room = Room.objects.get(id=room_id)
            except Room.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Room not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Update fields if provided
            if 'title' in data:
                room.title = data['title']
            if 'category_id' in data:
                try:
                    category = Category.objects.get(id=data['category_id'])
                    room.category = category
                except Category.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'Invalid category ID'
                    }, status=status.HTTP_400_BAD_REQUEST)
            if 'price_per_night' in data:
                room.price_per_night = data['price_per_night']
            if 'capacity' in data:
                room.capacity = data['capacity']
            if 'room_size' in data:
                room.room_size = data['room_size']
            if 'description' in data:
                room.description = data['description']
            if 'featured' in data:
                room.featured = data['featured']
            
            # Handle cover image update
            cover_image = request.FILES.get('cover_image')
            if cover_image:
                room.cover_image = cover_image
            
            room.save()
            
            serializer = RoomDetailSerializer(room)
            
            return Response({
                'success': True,
                'message': 'Room updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating room: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to update room',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_description="Delete a room",
        operation_summary="Delete Room",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['room_id'],
            properties={
                'room_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Room ID to delete'),
            }
        ),
        responses={
            200: openapi.Response(description="Room deleted successfully"),
            404: openapi.Response(description="Room not found"),
            400: openapi.Response(description="Cannot delete room with active bookings")
        },
        tags=['Room Management']
    )
    def delete(self, request, room_id=None):
        """Delete a room (only if no active bookings)"""
        try:
            data = request.data
            
            # Get room_id from URL parameter if not in data
            if not room_id:
                room_id = data.get('room_id')
            
            if not room_id:
                return Response({
                    'success': False,
                    'message': 'Room ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                room = Room.objects.get(id=room_id)
            except Room.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Room not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if room has active bookings
            if room.is_booked:
                return Response({
                    'success': False,
                    'message': 'Cannot delete room with active bookings. Please check out guests first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for pending bookings
            from hotel_app.models import Booking
            pending_bookings = Booking.objects.filter(room=room, status='pending')
            if pending_bookings.exists():
                return Response({
                    'success': False,
                    'message': 'Cannot delete room with pending bookings. Please cancel pending bookings first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            room_title = room.title
            room.delete()
            
            return Response({
                'success': True,
                'message': f'Room "{room_title}" deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting room: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to delete room',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StaffManagementView(APIView):
    """
    Staff Management - Admin only feature to assign manager roles
    """
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        operation_description="Get all staff members and their roles",
        operation_summary="Get All Staff Members",
        responses={
            200: openapi.Response(
                description="Staff members retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Staff members retrieved successfully",
                        "data": [],
                        "count": 0
                    }
                }
            )
        },
        tags=['Staff Management']
    )
    def get(self, request):
        """Get all staff members"""
        try:
            staff_users = User.objects.filter(
                Q(is_staff=True) | Q(booknest_role__role__in=['admin', 'manager', 'staff'])
            ).distinct().select_related('booknest_role')
            
            serializer = UserSerializer(staff_users, many=True)
            
            return Response({
                'success': True,
                'message': 'Staff members retrieved successfully',
                'data': serializer.data,
                'count': staff_users.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving staff members: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve staff members',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Assign manager role to staff member",
        operation_summary="Assign Manager Role",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id', 'role'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID'),
                'role': openapi.Schema(type=openapi.TYPE_STRING, description='Role: manager, staff, admin'),
                'department': openapi.Schema(type=openapi.TYPE_STRING, description='Department (optional)'),
            }
        ),
        responses={
            200: openapi.Response(
                description="Role assigned successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Manager role assigned successfully",
                        "data": {}
                    }
                }
            )
        },
        tags=['Staff Management']
    )
    def post(self, request):
        """Assign role to staff member"""
        try:
            user_id = request.data.get('user_id')
            role = request.data.get('role')
            department = request.data.get('department', '')
            
            if not user_id or not role:
                return Response({
                    'success': False,
                    'message': 'User ID and role are required',
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if role not in ['admin', 'manager', 'staff']:
                return Response({
                    'success': False,
                    'message': 'Invalid role. Use admin, manager, or staff',
                    'error': 'Invalid role'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Only admin can assign manager or admin roles
            user_role = get_user_role(request.user)
            if role in ['manager', 'admin'] and user_role != 'admin':
                return Response({
                    'success': False,
                    'message': 'Only administrators can assign manager or admin roles',
                    'error': 'Insufficient permissions'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = get_object_or_404(User, id=user_id)
            
            # Create or update user role
            user_role, created = UserRole.objects.get_or_create(
                user=user,
                defaults={
                    'role': role,
                    'department': department,
                    'assigned_by': request.user,
                    'is_active': True
                }
            )
            
            if not created:
                user_role.role = role
                user_role.department = department
                user_role.assigned_by = request.user
                user_role.is_active = True
                user_role.save()
            
            # Update user's staff status if needed
            if role in ['admin', 'manager']:
                user.is_staff = True
                user.save()
            
            return Response({
                'success': True,
                'message': f'{role.title()} role assigned successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'role': role,
                    'department': department
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error assigning role: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to assign role',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            user = get_object_or_404(User, id=user_id)
            
            # Create or update user role
            user_role, created = UserRole.objects.get_or_create(
                user=user,
                defaults={
                    'role': role,
                    'department': department,
                    'assigned_by': request.user,
                    'is_active': True
                }
            )
            
            if not created:
                user_role.role = role
                user_role.department = department
                user_role.assigned_by = request.user
                user_role.is_active = True
                user_role.save()
            
            # Update user's staff status if needed
            if role in ['admin', 'manager']:
                user.is_staff = True
                user.save()
            
            return Response({
                'success': True,
                'message': f'{role.title()} role assigned successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'role': role,
                    'department': department
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error assigning role: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to assign role',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuestManagementView(APIView):
    """
    Guest Management - View all guests and their information
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get all guests with their booking history",
        operation_summary="Get All Guests",
        manual_parameters=[
            openapi.Parameter('search', openapi.IN_QUERY, description="Search by name or email", type=openapi.TYPE_STRING),
            openapi.Parameter('vip_only', openapi.IN_QUERY, description="Filter VIP guests only", type=openapi.TYPE_BOOLEAN),
        ],
        responses={
            200: openapi.Response(
                description="Guests retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Guests retrieved successfully",
                        "data": [],
                        "count": 0
                    }
                }
            )
        },
        tags=['Guest Management']
    )
    def get(self, request):
        """Get all guests with their information"""
        try:
            # Get all users who have made bookings
            guest_users = User.objects.filter(
                booking__isnull=False
            ).distinct().prefetch_related('booking_set', 'guest_profile')
            
            # Apply search filter
            search = request.query_params.get('search')
            if search:
                guest_users = guest_users.filter(
                    Q(username__icontains=search) |
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            
            # Filter VIP guests
            vip_only = request.query_params.get('vip_only')
            if vip_only and vip_only.lower() == 'true':
                guest_users = guest_users.filter(guest_profile__vip_status=True)
            
            # Prepare guest data with booking statistics
            guests_data = []
            for user in guest_users:
                bookings = user.booking_set.all()
                guest_info = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'date_joined': user.date_joined,
                    'total_bookings': bookings.count(),
                    'completed_stays': bookings.filter(status='checked_out').count(),
                    'pending_bookings': bookings.filter(status='pending').count(),
                    'confirmed_bookings': bookings.filter(status='confirmed').count(),
                    'current_booking': None,
                    'guest_profile': None
                }
                
                # Current booking (if checked in)
                current_booking = bookings.filter(status='checked_in').first()
                if current_booking:
                    guest_info['current_booking'] = {
                        'room_title': current_booking.room.title,
                        'room_category': current_booking.room.category.category_name,
                        'checking_date': current_booking.checking_date,
                        'checkout_date': current_booking.checkout_date,
                        'booking_id': current_booking.id
                    }
                
                # Guest profile information
                if hasattr(user, 'guest_profile'):
                    guest_info['guest_profile'] = GuestProfileSerializer(user.guest_profile).data
                
                guests_data.append(guest_info)
            
            return Response({
                'success': True,
                'message': 'Guests retrieved successfully',
                'data': guests_data,
                'count': len(guests_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving guests: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve guests',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminDashboardView(APIView):
    """
    Admin Dashboard - Comprehensive overview including manager assignment
    """
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        operation_description="Get comprehensive admin dashboard data",
        operation_summary="Admin Dashboard Overview",
        responses={
            200: openapi.Response(
                description="Admin dashboard data retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Admin dashboard data retrieved successfully",
                        "data": {
                            "overview": {},
                            "staff_overview": {},
                            "recent_activities": []
                        }
                    }
                }
            )
        },
        tags=['Admin Management']
    )
    def get(self, request):
        """Get admin dashboard overview"""
        try:
            # All manager dashboard data
            manager_dashboard = ManagerDashboardView()
            manager_response = manager_dashboard.get(request)
            manager_data = manager_response.data['data']
            
            # Additional admin-specific metrics
            total_staff = UserRole.objects.filter(role__in=['admin', 'manager', 'staff'], is_active=True).count()
            total_managers = UserRole.objects.filter(role='manager', is_active=True).count()
            total_admins = UserRole.objects.filter(role='admin', is_active=True).count()
            total_guests = User.objects.filter(booking__isnull=False).distinct().count()
            
            # Recent role assignments
            recent_assignments = UserRole.objects.filter(
                assigned_by__isnull=False
            ).select_related('user', 'assigned_by').order_by('-assigned_date')[:10]
            
            # Staff overview
            staff_members = UserRole.objects.filter(
                role__in=['admin', 'manager', 'staff'],
                is_active=True
            ).select_related('user', 'assigned_by')
            
            admin_data = {
                **manager_data,  # Include all manager dashboard data
                'admin_overview': {
                    'total_staff': total_staff,
                    'total_managers': total_managers,
                    'total_admins': total_admins,
                    'total_guests': total_guests,
                },
                'staff_members': UserRoleSerializer(staff_members, many=True).data,
                'recent_assignments': UserRoleSerializer(recent_assignments, many=True).data,
            }
            
            return Response({
                'success': True,
                'message': 'Admin dashboard data retrieved successfully',
                'data': admin_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving admin dashboard data: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve admin dashboard data',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ManagerAssignmentView(APIView):
    """
    Manager Assignment - Admin-only view to assign managers
    """
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        operation_description="Get list of staff members eligible for manager role",
        operation_summary="Get Staff for Manager Assignment",
        responses={
            200: openapi.Response(
                description="Staff members retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Staff members retrieved successfully",
                        "data": []
                    }
                }
            )
        },
        tags=['Admin Management']
    )
    def get(self, request):
        """Get staff members eligible for manager role"""
        try:
            # Get staff members who are not already managers or admins
            eligible_staff = User.objects.filter(
                Q(booknest_role__role='staff') | Q(booknest_role__isnull=True),
                is_active=True
            ).exclude(
                booknest_role__role__in=['admin', 'manager']
            ).select_related('booknest_role')
            
            serializer = UserSerializer(eligible_staff, many=True)
            
            return Response({
                'success': True,
                'message': 'Eligible staff members retrieved successfully',
                'data': serializer.data,
                'count': eligible_staff.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving eligible staff: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve eligible staff',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Assign manager role to staff member (Admin only)",
        operation_summary="Assign Manager Role (Admin Only)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID'),
                'department': openapi.Schema(type=openapi.TYPE_STRING, description='Department (optional)'),
            }
        ),
        responses={
            200: openapi.Response(
                description="Manager role assigned successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Manager role assigned successfully",
                        "data": {}
                    }
                }
            )
        },
        tags=['Admin Management']
    )
    def post(self, request):
        """Assign manager role to staff member (Admin only)"""
        try:
            user_id = request.data.get('user_id')
            department = request.data.get('department', '')
            
            if not user_id:
                return Response({
                    'success': False,
                    'message': 'User ID is required',
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = get_object_or_404(User, id=user_id)
            
            # Check if user is already a manager or admin
            if hasattr(user, 'booknest_role') and user.booknest_role.role in ['admin', 'manager']:
                return Response({
                    'success': False,
                    'message': 'User is already a manager or admin',
                    'error': 'Invalid operation'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create or update user role
            user_role, created = UserRole.objects.get_or_create(
                user=user,
                defaults={
                    'role': 'manager',
                    'department': department,
                    'assigned_by': request.user,
                    'is_active': True
                }
            )
            
            if not created:
                user_role.role = 'manager'
                user_role.department = department
                user_role.assigned_by = request.user
                user_role.is_active = True
                user_role.save()
            
            # Update user's staff status
            user.is_staff = True
            user.save()
            
            return Response({
                'success': True,
                'message': 'Manager role assigned successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'role': 'manager',
                    'department': department,
                    'assigned_by': request.user.username
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error assigning manager role: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to assign manager role',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_description="Remove manager role from user (Admin only)",
        operation_summary="Remove Manager Role (Admin Only)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID'),
            }
        ),
        responses={
            200: openapi.Response(
                description="Manager role removed successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Manager role removed successfully",
                        "data": {}
                    }
                }
            )
        },
        tags=['Admin Management']
    )
    def delete(self, request):
        """Remove manager role from user (Admin only)"""
        try:
            user_id = request.data.get('user_id')
            
            if not user_id:
                return Response({
                    'success': False,
                    'message': 'User ID is required',
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = get_object_or_404(User, id=user_id)
            
            # Check if user has a manager role
            if not hasattr(user, 'booknest_role') or user.booknest_role.role != 'manager':
                return Response({
                    'success': False,
                    'message': 'User is not a manager',
                    'error': 'Invalid operation'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cannot remove admin role through this endpoint
            if user.booknest_role.role == 'admin':
                return Response({
                    'success': False,
                    'message': 'Cannot remove admin role through this endpoint',
                    'error': 'Invalid operation'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update role to staff
            user.booknest_role.role = 'staff'
            user.booknest_role.assigned_by = request.user
            user.booknest_role.save()
            
            return Response({
                'success': True,
                'message': 'Manager role removed successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'new_role': 'staff',
                    'updated_by': request.user.username
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error removing manager role: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to remove manager role',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CategoriesView(APIView):
    """
    Categories Management - Get all room categories
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get all room categories",
        operation_summary="Get All Categories",
        responses={
            200: openapi.Response(
                description="Categories retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Categories retrieved successfully",
                        "data": []
                    }
                }
            )
        },
        tags=['Room Management']
    )
    def get(self, request):
        """Get all room categories"""
        try:
            from hotel_app.models import Category
            from hotel_app.serializer import CategorySerializer
            
            categories = Category.objects.all().order_by('category_name')
            serializer = CategorySerializer(categories, many=True)
            
            return Response({
                'success': True,
                'message': 'Categories retrieved successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving categories: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve categories',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
