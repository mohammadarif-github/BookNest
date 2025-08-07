#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files for Django admin and DRF
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate

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