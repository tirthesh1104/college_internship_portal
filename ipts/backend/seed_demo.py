"""
Seed script for reference roles only (Admin & Coordinator).
Dummy student creation has been completely removed to make registration the single source of truth.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from apps.accounts.models import User
from apps.students.models import Department, AcademicYear
from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment

if not settings.DEBUG and not os.environ.get('FORCE_SEED'):
    print('Safeguard active: Seeding disabled in production.')
    exit(0)

# Departments
depts = []
for name, code in [
    ('Computer Science & Engineering', 'CSE'),
    ('Electronics & Telecommunication', 'E&TC'),
    ('Mechanical Engineering', 'MECH'),
    ('Civil Engineering', 'CIVIL'),
]:
    d, _ = Department.objects.get_or_create(code=code, defaults={'name': name})
    depts.append(d)

# Academic Years
curr_year, _ = AcademicYear.objects.get_or_create(year_label='2026-2027', defaults={'is_active': True})

# Admin: Prof. Meghraj Chougoule
admin_user, _ = User.objects.get_or_create(
    email='admin@mitcorer.edu.in',
    defaults={'name': 'Prof. Meghraj Chougoule', 'role': 'ADMIN', 'is_staff': True, 'is_superuser': True}
)
admin_user.set_password('Admin@123')
admin_user.save()

# Coordinator: Tirthesh Gutte
coord_user, _ = User.objects.get_or_create(
    email='coordinator.cse@mitcorer.edu.in',
    defaults={'name': 'Tirthesh Gutte', 'role': 'COORDINATOR'}
)
coord_user.set_password('Coord@123')
coord_user.save()

CoordinatorAssignment.objects.get_or_create(
    coordinator=coord_user,
    department=depts[0],
    academic_year='2026-2027'
)

print('Reference seeding complete. Dummy student records are NOT created; students must self-register.')
