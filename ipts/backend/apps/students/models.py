from django.db import models
from django.conf import settings

class Department(models.Model):
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        db_table = 'departments'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

class AcademicYear(models.Model):
    year_label = models.CharField(max_length=50, unique=True) # e.g. "2026-2027"
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'academic_years'
        ordering = ['-year_label']

    def __str__(self):
        return self.year_label

class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    roll_number = models.CharField(max_length=50, unique=True, db_index=True)
    prn_number = models.CharField(max_length=50, blank=True, default='', db_index=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    academic_year = models.CharField(max_length=50, default='2026-2027')
    registration_date = models.DateField(null=True, blank=True)
    division = models.CharField(max_length=10, default='A')
    semester = models.IntegerField(default=6)
    phone = models.CharField(max_length=20, blank=True)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    bio = models.TextField(blank=True)
    github_url = models.URLField(max_length=300, blank=True)
    linkedin_url = models.URLField(max_length=300, blank=True)
    portfolio_url = models.URLField(max_length=300, blank=True)
    resume_file_key = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'

    def __str__(self):
        return f"{self.roll_number} - {self.user.name} ({self.department.code if self.department else 'No Dept'})"
