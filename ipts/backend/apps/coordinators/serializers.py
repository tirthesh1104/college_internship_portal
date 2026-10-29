from rest_framework import serializers
from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment

class CoordinatorProfileSerializer(serializers.ModelSerializer):
    coordinator_name = serializers.CharField(source='user.name', read_only=True)
    coordinator_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)

    class Meta:
        model = CoordinatorProfile
        fields = [
            'id', 'user_id', 'coordinator_name', 'coordinator_email', 'employee_id',
            'department', 'department_name', 'department_code', 'designation',
            'phone', 'can_publish_directly', 'created_at'
        ]

class CoordinatorAssignmentSerializer(serializers.ModelSerializer):
    coordinator_name = serializers.CharField(source='coordinator.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = CoordinatorAssignment
        fields = [
            'id', 'coordinator', 'coordinator_name', 'department', 
            'department_code', 'academic_year', 'student', 'student_name', 'created_at'
        ]
