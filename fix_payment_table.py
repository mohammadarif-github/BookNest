#!/usr/bin/env python
"""
Script to fix payment table database schema issues
"""
import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_reservation_site.settings')
    django.setup()
    
    from django.db import connection, transaction
    from django.core.management import call_command
    
    try:
        cursor = connection.cursor()
        
        print("Fixing payment table schema...")
        
        # Disable foreign key checks for SQLite
        cursor.execute("PRAGMA foreign_keys = OFF;")
        
        with transaction.atomic():
            # Check if old payment table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='hotel_app_payment';")
            if cursor.fetchone():
                print("Found existing payment table, checking structure...")
                cursor.execute("PRAGMA table_info(hotel_app_payment);")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                # If it's the old structure (only has id and customer_id)
                if 'booking_id' not in column_names and len(column_names) <= 3:
                    print("Old payment table structure detected, dropping...")
                    cursor.execute("DROP TABLE hotel_app_payment;")
                    print("Dropped old payment table")
                    
                    # Reset migration state for payment recreation
                    cursor.execute("DELETE FROM django_migrations WHERE app='hotel_app' AND name='0017_recreate_payment_model';")
                    print("Reset payment migration state")
        
        # Re-enable foreign key checks
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Now run migrations to recreate the payment table properly
        print("Running migrations to recreate payment table...")
        call_command('migrate', 'hotel_app', verbosity=1)
        
        print("✅ Payment table schema fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing payment table: {e}")
        sys.exit(1)
