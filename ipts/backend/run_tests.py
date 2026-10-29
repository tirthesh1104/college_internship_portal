#!/usr/bin/env python
import os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')
import django
django.setup()
from apps.accounts.models import User
User.objects.create_user('c@test.com', 'Test Coord', 'COORDINATOR', 'pass123')
print('Test user created')