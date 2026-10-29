from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.assessments.models import Skill, SkillAssessment
from apps.assessments.serializers import SkillSerializer, SkillAssessmentSerializer
from apps.accounts.permissions import IsAdminOrCoordinator

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrCoordinator()]

class SkillAssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = SkillAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_coordinator:
            return SkillAssessment.objects.all().select_related('student', 'skill', 'assessed_by')
        else:
            return SkillAssessment.objects.filter(student=user).select_related('skill', 'assessed_by')

    def perform_create(self, serializer):
        user = self.request.user
        # Coordinator or Admin conducts assessment
        serializer.save(assessed_by=user if (user.is_admin or user.is_coordinator) else None)
