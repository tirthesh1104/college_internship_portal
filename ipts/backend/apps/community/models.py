from django.db import models
from django.conf import settings

class ProjectTeam(models.Model):
    STATUS_CHOICES = (
        ('OPEN', 'Recruiting Teammates'),
        ('FULL', 'Team Full'),
        ('CLOSED', 'Project Completed'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    required_skills = models.CharField(max_length=300, help_text="e.g. React, Django, IoT, Embedded C")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_project_teams')
    max_members = models.PositiveIntegerField(default=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_teams'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (Lead: {self.created_by.name})"

class TeamMember(models.Model):
    team = models.ForeignKey(ProjectTeam, on_delete=models.CASCADE, related_name='members')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='joined_teams')
    role = models.CharField(max_length=100, default='Developer / Contributor')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'team_members'
        unique_together = ('team', 'student')

    def __str__(self):
        return f"{self.student.name} in {self.team.title}"

class CommunityPost(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_posts')
    title = models.CharField(max_length=250)
    content = models.TextField()
    category = models.CharField(max_length=100, default='General Discussion')
    tags = models.CharField(max_length=200, blank=True)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'community_posts'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.title} by {self.author.name}"
