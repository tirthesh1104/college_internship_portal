from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.conf import settings
from apps.internships.models import Internship


class ProgressReport(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft - In Progress'),
        ('SUBMITTED', 'Submitted - Waiting for Review'),
        ('UNDER_REVIEW', 'Under Review by Coordinator'),
        ('NEEDS_IMPROVEMENT', 'Needs Improvement / Revisions Requested'),
        ('APPROVED', 'Approved by Coordinator'),
    )

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='reports')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='progress_reports')
    week_number = models.PositiveIntegerField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    tasks_completed = models.TextField()
    technical_skills = models.CharField(max_length=300, help_text="e.g. Python, REST APIs, Git, PostgreSQL/MySQL")
    learning_outcomes = models.TextField()
    challenges_faced = models.TextField(blank=True)
    solutions_implemented = models.TextField(blank=True)
    project_progress = models.TextField(blank=True)

    github_link = models.URLField(max_length=300, blank=True)
    demo_link = models.URLField(max_length=300, blank=True)
    proof_links = models.JSONField(blank=True, default=list, help_text='Array of proof/evidence URLs (HTTP/HTTPS only)')

    next_week_plan = models.TextField()
    student_reflection = models.TextField(blank=True)

    hours_worked = models.PositiveIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(80),
        ],
        help_text='Hours worked this week (0-80)',
    )

    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    version_number = models.PositiveIntegerField(default=1)

    coordinator_comment = models.TextField(blank=True, help_text='Coordinator review comment')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_reports',
    )

    submission_timestamp = models.DateTimeField(null=True, blank=True)
    review_timestamp = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'progress_reports'
        ordering = ['-week_number']
        unique_together = ('internship', 'week_number')
        constraints = [
            models.CheckConstraint(
                check=models.Q(hours_worked__gte=0) & models.Q(hours_worked__lte=80),
                name='progress_reports_hours_worked_range',
            ),
            models.CheckConstraint(
                check=models.Q(week_number__gte=1),
                name='progress_reports_week_number_positive',
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'internship'], name='idx_status_internship'),
            models.Index(fields=['student', 'status'], name='idx_student_status'),
            models.Index(fields=['submission_timestamp'], name='idx_submission_ts'),
        ]

    def __str__(self):
        return f"{self.student.name} - Week {self.week_number} [{self.status}]"


class PointTransaction(models.Model):
    """Model to store point transactions for leaderboard and auditing."""
    POINT_REASONS = (
        ('WEEKLY_REPORT_APPROVED', 'Approved weekly progress report'),
        ('CERTIFICATE_UPLOAD', 'Certificate upload'),
        ('OFFER_LETTER_UPLOAD', 'Offer letter upload'),
        ('INTERNSHIP_COMPLETED', 'Internship completed'),
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='point_transactions'
    )
    reason = models.CharField(max_length=30, choices=POINT_REASONS)
    points_awarded = models.PositiveIntegerField()
    # Associate with the triggering event
    report = models.ForeignKey(
        ProgressReport, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='point_transactions'
    )
    internship = models.ForeignKey(
        Internship, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='point_transactions'
    )
    document = models.ForeignKey(
        'documents.Document', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='point_transactions'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'point_transactions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', '-timestamp'], name='idx_student_ts'),
            models.Index(fields=['reason', '-timestamp'], name='idx_reason_ts'),
        ]

    def __str__(self):
        return f"{self.student.name}: {self.points_awarded} points ({self.reason}) at {self.timestamp}"


class ConsecutiveStreak(models.Model):
    """Track consecutive reporting weeks for each student."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consecutive_streaks'
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_qualifying_week = models.PositiveIntegerField(null=True, blank=True)
    last_week_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consecutive_streaks'
        constraints = [
            models.UniqueConstraint(
                fields=['student'],
                name='unique_streak_per_student'
            )
        ]

    def __str__(self):
        return f"{self.student.name}: {self.current_streak} week streak (longest: {self.longest_streak})"

class ReportEvidence(models.Model):
    report = models.ForeignKey(ProgressReport, on_delete=models.CASCADE, related_name='evidence_items')
    file_key = models.CharField(max_length=255, blank=True)
    evidence_url = models.URLField(max_length=500, blank=True)
    description = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_evidence'

class Feedback(models.Model):
    report = models.ForeignKey(ProgressReport, on_delete=models.CASCADE, related_name='feedback_entries')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_feedback')
    comments = models.TextField()
    score = models.DecimalField(max_digits=5, decimal_places=2, default=80.0) # score out of 100
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback by {self.reviewer.name} for Report #{self.report_id} (Score: {self.score})"
