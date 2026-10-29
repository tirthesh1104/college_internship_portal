from rest_framework import serializers, viewsets, permissions, decorators
from rest_framework.response import Response
from apps.community.models import ProjectTeam, TeamMember, CommunityPost

class TeamMemberSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'student', 'student_name', 'student_email', 'role', 'joined_at']

class ProjectTeamSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='created_by.name', read_only=True)
    lead_email = serializers.CharField(source='created_by.email', read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTeam
        fields = ['id', 'title', 'description', 'required_skills', 'created_by', 'lead_name', 'lead_email', 'max_members', 'status', 'members', 'members_count', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_members_count(self, obj):
        return obj.members.count()

class CommunityPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)

    class Meta:
        model = CommunityPost
        fields = ['id', 'author', 'author_name', 'author_role', 'author_email', 'title', 'content', 'category', 'tags', 'is_pinned', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

class ProjectTeamViewSet(viewsets.ModelViewSet):
    queryset = ProjectTeam.objects.all().prefetch_related('members')
    serializer_class = ProjectTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        team = serializer.save(created_by=self.request.user)
        TeamMember.objects.create(team=team, student=self.request.user, role='Project Lead')

    @decorators.action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        team = self.get_object()
        user = request.user
        if TeamMember.objects.filter(team=team, student=user).exists():
            return Response({'error': 'You are already a member of this team.'}, status=400)
        if team.members.count() >= team.max_members:
            return Response({'error': 'Team is already full.'}, status=400)
        TeamMember.objects.create(team=team, student=user, role=request.data.get('role', 'Developer'))
        if team.members.count() >= team.max_members:
            team.status = 'FULL'
            team.save()
        return Response({'message': f"Joined team '{team.title}' successfully."})

class CommunityPostViewSet(viewsets.ModelViewSet):
    queryset = CommunityPost.objects.all().select_related('author').order_by('-is_pinned', '-created_at')
    serializer_class = CommunityPostSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.author != request.user and request.user.role not in ['ADMIN', 'COORDINATOR']:
            return Response({'error': 'You do not have permission to delete this post.'}, status=403)
        return super().destroy(request, *args, **kwargs)
