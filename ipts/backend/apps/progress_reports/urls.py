from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.progress_reports.views import ProgressReportViewSet, student_progress_summary, staff_students_list, staff_student_detail, inactive_students

router = DefaultRouter()
router.register(r'', ProgressReportViewSet, basename='progress-reports')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', student_progress_summary, name='student-progress-summary'),
    path('staff/students/', staff_students_list, name='staff-students-list'),
    path('staff/students/<int:student_id>/', staff_student_detail, name='staff-student-detail'),
    path('staff/inactive-students/', inactive_students, name='staff-inactive-students'),
]
