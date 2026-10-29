from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    action = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.name if self.actor else 'System'
        return f"[{self.created_at}] {actor_name} -> {self.action} on {self.entity_type}#{self.entity_id}"
