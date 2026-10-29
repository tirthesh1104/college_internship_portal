import os, django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')
django.setup()

from apps.accounts.models import User

# Find the main admin account
admin_user = User.objects.filter(email='admin@mitcorer.edu.in').first()
if admin_user:
    old_name = admin_user.name
    admin_user.name = 'Prof. Meghraj Chougoule'
    admin_user.save()
    print("UPDATED admin@mitcorer.edu.in: '" + old_name + "' -> '" + admin_user.name + "'")
else:
    print("ERROR: admin@mitcorer.edu.in not found")

# Find all ADMIN role users
all_admins = User.objects.filter(role='ADMIN', is_active=True)
print("\nAll ADMIN role users:")
for u in all_admins:
    print("  - " + u.email + ": '" + u.name + "'")