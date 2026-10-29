from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.internships.views import InternshipViewSet

router = DefaultRouter()
router.register(r'', InternshipViewSet, basename='internships')

urlpatterns = [
    path('', include(router.urls)),
]
