import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
from pathlib import Path
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')

django.setup()

from apps.accounts.models import User

# Create test users
coord = User.objects.create_user(
    email='coordinator@test.local',
    name='Test Coordinator',
    role='COORDINATOR',
    password='testpass123'
)
coord.is_staff = True
coord.save()

student = User.objects.create_user(
    email='student@test.local',
    name='Test Student',
    role='STUDENT',
    password='testpass123'
)
student.save()

print(f'Created coordinator: {coord.email} ({coord.role}, is_staff={coord.is_staff})')
print(f'Created student: {student.email} ({student.role}, is_staff={student.is_staff})')
print(f'Total users in database: {User.objects.count()}')