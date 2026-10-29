from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.community.views import ProjectTeamViewSet, CommunityPostViewSet

router = DefaultRouter()
router.register(r'teams', ProjectTeamViewSet, basename='project-teams')
router.register(r'posts', CommunityPostViewSet, basename='community-posts')

urlpatterns = [
    path('', include(router.urls)),
]
