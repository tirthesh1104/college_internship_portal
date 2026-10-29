import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()

from apps.internships.models import Internship
print('=== Internship ===')
print('Fields:', [f.name for f in Internship._meta.fields])
print('Relations:', [(f.name, f.get_internal_type() if hasattr(f, 'get_internal_type') else type(f)) for f in Internship._meta.get_fields()])

from apps.students.models import StudentProfile
print('\n=== StudentProfile ===')
print('Fields:', [f.name for f in StudentProfile._meta.fields])
print('Relations:', [(f.name, f.get_internal_type() if hasattr(f, 'get_internal_type') else type(f)) for f in StudentProfile._meta.get_fields()])

from apps.progress_reports.models import ProgressReport
print('\n=== ProgressReport ===')
print('Fields:', [f.name for f in ProgressReport._meta.fields])
print('Relations:', [(f.name, f.get_internal_type() if hasattr(f, 'get_internal_type') else type(f)) for f in ProgressReport._meta.get_fields()])

from apps.accounts.models import User, CoordinatorProfile
print('\n=== User (custom) ===')
print('Fields:', [f.name for f in User._meta.fields])
print('Relations:', [(f.name, f.get_internal_type() if hasattr(f, 'get_internal_type') else type(f)) for f in User._meta.get_fields()])

print('\n=== CoordinatorProfile ===')
print('Fields:', [f.name for f in CoordinatorProfile._meta.fields])
print('Relations:', [(f.name, f.get_internal_type() if hasattr(f, 'get_internal_type') else type(f)) for f in CoordinatorProfile._meta.get_fields()])

from django.apps import apps
models = [m.__name__ for m in apps.get_models()]
print('Models:', models)