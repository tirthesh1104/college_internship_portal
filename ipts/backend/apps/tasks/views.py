from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from apps.tasks.models import ImprovementTask
from apps.tasks.serializers import ImprovementTaskSerializer
from apps.accounts.permissions import IsAdminOrCoordinator

class ImprovementTaskViewSet(viewsets.ModelViewSet):
    serializer_class = ImprovementTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return ImprovementTask.objects.all().select_related('student', 'assigned_by', 'internship')
        elif user.is_coordinator:
            return ImprovementTask.objects.filter(assigned_by=user) | ImprovementTask.objects.filter(student__student_profile__department__in=[a.department for a in user.assignments.all() if a.department])
        else:
            return ImprovementTask.objects.filter(student=user).select_related('assigned_by', 'internship')

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_admin or user.is_coordinator):
            raise permissions.PermissionDenied("Only Coordinators or Admins can assign improvement tasks.")
        serializer.save(assigned_by=user)

    @decorators.action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        task = self.get_object()
        notes = request.data.get('student_notes', '')

        task.status = 'COMPLETED'
        task.student_notes = notes
        task.completed_at = timezone.now()
        task.save()

        return Response({'message': 'Task marked as completed.', 'task': ImprovementTaskSerializer(task).data})
