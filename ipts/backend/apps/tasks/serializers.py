from rest_framework import serializers
from apps.tasks.models import ImprovementTask

class ImprovementTaskSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.name', read_only=True)
    organization_name = serializers.CharField(source='internship.organization_name', read_only=True)

    class Meta:
        model = ImprovementTask
        fields = [
            'id', 'internship', 'student', 'student_name', 'assigned_by',
            'assigned_by_name', 'organization_name', 'title', 'description',
            'due_date', 'status', 'student_notes', 'completed_at', 'created_at'
        ]
        read_only_fields = ['id', 'assigned_by', 'created_at']
