from rest_framework import serializers
from apps.progress_reports.models import ProgressReport, ReportEvidence, Feedback

class ReportEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEvidence
        fields = ['id', 'report', 'file_key', 'evidence_url', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class FeedbackSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.name', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'report', 'reviewer', 'reviewer_name', 'comments', 'score', 'created_at']
        read_only_fields = ['id', 'reviewer', 'created_at']

class ProgressReportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    organization_name = serializers.CharField(source='internship.organization_name', read_only=True)
    role_title = serializers.CharField(source='internship.role_title', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    evidence_items = ReportEvidenceSerializer(many=True, read_only=True)
    feedback_entries = FeedbackSerializer(many=True, read_only=True)

    class Meta:
        model = ProgressReport
        fields = [
            'id', 'internship', 'student', 'student_name', 'student_email',
            'organization_name', 'role_title', 'week_number', 'start_date', 'end_date',
            'tasks_completed', 'technical_skills', 'learning_outcomes', 'challenges_faced',
            'solutions_implemented', 'project_progress', 'github_link', 'demo_link',
            'proof_links', 'next_week_plan', 'student_reflection', 'hours_worked',
            'status', 'version_number', 'coordinator_comment', 'reviewed_by', 'reviewed_by_name',
            'submission_timestamp', 'review_timestamp', 'evidence_items',
            'feedback_entries', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_by_name']
