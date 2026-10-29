from django.db import models
from django.conf import settings
from apps.internships.models import Internship

class ImprovementTask(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Assignment'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('OVERDUE', 'Overdue'),
    )

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='tasks')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    title = models.CharField(max_length=200)
    description = models.TextField()
    due_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    student_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['due_date']

    def __str__(self):
        return f"{self.title} - {self.student.name} [{self.status}]"
