import os
import uuid
from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, permissions, status, decorators, views
from rest_framework.response import Response
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer
from apps.accounts.permissions import IsAdminOrCoordinator
from apps.accounts.views import log_action
from apps.notifications.models import Notification

ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        doc = self.get_object()
        user = request.user
        if user.is_student and doc.student != user:
            return Response({'error': 'Students cannot delete documents.'}, status=status.HTTP_403_FORBIDDEN)
        storage_dir = getattr(settings, "PRIVATE_STORAGE_DIR", settings.BASE_DIR / "media" / "private_documents")
        file_path = os.path.join(storage_dir, doc.file_key)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Document.objects.all().select_related('student', 'internship', 'verified_by')
        elif user.is_coordinator:
            return Document.objects.filter(internship__coordinator=user) | Document.objects.filter(student__student_profile__department__in=[a.department for a in user.assignments.all() if a.department])
        else:
            return Document.objects.filter(student=user).select_related('internship', 'verified_by')

    def create(self, request, *args, **kwargs):
        user = request.user
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Please select a document file to upload.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size
        if file_obj.size > MAX_FILE_SIZE:
            return Response({'error': 'File exceeds maximum allowed size of 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file extension
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate secure random storage filename
        stored_filename = f"{uuid.uuid4().hex}{ext}"
        storage_dir = getattr(settings, 'PRIVATE_STORAGE_DIR', settings.BASE_DIR / 'media' / 'private_documents')
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, stored_filename)

        with open(file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        target_student = user
        if not user.is_student and 'student_id' in request.data:
            from apps.accounts.models import User
            target_student = User.objects.filter(id=request.data['student_id']).first() or user

        doc = Document.objects.create(
            student=target_student,
            internship_id=request.data.get('internship_id') or None,
            document_type=request.data.get('document_type', 'OFFER_LETTER'),
            title=request.data.get('title', file_obj.name),
            file_key=stored_filename,
            file_name=file_obj.name,
            file_size=file_obj.size,
            issuing_organization=request.data.get('issuing_organization', ''),
            document_date=request.data.get('document_date') or None,
            verification_reference=request.data.get('verification_reference', ''),
            verification_url=request.data.get('verification_url', ''),
            status='SUBMITTED'
        )

        log_action(user, 'DOCUMENT_UPLOADED', 'Document', doc.id, f"Uploaded {doc.document_type}: {doc.title}", request)

        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        user = request.user

        # Enforce server-side authorization: only owner, coordinator, or admin can download
        if user.is_student and doc.student != user:
            return Response({'error': 'Unauthorized: You cannot access other students private documents.'}, status=status.HTTP_403_FORBIDDEN)

        storage_dir = getattr(settings, 'PRIVATE_STORAGE_DIR', settings.BASE_DIR / 'media' / 'private_documents')
        file_path = os.path.join(storage_dir, doc.file_key)

        if not os.path.exists(file_path):
            raise Http404("Document file was not found on server.")

        response = FileResponse(open(file_path, 'rb'))
        response['Content-Disposition'] = f'inline; filename="{doc.file_name}"'
        return response

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def verify(self, request, pk=None):
        doc = self.get_object()
        doc.status = 'VERIFIED'
        doc.rejection_reason = ''
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()

        log_action(request.user, 'DOCUMENT_VERIFIED', 'Document', doc.id, f"Verified {doc.document_type}", request)

        Notification.objects.create(
            recipient=doc.student,
            title="Document Verified & Approved",
            message=f"Your document '{doc.title}' ({doc.document_type}) has been officially verified by {request.user.name}.",
            link="/student/documents",
            notification_type='DOCUMENT'
        )

        return Response({'message': 'Document verified successfully.', 'document': DocumentSerializer(doc).data})

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def reject(self, request, pk=None):
        doc = self.get_object()
        reason = request.data.get('rejection_reason', '').strip()
        if not reason:
            return Response({'error': 'Please provide a reason for rejecting the document.'}, status=status.HTTP_400_BAD_REQUEST)

        doc.status = 'REJECTED'
        doc.rejection_reason = reason
        doc.verified_by = request.user
        doc.verified_at = timezone.now()
        doc.save()

        log_action(request.user, 'DOCUMENT_REJECTED', 'Document', doc.id, f"Rejected: {reason}", request)

        Notification.objects.create(
            recipient=doc.student,
            title="Document Rejected / Action Required",
            message=f"Your document '{doc.title}' was rejected. Reason: {reason}. Please review and re-upload.",
            link="/student/documents",
            notification_type='DOCUMENT'
        )

        return Response({'message': 'Document marked as rejected.', 'document': DocumentSerializer(doc).data})

    @decorators.action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/]+)/documents', permission_classes=[permissions.IsAuthenticated])
    def documents_by_student(self, request, *args, **kwargs):
        student_id = request.parser_context['kwargs'].get('student_id')
        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Student can only see their own documents
        if user.is_student:
            qs = Document.objects.filter(student=user).select_related('internship')
        elif user.is_admin or user.is_coordinator:
            # Staff can see any student's documents
            qs = Document.objects.filter(student_id=student_id).select_related('internship')
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DocumentSerializer(qs, many=True)
        return Response(serializer.data)

class QRCodeVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, qr_code_key):
        doc = Document.objects.filter(qr_code_key=qr_code_key, status='VERIFIED').select_related('student', 'internship', 'verified_by').first()
        if not doc:
            return Response({'error': 'No verified official record found for this QR code.'}, status=status.HTTP_404_NOT_FOUND)

        student_profile = getattr(doc.student, 'student_profile', None)
        return Response({
            'is_authentic': True,
            'institution': "MAEER's MIT College of Railway Engineering and Research, Barshi",
            'document_title': doc.title,
            'document_type': doc.document_type,
            'student_name': doc.student.name,
            'roll_number': student_profile.roll_number if student_profile else 'Verified',
            'department': student_profile.department.name if (student_profile and student_profile.department) else 'Engineering',
            'issuing_organization': doc.issuing_organization or "MITCORER Industry Partner",
            'verification_reference': doc.verification_reference or f"MITCORER-DOC-{doc.id}",
            'verified_at': doc.verified_at,
            'verified_by': doc.verified_by.name if doc.verified_by else 'Training & Placement Cell'
        })
