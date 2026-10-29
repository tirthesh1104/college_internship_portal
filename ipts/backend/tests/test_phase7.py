"""
Phase 7: Gamification System Tests
Covers: opportunities, points, badges, streaks, notifications
"""
from django.test import TestCase
from django.utils import timezone
from django.db import models
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.students.models import Department, StudentProfile
from apps.opportunities.models import Opportunity
from apps.internships.models import Internship
from apps.progress_reports.models import (
    ProgressReport, PointTransaction, ConsecutiveStreak
)
from apps.progress_reports.badges import check_and_award_badges
from apps.progress_reports.signals import (
    award_weekly_report_points, award_certificate_points,
    award_offer_letter_points, award_internship_completion_points,
    get_current_month_start, can_upload_document_type
)
from apps.notifications.models import Notification
from apps.documents.models import Document


class Phase7GamificationTests(TestCase):
    """Phase 7: Points, Badges, Streaks, Leaderboard, Notifications"""

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(
            name='Computer Science & Engineering', code='CSE'
        )

        # Admin
        self.admin = User.objects.create_superuser(
            email='admin@test.mitcorer.edu.in',
            name='Test Admin',
            password='AdminPass@123'
        )

        # Coordinator
        self.coordinator = User.objects.create_user(
            email='coord@test.mitcorer.edu.in',
            name='Test Coordinator',
            password='CoordPass@123',
            role='COORDINATOR'
        )

        # Student 1
        self.student1 = User.objects.create_user(
            email='student1@test.mitcorer.edu.in',
            name='Student One',
            password='StudentPass@123',
            role='STUDENT'
        )
        self.profile1 = StudentProfile.objects.create(
            user=self.student1,
            roll_number='TEST001',
            department=self.dept
        )

        # Student 2
        self.student2 = User.objects.create_user(
            email='student2@test.mitcorer.edu.in',
            name='Student Two',
            password='StudentPass@123',
            role='STUDENT'
        )
        self.profile2 = StudentProfile.objects.create(
            user=self.student2,
            roll_number='TEST002',
            department=self.dept
        )

        # Internship for student1
        self.internship1 = Internship.objects.create(
            student=self.student1,
            organization_name='Test Org',
            role_title='Software Intern',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=60),
            status='ACTIVE',
            coordinator=self.coordinator
        )

        # Internship for student2
        self.internship2 = Internship.objects.create(
            student=self.student2,
            organization_name='Test Org 2',
            role_title='Web Intern',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=60),
            status='ACTIVE',
            coordinator=self.coordinator
        )

    # ============================================================
    # OPPORTUNITIES TESTS
    # ============================================================

    def test_opportunity_creation_and_fields(self):
        """Opportunity can be created with all required fields"""
        opp = Opportunity.objects.create(
            title='Python Internship',
            organization='TechCorp',
            country='India',
            opportunity_type='INTERNSHIP',
            description='Learn Python and Django',
            required_skills='Python, Django',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=56),
            duration='8 Weeks',
            stipend_type='PAID',
            stipend_amount='20000',
            mode='REMOTE',
            available_seats=5,
            deadline=timezone.now().date() + timezone.timedelta(days=30),
            created_by=self.admin
        )
        self.assertEqual(opp.title, 'Python Internship')
        self.assertEqual(opp.organization, 'TechCorp')
        self.assertEqual(opp.country, 'India')
        self.assertEqual(opp.status, 'DRAFT')
        self.assertEqual(opp.available_seats, 5)

    def test_opportunity_status_transitions(self):
        """Opportunity status transitions from DRAFT to PUBLISHED"""
        opp = Opportunity.objects.create(
            title='Test Opportunity',
            organization='TestOrg',
            country='India',
            description='Test description',
            required_skills='Python',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=56),
            duration='8 Weeks',
            deadline=timezone.now().date() + timezone.timedelta(days=30),
            created_by=self.admin
        )
        self.assertEqual(opp.status, 'DRAFT')
        opp.status = 'PENDING_APPROVAL'
        opp.save()
        self.assertEqual(opp.status, 'PENDING_APPROVAL')
        opp.status = 'PUBLISHED'
        opp.save()
        self.assertEqual(opp.status, 'PUBLISHED')

    def test_opportunity_filter_by_country(self):
        """Opportunities can be filtered by country"""
        Opportunity.objects.create(
            title='India Opp',
            organization='Org1',
            country='India',
            description='Desc',
            required_skills='Python',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=56),
            duration='8 Weeks',
            deadline=timezone.now().date() + timezone.timedelta(days=30),
            created_by=self.admin
        )
        Opportunity.objects.create(
            title='USA Opp',
            organization='Org2',
            country='USA',
            description='Desc',
            required_skills='Java',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=56),
            duration='8 Weeks',
            deadline=timezone.now().date() + timezone.timedelta(days=30),
            created_by=self.admin
        )
        india_opps = Opportunity.objects.filter(country='India')
        self.assertEqual(india_opps.count(), 1)
        self.assertEqual(india_opps.first().title, 'India Opp')

    # ============================================================
    # POINTS TESTS
    # ============================================================

    def test_award_weekly_report_points_approved(self):
        """+10 points awarded when weekly report is approved"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='APPROVED'
        )
        result = award_weekly_report_points(report)
        self.assertTrue(result)
        tx = PointTransaction.objects.get(
            student=self.student1,
            reason='WEEKLY_REPORT_APPROVED',
            report=report
        )
        self.assertEqual(tx.points_awarded, 10)

    def test_award_weekly_report_points_not_double_awarded(self):
        """Points not awarded twice for same report"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='APPROVED'
        )
        award_weekly_report_points(report)
        result = award_weekly_report_points(report)
        self.assertFalse(result)
        self.assertEqual(
            PointTransaction.objects.filter(
                student=self.student1,
                reason='WEEKLY_REPORT_APPROVED',
                report=report
            ).count(),
            1
        )

    def test_award_weekly_report_points_not_for_non_approved(self):
        """No points for non-approved reports"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='SUBMITTED'
        )
        result = award_weekly_report_points(report)
        self.assertFalse(result)
        self.assertEqual(
            PointTransaction.objects.filter(
                student=self.student1,
                reason='WEEKLY_REPORT_APPROVED'
            ).count(),
            0
        )

    def test_award_certificate_points(self):
        """+5 points for certificate upload (max 3 per month)"""
        doc = Document.objects.create(
            student=self.student1,
            document_type='CERTIFICATE',
            file_key='cert1.pdf',
            status='VERIFIED',
            verified_at=timezone.now()
        )
        result = award_certificate_points(self.student1, doc, self.internship1)
        self.assertTrue(result)
        tx = PointTransaction.objects.get(
            student=self.student1,
            reason='CERTIFICATE_UPLOAD',
            document=doc
        )
        self.assertEqual(tx.points_awarded, 5)

    def test_award_certificate_points_monthly_limit(self):
        """Certificate points limited to 3 per month per student"""
        month_start = get_current_month_start()
        for i in range(3):
            doc = Document.objects.create(
                student=self.student1,
                document_type='CERTIFICATE',
                file_key=f'cert{i}.pdf',
                status='VERIFIED',
                verified_at=timezone.now()
            )
            award_certificate_points(self.student1, doc, self.internship1)

        doc4 = Document.objects.create(
            student=self.student1,
            document_type='CERTIFICATE',
            file_key='cert4.pdf',
            status='VERIFIED',
            verified_at=timezone.now()
        )
        result = award_certificate_points(self.student1, doc4, self.internship1)
        self.assertFalse(result)

    def test_award_offer_letter_points(self):
        """+5 points for offer letter upload (max 3 per month)"""
        doc = Document.objects.create(
            student=self.student1,
            document_type='OFFER_LETTER',
            file_key='offer1.pdf',
            status='VERIFIED',
            verified_at=timezone.now()
        )
        result = award_offer_letter_points(self.student1, doc, self.internship1)
        self.assertTrue(result)
        tx = PointTransaction.objects.get(
            student=self.student1,
            reason='OFFER_LETTER_UPLOAD',
            document=doc
        )
        self.assertEqual(tx.points_awarded, 5)

    def test_award_internship_completion_points(self):
        """+50 points for internship completion"""
        self.internship1.status = 'COMPLETED'
        self.internship1.save()
        result = award_internship_completion_points(self.internship1)
        self.assertTrue(result)
        tx = PointTransaction.objects.get(
            student=self.student1,
            reason='INTERNSHIP_COMPLETED',
            internship=self.internship1
        )
        self.assertEqual(tx.points_awarded, 50)

    def test_award_internship_completion_not_for_non_completed(self):
        """No points if internship not completed"""
        self.internship1.status = 'ACTIVE'
        self.internship1.save()
        result = award_internship_completion_points(self.internship1)
        self.assertFalse(result)

    def test_can_upload_document_type_limit(self):
        """Document upload limit check works correctly"""
        month_start = get_current_month_start()
        self.assertTrue(can_upload_document_type(self.student1, 'CERTIFICATE', month_start))
        for i in range(3):
            Document.objects.create(
                student=self.student1,
                document_type='CERTIFICATE',
                file_key=f'cert_limit_{i}.pdf',
                status='VERIFIED',
                verified_at=timezone.now()
            )
        self.assertFalse(can_upload_document_type(self.student1, 'CERTIFICATE', month_start))

    def test_point_transaction_total_for_student(self):
        """Point transactions can be aggregated per student"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='APPROVED'
        )
        award_weekly_report_points(report)

        self.internship1.status = 'COMPLETED'
        self.internship1.save()
        award_internship_completion_points(self.internship1)

        total = PointTransaction.objects.filter(
            student=self.student1
        ).aggregate(total=models.Sum('points_awarded'))
        self.assertEqual(total['total'], 60)

    # ============================================================
    # BADGES TESTS
    # ============================================================

    def test_badge_first_report(self):
        """First Report badge awarded for first approved report"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='APPROVED'
        )
        awarded = check_and_award_badges(self.student1)
        self.assertIn('First Report', awarded)
        # Not re-awarded on second call
        awarded_again = check_and_award_badges(self.student1)
        self.assertNotIn('First Report', awarded_again)
        # Verify notification was created
        self.assertTrue(Notification.objects.filter(
            recipient=self.student1,
            title__contains='First Report'
        ).exists())

    def test_badge_4_week_streak(self):
        """4-Week Streak badge awarded when streak >= 4"""
        streak, _ = ConsecutiveStreak.objects.get_or_create(student=self.student1)
        streak.current_streak = 4
        streak.save()
        awarded = check_and_award_badges(self.student1)
        self.assertIn('4-Week Streak', awarded)

    def test_badge_8_week_streak(self):
        """8-Week Streak badge awarded when streak >= 8"""
        streak, _ = ConsecutiveStreak.objects.get_or_create(student=self.student1)
        streak.current_streak = 8
        streak.save()
        awarded = check_and_award_badges(self.student1)
        self.assertIn('8-Week Streak', awarded)

    def test_badge_first_internship_completed(self):
        """First Internship Completed badge for first completed internship"""
        self.internship1.status = 'COMPLETED'
        self.internship1.save()
        awarded = check_and_award_badges(self.student1)
        self.assertIn('First Internship Completed', awarded)
        awarded_again = check_and_award_badges(self.student1)
        self.assertNotIn('First Internship Completed', awarded_again)

    def test_badge_notification_created(self):
        """Notification created when badge is awarded"""
        report = ProgressReport.objects.create(
            internship=self.internship1,
            student=self.student1,
            week_number=1,
            tasks_completed='Task 1',
            technical_skills='Python',
            learning_outcomes='Learned Python',
            next_week_plan='Next week plan',
            status='APPROVED'
        )
        check_and_award_badges(self.student1)
        notification = Notification.objects.filter(
            recipient=self.student1,
            title__contains='Badge Earned'
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.notification_type, 'SYSTEM')

    # ============================================================
    # STREAKS TESTS
    # ============================================================

    def test_consecutive_streak_creation(self):
        """ConsecutiveStreak record created for student"""
        streak = ConsecutiveStreak.objects.create(
            student=self.student1,
            current_streak=0,
            longest_streak=0
        )
        self.assertEqual(streak.current_streak, 0)
        self.assertEqual(streak.student, self.student1)

    def test_consecutive_streak_update(self):
        """ConsecutiveStreak can be updated"""
        streak = ConsecutiveStreak.objects.create(
            student=self.student1,
            current_streak=3,
            longest_streak=3
        )
        streak.current_streak = 5
        streak.longest_streak = 5
        streak.save()
        streak.refresh_from_db()
        self.assertEqual(streak.current_streak, 5)
        self.assertEqual(streak.longest_streak, 5)

    def test_consecutive_streak_unique_per_student(self):
        """Only one ConsecutiveStreak per student"""
        ConsecutiveStreak.objects.create(
            student=self.student1,
            current_streak=1
        )
        with self.assertRaises(Exception):
            ConsecutiveStreak.objects.create(
                student=self.student1,
                current_streak=2
            )

    # ============================================================
    # NOTIFICATIONS TESTS
    # ============================================================

    def test_notification_creation(self):
        """Notification can be created with all fields"""
        notification = Notification.objects.create(
            recipient=self.student1,
            title='Test Notification',
            message='This is a test notification',
            link='/student/dashboard/',
            notification_type='SYSTEM'
        )
        self.assertEqual(notification.recipient, self.student1)
        self.assertEqual(notification.title, 'Test Notification')
        self.assertEqual(notification.notification_type, 'SYSTEM')
        self.assertIsNone(notification.read_at)

    def test_notification_mark_as_read(self):
        """Notification can be marked as read"""
        notification = Notification.objects.create(
            recipient=self.student1,
            title='Test',
            message='Test message',
            notification_type='REPORT'
        )
        notification.read_at = timezone.now()
        notification.save()
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)

    def test_notification_for_student_only(self):
        """Student only sees their own notifications"""
        Notification.objects.create(
            recipient=self.student1,
            title='Student 1 Notification',
            message='For student 1',
            notification_type='SYSTEM'
        )
        Notification.objects.create(
            recipient=self.student2,
            title='Student 2 Notification',
            message='For student 2',
            notification_type='SYSTEM'
        )
        student1_notifs = Notification.objects.filter(recipient=self.student1)
        self.assertEqual(student1_notifs.count(), 1)
        self.assertEqual(student1_notifs.first().title, 'Student 1 Notification')

    def test_notification_ordering_newest_first(self):
        """Notifications ordered newest first"""
        n1 = Notification.objects.create(
            recipient=self.student1,
            title='Older',
            message='Old message',
            notification_type='SYSTEM'
        )
        n2 = Notification.objects.create(
            recipient=self.student1,
            title='Newer',
            message='New message',
            notification_type='SYSTEM'
        )
        notifications = Notification.objects.filter(recipient=self.student1)
        self.assertEqual(notifications.first().id, n2.id)