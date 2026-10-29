from django.db import models
from django.conf import settings
from apps.students.models import Department

class CoordinatorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coordinator_profile')
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='coordinators')
    designation = models.CharField(max_length=100, default='Assistant Professor & Training Coordinator')
    phone = models.CharField(max_length=20, blank=True)
    can_publish_directly = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coordinator_profiles'

    def __str__(self):
        return f"{self.user.name} ({self.department.code if self.department else 'General'})"

class CoordinatorAssignment(models.Model):
    coordinator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True, related_name='assigned_coordinators')
    academic_year = models.CharField(max_length=50, default='2026-2027')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='assigned_coordinator_links')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coordinator_assignments'

    def __str__(self):
        return f"Coord: {self.coordinator.name} -> Dept: {self.department.code if self.department else 'All'} (Year: {self.academic_year})"
