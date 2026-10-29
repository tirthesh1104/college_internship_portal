from django.urls import path
from apps.analytics.views import AnalyticsOverviewView, ExportDataView, ExportAuditLogView

urlpatterns = [
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('export/<str:export_type>/<str:format_type>/', ExportDataView.as_view(), name='analytics-export'),
    path('export-audit/', ExportAuditLogView.as_view(), name='analytics-export-audit'),
]
