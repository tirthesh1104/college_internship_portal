from rest_framework import serializers
from apps.internships.models import Internship

class InternshipSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    coordinator_name = serializers.CharField(source='coordinator.name', read_only=True)
    roll_number = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()
    reports_count = serializers.SerializerMethodField()
    approved_reports_count = serializers.SerializerMethodField()

    class Meta:
        model = Internship
        fields = [
            'id', 'student', 'student_name', 'student_email', 'roll_number',
            'department_code', 'opportunity', 'organization_name', 'role_title',
            'start_date', 'end_date', 'status', 'supervisor_name', 'supervisor_email',
            'supervisor_phone', 'coordinator', 'coordinator_name', 'completion_status',
            'final_score', 'final_remarks', 'reports_count', 'approved_reports_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'created_at', 'updated_at']

    def get_roll_number(self, obj):
        if hasattr(obj.student, 'student_profile'):
            return obj.student.student_profile.roll_number
        return ''

    def get_department_code(self, obj):
        if hasattr(obj.student, 'student_profile') and obj.student.student_profile.department:
            return obj.student.student_profile.department.code
        return ''

    def get_reports_count(self, obj):
        return obj.reports.count()

    def get_approved_reports_count(self, obj):
        return obj.reports.filter(status='APPROVED').count()
