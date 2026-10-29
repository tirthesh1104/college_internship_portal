from rest_framework import viewsets, permissions
from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment
from apps.coordinators.serializers import CoordinatorProfileSerializer, CoordinatorAssignmentSerializer
from apps.accounts.permissions import IsAdminUserRole, IsAdminOrCoordinator

class CoordinatorProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CoordinatorProfileSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]

    def get_queryset(self):
        return CoordinatorProfile.objects.all().select_related('user', 'department')

class CoordinatorAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = CoordinatorAssignmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return CoordinatorAssignment.objects.all().select_related('coordinator', 'department', 'student')
        elif user.is_coordinator:
            return CoordinatorAssignment.objects.filter(coordinator=user).select_related('coordinator', 'department', 'student')
        return CoordinatorAssignment.objects.none()
