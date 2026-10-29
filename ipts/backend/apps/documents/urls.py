from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.documents.views import DocumentViewSet, QRCodeVerificationView

router = DefaultRouter()
router.register(r'', DocumentViewSet, basename='documents')

urlpatterns = [
    path('verify-qr/<str:qr_code_key>/', QRCodeVerificationView.as_view(), name='document-qr-verify'),
    path('', include(router.urls)),
]
