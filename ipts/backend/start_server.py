import os
import sys

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

import django
import platform
print(f"Python version: {platform.python_version()}")
print(f"Django version: {django.VERSION}")

sys.path.insert(0, r'C:\Users\Lenovo\Desktop\ipts\backend')

django.setup()

from django.core.management import call_command
from django.db import connection

print("=" * 60)
print("Step 1: Django System Check")
print("=" * 60)

try:
    call_command('check')
    print("✅ Django check passed!")
except Exception as e:
    print(f"❌ Django check failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("Step 2: Database Connectivity Test")
print("=" * 60)

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"✅ Database connection successful! Result: {result}")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("Note: MySQL may not be running in this environment")
    print("The backend server can still start but may have DB issues")

print("\n" + "=" * 60)
print("Step 3: Start Django Runserver")
print("=" * 60)

import subprocess
import time

try:
    # Start the server in a subprocess
    server_proc = subprocess.Popen(
        [sys.executable, 'manage.py', 'runserver', '127.0.0.1:8000'],
        cwd=r'C:\Users\Lenovo\Desktop\ipts\backend',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait a moment for server to start
    time.sleep(3)
    
    # Check if process is still running
    if server_proc.poll() is None:
        print("✅ Django server started successfully on 127.0.0.1:8000")
        print(f"   Process ID: {server_proc.pid}")
    else:
        stderr = server_proc.stderr.read().decode('utf-8', errors='replace')
        print(f"❌ Django server failed to start")
        print(f"   Error output: {stderr[:500]}")
        
except Exception as e:
    print(f"❌ Failed to start server: {e}")