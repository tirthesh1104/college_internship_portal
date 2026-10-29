import os
import sys
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment
from apps.accounts.models import User

print('=== Coordinator Profiles ===')
for cp in CoordinatorProfile.objects.all():
    print(f'User: {cp.user.email} ({cp.user.name}), Designation: {cp.designation}, Dept: {cp.department}')

print()
print('=== Coordinator Assignments ===')
for ca in CoordinatorAssignment.objects.all():
    dept = ca.department.code if ca.department else 'All'
    student = ca.student.email if ca.student else 'None'
    print(f'{ca.coordinator.email} -> Dept: {dept} (Year: {ca.academic_year}), Student: {student}')

print()
print('=== Users with Coordinator role ===')
for u in User.objects.filter(role='COORDINATOR'):
    print(f'{u.email} ({u.name})')