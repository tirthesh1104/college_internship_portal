from rest_framework import serializers, viewsets, permissions, status
from rest_framework.response import Response
from apps.mentors.models import Mentor, MentorSession
from apps.accounts.permissions import IsAdminOrCoordinator

class MentorSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='user.name', read_only=True)
    mentor_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Mentor
        fields = ['id', 'user', 'mentor_name', 'mentor_email', 'organization', 'designation', 'expertise_areas', 'bio', 'linkedin_url', 'is_available', 'created_at']
        read_only_fields = ['id', 'created_at']

class MentorSessionSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='mentor.user.name', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = MentorSession
        fields = ['id', 'mentor', 'mentor_name', 'student', 'student_name', 'scheduled_at', 'topic', 'learning_goals', 'meeting_link', 'status', 'mentor_feedback', 'follow_up_tasks', 'created_at']
        read_only_fields = ['id', 'student', 'created_at']

class MentorViewSet(viewsets.ModelViewSet):
    queryset = Mentor.objects.filter(is_available=True)
    serializer_class = MentorSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrCoordinator()]

class MentorSessionViewSet(viewsets.ModelViewSet):
    serializer_class = MentorSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_coordinator:
            return MentorSession.objects.all().select_related('mentor', 'student')
        return MentorSession.objects.filter(student=user).select_related('mentor')

    def perform_create(self, serializer):
        serializer.save(student=self.request.user, status='REQUESTED')
