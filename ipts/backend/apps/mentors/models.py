from django.db import models
from django.conf import settings

class Mentor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mentor_profile')
    organization = models.CharField(max_length=200, default='Industry Partner / Alumnus')
    designation = models.CharField(max_length=150, default='Senior Engineer')
    expertise_areas = models.CharField(max_length=300, help_text="e.g. Python, Cloud, Data Science, System Design")
    bio = models.TextField()
    linkedin_url = models.URLField(max_length=300, blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mentors'

    def __str__(self):
        return f"{self.user.name} - {self.designation} ({self.organization})"

class MentorSession(models.Model):
    STATUS_CHOICES = (
        ('REQUESTED', 'Session Requested'),
        ('CONFIRMED', 'Confirmed & Scheduled'),
        ('COMPLETED', 'Session Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE, related_name='sessions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mentoring_sessions')
    scheduled_at = models.DateTimeField()
    topic = models.CharField(max_length=200)
    learning_goals = models.TextField(blank=True)
    meeting_link = models.URLField(max_length=300, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')
    mentor_feedback = models.TextField(blank=True)
    follow_up_tasks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mentor_sessions'
        ordering = ['-scheduled_at']

    def __str__(self):
        return f"{self.student.name} with {self.mentor.user.name} on {self.topic}"
