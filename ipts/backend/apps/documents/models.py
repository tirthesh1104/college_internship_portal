import uuid
from django.db import models
from django.conf import settings
from apps.internships.models import Internship

class Document(models.Model):
    DOC_TYPES = (
        ('OFFER_LETTER', 'Internship Offer Letter'),
        ('JOINING_PROOF', 'Joining Confirmation Proof'),
        ('WEEKLY_EVIDENCE', 'Weekly Performance Evidence'),
        ('COMPLETION_CERTIFICATE', 'Internship Completion Certificate'),
        ('LOR', 'Letter of Recommendation (LOR)'),
        ('TRAINING_CERTIFICATE', 'Training / Workshop Certificate'),
        ('PROJECT_REPORT', 'Final Project Report'),
        ('OTHER', 'Other Official Evidence'),
    )

    STATUS_CHOICES = (
        ('NOT_UPLOADED', 'Not Uploaded'),
        ('SUBMITTED', 'Submitted for Verification'),
        ('UNDER_VERIFICATION', 'Under Verification by Coordinator'),
        ('VERIFIED', 'Verified & Approved'),
        ('REJECTED', 'Rejected'),
        ('RESUBMISSION_REQUIRED', 'Resubmission Required'),
    )

    internship = models.ForeignKey(Internship, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_documents')
    document_type = models.CharField(max_length=30, choices=DOC_TYPES, default='OFFER_LETTER')
    title = models.CharField(max_length=200)
    file_key = models.CharField(max_length=255, help_text="Secure private storage key")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True, null=True, help_text="MIME type of the stored file")
    
    issuing_organization = models.CharField(max_length=200, blank=True)
    document_date = models.DateField(null=True, blank=True)
    verification_reference = models.CharField(max_length=150, blank=True, help_text="Ref No / Certificate ID")
    verification_url = models.URLField(max_length=500, blank=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED', db_index=True)
    rejection_reason = models.TextField(blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_documents')
    verified_at = models.DateTimeField(null=True, blank=True)
    
    qr_code_key = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.document_type}) - {self.student.name} [{self.status}]"

