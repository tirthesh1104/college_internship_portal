# IPTS Security Fix - PIN Authentication Removal

## SECURITY ISSUE FIXED
Removed insecure shared PIN authentication (PIN "77") from both backend and frontend.

## AUTHENTICATION CREDENTIALS

### Admin Account
- Email: `admin@mitcorer.edu.in`
- Name: Prof. Meghraj Chougoule - T&P Head & Hub Admin
- Password: `Admin@123`
- Role: ADMIN

### Coordinator Account
- Email: `coordinator.cse@mitcorer.edu.in`
- Name: Tirthesh Gutte
- Password: `Coord@123`
- Role: COORDINATOR

### Student Test Account
- Email: `tirthesh.gutte@mitcorer.edu.in`
- Name: Tirthesh Gutte
- Password: `Student@123`
- Role: STUDENT
- Roll Number: 24CSE101

## FILES MODIFIED

### Backend
1. `backend/apps/accounts/views.py` - Removed PIN authentication logic from LoginView
   - Lines 48-114: Removed PIN-based authentication
   - Now only accepts email/password for all roles

### Frontend
1. `frontend/src/pages/auth/Login.tsx` - Removed PIN UI
   - Removed Admin/Coordinator entry buttons
   - Removed PIN modal
   - Simplified to email/password only

2. `frontend/src/hooks/useAuth.tsx` - Removed PIN login function
   - Removed `loginWithPin` function
   - Removed from AuthContextType interface
   - Removed from AuthProvider

## MIGRATION INSTRUCTIONS

To apply these changes to an existing database with users who don't have passwords:

1. Run the seed script to ensure accounts have proper passwords:
```bash
cd backend
python3 seed_data.py
```

2. Or manually set passwords for existing users:
```python
from apps.accounts.models import User

admin = User.objects.get(email='admin@mitcorer.edu.in')
admin.set_password('Admin@123')
admin.save()

coord = User.objects.get(email='coordinator.cse@mitcorer.edu.in')
coord.set_password('Coord@123')
coord.save()
```

## TESTING

Test authentication for all three roles:

1. Admin Login:
   - Email: admin@mitcorer.edu.in
   - Password: Admin@123
   - Should redirect to /management

2. Coordinator Login:
   - Email: coordinator.cse@mitcorer.edu.in
   - Password: Coord@123
   - Should redirect to /management

3. Student Login:
   - Email: tirthesh.gutte@mitcorer.edu.in
   - Password: Student@123
   - Should redirect to /student

## SECURITY IMPROVEMENTS

- ✅ Removed hardcoded PIN authentication
- ✅ All users now authenticate with email/password
- ✅ Passwords are hashed using Django's built-in password hashing
- ✅ JWT tokens used for session management
- ✅ Role-based access control enforced server-side
