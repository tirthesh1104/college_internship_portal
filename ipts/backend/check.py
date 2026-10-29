import os
import sys

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

import django
sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')

django.setup()

from django.core.management import call_command
call_command('check')
print("Django check passed!")