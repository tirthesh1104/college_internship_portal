from rest_framework import serializers
from apps.students.models import Department, AcademicYear, StudentProfile
from apps.accounts.models import User

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'year_label', 'is_active']

class StudentProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='user.name', read_only=True)
    student_email = serializers.CharField(source='user.email', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user_id', 'student_name', 'student_email', 'roll_number', 'prn_number',
            'department', 'department_code', 'department_name', 'academic_year', 'registration_date',
            'division', 'semester', 'phone', 'cgpa', 'bio', 'github_url', 
            'linkedin_url', 'portfolio_url', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'user_id', 'created_at']
