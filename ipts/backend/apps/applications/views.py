from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from apps.applications.models import Application
from apps.applications.serializers import ApplicationSerializer
from apps.accounts.permissions import IsAdminOrCoordinator
from apps.accounts.views import log_action
from apps.notifications.models import Notification
from apps.internships.models import Internship

class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Application.objects.all().select_related('student', 'opportunity').order_by('-applied_at')
        elif user.is_coordinator:
            # Applications for assigned students or created opportunities
            return Application.objects.filter(opportunity__created_by=user) | Application.objects.filter(student__student_profile__department__in=[a.department for a in user.assignments.all() if a.department])
        else:
            # Student can ONLY access their own applications
            return Application.objects.filter(student=user).select_related('student', 'opportunity').order_by('-applied_at')

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_student:
            raise permissions.PermissionDenied("Only students can apply for opportunities.")
        
        app = serializer.save(student=user, status='SUBMITTED')
        log_action(user, 'STUDENT_SUBMIT_APPLICATION', 'Application', app.id, f"Applied to {app.opportunity.title}", self.request)

        # Notify coordinator or opportunity creator
        recipient = app.opportunity.created_by
        if recipient and recipient != user:
            Notification.objects.create(
                recipient=recipient,
                title="New Student Application",
                message=f"Student {user.name} applied for '{app.opportunity.title}'.",
                link="/coordinator/applications",
                notification_type='APPLICATION'
            )

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def review(self, request, pk=None):
        app = self.get_object()
        new_status = request.data.get('status')
        feedback = request.data.get('reviewer_feedback', '').strip()

        valid_statuses = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN']
        if new_status not in valid_statuses:
            return Response({'error': f"Invalid status. Choose from: {', '.join(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)

        app.status = new_status
        app.reviewer_feedback = feedback
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()

        log_action(request.user, 'APPLICATION_STATUS_UPDATED', 'Application', app.id, f"Status updated to {new_status}", request)

        # If SELECTED, ensure an Internship entry is initialized or ready
        if new_status == 'SELECTED':
            Internship.objects.get_or_create(
                student=app.student,
                opportunity=app.opportunity,
                defaults={
                    'organization_name': app.opportunity.organization,
                    'role_title': app.opportunity.title,
                    'start_date': app.opportunity.start_date or timezone.now().date(),
                    'end_date': app.opportunity.end_date or (timezone.now() + timezone.timedelta(days=60)).date(),
                    'status': 'ACTIVE',
                    'coordinator': app.opportunity.created_by if app.opportunity.created_by.is_coordinator else request.user
                }
            )

        # Notify student of application status update
        Notification.objects.create(
            recipient=app.student,
            title=f"Application Update: {new_status}",
            message=f"Your application for '{app.opportunity.title}' has been updated to {new_status}. {feedback}",
            link="/student/applications",
            notification_type='APPLICATION'
        )

        return Response({'message': f"Application marked as {new_status}.", 'application': ApplicationSerializer(app).data})
