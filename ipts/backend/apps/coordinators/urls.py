from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.coordinators.views import CoordinatorProfileViewSet, CoordinatorAssignmentViewSet

router = DefaultRouter()
router.register(r'profiles', CoordinatorProfileViewSet, basename='coordinator-profiles')
router.register(r'assignments', CoordinatorAssignmentViewSet, basename='coordinator-assignments')

urlpatterns = [
    path('', include(router.urls)),
]
