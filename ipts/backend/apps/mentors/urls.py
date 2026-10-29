from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.mentors.views import MentorViewSet, MentorSessionViewSet

router = DefaultRouter()
router.register(r'mentors', MentorViewSet, basename='mentors')
router.register(r'sessions', MentorSessionViewSet, basename='mentor-sessions')

urlpatterns = [
    path('', include(router.urls)),
]
