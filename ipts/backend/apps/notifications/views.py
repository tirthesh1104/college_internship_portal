from rest_framework import viewsets, permissions, decorators
from rest_framework.response import Response
from django.utils import timezone
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @decorators.action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.read_at = timezone.now()
        notif.save()
        return Response({'message': 'Marked as read', 'notification': NotificationSerializer(notif).data})

    @decorators.action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({'message': 'All notifications marked as read'})
