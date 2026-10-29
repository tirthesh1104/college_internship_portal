from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class Internship(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active Internship'),
        ('COMPLETED', 'Successfully Completed'),
        ('DELAYED', 'Delayed / Needs Attention'),
        ('TERMINATED', 'Discontinued'),
    )

    COMPLETION_CHOICES = (
        ('IN_PROGRESS', 'In Progress'),
        ('PENDING_APPROVAL', 'Completion Pending Approval'),
        ('APPROVED', 'Completion Approved'),
        ('REJECTED', 'Completion Rejected'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='internships')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.SET_NULL, null=True, blank=True, related_name='active_internships')
    organization_name = models.CharField(max_length=200)
    role_title = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    
    supervisor_name = models.CharField(max_length=150, blank=True)
    supervisor_email = models.EmailField(blank=True)
    supervisor_phone = models.CharField(max_length=20, blank=True)
    
    coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='mentored_internships'
    )
    completion_status = models.CharField(max_length=30, choices=COMPLETION_CHOICES, default='IN_PROGRESS')
    final_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    final_remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'internships'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.student.name} - {self.role_title} @ {self.organization_name} [{self.status}]"
