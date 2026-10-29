import os
import sys

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')

import django
django.setup()

from apps.accounts.models import User

# Update the coordinator user name
coord_user = User.objects.filter(email='coordinator.cse@mitcorer.edu.in').first()
if coord_user:
    coord_user.name = 'Tirthesh Gutte'
    coord_user.save()
    print(f'Updated user: {coord_user.email} ({coord_user.name})')
else:
    print('Coordinator user not found')