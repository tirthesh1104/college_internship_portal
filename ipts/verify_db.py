import os, django, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')
django.setup()
from apps.accounts.models import User

users = User.objects.all().order_by('role', 'email')
print("Total users: " + str(users.count()))
for u in users:
    print("  " + u.email + " | " + u.name + " | " + u.role + " | active=" + str(u.is_active))

print("\nKey accounts check:")
admin = User.objects.filter(email='admin@mitcorer.edu.in').first()
if admin:
    print("  Main Admin: " + admin.name + " (" + admin.email + ") - Role: " + admin.role)

coord = User.objects.filter(email='coordinator.cse@mitcorer.edu.in').first()
if coord:
    print("  Coordinator: " + coord.name + " (" + coord.email + ") - Role: " + coord.role)

mentor = User.objects.filter(email='mentor.industry@mitcorer.edu.in').first()
if mentor:
    print("  Mentor: " + mentor.name + " (" + mentor.email + ") - Role: " + mentor.role)

test_student = User.objects.filter(email='teststudent@mitcorer.edu.in').first()
if test_student:
    print("  Test Student: " + test_student.name + " (" + test_student.email + ") - Role: " + test_student.role)