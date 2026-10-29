from django.db import models
from django.conf import settings
from apps.students.models import Department

class Opportunity(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PENDING_APPROVAL', 'Pending Admin Approval'),
        ('APPROVED', 'Approved'),
        ('PUBLISHED', 'Published & Live'),
        ('REJECTED', 'Rejected'),
        ('UNPUBLISHED', 'Unpublished'),
        ('EXPIRED', 'Expired'),
    )

    TYPE_CHOICES = (
        ('INTERNSHIP', 'Internship'),
        ('TRAINING', 'Training Program'),
        ('WORKSHOP', 'Workshop'),
        ('HACKATHON', 'Hackathon / Competition'),
    )

    MODE_CHOICES = (
        ('REMOTE', 'Remote / Online'),
        ('ONSITE', 'On-Site'),
        ('HYBRID', 'Hybrid'),
    )

    STIPEND_CHOICES = (
        ('PAID', 'Paid'),
        ('UNPAID', 'Unpaid'),
        ('STIPEND', 'Performance Stipend'),
    )

    APPLICATION_TYPE_CHOICES = (
        ('INTERNAL', 'Internal Portal Application'),
        ('EXTERNAL', 'External Official Portal Link'),
    )

    title = models.CharField(max_length=200, db_index=True)
    organization = models.CharField(max_length=200, db_index=True)
    country = models.CharField(max_length=100, db_index=True, default='')
    opportunity_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='INTERNSHIP')
    description = models.TextField()
    learning_outcomes = models.TextField(blank=True)
    eligibility_requirements = models.TextField(blank=True)
    required_skills = models.CharField(max_length=300, help_text="Comma-separated skills, e.g. Python, Django, React")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    duration = models.CharField(max_length=100, default='8 Weeks')
    stipend_type = models.CharField(max_length=20, choices=STIPEND_CHOICES, default='PAID')
    stipend_amount = models.CharField(max_length=100, blank=True, default='As per performance')
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='REMOTE')
    available_seats = models.IntegerField(default=10)
    deadline = models.DateField(db_index=True)

    application_type = models.CharField(max_length=20, choices=APPLICATION_TYPE_CHOICES, default='INTERNAL')
    application_url = models.URLField(max_length=500, blank=True)
    external_warning_note = models.CharField(
        max_length=300, 
        blank=True, 
        default='You are applying on an authorized external partner site. MITCORER does not charge fees.'
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_opportunities')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    rejection_reason = models.TextField(blank=True)

    target_departments = models.ManyToManyField(Department, blank=True, related_name='target_opportunities')
    target_academic_year = models.CharField(max_length=50, blank=True, default='All')

    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'opportunities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} @ {self.organization} [{self.status}]"
