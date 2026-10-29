from rest_framework import serializers
from apps.documents.models import Document

class DocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    roll_number = serializers.SerializerMethodField()
    verified_by_name = serializers.CharField(source='verified_by.name', read_only=True)
    organization_name = serializers.CharField(source='internship.organization_name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'internship', 'student', 'student_name', 'student_email',
            'roll_number', 'organization_name', 'document_type', 'title',
            'file_key', 'file_name', 'file_size', 'issuing_organization',
            'document_date', 'verification_reference', 'verification_url',
            'status', 'rejection_reason', 'verified_by', 'verified_by_name',
            'verified_at', 'qr_code_key', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'qr_code_key', 'verified_by', 'verified_at', 'created_at', 'updated_at']

    def get_roll_number(self, obj):
        if hasattr(obj.student, 'student_profile'):
            return obj.student.student_profile.roll_number
        return ''
