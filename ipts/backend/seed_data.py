import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.accounts.models import User
from apps.students.models import Department, AcademicYear, StudentProfile
from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment
from apps.opportunities.models import Opportunity
from apps.assessments.models import Skill

def seed():
    print("Starting MITCORER Internship Hub database seeding...")

    # 1. Departments
    dept_cse, _ = Department.objects.get_or_create(code='CSE', defaults={'name': 'Computer Science & Engineering'})
    dept_etc, _ = Department.objects.get_or_create(code='E&TC', defaults={'name': 'Electronics & Telecommunication Engineering'})
    dept_mech, _ = Department.objects.get_or_create(code='MECH', defaults={'name': 'Mechanical Engineering'})
    dept_civil, _ = Department.objects.get_or_create(code='CIVIL', defaults={'name': 'Civil Engineering'})
    print("Departments seeded.")

    # 2. Academic Years
    year_curr, _ = AcademicYear.objects.get_or_create(year_label='2026-2027', defaults={'is_active': True})
    AcademicYear.objects.get_or_create(year_label='2025-2026', defaults={'is_active': False})

    # 3. Skills
    skills_list = [
        ('Python', 'Programming Languages'),
        ('Django REST Framework', 'Backend Frameworks'),
        ('React.js', 'Frontend Development'),
        ('TypeScript', 'Frontend Development'),
        ('MySQL & Relational Databases', 'Databases'),
        ('Git & GitHub', 'Version Control'),
        ('Embedded C / IoT', 'Hardware & IoT'),
        ('Data Structures & Algorithms', 'Core CS'),
        ('Cloud Computing (AWS / GCP)', 'Cloud & DevOps'),
        ('Machine Learning', 'Artificial Intelligence'),
    ]
    for name, cat in skills_list:
        Skill.objects.get_or_create(name=name, defaults={'category': cat})
    print("Skills seeded.")

    # 4. User Accounts - Admin and Coordinator ONLY
    # Admin
    admin_user = User.objects.filter(email='admin@mitcorer.edu.in').first()
    if not admin_user:
        admin_user = User.objects.create_superuser(
            email='admin@mitcorer.edu.in',
            name='Prof. Meghraj Chougule - T&P Head & Hub Admin',
            password='Admin@123'
        )
    print("Admin user ready: admin@mitcorer.edu.in")

    # Coordinator - DO NOT use student name as coordinator name
    coord_user = User.objects.filter(email='coordinator.cse@mitcorer.edu.in').first()
    if not coord_user:
        coord_user = User.objects.create_user(
            email='coordinator.cse@mitcorer.edu.in',
            name='Prof. Training & Placement Coordinator',
            password='Coord@123',
            role='COORDINATOR',
            is_staff=False
        )
    coord_profile, _ = CoordinatorProfile.objects.get_or_create(
        user=coord_user,
        defaults={
            'employee_id': 'MIT-COORD-01',
            'department': dept_cse,
            'designation': 'Assistant Professor & Training & Placement Coordinator',
            'phone': '+91 9876543210',
            'can_publish_directly': True
        }
    )
    CoordinatorAssignment.objects.get_or_create(
        coordinator=coord_user,
        department=dept_cse,
        academic_year='2026-2027'
    )
    print("Coordinator ready: coordinator.cse@mitcorer.edu.in")

    # NOTE: Dummy student data removed. Students must register through the registration form.
    print("Student data seeding disabled. Students must register through the registration form.")
    print("Opportunities, applications, internships, reports, and other student-related data seeding disabled.")
    print("Only reference data (departments, academic years, skills, admin, coordinator) seeded.")
    print("SUCCESS: MITCORER Internship Hub reference data seeding completed!")

if __name__ == '__main__':
    seed()
