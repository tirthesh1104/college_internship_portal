from django.db import models
from apps.accounts.models import User


class ExportAuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    export_type = models.CharField(max_length=50)
    filters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.export_type} export by {self.user} at {self.created_at}"
