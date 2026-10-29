from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from apps.internships.models import Internship
from apps.internships.serializers import InternshipSerializer
from apps.accounts.permissions import IsAdminOrCoordinator
from apps.accounts.views import log_action
from apps.notifications.models import Notification

class InternshipViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Internship.objects.all().select_related('student', 'coordinator', 'opportunity').order_by('-start_date')
        elif user.is_coordinator:
            return Internship.objects.filter(coordinator=user) | Internship.objects.filter(student__student_profile__department__in=[a.department for a in user.assignments.all() if a.department])
        else:
            # Student gets ONLY their own internships
            return Internship.objects.filter(student=user).select_related('coordinator', 'opportunity').order_by('-start_date')

    def perform_create(self, serializer):
        user = self.request.user
        # Student or Coordinator or Admin can record an active internship
        target_student = user
        if not user.is_student:
            student_id = self.request.data.get('student_id')
            from apps.accounts.models import User
            target_student = User.objects.filter(id=student_id).first() or user

        serializer.save(student=target_student, status='ACTIVE')

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def approve_completion(self, request, pk=None):
        internship = self.get_object()
        score = request.data.get('score', 85.0)
        remarks = request.data.get('remarks', 'Successfully verified and completed all internship requirements.')

        internship.completion_status = 'APPROVED'
        internship.status = 'COMPLETED'
        internship.final_score = float(score)
        internship.final_remarks = remarks
        internship.save()

        log_action(request.user, 'INTERNSHIP_COMPLETION_APPROVED', 'Internship', internship.id, f"Approved with score {score}", request)

        # Notify student
        Notification.objects.create(
            recipient=internship.student,
            title="Internship Completed & Approved!",
            message=f"Congratulations! Your internship '{internship.role_title}' at {internship.organization_name} has been approved with a performance score of {score}/100.",
            link="/student/internships",
            notification_type='FEEDBACK'
        )

        return Response({'message': 'Internship marked as completed and approved.', 'internship': InternshipSerializer(internship).data})
