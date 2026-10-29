#!/usr/bin/env python
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

import django
from pathlib import Path
sys_path = r'C:\Users\Lenovo\Desktop\ipts\backend'
if sys_path not in os.sys.path:
    os.sys.path.insert(0, sys_path)

import sys
django.setup()

from django.core.management import call_command
call_command('migrate', '--run-syncdb')
print('Migration complete')