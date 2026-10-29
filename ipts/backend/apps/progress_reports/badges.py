"""
Badges and Achievements for IPTS Phase 7.

Award badges automatically when their conditions are satisfied:
- First Report: First approved weekly report
- 4-Week Streak: Four consecutive qualifying reporting weeks
- 8-Week Streak: Eight consecutive qualifying reporting weeks
- First Internship Completed: First verified completed internship
- Top Performer of the Month: Highest eligible points for the relevant month
"""

from django.utils import timezone
from django.db.models import Sum
from datetime import date, timedelta


def get_current_month_start():
    """Get the start of the current month (timezone-aware)."""
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def check_and_award_badges(student):
    """
    Check and award badges for a student based on verified records.
    Returns a list of newly awarded badge names.
    """
    from apps.progress_reports.models import ProgressReport, PointTransaction, ConsecutiveStreak
    from apps.internships.models import Internship
    from apps.notifications.models import Notification
    
    awarded = []
    now = timezone.now()
    
    # 1. First Report badge: First approved weekly report
    first_approved = ProgressReport.objects.filter(
        student=student,
        status='APPROVED',
    ).order_by('week_number').first()
    if first_approved and not PointTransaction.objects.filter(
        student=student,
        reason='BADGE_FIRST_REPORT',
    ).exists():
        PointTransaction.objects.create(
            student=student,
            reason='BADGE_FIRST_REPORT',
            points_awarded=0,
        )
        awarded.append('First Report')
        # Notify the student
        Notification.objects.create(
            recipient=student,
            title="Badge Earned: First Report!",
            message="You've earned the 'First Report' badge for submitting your first approved weekly progress report.",
            link="/student/dashboard/",
            notification_type='SYSTEM'
        )
    
    # 2. 4-Week Streak badge: Four consecutive qualifying reporting weeks
    streak, created = ConsecutiveStreak.objects.get_or_create(student=student)
    if streak.current_streak >= 4:
        if not PointTransaction.objects.filter(
            student=student,
            reason='BADGE_4_WEEK_STREAK',
        ).exists():
            PointTransaction.objects.create(
                student=student,
                reason='BADGE_4_WEEK_STREAK',
                points_awarded=0,
            )
            awarded.append('4-Week Streak')
            Notification.objects.create(
                recipient=student,
                title="Badge Earned: 4-Week Streak!",
                message=f"You've earned the '4-Week Streak' badge with {streak.current_streak} consecutive reporting weeks.",
                link="/student/dashboard/",
                notification_type='SYSTEM'
            )
    
    # 3. 8-Week Streak badge: Eight consecutive qualifying reporting weeks
    if streak.current_streak >= 8:
        if not PointTransaction.objects.filter(
            student=student,
            reason='BADGE_8_WEEK_STREAK',
        ).exists():
            PointTransaction.objects.create(
                student=student,
                reason='BADGE_8_WEEK_STREAK',
                points_awarded=0,
            )
            awarded.append('8-Week Streak')
            Notification.objects.create(
                recipient=student,
                title="Badge Earned: 8-Week Streak!",
                message=f"You've earned the '8-Week Streak' badge with {streak.current_streak} consecutive reporting weeks.",
                link="/student/dashboard/",
                notification_type='SYSTEM'
            )
    
    # 4. First Internship Completed badge: First verified completed internship
    first_completed = Internship.objects.filter(
        student=student,
        status='COMPLETED',
    ).order_by('start_date').first()
    if first_completed and not PointTransaction.objects.filter(
        student=student,
        reason='BADGE_FIRST_INTERNSHIP',
    ).exists():
        PointTransaction.objects.create(
            student=student,
            reason='BADGE_FIRST_INTERNSHIP',
            points_awarded=0,
        )
        awarded.append('First Internship Completed')
        Notification.objects.create(
            recipient=student,
            title="Badge Earned: First Internship Completed!",
            message="You've earned the 'First Internship Completed' badge for completing your first internship.",
            link="/student/dashboard/",
            notification_type='SYSTEM'
        )
    
    # 5. Top Performer of the Month badge
    # Calculate this month's eligible points
    month_start = get_current_month_start()
    top_student = PointTransaction.objects.filter(
        timestamp__gte=month_start
    ).values('student').annotate(
        total=Sum('points_awarded')
    ).order_by('-total').first()
    
    # For now, we'll mark this as documented to be implemented later
    # The full implementation would compare all students' points for the month
    
    return awarded