from django.db import models
from django.conf import settings

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, default='General Tech')

    class Meta:
        db_table = 'skills'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.category})"

class SkillAssessment(models.Model):
    LEVEL_CHOICES = (
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
        ('EXPERT', 'Expert'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='skill_assessments')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='assessments')
    initial_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='BEGINNER')
    current_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='INTERMEDIATE')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=75.0)
    practical_evidence = models.TextField(blank=True, help_text="Projects, git repos, lab proofs")
    coordinator_feedback = models.TextField(blank=True)
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='conducted_assessments'
    )
    assessment_date = models.DateField(auto_now=True)

    class Meta:
        db_table = 'skill_assessments'
        unique_together = ('student', 'skill')
        ordering = ['-assessment_date']

    def __str__(self):
        return f"{self.student.name} - {self.skill.name}: {self.initial_level} -> {self.current_level}"
