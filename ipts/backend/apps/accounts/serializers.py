import os
from rest_framework import serializers
from django.contrib.auth import authenticate
from apps.accounts.models import User
from apps.students.models import StudentProfile, Department


class UserSerializer(serializers.ModelSerializer):
    student_profile = serializers.SerializerMethodField()
    coordinator_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'is_active', 'created_at', 'student_profile', 'coordinator_profile']
        read_only_fields = ['id', 'created_at']

    def get_student_profile(self, obj):
        if hasattr(obj, 'student_profile'):
            profile = obj.student_profile
            return {
                'id': profile.id,
                'roll_number': profile.roll_number,
                'prn_number': profile.prn_number,
                'department_id': profile.department_id,
                'department_code': profile.department.code if profile.department else '',
                'department_name': profile.department.name if profile.department else '',
                'academic_year': profile.academic_year,
                'registration_date': str(profile.registration_date) if profile.registration_date else '',
                'division': profile.division,
                'semester': profile.semester,
                'phone': profile.phone,
                'cgpa': str(profile.cgpa),
                'bio': profile.bio,
                'github_url': profile.github_url,
                'linkedin_url': profile.linkedin_url,
                'portfolio_url': profile.portfolio_url,
                'is_verified': profile.is_verified,
            }
        return None

    def get_coordinator_profile(self, obj):
        if hasattr(obj, 'coordinator_profile'):
            profile = obj.coordinator_profile
            return {
                'id': profile.id,
                'employee_id': profile.employee_id,
                'department_id': profile.department_id,
                'department_code': profile.department.code if profile.department else '',
                'designation': profile.designation,
                'phone': profile.phone,
                'can_publish_directly': profile.can_publish_directly,
            }
        return None


class StudentRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    roll_number = serializers.CharField(write_only=True)
    prn_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department_id = serializers.IntegerField(write_only=True, required=False)
    academic_year = serializers.CharField(write_only=True, required=False, default='2026-2027')
    registration_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    division = serializers.CharField(write_only=True, required=False, default='A')

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'roll_number', 'prn_number', 'department_id', 'academic_year', 'registration_date', 'division']

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_roll_number(self, value):
        value = value.strip().upper()
        if StudentProfile.objects.filter(roll_number=value).exists():
            raise serializers.ValidationError("A student with this Roll Number is already registered.")
        return value

    def validate_prn_number(self, value):
        if value:
            value = value.strip().upper()
            if StudentProfile.objects.filter(prn_number=value).exclude(prn_number='').exists():
                raise serializers.ValidationError("A student with this PRN Number is already registered.")
        return value

    def create(self, validated_data):
        roll_number = validated_data.pop('roll_number')
        prn_number = validated_data.pop('prn_number', '')
        dept_id = validated_data.pop('department_id', None)
        academic_year = validated_data.pop('academic_year', '2026-2027')
        registration_date = validated_data.pop('registration_date', None)
        division = validated_data.pop('division', 'A')

        # FORCE role to STUDENT — user can NEVER self-assign Admin or Coordinator
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password'],
            role='STUDENT'
        )

        dept = None
        if dept_id:
            dept = Department.objects.filter(id=dept_id).first()
        if not dept:
            dept = Department.objects.filter(code='CSE').first() or Department.objects.first()

        StudentProfile.objects.create(
            user=user,
            roll_number=roll_number,
            prn_number=prn_number or '',
            department=dept,
            academic_year=academic_year,
            registration_date=registration_date,
            division=division,
            is_verified=True
        )

        return user


class CoordinatorRegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    security_pin = serializers.CharField(write_only=True)
    employee_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department_id = serializers.IntegerField(write_only=True, required=False, default=1)
    designation = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'security_pin', 'employee_id', 'department_id', 'designation', 'phone']

    def validate_email(self, value):
        if not value:
            return ''
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_security_pin(self, value):
        if str(value).strip() != '77':
            raise serializers.ValidationError("Invalid Coordinator security PIN.")
        return value

    def create(self, validated_data):
        import time
        validated_data.pop('security_pin', None)
        employee_id = validated_data.pop('employee_id', '')
        dept_id = validated_data.pop('department_id', 1)
        designation = validated_data.pop('designation', 'Department T&P Coordinator')
        phone = validated_data.pop('phone', '')
        email = validated_data.get('email') or f"coordinator.{int(time.time() * 1000)}@mitcorer.edu.in"
        password = validated_data.get('password') or f"coord_pin_{int(time.time() * 1000)}"

        user = User.objects.create_user(
            email=email,
            name=validated_data['name'],
            password=password,
            role='COORDINATOR',
            is_staff=False
        )

        dept = Department.objects.filter(id=dept_id).first() or Department.objects.filter(code='CSE').first()
        from apps.coordinators.models import CoordinatorProfile, CoordinatorAssignment
        CoordinatorProfile.objects.create(
            user=user,
            employee_id=(employee_id.strip().upper() if employee_id else f"COORD-{user.id}"),
            department=dept,
            designation=designation or 'Department T&P Coordinator',
            phone=phone or ''
        )
        if dept:
            CoordinatorAssignment.objects.get_or_create(
                coordinator=user,
                department=dept,
                student=None
            )
        return user


class AdminRegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    security_pin = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'security_pin']

    def validate_email(self, value):
        if not value:
            return ''
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_security_pin(self, value):
        if str(value).strip() != '123':
            raise serializers.ValidationError("Invalid Admin security PIN.")
        return value

    def create(self, validated_data):
        import time
        validated_data.pop('security_pin', None)
        email = validated_data.get('email') or f"admin.{int(time.time() * 1000)}@mitcorer.edu.in"
        password = validated_data.get('password') or f"admin_pin_{int(time.time() * 1000)}"
        user = User.objects.create_user(
            email=email,
            name=validated_data['name'],
            password=password,
            role='ADMIN',
            is_staff=True
        )
        return user


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    roll_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    employee_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role', 'roll_number', 'employee_id', 'department_id']

    def create(self, validated_data):
        role = validated_data.get('role', 'STUDENT')
        roll_number = validated_data.pop('roll_number', None)
        employee_id = validated_data.pop('employee_id', None)
        department_id = validated_data.pop('department_id', None)

        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password'],
            role=role,
            is_staff=(role == 'ADMIN')
        )

        dept = Department.objects.filter(id=department_id).first() if department_id else None

        if role == 'STUDENT' and roll_number:
            StudentProfile.objects.create(
                user=user,
                roll_number=roll_number,
                department=dept,
                is_verified=True
            )
        elif role == 'COORDINATOR':
            from apps.coordinators.models import CoordinatorProfile
            CoordinatorProfile.objects.create(
                user=user,
                employee_id=employee_id or f"EMP{user.id}",
                department=dept
            )

        return user
