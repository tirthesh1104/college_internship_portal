from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_CHOICES = (
        ('OPPORTUNITY', 'Internship Opportunity Alert'),
        ('APPLICATION', 'Application Status Update'),
        ('REPORT', 'Weekly Progress Report'),
        ('FEEDBACK', 'Coordinator Feedback & Assessment'),
        ('TASK', 'Improvement Task Assigned'),
        ('DOCUMENT', 'Document Verification Alert'),
        ('SYSTEM', 'System Announcement'),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='SYSTEM')
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"To: {self.recipient.name} - {self.title}"
