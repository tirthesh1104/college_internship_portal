from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, role='STUDENT', **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, name=name, role=role, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        return self.create_user(email, name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('COORDINATOR', 'Internship & Training Coordinator'),
        ('STUDENT', 'Student'),
    )

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT', db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.role}"

    @property
    def is_admin(self):
        return self.role == 'ADMIN' or self.is_superuser

    @property
    def is_coordinator(self):
        return self.role == 'COORDINATOR'

    @property
    def is_student(self):
        return self.role == 'STUDENT'
