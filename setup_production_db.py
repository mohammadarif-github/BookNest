#!/usr/bin/env python
"""
Script to ensure database is properly set up for production
"""
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_reservation_site.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.contrib.auth import get_user_model
from django.db import connection

def check_database():
    """Check if database tables exist"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM axes_accessattempt LIMIT 1;")
        print("✅ Axes tables exist")
        return True
    except Exception as e:
        print(f"❌ Axes tables missing: {e}")
        return False

def run_migrations():
    """Run all migrations"""
    print("🔄 Running migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    print("✅ Migrations completed")

def create_superuser():
    """Create superuser if it doesn't exist"""
    User = get_user_model()
    username = 'admin'
    email = 'admin@booknest.com'
    password = 'booknest2024'
    
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, email, password)
        print(f"✅ Superuser created: {username}/{password}")
    else:
        print(f"ℹ️  Superuser already exists: {username}")

if __name__ == '__main__':
    print("🚀 Setting up BookNest production database...")
    
    # Always run migrations to ensure everything is up to date
    run_migrations()
    
    # Check if Axes tables now exist
    if check_database():
        print("✅ Database setup complete")
    else:
        print("❌ Database setup failed")
    
    # Create superuser
    create_superuser()
    
    print("🎉 Setup complete!")
