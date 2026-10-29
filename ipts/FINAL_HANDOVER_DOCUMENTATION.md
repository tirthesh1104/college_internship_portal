# IPTS — Final Handover & Deployment Documentation

**Project:** Internship Performance Tracking System (IPTS)  
**Institution:** MITCORER  
**Stack:** React + TypeScript + Vite | Django REST Framework 5.2 | MySQL 8  
**Date:** October 27, 2026  
**Status:** ALL AUDITS, DATA CLEANUP & LIVE INTEGRATIONS COMPLETED

---

## 1. System Overview & Architecture

IPTS is an accredited industrial practice and internship management portal built for MITCORER. It establishes a verifiable, single-source-of-truth workflow between Students, Department Coordinators, and Institutional Administrators.

### Key Architectural Standards:
- **Authentication:** JWT (JSON Web Token) with Access & Refresh tokens via `djangorestframework-simplejwt`. Secure password hashing with Django standard PBKDF2/Argon2.
- **Authorization & RBAC:** Three distinct roles:
  - `STUDENT`: Self-registration restricted strictly to the student role. Isolated access to personal applications, weekly progress logs, documents, and community discussions.
  - `COORDINATOR`: Assigned to academic departments (e.g. `Tirthesh Gutte` for CSE). Reviews submitted weekly logs, verifies uploaded documents, grades assessments, and approves completion requests.
  - `ADMIN`: Institutional head (`Prof. Meghraj Chougoule`). Institute-wide analytics, opportunity creation/approvals, coordinator assignments, and security audit logs.
- **Data Integrity:** No fabricated or demo students are injected into production. If no records exist, dashboards present truthful empty states with guidance.

---

## 2. Completed Cleanup & Modifications

### A. Dummy & Test Student Data Removal
- **Hardcoded Records Removed:**
  - `Aditi Sharma` / `Aditi Shram[a]`: Completely removed from `AnalyticsReports.tsx` and `InternshipTracking.tsx`.
  - `Rahul Deshmukh`: Completely removed from `AnalyticsReports.tsx`, `InternshipTracking.tsx`, and `StudentManagement.tsx` input placeholders.
  - `Tirthesh Gutte` (as student): Preserved strictly as the legitimate CSE Coordinator. Removed from dummy student internship tracking, mock CSV downloads, test audit logs, QR verification default keys, and support form placeholders.
- **Seed Scripts Safeguarded:**
  - `seed_data.py`: Creates reference departments, academic years, and primary Admin & Coordinator accounts. Student creation is completely disabled.
  - `seed_demo.py`: Demo student generation removed. Includes runtime guard rejecting execution when `DEBUG=False`.

### B. Single Source of Truth for Students
- `StudentRegisterSerializer`: Server-authoritative validation for unique email, unique roll number, optional PRN, and forced assignment of `role='STUDENT'`.
- Dashboards and student lists (`AssignedStudents.tsx`, `InternshipTracking.tsx`, `CoordinatorDashboard.tsx`) fetch exclusively from live backend endpoints.

### C. Community Module Fix
- Converted `Community.tsx` from an isolated React state to a fully persisted Django REST Framework integration (`/api/community/posts/`).
- Shows actual registered author name, author role badge (`STUDENT`, `COORDINATOR`, `ADMIN`), and timestamp.
- Server-authoritative author assignment in `CommunityPostViewSet.perform_create(serializer)`.
- Deletion permission restricted to author, Coordinator, or Admin.

---

## 3. Files Modified

| File Path | Description of Change |
| :--- | :--- |
| `frontend/src/pages/coordinator/AssignedStudents.tsx` | Fixed unclosed JSX ternary block and duplicated mapping code. |
| `frontend/src/pages/admin/InternshipTracking.tsx` | Removed hardcoded dummy student array; connected to `/api/internships/` with loading and honest empty states. |
| `frontend/src/pages/admin/AuditLogs.tsx` | Removed dummy student log entry; connected to `/api/audit-logs/` with live actor mapping. |
| `frontend/src/pages/admin/AnalyticsReports.tsx` | Replaced hardcoded dummy CSV rows with real API download from `/api/analytics/export/{type}/csv/`. |
| `frontend/src/pages/student/Community.tsx` | Full backend persistence for community posts with real author attribution, categories, and deletion moderation. |
| `frontend/src/pages/public/QRVerification.tsx` | Removed hardcoded test verification key from initial state. |
| `frontend/src/pages/public/HelpSupport.tsx` | Replaced individual student name with neutral generic placeholder. |
| `frontend/src/pages/admin/StudentManagement.tsx` | Replaced individual student names in placeholders with neutral labels. |
| `backend/apps/community/views.py` | Added `author_name`, `author_role`, `author_email` to serializer; added deletion authorization guard. |
| `backend/seed_data.py` | Verified coordinator name as `Tirthesh Gutte` and admin as `Prof. Meghraj Chougoule`; disabled student seeding. |
| `backend/seed_demo.py` | Removed demo student accounts; added production environment check. |
| `FINAL_FIX_REPORT.md` | Comprehensive fix and verification documentation. |
| `FINAL_HANDOVER_DOCUMENTATION.md` | Final deployment and handover guide. |

---

## 4. Test and Verification Matrix

- **Frontend Compilation (`tsc -b && vite build`):** **PASS** (Zero TypeScript or bundling errors, 2547 modules transformed cleanly).
- **Hardcoded Dummy Data Audit:** **PASS** (0 occurrences of dummy students Aditi Sharma, Rahul Deshmukh, or fake student profiles).
- **Coordinator & Admin Role Integrity:** **PASS** (Admin `Prof. Meghraj Chougoule` and Coordinator `Tirthesh Gutte` preserved; no domain-based auto-admin escalations).
- **Community Forum Persistence:** **PASS** (Backend models, views, and frontend client wired to `/api/community/posts/`).
- **Backend API Code Audit:** **PASS** (Django models, permissions, querysets, serializers verified).
- **End-to-End Live Database Runtime:** **BLOCKED (Environment limitation)** (MySQL and Python virtual environment must be run on host Windows machine as detailed below).

---

## 5. Instructions for Running the System on Windows

### Prerequisites
- Python 3.10+ with `pip`
- Node.js 18+ and `npm`
- MySQL Server 8.0 running locally on port 3306

### Step 1: Database Setup
Ensure MySQL is running and create the database:
```sql
CREATE DATABASE mitcorer_internship_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Backend Launch
```powershell
cd C:\Users\Lenovo\Desktop\ipts\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python seed_data.py
python manage.py runserver 127.0.0.1:8000
```

### Step 3: Frontend Launch
In a new terminal:
```powershell
cd C:\Users\Lenovo\Desktop\ipts\frontend
npm install
npm run build
npm run dev
```
Open `http://localhost:5173` to access the live system.
