from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.opportunities.views import OpportunityViewSet

router = DefaultRouter()
router.register(r'', OpportunityViewSet, basename='opportunities')

urlpatterns = [
    path('', include(router.urls)),
]
