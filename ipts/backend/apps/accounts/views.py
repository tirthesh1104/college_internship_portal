from rest_framework import status, views, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from apps.accounts.models import User
from apps.accounts.serializers import (
    UserSerializer,
    StudentRegisterSerializer,
    CoordinatorRegisterSerializer,
    AdminRegisterSerializer,
    AdminCreateUserSerializer,
)
from apps.accounts.permissions import IsAdminUserRole
from apps.audit_logs.models import AuditLog


def log_action(actor, action, entity_type, entity_id, details='', request=None):
    ip = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
    try:
        AuditLog.objects.create(
            actor=actor if actor and actor.is_authenticated else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=details,
            ip_address=ip
        )
    except Exception:
        pass


class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        requested_role = str(request.data.get('role', 'STUDENT')).strip().upper()

        if requested_role == 'COORDINATOR':
            serializer = CoordinatorRegisterSerializer(data=request.data)
            action_label = 'COORDINATOR_REGISTER'
        elif requested_role == 'ADMIN':
            serializer = AdminRegisterSerializer(data=request.data)
            action_label = 'ADMIN_REGISTER'
        else:
            serializer = StudentRegisterSerializer(data=request.data)
            action_label = 'STUDENT_SELF_REGISTER'

        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            log_action(user, action_label, 'User', user.id, f"{user.role} {user.email} registered", request)
            return Response({
                'message': 'Registration successful! Welcome to MITCORER Internship Hub.',
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        # Return a clear error string for PIN failures as well as field errors
        if 'security_pin' in serializer.errors:
            pin_err = serializer.errors['security_pin']
            msg = pin_err[0] if isinstance(pin_err, list) and pin_err else str(pin_err)
            return Response({'error': msg, **serializer.errors}, status=status.HTTP_403_FORBIDDEN)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import os
        role = str(request.data.get('role', '')).strip().upper()
        security_pin = request.data.get('security_pin')

        # 1A. Direct Coordinator PIN Login (No email/password required)
        if role == 'COORDINATOR' and security_pin is not None:
            if str(security_pin).strip() != '77':
                return Response({'error': 'Invalid Coordinator Security PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
            coord = User.objects.filter(role='COORDINATOR', is_active=True).order_by('-created_at').first()
            if not coord:
                return Response({'error': 'No Coordinator account found. Please register first.'}, status=status.HTTP_404_NOT_FOUND)
            refresh = RefreshToken.for_user(coord)
            log_action(coord, 'COORDINATOR_PIN_LOGIN', 'User', coord.id, f"Coordinator {coord.name} logged in via PIN", request)
            return Response({
                'message': 'Coordinator access granted.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user': UserSerializer(coord).data
            })

        # 1B. Direct Admin PIN Login (No email/password required)
        if role == 'ADMIN' and security_pin is not None:
            if str(security_pin).strip() != '123':
                return Response({'error': 'Invalid Admin Security PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
            admin_user = User.objects.filter(role='ADMIN', is_active=True).order_by('-created_at').first()
            if not admin_user:
                return Response({'error': 'No Admin account found. Please register first.'}, status=status.HTTP_404_NOT_FOUND)
            refresh = RefreshToken.for_user(admin_user)
            log_action(admin_user, 'ADMIN_PIN_LOGIN', 'User', admin_user.id, f"Admin {admin_user.name} logged in via PIN", request)
            return Response({
                'message': 'Admin access granted.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user': UserSerializer(admin_user).data
            })

        # 1C. Email & Password Login (Required for Students)
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Please provide both email and password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials. Please verify your email and password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Your account is currently inactive. Please contact the administrator.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        log_action(user, 'USER_LOGIN', 'User', user.id, f"User {user.email} logged in ({user.role})", request)

        return Response({
            'message': 'Login successful.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'user': UserSerializer(user).data
        })


class CurrentUserView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        data = request.data
        if 'name' in data:
            user.name = data['name']
            user.save()

        if user.is_student and hasattr(user, 'student_profile'):
            profile = user.student_profile
            for field in ['phone', 'bio', 'github_url', 'linkedin_url', 'portfolio_url']:
                if field in data:
                    setattr(profile, field, data[field])
            profile.save()

        return Response(UserSerializer(user).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUserRole]
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = AdminCreateUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(request.user, 'ADMIN_CREATE_USER', 'User', user.id, f"Created {user.role}: {user.email}", request)
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save()
        log_action(request.user, 'ADMIN_DEACTIVATE_USER', 'User', user.id, f"Deactivated {user.email}", request)
        return Response({'message': f'User {user.email} deactivated successfully.'})
