from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.students.views import DepartmentViewSet, AcademicYearViewSet, StudentProfileViewSet, CareerPassportView

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'academic-years', AcademicYearViewSet, basename='academic-years')
router.register(r'profiles', StudentProfileViewSet, basename='student-profiles')

urlpatterns = [
    path('career-passport/', CareerPassportView.as_view(), name='career-passport-me'),
    path('career-passport/<int:student_id>/', CareerPassportView.as_view(), name='career-passport-detail'),
    path('', include(router.urls)),
]
