import csv
import io
import requests
import os
import logging
from urllib.parse import urlparse
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .models import Room, Category, Booking, Customer, RoomDisplayImages, UserRole, GuestProfile, Payment, CheckIn, CheckOut
from .serializer import RoomSerializer

# Set up logging
logger = logging.getLogger(__name__)


class BulkDataUploadView(APIView):
    """
    Handle bulk data upload via CSV files for different models
    """
    # permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def download_image_from_url(self, image_url, room_slug):
        """
        Download image from URL and save it to media folder
        Returns the saved file path or None if failed
        """
        try:
            # Download the image
            response = requests.get(image_url, stream=True, timeout=10)
            response.raise_for_status()
            
            # Get file extension from URL or default to jpg
            parsed_url = urlparse(image_url)
            file_extension = os.path.splitext(parsed_url.path)[1] or '.jpg'
            
            # Create filename based on room slug
            filename = f"{room_slug}_cover{file_extension}"
            file_path = f"{room_slug}/room_cover/{filename}"
            
            # Save the file
            file_content = ContentFile(response.content)
            saved_path = default_storage.save(file_path, file_content)
            
            return saved_path
            
        except Exception as e:
            print(f"Failed to download image from {image_url}: {str(e)}")
            return None

    @swagger_auto_schema(
        operation_description="Upload CSV files to bulk create records for users, categories, rooms, or bookings",
        operation_summary="Bulk Upload CSV Data",
        manual_parameters=[
            openapi.Parameter(
                'file',
                openapi.IN_FORM,
                description="CSV file to upload",
                type=openapi.TYPE_FILE,
                required=True
            ),
            openapi.Parameter(
                'data_type',
                openapi.IN_FORM,
                description="Type of data to upload",
                type=openapi.TYPE_STRING,
                enum=['users', 'categories', 'rooms', 'bookings', 'user_roles', 'guest_profiles', 'payments', 'checkins', 'checkouts', 'room_images'],
                required=True
            ),
        ],
        responses={
            201: openapi.Response(
                description="Success",
                examples={
                    "application/json": {
                        "message": "Processed 5 users successfully",
                        "created_users": [
                            {"username": "john_doe", "email": "john@example.com", "id": 1}
                        ],
                        "errors": []
                    }
                }
            ),
            400: "Bad Request - Invalid file or data_type"
        },
        tags=['Bulk Operations']
    )
    def post(self, request):
        """Handle bulk data upload with comprehensive error handling"""
        try:
            # Validate file presence
            if 'file' not in request.FILES:
                logger.warning("Bulk upload attempted without file")
                return Response({
                    'success': False,
                    'message': 'No file provided',
                    'error': 'Please select a CSV file to upload'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            csv_file = request.FILES['file']
            data_type = request.data.get('data_type', '').strip().lower()
            
            # Validate file type
            if not csv_file.name.lower().endswith('.csv'):
                logger.warning(f"Invalid file type uploaded: {csv_file.name}")
                return Response({
                    'success': False,
                    'message': 'Invalid file type',
                    'error': 'File must be a CSV (.csv extension required)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate data type
            valid_data_types = ['users', 'categories', 'rooms', 'bookings', 'user_roles', 'guest_profiles', 'payments', 'checkins', 'checkouts', 'room_images']
            if data_type not in valid_data_types:
                logger.warning(f"Invalid data type: {data_type}")
                return Response({
                    'success': False,
                    'message': 'Invalid data type',
                    'error': f'data_type must be one of: {", ".join(valid_data_types)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size (limit to 10MB)
            max_file_size = 10 * 1024 * 1024  # 10MB
            if csv_file.size > max_file_size:
                logger.warning(f"File too large: {csv_file.size} bytes")
                return Response({
                    'success': False,
                    'message': 'File too large',
                    'error': 'CSV file must be smaller than 10MB'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Read and process CSV file
            try:
                file_data = csv_file.read().decode('utf-8')
            except UnicodeDecodeError:
                logger.error("Failed to decode CSV file")
                return Response({
                    'success': False,
                    'message': 'File encoding error',
                    'error': 'CSV file must be UTF-8 encoded'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                csv_data = csv.DictReader(io.StringIO(file_data))
                
                # Check if CSV has data
                first_row = next(csv_data, None)
                if first_row is None:
                    return Response({
                        'success': False,
                        'message': 'Empty CSV file',
                        'error': 'The CSV file contains no data rows'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Reset the CSV reader
                csv_data = csv.DictReader(io.StringIO(file_data))
                
            except csv.Error as e:
                logger.error(f"CSV parsing error: {str(e)}")
                return Response({
                    'success': False,
                    'message': 'CSV format error',
                    'error': f'Invalid CSV format: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process data based on type
            logger.info(f"Processing {data_type} CSV upload by user {request.user.id}")
            
            if data_type == 'users':
                return self._process_users_csv(csv_data)
            elif data_type == 'categories':
                return self._process_categories_csv(csv_data)
            elif data_type == 'rooms':
                return self._process_rooms_csv(csv_data)
            elif data_type == 'bookings':
                return self._process_bookings_csv(csv_data)
            elif data_type == 'user_roles':
                return self._process_user_roles_csv(csv_data)
            elif data_type == 'guest_profiles':
                return self._process_guest_profiles_csv(csv_data)
            elif data_type == 'payments':
                return self._process_payments_csv(csv_data)
            elif data_type == 'checkins':
                return self._process_checkins_csv(csv_data)
            elif data_type == 'checkouts':
                return self._process_checkouts_csv(csv_data)
            elif data_type == 'room_images':
                return self._process_room_images_csv(csv_data)
                
        except MemoryError:
            logger.error("Memory error during CSV processing")
            return Response({
                'success': False,
                'message': 'File too large to process',
                'error': 'The CSV file is too large to process. Please split it into smaller files.'
            }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
            
        except Exception as e:
            logger.error(f"Unexpected error during bulk upload: {str(e)}")
            return Response({
                'success': False,
                'message': 'Bulk upload failed',
                'error': 'An unexpected error occurred while processing the file'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_users_csv(self, csv_data):
        """
        Process CSV for users
        Expected columns: username, email, first_name, last_name, password, is_staff
        """
        created_users = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    username = row.get('username', '').strip()
                    email = row.get('email', '').strip()
                    first_name = row.get('first_name', '').strip()
                    last_name = row.get('last_name', '').strip()
                    password = row.get('password', 'defaultpass123')
                    is_staff = row.get('is_staff', 'False').lower() == 'true'
                    
                    if not username or not email:
                        errors.append(f'Row {row_num}: Username and email are required')
                        continue
                    
                    if User.objects.filter(username=username).exists():
                        errors.append(f'Row {row_num}: Username "{username}" already exists')
                        continue
                    
                    if User.objects.filter(email=email).exists():
                        errors.append(f'Row {row_num}: Email "{email}" already exists')
                        continue
                    
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        password=password,
                        is_staff=is_staff
                    )
                    
                    # Create Customer record
                    Customer.objects.get_or_create(customer=user)
                    
                    created_users.append({
                        'username': username,
                        'email': email,
                        'id': user.id
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_users)} users successfully',
            'created_users': created_users,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_categories_csv(self, csv_data):
        """
        Process CSV for categories
        Expected columns: category_name
        """
        created_categories = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    category_name = row.get('category_name', '').strip()
                    
                    if not category_name:
                        errors.append(f'Row {row_num}: Category name is required')
                        continue
                    
                    category, created = Category.objects.get_or_create(
                        category_name=category_name
                    )
                    
                    if created:
                        created_categories.append({
                            'id': category.id,
                            'category_name': category_name
                        })
                    else:
                        errors.append(f'Row {row_num}: Category "{category_name}" already exists')
                        
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_categories)} categories successfully',
            'created_categories': created_categories,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_rooms_csv(self, csv_data):
        """
        Process CSV for rooms with update-or-create logic and image download support
        Expected columns: title, category_name, price_per_night, capacity, room_size, featured, cover_image_url (optional)
        """
        processed_rooms = []
        errors = []
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    title = row.get('title', '').strip()
                    category_name = row.get('category_name', '').strip()
                    price_per_night = row.get('price_per_night', '').strip()
                    capacity = row.get('capacity', '').strip()
                    room_size = row.get('room_size', '').strip()
                    featured = row.get('featured', 'False').lower() == 'true'
                    cover_image_url = row.get('cover_image_url', '').strip()
                    
                    if not all([title, category_name, price_per_night, capacity, room_size]):
                        errors.append(f'Row {row_num}: All fields except featured and cover_image_url are required')
                        continue
                    
                    try:
                        category, created = Category.objects.get_or_create(category_name=category_name)
                    except Category.DoesNotExist:
                        errors.append(f'Row {row_num}: Category "{category_name}" does not exist')
                        continue
                    
                    # Generate room slug for image naming
                    room_slug = slugify(title)
                    base_slug = room_slug
                    counter = 1
                    while Room.objects.filter(room_slug=room_slug).exclude(title=title).exists():
                        room_slug = f"{base_slug}-{counter}"
                        counter += 1
                    
                    # Handle image download
                    cover_image_path = 'default/room_default.jpg'  # Default fallback
                    if cover_image_url:
                        downloaded_path = self.download_image_from_url(cover_image_url, room_slug)
                        if downloaded_path:
                            cover_image_path = downloaded_path
                        else:
                            errors.append(f'Row {row_num}: Failed to download image from {cover_image_url}, using default')
                    
                    # Check if room with same title already exists
                    existing_room = Room.objects.filter(title=title).first()
                    
                    if existing_room:
                        # Update existing room
                        existing_room.category = category
                        existing_room.price_per_night = float(price_per_night)
                        existing_room.capacity = int(capacity)
                        existing_room.room_size = room_size
                        existing_room.featured = featured
                        
                        # Update image only if new one was downloaded
                        if cover_image_url and cover_image_path != 'default/room_default.jpg':
                            existing_room.cover_image = cover_image_path
                        
                        existing_room.save()
                        
                        processed_rooms.append({
                            'id': existing_room.id,
                            'title': title,
                            'room_slug': existing_room.room_slug,
                            'category': category_name,
                            'price_per_night': float(price_per_night),
                            'cover_image_url': cover_image_url if cover_image_url else 'default',
                            'image_downloaded': cover_image_path != 'default/room_default.jpg',
                            'action': 'updated'
                        })
                        updated_count += 1
                    else:
                        # Create new room
                        room = Room.objects.create(
                            title=title,
                            category=category,
                            price_per_night=float(price_per_night),
                            room_slug=room_slug,
                            capacity=int(capacity),
                            room_size=room_size,
                            featured=featured,
                            is_booked=False,
                            cover_image=cover_image_path
                        )
                        
                        processed_rooms.append({
                            'id': room.id,
                            'title': title,
                            'room_slug': room_slug,
                            'category': category_name,
                            'price_per_night': float(price_per_night),
                            'cover_image_url': cover_image_url if cover_image_url else 'default',
                            'image_downloaded': cover_image_path != 'default/room_default.jpg',
                            'action': 'created'
                        })
                        created_count += 1
                    
                except ValueError as e:
                    errors.append(f'Row {row_num}: Invalid number format - {str(e)}')
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(processed_rooms)} rooms - {created_count} created, {updated_count} updated',
            'created_count': created_count,
            'updated_count': updated_count,
            'processed_rooms': processed_rooms,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_bookings_csv(self, csv_data):
        """
        Process CSV for bookings
        Expected columns: customer_username, room_title, phone_number, email, checking_date, checkout_date
        (Also supports: username, room_slug for backward compatibility)
        """
        created_bookings = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    # Support both formats: new (customer_username, room_title) and old (username, room_slug)
                    username = row.get('customer_username', '').strip() or row.get('username', '').strip()
                    room_identifier = row.get('room_title', '').strip() or row.get('room_slug', '').strip()
                    phone_number = row.get('phone_number', '').strip()
                    email = row.get('email', '').strip()
                    checking_date = row.get('checking_date', '').strip()
                    checkout_date = row.get('checkout_date', '').strip()
                    
                    if not all([username, room_identifier, email]):
                        errors.append(f'Row {row_num}: Customer username, room identifier, and email are required')
                        continue
                    
                    try:
                        user = User.objects.get(username=username)
                    except User.DoesNotExist:
                        errors.append(f'Row {row_num}: User "{username}" does not exist')
                        continue
                    
                    # Try to find room by title first (new format), then by slug (old format)
                    room = None
                    try:
                        room = Room.objects.get(title=room_identifier)
                    except Room.DoesNotExist:
                        try:
                            room = Room.objects.get(room_slug=room_identifier)
                        except Room.DoesNotExist:
                            errors.append(f'Row {row_num}: Room "{room_identifier}" not found (tried both title and slug)')
                            continue
                    
                    booking = Booking.objects.create(
                        customer=user,
                        room=room,
                        phone_number=phone_number,
                        email=email
                    )
                    
                    # Set dates if provided - handle multiple date formats
                    if checking_date:
                        from datetime import datetime
                        try:
                            # Try with timezone info first (your exported format)
                            if '+' in checking_date:
                                # Remove timezone info for parsing
                                checking_date_clean = checking_date.split('+')[0]
                                booking.checking_date = datetime.strptime(checking_date_clean, '%Y-%m-%d %H:%M:%S')
                            else:
                                # Standard format without timezone
                                booking.checking_date = datetime.strptime(checking_date, '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            try:
                                # Try simple date format
                                booking.checking_date = datetime.strptime(checking_date, '%Y-%m-%d')
                            except ValueError:
                                errors.append(f'Row {row_num}: Invalid checking_date format "{checking_date}"')
                                continue
                    
                    if checkout_date:
                        from datetime import datetime
                        try:
                            # Try with timezone info first (your exported format)
                            if '+' in checkout_date:
                                # Remove timezone info for parsing
                                checkout_date_clean = checkout_date.split('+')[0]
                                booking.checkout_date = datetime.strptime(checkout_date_clean, '%Y-%m-%d %H:%M:%S')
                            else:
                                # Standard format without timezone
                                booking.checkout_date = datetime.strptime(checkout_date, '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            try:
                                # Try simple date format
                                booking.checkout_date = datetime.strptime(checkout_date, '%Y-%m-%d')
                            except ValueError:
                                errors.append(f'Row {row_num}: Invalid checkout_date format "{checkout_date}"')
                                continue
                    
                    booking.save()
                    
                    created_bookings.append({
                        'id': booking.id,
                        'customer': username,
                        'room': room.title,
                        'room_slug': room.room_slug,
                        'email': email
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_bookings)} bookings successfully',
            'created_bookings': created_bookings,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_user_roles_csv(self, csv_data):
        """
        Process CSV for user roles
        Expected columns: username, role, department, is_active
        """
        created_roles = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    username = row.get('username', '').strip()
                    role = row.get('role', 'guest').strip()
                    department = row.get('department', '').strip()
                    is_active = row.get('is_active', 'True').lower() == 'true'
                    
                    if not username:
                        errors.append(f'Row {row_num}: Username is required')
                        continue
                    
                    try:
                        user = User.objects.get(username=username)
                    except User.DoesNotExist:
                        errors.append(f'Row {row_num}: User "{username}" does not exist')
                        continue
                    
                    # Create or update user role
                    user_role, created = UserRole.objects.update_or_create(
                        user=user,
                        defaults={
                            'role': role,
                            'department': department,
                            'is_active': is_active,
                            'assigned_by': None  # Can be set if needed
                        }
                    )
                    
                    created_roles.append({
                        'id': user_role.id,
                        'username': username,
                        'role': role,
                        'created': created
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_roles)} user roles successfully',
            'created_roles': created_roles,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_guest_profiles_csv(self, csv_data):
        """
        Process CSV for guest profiles
        Expected columns: username, phone_number, address, id_number, emergency_contact_name, emergency_contact_phone, vip_status
        """
        created_profiles = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    username = row.get('username', '').strip()
                    phone_number = row.get('phone_number', '').strip()
                    address = row.get('address', '').strip()
                    id_number = row.get('id_number', '').strip()
                    emergency_contact_name = row.get('emergency_contact_name', '').strip()
                    emergency_contact_phone = row.get('emergency_contact_phone', '').strip()
                    vip_status = row.get('vip_status', 'False').lower() == 'true'
                    
                    if not username:
                        errors.append(f'Row {row_num}: Username is required')
                        continue
                    
                    try:
                        user = User.objects.get(username=username)
                    except User.DoesNotExist:
                        errors.append(f'Row {row_num}: User "{username}" does not exist')
                        continue
                    
                    # Create or update guest profile
                    guest_profile, created = GuestProfile.objects.update_or_create(
                        user=user,
                        defaults={
                            'phone_number': phone_number,
                            'address': address,
                            'id_number': id_number,
                            'emergency_contact_name': emergency_contact_name,
                            'emergency_contact_phone': emergency_contact_phone,
                            'vip_status': vip_status
                        }
                    )
                    
                    created_profiles.append({
                        'id': guest_profile.id,
                        'username': username,
                        'phone_number': phone_number,
                        'created': created
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_profiles)} guest profiles successfully',
            'created_profiles': created_profiles,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_payments_csv(self, csv_data):
        """
        Process CSV for payments
        Expected columns: booking_id, customer_username, amount, currency, status, payment_method, transaction_id
        """
        created_payments = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    # Required fields
                    booking_id = row.get('booking_id', '').strip()
                    customer_username = row.get('customer_username', '').strip()
                    amount = row.get('amount', '').strip()
                    transaction_id = row.get('transaction_id', '').strip()
                    
                    # Optional fields with defaults
                    currency = row.get('currency', 'BDT').strip()
                    status_value = row.get('status', 'pending').strip()
                    payment_method = row.get('payment_method', '').strip() or None
                    
                    if not all([booking_id, customer_username, amount, transaction_id]):
                        errors.append(f'Row {row_num}: booking_id, customer_username, amount, and transaction_id are required')
                        continue
                    
                    try:
                        # Find customer by username
                        user = User.objects.get(username=customer_username)
                    except User.DoesNotExist:
                        errors.append(f'Row {row_num}: User "{customer_username}" does not exist')
                        continue
                    
                    try:
                        # Find booking by ID
                        booking = Booking.objects.get(id=booking_id)
                    except Booking.DoesNotExist:
                        errors.append(f'Row {row_num}: Booking with ID "{booking_id}" does not exist')
                        continue
                    
                    # Validate amount
                    try:
                        amount_decimal = float(amount)
                    except ValueError:
                        errors.append(f'Row {row_num}: Invalid amount "{amount}"')
                        continue
                    
                    # Check if payment already exists for this booking
                    if Payment.objects.filter(booking=booking).exists():
                        errors.append(f'Row {row_num}: Payment already exists for booking ID "{booking_id}"')
                        continue
                    
                    # Create payment with new schema
                    payment = Payment.objects.create(
                        booking=booking,
                        customer=user,
                        amount=amount_decimal,
                        currency=currency,
                        status=status_value,  # Changed variable name to avoid conflict
                        payment_method=payment_method,
                        transaction_id=transaction_id
                    )
                    
                    created_payments.append({
                        'id': payment.id,
                        'booking_id': booking_id,
                        'customer': customer_username,
                        'amount': amount_decimal,
                        'currency': currency,
                        'status': status_value,
                        'transaction_id': transaction_id
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_payments)} payments successfully',
            'created_payments': created_payments,
            'errors': errors
        }, status=status.HTTP_201_CREATED)  # Changed from HTTP_200_CREATED to HTTP_201_CREATED

    def _process_checkins_csv(self, csv_data):
        """
        Process CSV for check-ins
        Expected columns: customer_username, room_slug, phone_number, email
        """
        created_checkins = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    customer_username = row.get('customer_username', '').strip()
                    room_slug = row.get('room_slug', '').strip()
                    phone_number = row.get('phone_number', '').strip()
                    email = row.get('email', '').strip()
                    
                    if not all([customer_username, room_slug]):
                        errors.append(f'Row {row_num}: customer_username and room_slug are required')
                        continue
                    
                    try:
                        customer = User.objects.get(username=customer_username)
                    except User.DoesNotExist:
                        errors.append(f'Row {row_num}: Customer "{customer_username}" does not exist')
                        continue
                    
                    try:
                        room = Room.objects.get(room_slug=room_slug)
                    except Room.DoesNotExist:
                        errors.append(f'Row {row_num}: Room "{room_slug}" does not exist')
                        continue
                    
                    checkin = CheckIn.objects.create(
                        customer=customer,
                        room=room,
                        phone_number=phone_number,
                        email=email
                    )
                    
                    created_checkins.append({
                        'id': checkin.id,
                        'customer': customer_username,
                        'room': room_slug
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_checkins)} check-ins successfully',
            'created_checkins': created_checkins,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_checkouts_csv(self, csv_data):
        """
        Process CSV for check-outs
        Expected columns: customer_id
        """
        created_checkouts = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    customer_id = row.get('customer_id', '').strip()
                    
                    if not customer_id:
                        errors.append(f'Row {row_num}: customer_id is required')
                        continue
                    
                    try:
                        customer = Customer.objects.get(id=int(customer_id))
                    except Customer.DoesNotExist:
                        errors.append(f'Row {row_num}: Customer with ID "{customer_id}" does not exist')
                        continue
                    
                    checkout = CheckOut.objects.create(customer=customer)
                    
                    created_checkouts.append({
                        'id': checkout.id,
                        'customer_id': customer_id
                    })
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_checkouts)} check-outs successfully',
            'created_checkouts': created_checkouts,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

    def _process_room_images_csv(self, csv_data):
        """
        Process CSV for room display images
        Expected columns: room_slug, image_url
        """
        created_images = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    room_slug = row.get('room_slug', '').strip()
                    image_url = row.get('image_url', '').strip()
                    
                    if not all([room_slug, image_url]):
                        errors.append(f'Row {row_num}: room_slug and image_url are required')
                        continue
                    
                    try:
                        room = Room.objects.get(room_slug=room_slug)
                    except Room.DoesNotExist:
                        errors.append(f'Row {row_num}: Room "{room_slug}" does not exist')
                        continue
                    
                    # Download and save image
                    downloaded_path = self.download_image_from_url(image_url, room_slug)
                    if downloaded_path:
                        room_image = RoomDisplayImages.objects.create(
                            room=room,
                            display_images=downloaded_path
                        )
                        
                        created_images.append({
                            'id': room_image.id,
                            'room_slug': room_slug,
                            'image_url': image_url,
                            'downloaded': True
                        })
                    else:
                        errors.append(f'Row {row_num}: Failed to download image from {image_url}')
                    
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        return Response({
            'message': f'Processed {len(created_images)} room images successfully',
            'created_images': created_images,
            'errors': errors
        }, status=status.HTTP_201_CREATED)


class BulkUpdateView(APIView):
    """
    Handle bulk updates for existing records
    """
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_description="Bulk update existing records for rooms or users",
        operation_summary="Bulk Update Records",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['data_type', 'updates'],
            properties={
                'data_type': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['rooms', 'users', 'user_roles', 'guest_profiles'],
                    description='Type of data to update'
                ),
                'updates': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Record ID'),
                            'price_per_night': openapi.Schema(type=openapi.TYPE_NUMBER, description='Room price (for rooms)'),
                            'featured': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Featured status (for rooms)'),
                            'first_name': openapi.Schema(type=openapi.TYPE_STRING, description='First name (for users)'),
                            'last_name': openapi.Schema(type=openapi.TYPE_STRING, description='Last name (for users)'),
                        }
                    ),
                    description='Array of update objects with id and fields to update'
                )
            },
            example={
                "data_type": "rooms",
                "updates": [
                    {"id": 1, "price_per_night": 300.00, "featured": True},
                    {"id": 2, "capacity": 3, "is_booked": True}
                ]
            }
        ),
        responses={
            200: openapi.Response(
                description="Success",
                examples={
                    "application/json": {
                        "message": "Updated 2 rooms successfully",
                        "updated_rooms": [{"id": 1, "title": "Ocean View Deluxe"}],
                        "errors": []
                    }
                }
            ),
            400: "Bad Request - Invalid data_type or missing updates"
        },
        tags=['Bulk Operations']
    )
    def put(self, request):
        data_type = request.data.get('data_type', '')
        updates = request.data.get('updates', [])
        
        if not updates:
            return Response(
                {'error': 'No updates provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if data_type == 'rooms':
                return self._bulk_update_rooms(updates)
            elif data_type == 'users':
                return self._bulk_update_users(updates)
            elif data_type == 'user_roles':
                return self._bulk_update_user_roles(updates)
            elif data_type == 'guest_profiles':
                return self._bulk_update_guest_profiles(updates)
            else:
                return Response(
                    {'error': 'Invalid data_type. Must be: rooms, users, user_roles, or guest_profiles'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Error processing updates: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def _bulk_update_rooms(self, updates):
        updated_rooms = []
        errors = []
        
        with transaction.atomic():
            for update in updates:
                try:
                    room_id = update.get('id')
                    if not room_id:
                        errors.append('Room ID is required for updates')
                        continue
                    
                    room = Room.objects.get(id=room_id)
                    
                    # Update fields if provided
                    if 'title' in update:
                        room.title = update['title']
                    if 'price_per_night' in update:
                        room.price_per_night = float(update['price_per_night'])
                    if 'capacity' in update:
                        room.capacity = int(update['capacity'])
                    if 'room_size' in update:
                        room.room_size = update['room_size']
                    if 'featured' in update:
                        room.featured = update['featured']
                    if 'is_booked' in update:
                        room.is_booked = update['is_booked']
                    
                    room.save()
                    updated_rooms.append({'id': room.id, 'title': room.title})
                    
                except Room.DoesNotExist:
                    errors.append(f'Room with ID {room_id} does not exist')
                except Exception as e:
                    errors.append(f'Error updating room {room_id}: {str(e)}')
        
        return Response({
            'message': f'Updated {len(updated_rooms)} rooms successfully',
            'updated_rooms': updated_rooms,
            'errors': errors
        }, status=status.HTTP_200_OK)

    def _bulk_update_users(self, updates):
        updated_users = []
        errors = []
        
        with transaction.atomic():
            for update in updates:
                try:
                    user_id = update.get('id')
                    if not user_id:
                        errors.append('User ID is required for updates')
                        continue
                    
                    user = User.objects.get(id=user_id)
                    
                    # Update fields if provided
                    if 'first_name' in update:
                        user.first_name = update['first_name']
                    if 'last_name' in update:
                        user.last_name = update['last_name']
                    if 'email' in update:
                        user.email = update['email']
                    if 'is_staff' in update:
                        user.is_staff = update['is_staff']
                    if 'is_active' in update:
                        user.is_active = update['is_active']
                    
                    user.save()
                    updated_users.append({'id': user.id, 'username': user.username})
                    
                except User.DoesNotExist:
                    errors.append(f'User with ID {user_id} does not exist')
                except Exception as e:
                    errors.append(f'Error updating user {user_id}: {str(e)}')
        
        return Response({
            'message': f'Updated {len(updated_users)} users successfully',
            'updated_users': updated_users,
            'errors': errors
        }, status=status.HTTP_200_OK)

    def _bulk_update_user_roles(self, updates):
        updated_roles = []
        errors = []
        
        with transaction.atomic():
            for update in updates:
                try:
                    role_id = update.get('id')
                    if not role_id:
                        errors.append('UserRole ID is required for updates')
                        continue
                    
                    user_role = UserRole.objects.get(id=role_id)
                    
                    # Update fields if provided
                    if 'role' in update:
                        user_role.role = update['role']
                    if 'department' in update:
                        user_role.department = update['department']
                    if 'is_active' in update:
                        user_role.is_active = update['is_active']
                    
                    user_role.save()
                    updated_roles.append({'id': user_role.id, 'username': user_role.user.username})
                    
                except UserRole.DoesNotExist:
                    errors.append(f'UserRole with ID {role_id} does not exist')
                except Exception as e:
                    errors.append(f'Error updating user role {role_id}: {str(e)}')
        
        return Response({
            'message': f'Updated {len(updated_roles)} user roles successfully',
            'updated_roles': updated_roles,
            'errors': errors
        }, status=status.HTTP_200_OK)

    def _bulk_update_guest_profiles(self, updates):
        updated_profiles = []
        errors = []
        
        with transaction.atomic():
            for update in updates:
                try:
                    profile_id = update.get('id')
                    if not profile_id:
                        errors.append('GuestProfile ID is required for updates')
                        continue
                    
                    guest_profile = GuestProfile.objects.get(id=profile_id)
                    
                    # Update fields if provided
                    if 'phone_number' in update:
                        guest_profile.phone_number = update['phone_number']
                    if 'address' in update:
                        guest_profile.address = update['address']
                    if 'id_number' in update:
                        guest_profile.id_number = update['id_number']
                    if 'emergency_contact_name' in update:
                        guest_profile.emergency_contact_name = update['emergency_contact_name']
                    if 'emergency_contact_phone' in update:
                        guest_profile.emergency_contact_phone = update['emergency_contact_phone']
                    if 'vip_status' in update:
                        guest_profile.vip_status = update['vip_status']
                    
                    guest_profile.save()
                    updated_profiles.append({'id': guest_profile.id, 'username': guest_profile.user.username})
                    
                except GuestProfile.DoesNotExist:
                    errors.append(f'GuestProfile with ID {profile_id} does not exist')
                except Exception as e:
                    errors.append(f'Error updating guest profile {profile_id}: {str(e)}')
        
        return Response({
            'message': f'Updated {len(updated_profiles)} guest profiles successfully',
            'updated_profiles': updated_profiles,
            'errors': errors
        }, status=status.HTTP_200_OK)


class BulkDeleteView(APIView):
    """
    Handle bulk deletion of records
    """
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_description="Bulk delete records by IDs for rooms, users, categories, or bookings",
        operation_summary="Bulk Delete Records",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['data_type', 'ids'],
            properties={
                'data_type': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['rooms', 'users', 'categories', 'bookings', 'user_roles', 'guest_profiles', 'payments', 'checkins', 'checkouts', 'room_images'],
                    description='Type of data to delete'
                ),
                'ids': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_INTEGER),
                    description='Array of IDs to delete'
                )
            },
            example={
                "data_type": "rooms",
                "ids": [1, 2, 3, 4]
            }
        ),
        responses={
            200: openapi.Response(
                description="Success",
                examples={
                    "application/json": {
                        "message": "Deleted 3 rooms successfully"
                    }
                }
            ),
            400: "Bad Request - Invalid data_type or missing IDs"
        },
        tags=['Bulk Operations']
    )
    def delete(self, request):
        data_type = request.data.get('data_type', '')
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {'error': 'No IDs provided for deletion'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if data_type == 'rooms':
                return self._bulk_delete_rooms(ids)
            elif data_type == 'users':
                return self._bulk_delete_users(ids)
            elif data_type == 'categories':
                return self._bulk_delete_categories(ids)
            elif data_type == 'bookings':
                return self._bulk_delete_bookings(ids)
            elif data_type == 'user_roles':
                return self._bulk_delete_user_roles(ids)
            elif data_type == 'guest_profiles':
                return self._bulk_delete_guest_profiles(ids)
            elif data_type == 'payments':
                return self._bulk_delete_payments(ids)
            elif data_type == 'checkins':
                return self._bulk_delete_checkins(ids)
            elif data_type == 'checkouts':
                return self._bulk_delete_checkouts(ids)
            elif data_type == 'room_images':
                return self._bulk_delete_room_images(ids)
            else:
                return Response(
                    {'error': 'Invalid data_type. Must be: rooms, users, categories, bookings, user_roles, guest_profiles, payments, checkins, checkouts, or room_images'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Error processing deletions: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def _bulk_delete_rooms(self, ids):
        deleted_count = Room.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} rooms successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_users(self, ids):
        # Don't delete superusers
        users_to_delete = User.objects.filter(id__in=ids, is_superuser=False)
        deleted_count = users_to_delete.delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} users successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_categories(self, ids):
        deleted_count = Category.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} categories successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_bookings(self, ids):
        deleted_count = Booking.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} bookings successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_user_roles(self, ids):
        deleted_count = UserRole.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} user roles successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_guest_profiles(self, ids):
        deleted_count = GuestProfile.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} guest profiles successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_payments(self, ids):
        deleted_count = Payment.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} payments successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_checkins(self, ids):
        deleted_count = CheckIn.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} check-ins successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_checkouts(self, ids):
        deleted_count = CheckOut.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} check-outs successfully'
        }, status=status.HTTP_200_OK)

    def _bulk_delete_room_images(self, ids):
        deleted_count = RoomDisplayImages.objects.filter(id__in=ids).delete()[0]
        return Response({
            'message': f'Deleted {deleted_count} room images successfully'
        }, status=status.HTTP_200_OK)


class DataExportView(APIView):
    """
    Export data to CSV format
    """
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_description="Export data to CSV format for users, rooms, categories, or bookings",
        operation_summary="Export Data to CSV",
        manual_parameters=[
            openapi.Parameter(
                'data_type',
                openapi.IN_QUERY,
                description="Type of data to export",
                type=openapi.TYPE_STRING,
                enum=['users', 'rooms', 'categories', 'bookings', 'user_roles', 'guest_profiles', 'payments', 'checkins', 'checkouts', 'room_images'],
                required=True
            ),
        ],
        responses={
            200: openapi.Response(
                description="CSV file download",
                content={'text/csv': {}}
            ),
            400: "Bad Request - Invalid data_type"
        },
        tags=['Bulk Operations']
    )
    def get(self, request):
        data_type = request.query_params.get('data_type', '')
        
        if data_type == 'users':
            return self._export_users()
        elif data_type == 'rooms':
            return self._export_rooms()
        elif data_type == 'categories':
            return self._export_categories()
        elif data_type == 'bookings':
            return self._export_bookings()
        elif data_type == 'user_roles':
            return self._export_user_roles()
        elif data_type == 'guest_profiles':
            return self._export_guest_profiles()
        elif data_type == 'payments':
            return self._export_payments()
        elif data_type == 'checkins':
            return self._export_checkins()
        elif data_type == 'checkouts':
            return self._export_checkouts()
        elif data_type == 'room_images':
            return self._export_room_images()
        else:
            return Response(
                {'error': 'Invalid data_type. Must be: users, rooms, categories, bookings, user_roles, guest_profiles, payments, checkins, checkouts, or room_images'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def _export_users(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'password_hash'])
        
        for user in User.objects.all():
            writer.writerow([
                user.id, user.username, user.email, user.first_name, 
                user.last_name, user.is_staff, user.is_active, user.date_joined, user.password
            ])
        
        return response

    def _export_rooms(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="rooms.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['title', 'category_name', 'price_per_night', 'capacity', 'room_size', 'featured', 'cover_image_url'])
        
        for room in Room.objects.select_related('category').all():
            # Generate image URL for download
            cover_image_url = ''
            if room.cover_image and str(room.cover_image) != 'default/room_default.jpg':
                # If room has a custom uploaded image, provide the full URL
                if hasattr(settings, 'MEDIA_URL') and room.cover_image:
                    cover_image_url = f"{settings.MEDIA_URL}{room.cover_image}"
            else:
                # Use default category-based Unsplash image URLs
                image_map = {
                    'Luxury': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=350&fit=crop&crop=center',
                    'Deluxe Suite': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500&h=350&fit=crop&crop=center',
                    'Standard Room': 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=500&h=350&fit=crop&crop=center',
                    'Family Room': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&h=350&fit=crop&crop=center',
                    'Business Suite': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=500&h=350&fit=crop&crop=center',
                    'Penthouse': 'https://images.unsplash.com/photo-1559599238-9fdc67ce4e7c?w=500&h=350&fit=crop&crop=center',
                    'Economy Room': 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=500&h=350&fit=crop&crop=center',
                    'Luxury Villa': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=350&fit=crop&crop=center'
                }
                cover_image_url = image_map.get(room.category.category_name, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&h=350&fit=crop&crop=center')
            
            writer.writerow([
                room.title, room.category.category_name, room.price_per_night, 
                room.capacity, room.room_size, room.featured, cover_image_url
            ])
        
        return response

    def _export_categories(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="categories.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'category_name'])
        
        for category in Category.objects.all():
            writer.writerow([category.id, category.category_name])
        
        return response

    def _export_bookings(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="bookings.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'customer_username', 'room_title', 'booking_date', 'checking_date', 'checkout_date', 'phone_number', 'email'])
        
        for booking in Booking.objects.select_related('customer', 'room').all():
            writer.writerow([
                booking.id, booking.customer.username, booking.room.title, 
                booking.booking_date, booking.checking_date, booking.checkout_date, 
                booking.phone_number, booking.email
            ])
        
        return response

    def _export_user_roles(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="user_roles.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'username', 'role', 'department', 'is_active', 'assigned_date'])
        
        for user_role in UserRole.objects.select_related('user').all():
            writer.writerow([
                user_role.id, user_role.user.username, user_role.role, 
                user_role.department, user_role.is_active, user_role.assigned_date
            ])
        
        return response

    def _export_guest_profiles(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="guest_profiles.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'username', 'phone_number', 'address', 'id_number', 'emergency_contact_name', 'emergency_contact_phone', 'vip_status', 'created_date'])
        
        for profile in GuestProfile.objects.select_related('user').all():
            writer.writerow([
                profile.id, profile.user.username, profile.phone_number, 
                profile.address, profile.id_number, profile.emergency_contact_name,
                profile.emergency_contact_phone, profile.vip_status, profile.created_date
            ])
        
        return response

    def _export_payments(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payments.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'booking_id', 'customer_username', 'amount', 'currency', 'status', 'payment_method', 'transaction_id', 'created_at'])
        
        for payment in Payment.objects.select_related('booking', 'customer').all():
            writer.writerow([
                payment.id, payment.booking.id, payment.customer.username, 
                payment.amount, payment.currency, payment.status,
                payment.payment_method, payment.transaction_id, payment.created_at
            ])
        
        return response

    def _export_checkins(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="checkins.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'customer_username', 'room_slug', 'phone_number', 'email', 'checked_in_date'])
        
        for checkin in CheckIn.objects.select_related('customer', 'room').all():
            writer.writerow([
                checkin.id, checkin.customer.username, checkin.room.room_slug,
                checkin.phone_number, checkin.email, checkin.checked_in_date
            ])
        
        return response

    def _export_checkouts(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="checkouts.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'customer_id', 'customer_username', 'check_out_date'])
        
        for checkout in CheckOut.objects.select_related('customer').all():
            writer.writerow([
                checkout.id, checkout.customer.id, checkout.customer.customer.username,
                checkout.check_out_date
            ])
        
        return response

    def _export_room_images(self):
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="room_images.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'room_slug', 'room_title', 'image_url'])
        
        for room_image in RoomDisplayImages.objects.select_related('room').all():
            image_url = ''
            if room_image.display_images:
                if hasattr(settings, 'MEDIA_URL'):
                    image_url = f"{settings.MEDIA_URL}{room_image.display_images}"
                    
            writer.writerow([
                room_image.id, room_image.room.room_slug, room_image.room.title, image_url
            ])
        
        return response
