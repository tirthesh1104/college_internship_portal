from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.assessments.views import SkillViewSet, SkillAssessmentViewSet

router = DefaultRouter()
router.register(r'skills', SkillViewSet, basename='skills')
router.register(r'records', SkillAssessmentViewSet, basename='skill-assessments')

urlpatterns = [
    path('', include(router.urls)),
]
