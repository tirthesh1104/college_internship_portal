from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from django.db.models import Count, Q, F, Max, Min
from django.db import IntegrityError
from apps.progress_reports.models import ProgressReport, ReportEvidence, Feedback
from apps.progress_reports.serializers import ProgressReportSerializer, FeedbackSerializer, ReportEvidenceSerializer
from apps.accounts.permissions import IsAdminOrCoordinator
from apps.accounts.views import log_action
from apps.notifications.models import Notification
from apps.tasks.models import ImprovementTask
from apps.accounts.models import User
from apps.students.models import StudentProfile
from apps.internships.models import Internship

class ProgressReportViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return ProgressReport.objects.all().select_related('student', 'internship').prefetch_related('evidence_items', 'feedback_entries')
        elif user.is_coordinator:
            return ProgressReport.objects.filter(internship__coordinator=user) | ProgressReport.objects.filter(student__student_profile__department__in=[a.department for a in user.assignments.all() if a.department])
        else:
            # Student strictly sees ONLY their own progress reports
            return ProgressReport.objects.filter(student=user).select_related('internship').prefetch_related('evidence_items', 'feedback_entries')

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_student:
            raise permissions.PermissionDenied("Only students can create weekly progress reports.")

        # Validate hours_worked
        hours_worked = self.request.data.get('hours_worked', 0)
        try:
            hours_worked = int(hours_worked)
        except (ValueError, TypeError):
            hours_worked = 0
        if hours_worked < 0 or hours_worked > 80:
            raise permissions.PermissionDenied("Hours worked must be between 0 and 80.")

        # Validate proof_links are HTTP/HTTPS only
        proof_links = self.request.data.get('proof_links', [])
        if isinstance(proof_links, list):
            for link in proof_links:
                if link and not (link.startswith('http://') or link.startswith('https://')):
                    raise permissions.PermissionDenied(f"Invalid proof link: {link}. Only HTTP/HTTPS URLs are allowed.")

        report_status = self.request.data.get('status', 'DRAFT')
        if report_status not in ['DRAFT', 'SUBMITTED']:
            report_status = 'DRAFT'

        sub_time = timezone.now() if report_status == 'SUBMITTED' else None
        report = serializer.save(
            student=user,
            status=report_status,
            submission_timestamp=sub_time,
            hours_worked=hours_worked,
            proof_links=proof_links if isinstance(proof_links, list) else [],
        )
        log_action(user, 'PROGRESS_REPORT_SAVED', 'ProgressReport', report.id, f"Week {report.week_number} [{report_status}]", self.request)

        if report_status == 'SUBMITTED':
            # Notify all authorized staff (admin + coordinator)
            from apps.notifications.models import Notification as NotifModel
            staff_users = User.objects.filter(role__in=['ADMIN', 'COORDINATOR'], is_active=True)
            for staff in staff_users:
                NotifModel.objects.create(
                    recipient=staff,
                    title=f"New Report Submitted: {user.name}",
                    message=f"Student {user.name} submitted Week {report.week_number} report for '{report.internship.role_title}'.",
                    link="/management/reports",
                    notification_type='REPORT'
                )
            # Also notify the internship's assigned coordinator specifically
            coord = report.internship.coordinator
            if coord and coord.role == 'COORDINATOR':
                # Avoid duplicate if already in staff list
                pass

    def update(self, request, *args, **kwargs):
        report = self.get_object()
        user = request.user

        # Students can only edit their own reports
        if user.is_student:
            if report.student != user:
                return Response({'error': 'You cannot edit another student report.'}, status=status.HTTP_403_FORBIDDEN)
            if report.status == 'APPROVED':
                return Response({'error': 'Approved reports are locked and cannot be edited.'}, status=status.HTTP_400_BAD_REQUEST)
            # Students cannot modify protected review fields
            protected_fields = ['status', 'coordinator_comment', 'reviewed_by', 'reviewed_at']
            for field in protected_fields:
                if field in request.data:
                    return Response({'error': f'Students cannot modify {field}.'}, status=status.HTTP_403_FORBIDDEN)
            # A Needs Improvement report resubmitted goes back to Pending/SUBMITTED
            if report.status == 'NEEDS_IMPROVEMENT':
                request.data['status'] = 'SUBMITTED'
                request.data['submission_timestamp'] = timezone.now()
                report.version_number = (report.version_number or 1) + 1

        return super().update(request, *args, **kwargs)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        report = self.get_object()
        user = request.user
        if report.student != user:
            return Response({'error': 'You can only submit your own report.'}, status=status.HTTP_403_FORBIDDEN)

        report.status = 'SUBMITTED'
        report.submission_timestamp = timezone.now()
        report.version_number += 1
        report.save()

        log_action(user, 'PROGRESS_REPORT_SUBMITTED', 'ProgressReport', report.id, f"Week {report.week_number} submitted (v{report.version_number})", request)

        coord = report.internship.coordinator
        if coord:
            Notification.objects.create(
                recipient=coord,
                title=f"Report Resubmitted: {user.name}",
                message=f"Student {user.name} submitted Week {report.week_number} progress report.",
                link="/coordinator/progress-reports",
                notification_type='REPORT'
            )

        return Response({'message': f"Week {report.week_number} report submitted successfully.", 'report': ProgressReportSerializer(report).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def feedback(self, request, pk=None):
        report = self.get_object()
        reviewer = request.user
        comments = request.data.get('comments', '').strip()
        score = request.data.get('score', 80.0)
        decision = request.data.get('decision', 'APPROVED') # APPROVED or NEEDS_IMPROVEMENT
        task_title = request.data.get('task_title', '').strip()
        task_due_date = request.data.get('task_due_date')

        if not comments:
            return Response({'error': 'Please provide constructive feedback comments.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_decisions = ['APPROVED', 'NEEDS_IMPROVEMENT', 'UNDER_REVIEW']
        if decision not in valid_decisions:
            decision = 'APPROVED'

        # Record feedback
        fb = Feedback.objects.create(
            report=report,
            reviewer=reviewer,
            comments=comments,
            score=float(score)
        )

        report.status = decision
        report.review_timestamp = timezone.now()
        report.coordinator_comment = comments
        report.reviewed_by = reviewer
        report.save()

        # If needs improvement and task details provided, create an improvement task
        if decision == 'NEEDS_IMPROVEMENT' and task_title:
            ImprovementTask.objects.create(
                internship=report.internship,
                student=report.student,
                assigned_by=reviewer,
                title=task_title,
                description=f"Improvement task linked to Week {report.week_number}: {comments}",
                due_date=task_due_date or (timezone.now() + timezone.timedelta(days=7)).date(),
                status='PENDING'
            )

        log_action(reviewer, 'COORDINATOR_FEEDBACK_GIVEN', 'ProgressReport', report.id, f"Decision: {decision}, Score: {score}", request)

        # Notify student
        Notification.objects.create(
            recipient=report.student,
            title=f"Report Feedback: Week {report.week_number} ({decision})",
            message=f"Coordinator {reviewer.name} reviewed your report. Score: {score}/100. Comments: {comments[:100]}...",
            link="/student/progress-reports",
            notification_type='FEEDBACK'
        )

        return Response({
            'message': f"Feedback recorded with status: {decision}.",
            'report': ProgressReportSerializer(report).data,
            'feedback': FeedbackSerializer(fb).data
        })

    @decorators.action(detail=True, methods=['post'])
    def add_evidence(self, request, pk=None):
        report = self.get_object()
        if request.user.is_student and report.student != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        desc = request.data.get('description', 'Evidence Item')
        url = request.data.get('evidence_url', '')
        file_key = request.data.get('file_key', '')

        evidence = ReportEvidence.objects.create(
            report=report,
            description=desc,
            evidence_url=url,
            file_key=file_key
        )
        return Response(ReportEvidenceSerializer(evidence).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_progress_summary(request):
    """Progress summary for the authenticated student across all ongoing internships."""
    user = request.user
    if not user.is_student:
        return Response({'error': 'Only students can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

    internships = Internship.objects.filter(student=user, status='ACTIVE').select_related('opportunity')
    summary = []
    total_reports = 0
    total_approved = 0
    total_hours = 0

    for internship in internships:
        reports = ProgressReport.objects.filter(internship=internship)
        approved_reports = reports.filter(status='APPROVED')
        total_reports_for_internship = reports.count()
        approved_count = approved_reports.count()
        hours = sum((r.hours_worked or 0) for r in reports)

        today = timezone.now().date()
        start_date = internship.start_date
        if start_date:
            days_elapsed = (today - start_date).days
            expected_reports = max(1, (days_elapsed // 7) + 1)
        else:
            expected_reports = 1

        progress_pct = min(100, int((approved_count / expected_reports) * 100)) if expected_reports > 0 else 0

        week_nums = sorted(set(r.week_number for r in reports if r.status in ['SUBMITTED', 'APPROVED', 'NEEDS_IMPROVEMENT']))
        streak = 0
        if week_nums:
            streak = 1
            for i in range(1, len(week_nums)):
                if week_nums[i] == week_nums[i - 1] + 1:
                    streak += 1
                else:
                    streak = 1

        latest_report = reports.order_by('-created_at').first()

        summary.append({
            'internship_id': internship.id,
            'organization_name': internship.organization_name,
            'role_title': internship.role_title,
            'start_date': internship.start_date,
            'end_date': internship.end_date,
            'total_reports': total_reports_for_internship,
            'approved_reports': approved_count,
            'total_hours': hours,
            'expected_reports': expected_reports,
            'progress_percentage': progress_pct,
            'current_streak': streak,
            'latest_report_status': latest_report.status if latest_report else None,
            'latest_submission_date': latest_report.submission_timestamp if latest_report else None,
        })

        total_reports += total_reports_for_internship
        total_approved += approved_count
        total_hours += hours

    overall_progress = min(100, int((total_approved / max(1, sum(s['expected_reports'] for s in summary))) * 100)) if summary else 0

    return Response({
        'total_reports_submitted': total_reports,
        'total_approved_reports': total_approved,
        'total_hours_worked': total_hours,
        'overall_progress_percentage': overall_progress,
        'internships': summary,
    })


@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def staff_students_list(request):
    """List of students with their internship status and progress for staff monitoring."""
    user = request.user
    is_admin = user.is_admin

    if is_admin:
        students = User.objects.filter(role='STUDENT', is_active=True).select_related('student_profile')
    else:
        assignments = user.assignments.all()
        dept_ids = [a.department_id for a in assignments if a.department_id]
        coord_profile = getattr(user, 'coordinator_profile', None)
        if coord_profile and coord_profile.department_id and coord_profile.department_id not in dept_ids:
            dept_ids.append(coord_profile.department_id)
        assigned_student_ids = [a.student_id for a in assignments if a.student_id]
        students = User.objects.filter(
            role='STUDENT', is_active=True
        ).filter(
            Q(student_profile__department_id__in=dept_ids) | Q(id__in=assigned_student_ids)
        ).select_related('student_profile').distinct()

    data = []
    for student in students:
        profile = getattr(student, 'student_profile', None)
        internships = Internship.objects.filter(student=student, status='ACTIVE')
        latest_internship = internships.order_by('-start_date').first()

        latest_report = ProgressReport.objects.filter(student=student).order_by('-submission_timestamp').first()
        last_report_date = latest_report.submission_timestamp if latest_report else None

        all_reports = ProgressReport.objects.filter(student=student)
        approved_count = all_reports.filter(status='APPROVED').count()
        total_reports = all_reports.count()
        total_hours = sum((r.hours_worked or 0) for r in all_reports)

        data.append({
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'roll_number': profile.roll_number if profile else None,
            'prn_number': profile.prn_number if profile else None,
            'department_code': profile.department.code if profile and profile.department else None,
            'department_name': profile.department.name if profile and profile.department else None,
            'academic_year': profile.academic_year if profile else None,
            'current_internship': latest_internship.role_title if latest_internship else None,
            'internship_status': latest_internship.status if latest_internship else None,
            'organization_name': latest_internship.organization_name if latest_internship else None,
            'progress_percentage': min(100, int((approved_count / max(1, total_reports)) * 100)) if total_reports > 0 else 0,
            'total_reports': total_reports,
            'approved_reports': approved_count,
            'total_hours_worked': total_hours,
            'last_report_date': last_report_date,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def staff_student_detail(request, student_id):
    """Detailed view of a specific student's profile, internships, and reports."""
    user = request.user
    is_admin = user.is_admin

    try:
        student = User.objects.get(id=student_id, role='STUDENT', is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not is_admin:
        assignments = user.assignments.all()
        dept_ids = [a.department_id for a in assignments if a.department_id]
        coord_profile = getattr(user, 'coordinator_profile', None)
        if coord_profile and coord_profile.department_id and coord_profile.department_id not in dept_ids:
            dept_ids.append(coord_profile.department_id)
        assigned_student_ids = [a.student_id for a in assignments if a.student_id]
        profile = getattr(student, 'student_profile', None)
        if not (profile and profile.department_id in dept_ids) and student_id not in assigned_student_ids:
            return Response({'error': 'You are not authorized to view this student.'}, status=status.HTTP_403_FORBIDDEN)

    profile = getattr(student, 'student_profile', None)
    internships = Internship.objects.filter(student=student).order_by('-start_date').select_related('opportunity')

    internships_data = []
    for internship in internships:
        reports = ProgressReport.objects.filter(internship=internship).order_by('-week_number')
        approved_count = reports.filter(status='APPROVED').count()
        total_hours = sum((r.hours_worked or 0) for r in reports)

        today = timezone.now().date()
        start_date = internship.start_date
        if start_date:
            days_elapsed = (today - start_date).days
            expected_reports = max(1, (days_elapsed // 7) + 1)
        else:
            expected_reports = 1
        progress_pct = min(100, int((approved_count / expected_reports) * 100)) if expected_reports > 0 else 0

        internships_data.append({
            'id': internship.id,
            'organization_name': internship.organization_name,
            'role_title': internship.role_title,
            'start_date': internship.start_date,
            'end_date': internship.end_date,
            'status': internship.status,
            'completion_status': internship.completion_status,
            'coordinator_name': internship.coordinator.name if internship.coordinator else None,
            'total_reports': reports.count(),
            'approved_reports': approved_count,
            'total_hours': total_hours,
            'progress_percentage': progress_pct,
            'reports': ProgressReportSerializer(reports, many=True).data,
        })

    data = {
        'id': student.id,
        'name': student.name,
        'email': student.email,
        'roll_number': profile.roll_number if profile else None,
        'prn_number': profile.prn_number if profile else None,
        'department_code': profile.department.code if profile and profile.department else None,
        'department_name': profile.department.name if profile and profile.department else None,
        'academic_year': profile.academic_year if profile else None,
        'division': profile.division if profile else None,
        'semester': profile.semester if profile else None,
        'phone': profile.phone if profile else None,
        'cgpa': str(profile.cgpa) if profile else None,
        'bio': profile.bio if profile else None,
        'linkedin_url': profile.linkedin_url if profile else None,
        'github_url': profile.github_url if profile else None,
        'portfolio_url': profile.portfolio_url if profile else None,
        'is_verified': profile.is_verified if profile else False,
        'total_reports': ProgressReport.objects.filter(student=student).count(),
        'approved_reports': ProgressReport.objects.filter(student=student, status='APPROVED').count(),
        'total_hours_worked': sum((r.hours_worked or 0) for r in ProgressReport.objects.filter(student=student)),
        'internships': internships_data,
    }

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def inactive_students(request):
    """Students with Ongoing internships who haven't submitted a report in the last 14 days."""
    user = request.user
    is_admin = user.is_admin

    internships_qs = Internship.objects.filter(status='ACTIVE')

    if not is_admin:
        assignments = user.assignments.all()
        dept_ids = [a.department_id for a in assignments if a.department_id]
        assigned_student_ids = [a.student_id for a in assignments if a.student_id]
        internships_qs = internships_qs.filter(
            Q(student__student_profile__department_id__in=dept_ids) | Q(student_id__in=assigned_student_ids)
        ).distinct()

    cutoff_date = timezone.now() - timezone.timedelta(days=14)

    inactive = []
    for internship in internships_qs.select_related('student', 'student__student_profile'):
        student = internship.student
        profile = getattr(student, 'student_profile', None)

        last_report = ProgressReport.objects.filter(internship=internship).order_by('-submission_timestamp').first()

        if last_report and last_report.submission_timestamp:
            last_report_date = last_report.submission_timestamp
            days_inactive = (timezone.now() - last_report_date).days
            if days_inactive >= 14:
                inactive.append({
                    'student_id': student.id,
                    'name': student.name,
                    'email': student.email,
                    'roll_number': profile.roll_number if profile else None,
                    'prn_number': profile.prn_number if profile else None,
                    'department_code': profile.department.code if profile and profile.department else None,
                    'department_name': profile.department.name if profile and profile.department else None,
                    'academic_year': profile.academic_year if profile else None,
                    'internship_id': internship.id,
                    'internship_title': internship.role_title,
                    'organization_name': internship.organization_name,
                    'start_date': internship.start_date,
                    'last_report_date': last_report_date,
                    'days_inactive': days_inactive,
                    'last_report_status': last_report.status,
                })
        else:
            if internship.start_date:
                days_inactive = (timezone.now().date() - internship.start_date).days
            else:
                days_inactive = None
            inactive.append({
                'student_id': student.id,
                'name': student.name,
                'email': student.email,
                'roll_number': profile.roll_number if profile else None,
                'prn_number': profile.prn_number if profile else None,
                'department_code': profile.department.code if profile and profile.department else None,
                'department_name': profile.department.name if profile and profile.department else None,
                'academic_year': profile.academic_year if profile else None,
                'internship_id': internship.id,
                'internship_title': internship.role_title,
                'organization_name': internship.organization_name,
                'start_date': internship.start_date,
                'last_report_date': None,
                'days_inactive': days_inactive,
                'last_report_status': 'Never submitted',
            })

    inactive.sort(key=lambda x: (x['days_inactive'] is None, -(x['days_inactive'] or 0)))

    return Response(inactive)
