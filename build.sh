#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files for Django admin and DRF
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate

# Fix payment table if needed (for production deployment)
python manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
try:
    # Check if payment table exists and has correct structure
    cursor.execute('SELECT booking_id FROM hotel_app_payment LIMIT 1;')
    print('Payment table structure is correct')
except Exception as e:
    print('Payment table needs fixing:', str(e))
    # Create payment table if missing or incorrect
    try:
        cursor.execute('DROP TABLE IF EXISTS hotel_app_payment;')
        create_sql = '''
        CREATE TABLE \"hotel_app_payment\" (
            \"id\" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
            \"amount\" decimal NOT NULL,
            \"currency\" varchar(3) NOT NULL,
            \"status\" varchar(20) NOT NULL,
            \"payment_method\" varchar(20) NULL,
            \"transaction_id\" varchar(255) NOT NULL UNIQUE,
            \"sslcommerz_transaction_id\" varchar(255) NULL,
            \"session_key\" varchar(255) NULL,
            \"gateway_page_url\" text NULL,
            \"bank_transaction_id\" varchar(255) NULL,
            \"card_type\" varchar(50) NULL,
            \"card_no\" varchar(20) NULL,
            \"card_issuer\" varchar(100) NULL,
            \"card_brand\" varchar(50) NULL,
            \"card_issuer_country\" varchar(50) NULL,
            \"risk_level\" varchar(10) NULL,
            \"risk_title\" varchar(100) NULL,
            \"created_at\" datetime NOT NULL,
            \"updated_at\" datetime NOT NULL,
            \"paid_at\" datetime NULL,
            \"refund_reason\" text NULL,
            \"admin_notes\" text NULL,
            \"raw_response\" text NULL,
            \"booking_id\" bigint NOT NULL UNIQUE REFERENCES \"hotel_app_booking\" (\"id\") DEFERRABLE INITIALLY DEFERRED,
            \"customer_id\" bigint NOT NULL REFERENCES \"auth_user\" (\"id\") DEFERRABLE INITIALLY DEFERRED,
            \"processed_by_id\" bigint NULL REFERENCES \"auth_user\" (\"id\") DEFERRABLE INITIALLY DEFERRED,
            \"refunded_by_id\" bigint NULL REFERENCES \"auth_user\" (\"id\") DEFERRABLE INITIALLY DEFERRED
        );'''
        cursor.execute(create_sql)
        print('Payment table created successfully')
    except Exception as create_error:
        print('Error creating payment table:', str(create_error))
"

# Create superuser if it doesn't exist (optional)
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@booknest.com', 'password123')
    print('Superuser created: admin/password123')
else:
    print('Superuser already exists')
    # Update existing admin password to password123
    admin_user = User.objects.get(username='admin')
    admin_user.set_password('password123')
    admin_user.save()
    print('Admin password updated to: password123')
"