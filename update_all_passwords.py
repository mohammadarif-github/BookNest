#!/usr/bin/env python
"""
Script to update all user passwords to a default password.
Use this for testing or development purposes only.
"""
import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_reservation_site.settings')
    django.setup()
    
    from django.contrib.auth import get_user_model
    from django.db import transaction
    
    User = get_user_model()
    new_password = "password123"
    
    try:
        with transaction.atomic():
            users = User.objects.all()
            updated_count = 0
            
            print(f"Found {users.count()} users in the database")
            print("Updating passwords...")
            
            for user in users:
                user.set_password(new_password)
                user.save()
                updated_count += 1
                print(f"Updated password for user: {user.username}")
            
            print(f"\n✅ Successfully updated passwords for {updated_count} users")
            print(f"All users now have the password: {new_password}")
            
    except Exception as e:
        print(f"❌ Error updating passwords: {e}")
        sys.exit(1)
