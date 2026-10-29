from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.students.models import Department, StudentProfile
from apps.opportunities.models import Opportunity
from apps.internships.models import Internship
from apps.progress_reports.models import ProgressReport, Feedback
from apps.documents.models import Document

class MITCORERWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Computer Science & Engineering', code='CSE')

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
        self.p1 = StudentProfile.objects.create(
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
        self.p2 = StudentProfile.objects.create(
            user=self.student2,
            roll_number='TEST002',
            department=self.dept
        )

    def test_student_self_registration_enforces_student_role(self):
        """Verify that self-registration can NEVER assign ADMIN or COORDINATOR role"""
        payload = {
            'name': 'New Student',
            'email': 'new.student@test.mitcorer.edu.in',
            'password': 'Password123',
            'roll_number': 'NEW001',
            'department_id': self.dept.id,
            'role': 'ADMIN' # Attacker tries to escalate privilege
        }
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='new.student@test.mitcorer.edu.in')
        self.assertEqual(new_user.role, 'STUDENT')
        self.assertFalse(new_user.is_staff)
        self.assertFalse(new_user.is_superuser)

    def test_login_returns_jwt_tokens(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'student1@test.mitcorer.edu.in',
            'password': 'StudentPass@123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_centralized_opportunity_approval_and_visibility(self):
        """
        Test that:
        1. Coordinator creates draft.
        2. Student CANNOT see draft.
        3. Coordinator submits review.
        4. Admin approves and publishes.
        5. Student can now see the opportunity in shared list.
        """
        self.client.force_authenticate(user=self.coordinator)
        create_res = self.client.post('/api/opportunities/', {
            'title': 'Test React Internship',
            'organization': 'Apex Tech Labs',
            'description': 'Test description',
            'required_skills': 'React, TypeScript',
            'deadline': str(timezone.now().date() + timezone.timedelta(days=30)),
            'mode': 'REMOTE'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        opp_id = create_res.data['id']
        opp = Opportunity.objects.get(id=opp_id)
        self.assertEqual(opp.status, 'DRAFT')

        # Student views opportunities -> Draft must NOT be visible
        self.client.force_authenticate(user=self.student1)
        res_stud = self.client.get('/api/opportunities/')
        opp_ids = [item['id'] for item in res_stud.data.get('results', res_stud.data)]
        self.assertNotIn(opp_id, opp_ids)

        # Coordinator submits for review
        self.client.force_authenticate(user=self.coordinator)
        submit_res = self.client.post(f'/api/opportunities/{opp_id}/submit-review/')
        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        opp.refresh_from_db()
        self.assertEqual(opp.status, 'PENDING_APPROVAL')

        # Admin approves and publishes
        self.client.force_authenticate(user=self.admin)
        app_res = self.client.post(f'/api/opportunities/{opp_id}/approve/')
        self.assertEqual(app_res.status_code, status.HTTP_200_OK)
        pub_res = self.client.post(f'/api/opportunities/{opp_id}/publish/')
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        opp.refresh_from_db()
        self.assertEqual(opp.status, 'PUBLISHED')

        # Student views opportunities -> Now visible!
        self.client.force_authenticate(user=self.student1)
        res_stud_after = self.client.get('/api/opportunities/')
        opp_ids_after = [item['id'] for item in res_stud_after.data.get('results', res_stud_after.data)]
        self.assertIn(opp_id, opp_ids_after)

    def test_record_level_isolation_weekly_reports(self):
        """Student 2 must not see Student 1's private report"""
        internship = Internship.objects.create(
            student=self.student1,
            organization_name='Test Org',
            role_title='Software Intern',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=60),
            status='ACTIVE'
        )
        report = ProgressReport.objects.create(
            internship=internship,
            student=self.student1,
            week_number=1,
            tasks_completed='Tasks 1',
            technical_skills='Python',
            learning_outcomes='Outcomes',
            next_week_plan='Next plan',
            status='SUBMITTED'
        )

        # Student 2 requests reports list
        self.client.force_authenticate(user=self.student2)
        res = self.client.get('/api/reports/')
        report_ids = [r['id'] for r in res.data.get('results', res.data)]
        self.assertNotIn(report.id, report_ids)

    def test_coordinator_feedback_and_scoring(self):
        """Coordinator gives score and feedback on submitted weekly report"""
        internship = Internship.objects.create(
            student=self.student1,
            organization_name='Test Org',
            role_title='Software Intern',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=60),
            status='ACTIVE',
            coordinator=self.coordinator
        )
        report = ProgressReport.objects.create(
            internship=internship,
            student=self.student1,
            week_number=1,
            tasks_completed='Built REST API',
            technical_skills='Django',
            learning_outcomes='Serialization',
            next_week_plan='Testing',
            status='SUBMITTED'
        )

        self.client.force_authenticate(user=self.coordinator)
        fb_res = self.client.post(f'/api/reports/{report.id}/feedback/', {
            'comments': 'Great work on database migrations and views.',
            'score': 95.0,
            'decision': 'APPROVED'
        })
        self.assertEqual(fb_res.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, 'APPROVED')
        self.assertEqual(report.feedback_entries.count(), 1)
        self.assertEqual(report.feedback_entries.first().score, 95.0)
