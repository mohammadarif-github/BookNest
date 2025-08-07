from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.text import slugify
from hotel_app.models import Category, Room, Customer
import os


class Command(BaseCommand):
    help = 'Populate the database with sample data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of sample users to create',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            User.objects.filter(is_superuser=False).delete()
            Room.objects.all().delete()
            Category.objects.all().delete()

        # Create categories
        self.stdout.write('Creating categories...')
        categories_data = [
            'Deluxe Suite',
            'Standard Room', 
            'Family Room',
            'Business Suite',
            'Penthouse',
            'Economy Room',
            'Luxury Villa'
        ]
        
        categories = []
        for cat_name in categories_data:
            category, created = Category.objects.get_or_create(category_name=cat_name)
            if created:
                categories.append(category)
                self.stdout.write(f'  Created category: {cat_name}')

        # Create users
        self.stdout.write('Creating users...')
        users_data = [
            {'username': 'john_doe', 'email': 'john@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'jane_smith', 'email': 'jane@example.com', 'first_name': 'Jane', 'last_name': 'Smith'},
            {'username': 'bob_wilson', 'email': 'bob@example.com', 'first_name': 'Bob', 'last_name': 'Wilson'},
            {'username': 'alice_brown', 'email': 'alice@example.com', 'first_name': 'Alice', 'last_name': 'Brown'},
            {'username': 'charlie_davis', 'email': 'charlie@example.com', 'first_name': 'Charlie', 'last_name': 'Davis'},
        ]

        for i, user_data in enumerate(users_data):
            if i >= options['users']:
                break
            
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                Customer.objects.get_or_create(customer=user)
                self.stdout.write(f'  Created user: {user_data["username"]}')

        # Create additional users if requested
        for i in range(len(users_data), options['users']):
            username = f'user_{i+1}'
            email = f'user{i+1}@example.com'
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': f'User',
                    'last_name': f'{i+1}',
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                Customer.objects.get_or_create(customer=user)
                self.stdout.write(f'  Created user: {username}')

        # Create rooms
        self.stdout.write('Creating rooms...')
        rooms_data = [
            {'title': 'Ocean View Deluxe', 'category': 'Deluxe Suite', 'price': 250.00, 'capacity': 2, 'size': '50m²', 'featured': True},
            {'title': 'Garden Standard', 'category': 'Standard Room', 'price': 120.00, 'capacity': 2, 'size': '35m²', 'featured': False},
            {'title': 'Family Paradise', 'category': 'Family Room', 'price': 180.00, 'capacity': 4, 'size': '60m²', 'featured': True},
            {'title': 'Executive Business', 'category': 'Business Suite', 'price': 300.00, 'capacity': 2, 'size': '45m²', 'featured': False},
            {'title': 'Presidential Penthouse', 'category': 'Penthouse', 'price': 500.00, 'capacity': 4, 'size': '100m²', 'featured': True},
            {'title': 'Budget Economy', 'category': 'Economy Room', 'price': 80.00, 'capacity': 1, 'size': '25m²', 'featured': False},
            {'title': 'Luxury Beach Villa', 'category': 'Luxury Villa', 'price': 800.00, 'capacity': 6, 'size': '150m²', 'featured': True},
            {'title': 'City View Standard', 'category': 'Standard Room', 'price': 110.00, 'capacity': 2, 'size': '30m²', 'featured': False},
            {'title': 'Sunset Deluxe', 'category': 'Deluxe Suite', 'price': 280.00, 'capacity': 2, 'size': '55m²', 'featured': True},
            {'title': 'Business Executive', 'category': 'Business Suite', 'price': 320.00, 'capacity': 2, 'size': '50m²', 'featured': False},
        ]

        for room_data in rooms_data:
            try:
                category = Category.objects.get(category_name=room_data['category'])
                room_slug = slugify(room_data['title'])
                
                # Handle duplicate slugs
                base_slug = room_slug
                counter = 1
                while Room.objects.filter(room_slug=room_slug).exists():
                    room_slug = f"{base_slug}-{counter}"
                    counter += 1

                room, created = Room.objects.get_or_create(
                    title=room_data['title'],
                    defaults={
                        'category': category,
                        'price_per_night': room_data['price'],
                        'room_slug': room_slug,
                        'capacity': room_data['capacity'],
                        'room_size': room_data['size'],
                        'featured': room_data['featured'],
                        'is_booked': False,
                        'cover_image': 'default/room_default.jpg'
                    }
                )
                
                if created:
                    self.stdout.write(f'  Created room: {room_data["title"]}')
                    
            except Category.DoesNotExist:
                self.stdout.write(f'  Warning: Category "{room_data["category"]}" not found for room "{room_data["title"]}"')

        # Create a default cover image if it doesn't exist
        media_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'media')
        default_dir = os.path.join(media_root, 'default')
        
        if not os.path.exists(default_dir):
            os.makedirs(default_dir, exist_ok=True)
            
        default_image_path = os.path.join(default_dir, 'room_default.jpg')
        if not os.path.exists(default_image_path):
            # Create a placeholder file (you should replace this with an actual image)
            with open(default_image_path, 'w') as f:
                f.write('# Placeholder for default room image')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully populated database with sample data!\n'
                f'Categories: {Category.objects.count()}\n'
                f'Users: {User.objects.filter(is_superuser=False).count()}\n'
                f'Rooms: {Room.objects.count()}'
            )
        )
