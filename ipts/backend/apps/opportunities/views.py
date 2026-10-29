from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunitySerializer
from apps.accounts.permissions import IsAdminUserRole, IsAdminOrCoordinator
from apps.accounts.views import log_action
from apps.notifications.models import Notification
from apps.accounts.models import User

class OpportunityViewSet(viewsets.ModelViewSet):
    serializer_class = OpportunitySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Opportunity.objects.all().select_related('created_by').prefetch_related('target_departments')

        # Role-based visibility
        if not user.is_authenticated or user.is_student:
            # Students & public can ONLY view published, approved opportunities
            qs = qs.filter(status='PUBLISHED')
        elif user.is_coordinator:
            # Coordinators see published opportunities, plus their own drafts/submissions
            qs = qs.filter(Q(status='PUBLISHED') | Q(created_by=user))
        # Admin sees all

        # Search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | 
                Q(organization__icontains=search) | 
                Q(required_skills__icontains=search)
            )

        # Type filter
        op_type = self.request.query_params.get('type')
        if op_type:
            qs = qs.filter(opportunity_type=op_type)

        # Mode filter
        mode = self.request.query_params.get('mode')
        if mode:
            qs = qs.filter(mode=mode)

        # Country filter
        country = self.request.query_params.get('country')
        if country:
            qs = qs.filter(country__iexact=country)

        # Status filter for Admin/Coordinator
        status_param = self.request.query_params.get('status')
        if status_param and (user.is_authenticated and (user.is_admin or user.is_coordinator)):
            qs = qs.filter(status=status_param)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated or user.is_student:
            raise permissions.PermissionDenied("Students are not permitted to create opportunities.")

        initial_status = 'DRAFT'
        if user.is_admin:
            # Admin can publish directly
            initial_status = self.request.data.get('status', 'PUBLISHED')
        elif user.is_coordinator:
            # Coordinator can publish directly only if explicitly authorized
            profile = getattr(user, 'coordinator_profile', None)
            if profile and profile.can_publish_directly:
                initial_status = self.request.data.get('status', 'PUBLISHED')
            else:
                initial_status = 'DRAFT'

        published_at = timezone.now() if initial_status == 'PUBLISHED' else None
        opp = serializer.save(created_by=user, status=initial_status, published_at=published_at)
        log_action(user, 'CREATE_OPPORTUNITY', 'Opportunity', opp.id, f"Created {opp.title} ({initial_status})", self.request)

    @decorators.action(detail=True, methods=['post'], url_path='submit-review')
    def submit_review(self, request, pk=None):
        opp = self.get_object()
        user = request.user

        if opp.created_by != user and not user.is_admin:
            return Response({'error': 'You can only submit your own draft opportunities for review.'}, status=status.HTTP_403_FORBIDDEN)

        opp.status = 'PENDING_APPROVAL'
        opp.save()
        log_action(user, 'OPPORTUNITY_SUBMITTED_FOR_REVIEW', 'Opportunity', opp.id, f"Coordinator {user.name} submitted {opp.title}", request)

        # Notify all admins
        admins = User.objects.filter(Q(role='ADMIN') | Q(is_superuser=True))
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title="New Opportunity Submitted for Review",
                message=f"Coordinator {user.name} submitted '{opp.title}' at {opp.organization} for approval.",
                link=f"/admin/opportunities",
                notification_type='OPPORTUNITY'
            )

        return Response({'message': 'Opportunity submitted for Admin review successfully.', 'opportunity': OpportunitySerializer(opp).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def approve(self, request, pk=None):
        opp = self.get_object()
        opp.status = 'APPROVED'
        opp.rejection_reason = ''
        opp.save()
        log_action(request.user, 'OPPORTUNITY_APPROVED', 'Opportunity', opp.id, f"Admin approved {opp.title}", request)

        # Notify creator
        Notification.objects.create(
            recipient=opp.created_by,
            title="Opportunity Approved!",
            message=f"Your opportunity '{opp.title}' has been approved by the Admin and is ready to publish.",
            link=f"/coordinator/opportunities",
            notification_type='OPPORTUNITY'
        )

        return Response({'message': 'Opportunity approved successfully.', 'opportunity': OpportunitySerializer(opp).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def reject(self, request, pk=None):
        opp = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Please provide a reason for rejecting the opportunity.'}, status=status.HTTP_400_BAD_REQUEST)

        opp.status = 'REJECTED'
        opp.rejection_reason = reason
        opp.save()
        log_action(request.user, 'OPPORTUNITY_REJECTED', 'Opportunity', opp.id, f"Admin rejected {opp.title}: {reason}", request)

        # Notify creator
        Notification.objects.create(
            recipient=opp.created_by,
            title="Opportunity Rejection Notice",
            message=f"Your opportunity '{opp.title}' was rejected. Reason: {reason}",
            link=f"/coordinator/opportunities",
            notification_type='OPPORTUNITY'
        )

        return Response({'message': 'Opportunity marked as rejected.', 'opportunity': OpportunitySerializer(opp).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def publish(self, request, pk=None):
        opp = self.get_object()
        user = request.user

        if not user.is_admin:
            profile = getattr(user, 'coordinator_profile', None)
            if not (profile and profile.can_publish_directly):
                if opp.status != 'APPROVED':
                    return Response({'error': 'Opportunities must be approved by the Admin before publishing.'}, status=status.HTTP_403_FORBIDDEN)

        opp.status = 'PUBLISHED'
        opp.published_at = timezone.now()
        opp.save()
        log_action(user, 'OPPORTUNITY_PUBLISHED', 'Opportunity', opp.id, f"Published {opp.title}", request)

        return Response({'message': 'Opportunity is now live and published to all eligible students.', 'opportunity': OpportunitySerializer(opp).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def unpublish(self, request, pk=None):
        opp = self.get_object()
        opp.status = 'UNPUBLISHED'
        opp.save()
        log_action(request.user, 'OPPORTUNITY_UNPUBLISHED', 'Opportunity', opp.id, f"Unpublished {opp.title}", request)
        return Response({'message': 'Opportunity unpublished.', 'opportunity': OpportunitySerializer(opp).data})
