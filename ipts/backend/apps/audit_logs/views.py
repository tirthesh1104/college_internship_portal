from rest_framework import serializers, viewsets
from apps.audit_logs.models import AuditLog
from apps.accounts.permissions import IsAdminUserRole

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.name', read_only=True)
    actor_email = serializers.CharField(source='actor.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'actor_email', 'action', 'entity_type', 'entity_id', 'details', 'ip_address', 'created_at']

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUserRole]
    queryset = AuditLog.objects.all().select_related('actor').order_by('-created_at')
    serializer_class = AuditLogSerializer
