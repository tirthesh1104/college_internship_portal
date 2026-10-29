from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/coordinators/', include('apps.coordinators.urls')),
    path('api/opportunities/', include('apps.opportunities.urls')),
    path('api/applications/', include('apps.applications.urls')),
    path('api/internships/', include('apps.internships.urls')),
    path('api/reports/', include('apps.progress_reports.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/assessments/', include('apps.assessments.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/audit-logs/', include('apps.audit_logs.urls')),
    path('api/mentors/', include('apps.mentors.urls')),
    path('api/community/', include('apps.community.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
