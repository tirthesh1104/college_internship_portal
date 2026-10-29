from rest_framework import serializers
from apps.applications.models import Application
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunitySerializer

class ApplicationSerializer(serializers.ModelSerializer):
    opportunity_details = OpportunitySerializer(source='opportunity', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    roll_number = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'student', 'student_name', 'student_email', 'roll_number', 
            'department_code', 'opportunity', 'opportunity_details', 'status',
            'resume_url', 'cover_letter', 'external_applied', 'external_reference_proof',
            'reviewer_feedback', 'reviewed_by', 'reviewed_at', 'applied_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'applied_at', 'updated_at', 'reviewed_by', 'reviewed_at']

    def get_roll_number(self, obj):
        if hasattr(obj.student, 'student_profile'):
            return obj.student.student_profile.roll_number
        return ''

    def get_department_code(self, obj):
        if hasattr(obj.student, 'student_profile') and obj.student.student_profile.department:
            return obj.student.student_profile.department.code
        return ''

    def validate(self, data):
        request = self.context.get('request')
        opp = data.get('opportunity')
        if request and request.method == 'POST' and opp:
            student = request.user
            if Application.objects.filter(student=student, opportunity=opp).exists():
                raise serializers.ValidationError("You have already submitted an application for this opportunity.")
            if opp.status != 'PUBLISHED':
                raise serializers.ValidationError("You cannot apply to an unpublished opportunity.")
        return data
