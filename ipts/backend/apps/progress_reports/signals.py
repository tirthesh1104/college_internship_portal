"""
Points and signals for the IPTS system.

Award points for verified activities:
- +10 for approved weekly progress report
- +5 for certificate upload (max 3 per month per student)
- +5 for offer letter upload (max 3 per month per student)
- +50 for internship completed

Track consecutive reporting weeks for streak badges.
Maintain auditable point transaction ledger.
"""
from django.utils import timezone
from django.db import transaction

from apps.progress_reports.badges import check_and_award_badges


def get_current_month_start():
    """Get the start of the current month (timezone-aware)."""
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def can_upload_document_type(student, document_type, month_start=None):
    """
    Check if a student can upload a document type within the monthly limit.
    Each document type (certificate, offer-letter) is limited to 3 per month per student.
    """
    if month_start is None:
        month_start = get_current_month_start()

    from apps.documents.models import Document
    count = Document.objects.filter(
        student=student,
        document_type=document_type,
        status='VERIFIED',
        verified_at__gte=month_start,
    ).count()
    return count < 3  # Max 3 per month per document type


def award_weekly_report_points(report):
    """
    Award +10 points for an approved weekly progress report.
    Only award when report status is APPROVED.
    Returns True if points were awarded, False if already awarded.
    """
    from apps.progress_reports.models import PointTransaction, ConsecutiveStreak, ProgressReport
    from apps.internships.models import Internship
    from apps.accounts.models import User

    student = report.student

    # Only award points for APPROVED reports
    if report.status != 'APPROVED':
        return False

    with transaction.atomic():
        # Check if points already awarded for this report
        existing = PointTransaction.objects.filter(
            student=student,
            reason='WEEKLY_REPORT_APPROVED',
            report=report,
        ).exists()
        if existing:
            return False

        # Create point transaction
        PointTransaction.objects.create(
            student=student,
            reason='WEEKLY_REPORT_APPROVED',
            points_awarded=10,
            report=report,
        )

        # Update consecutive streak
        streak, created = ConsecutiveStreak.objects.get_or_create(student=student)

        if report.status == 'APPROVED':
            week_num = report.week_number
            # Check if previous week was also approved
            prev_report = ProgressReport.objects.filter(
                student=student,
                week_number=week_num - 1,
                status='APPROVED',
            ).exclude(id=report.id).first()

            if prev_report is not None:
                # Previous week was approved - increment streak
                streak.current_streak += 1
            else:
                # Check if this is the very first approved report
                first_approved = ProgressReport.objects.filter(
                    student=student,
                    status='APPROVED',
                ).order_by('week_number').first()
                if first_approved == report:
                    # This is the very first approved report
                    streak.current_streak = 1
                else:
                    # Not the first approved report and no previous approved week
                    # Reset streak to 1 (new streak starting from this report)
                    streak.current_streak = 1

            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak

            streak.last_qualifying_week = report.week_number
            streak.last_week_date = (
                report.submission_timestamp or timezone.now().date()
            )
        else:
            # Report not approved, reset streak
            streak.current_streak = 0

        streak.save(
            update_fields=[
                'current_streak',
                'longest_streak',
                'last_qualifying_week',
                'last_week_date',
            ]
        )

    # Check and award badges
    awarded = check_and_award_badges(student)
    if awarded:
        # Could add logging here
        pass

    return True


def award_certificate_points(student, document, internship):
    """
    Award +5 points for certificate upload when eligible (under monthly limit).
    Returns True if points were awarded, False if monthly limit reached or already awarded.
    """
    from apps.progress_reports.models import PointTransaction

    with transaction.atomic():
        month_start = get_current_month_start()

        # Check if points already awarded for this specific document
        existing = PointTransaction.objects.filter(
            student=student,
            reason='CERTIFICATE_UPLOAD',
            document=document,
        ).exists()
        if existing:
            return False

        # Check monthly limit (3 certificates per month per student)
        count = PointTransaction.objects.filter(
            student=student,
            reason='CERTIFICATE_UPLOAD',
            timestamp__gte=month_start,
        ).count()
        if count >= 3:
            return False

        # Create point transaction
        PointTransaction.objects.create(
            student=student,
            reason='CERTIFICATE_UPLOAD',
            points_awarded=5,
            document=document,
            internship=internship,
        )

    return True


def award_offer_letter_points(student, document, internship):
    """
    Award +5 points for offer letter upload when eligible (under monthly limit).
    Returns True if points were awarded, False if monthly limit reached or already awarded.
    """
    from apps.progress_reports.models import PointTransaction

    with transaction.atomic():
        month_start = get_current_month_start()

        # Check if points already awarded for this specific document
        existing = PointTransaction.objects.filter(
            student=student,
            reason='OFFER_LETTER_UPLOAD',
            document=document,
        ).exists()
        if existing:
            return False

        # Check monthly limit (3 offer letters per month per student)
        count = PointTransaction.objects.filter(
            student=student,
            reason='OFFER_LETTER_UPLOAD',
            timestamp__gte=month_start,
        ).count()
        if count >= 3:
            return False

        # Create point transaction
        PointTransaction.objects.create(
            student=student,
            reason='OFFER_LETTER_UPLOAD',
            points_awarded=5,
            document=document,
            internship=internship,
        )

    return True


def award_internship_completion_points(internship):
    """
    Award +50 points for internship completed.
    Only award when internship is marked COMPLETED by authorized workflow.
    Returns True if points were awarded, False if already awarded or internship not completed.
    """
    from apps.progress_reports.models import PointTransaction, ConsecutiveStreak
    from apps.accounts.models import User

    student = internship.student

    with transaction.atomic():
        # Check if points already awarded for this completed internship
        existing = PointTransaction.objects.filter(
            student=student,
            reason='INTERNSHIP_COMPLETED',
            internship=internship,
        ).exists()
        if existing:
            return False

        # Check internship status is COMPLETED
        if internship.status != 'COMPLETED':
            return False

        # Create point transaction
        PointTransaction.objects.create(
            student=student,
            reason='INTERNSHIP_COMPLETED',
            points_awarded=50,
            internship=internship,
        )

        # Reset consecutive streak since internship is completed
        streak, created = ConsecutiveStreak.objects.get_or_create(student=student)
        streak.current_streak = 0
        streak.save(update_fields=['current_streak'])

    return True