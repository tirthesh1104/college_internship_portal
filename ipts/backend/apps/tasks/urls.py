from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tasks.views import ImprovementTaskViewSet

router = DefaultRouter()
router.register(r'', ImprovementTaskViewSet, basename='tasks')

urlpatterns = [
    path('', include(router.urls)),
]
