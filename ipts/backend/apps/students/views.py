from rest_framework import viewsets, permissions, views, status
from rest_framework.response import Response
from apps.students.models import Department, AcademicYear, StudentProfile
from apps.students.serializers import DepartmentSerializer, AcademicYearSerializer, StudentProfileSerializer
from apps.accounts.permissions import IsAdminUserRole, IsAdminOrCoordinator

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUserRole()]

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUserRole()]

class StudentProfileViewSet(viewsets.ModelViewSet):
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return StudentProfile.objects.all().select_related('user', 'department')
        elif user.is_coordinator:
            # Check coordinator assigned departments or students
            assignments = user.assignments.all()
            dept_ids = [a.department_id for a in assignments if a.department_id]
            coord_profile = getattr(user, 'coordinator_profile', None)
            if coord_profile and coord_profile.department_id and coord_profile.department_id not in dept_ids:
                dept_ids.append(coord_profile.department_id)
            assigned_student_ids = [a.student_id for a in assignments if a.student_id]
            
            qs = StudentProfile.objects.all().select_related('user', 'department')
            if dept_ids or assigned_student_ids:
                return (qs.filter(department_id__in=dept_ids) | qs.filter(user_id__in=assigned_student_ids)).distinct()
            return StudentProfile.objects.none()
        else:
            # Student can ONLY view their own profile — strictly enforced server-side
            return StudentProfile.objects.filter(user=user).select_related('user', 'department')

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        # Ensure student only edits their own profile
        if request.user.is_student and profile.user != request.user:
            return Response({'error': 'You are not permitted to modify another student profile.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

class CareerPassportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id=None):
        user = request.user
        target_user = user
        if student_id and (user.is_admin or user.is_coordinator):
            from apps.accounts.models import User
            target_user = User.objects.filter(id=student_id).first()
            if not target_user:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        if not hasattr(target_user, 'student_profile'):
            return Response({'error': 'No student profile exists for this account.'}, status=status.HTTP_404_NOT_FOUND)

        profile = target_user.student_profile
        internships = target_user.internships.all().select_related('opportunity')
        assessments = target_user.skill_assessments.all().select_related('skill', 'assessed_by')
        documents = target_user.uploaded_documents.filter(status='VERIFIED')

        data = {
            'student_name': target_user.name,
            'email': target_user.email,
            'roll_number': profile.roll_number,
            'department': profile.department.name if profile.department else 'N/A',
            'department_code': profile.department.code if profile.department else 'N/A',
            'academic_year': profile.academic_year,
            'division': profile.division,
            'semester': profile.semester,
            'cgpa': str(profile.cgpa),
            'bio': profile.bio,
            'github_url': profile.github_url,
            'linkedin_url': profile.linkedin_url,
            'portfolio_url': profile.portfolio_url,
            'internships': [
                {
                    'id': i.id,
                    'organization': i.organization_name,
                    'role': i.role_title,
                    'start_date': i.start_date,
                    'end_date': i.end_date,
                    'status': i.status,
                    'final_score': str(i.final_score),
                    'completion_approved': i.completion_status == 'APPROVED'
                }
                for i in internships
            ],
            'verified_skills': [
                {
                    'skill_name': a.skill.name,
                    'category': a.skill.category,
                    'initial_level': a.initial_level,
                    'current_level': a.current_level,
                    'score': str(a.score),
                    'assessment_date': a.assessment_date,
                    'assessed_by': a.assessed_by.name if a.assessed_by else 'Coordinator'
                }
                for a in assessments
            ],
            'verified_credentials': [
                {
                    'title': d.title,
                    'document_type': d.document_type,
                    'issuing_organization': d.issuing_organization,
                    'verification_reference': d.verification_reference,
                    'qr_code_key': d.qr_code_key,
                    'verified_at': d.verified_at
                }
                for d in documents
            ]
        }
        return Response(data)
