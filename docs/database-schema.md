# MITCORER IPTS — Database Schema & Architecture

## 1. Engine & Connectivity
- **Production Engine**: MySQL 8.0+ via PyMySQL / Django MySQL backend.
- **Local / Container Development**: SQLite 3 with automatic toggle via `DB_ENGINE=sqlite` or Node.js persistent store.

## 2. Core Relational Entities

### `accounts_user`
- `id` (BigInt, PK)
- `email` (VarChar 254, Unique)
- `name` (VarChar 150)
- `role` (VarChar 20, Enum: `STUDENT`, `COORDINATOR`, `ADMIN`)
- `is_active` (Boolean, Default True)
- `created_at` (DateTime)

### `accounts_studentprofile`
- `id` (BigInt, PK)
- `user_id` (ForeignKey -> accounts_user.id, OneToOne)
- `roll_number` (VarChar 20, Unique)
- `prn_number` (VarChar 30)
- `department_id` (Integer)
- `department_code` (VarChar 10: CSE, E&TC, MECH, CIVIL)
- `academic_year` (VarChar 15)
- `division` (VarChar 5)
- `cgpa` (Decimal 4,2)
- `is_verified` (Boolean)

### `accounts_coordinatorprofile`
- `id` (BigInt, PK)
- `user_id` (ForeignKey -> accounts_user.id, OneToOne)
- `employee_id` (VarChar 20, Unique)
- `department_code` (VarChar 10)
- `designation` (VarChar 100)
- `can_publish_directly` (Boolean)

### `opportunities_opportunity`
- `id` (BigInt, PK)
- `title` (VarChar 200)
- `organization` (VarChar 150)
- `opportunity_type` (VarChar 30: INTERNSHIP, TRAINING, WORKSHOP, HACKATHON)
- `mode` (VarChar 20: REMOTE, ONSITE, HYBRID)
- `country` (VarChar 50, Default: 'India')
- `is_international` (Boolean)
- `status` (VarChar 20: DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, REJECTED)
- `stipend_amount` (Decimal 10,2)
- `application_deadline` (Date)
- `created_by_id` (ForeignKey -> accounts_user.id)

### `internships_internship`
- `id` (BigInt, PK)
- `student_id` (ForeignKey -> accounts_user.id)
- `organization_name` (VarChar 150)
- `role_title` (VarChar 100)
- `start_date` (Date)
- `end_date` (Date)
- `status` (VarChar 20: ACTIVE, COMPLETED, PENDING_APPROVAL, TERMINATED)
- `coordinator_id` (ForeignKey -> accounts_user.id)

### `progress_reports_weeklyreport`
- `id` (BigInt, PK)
- `internship_id` (ForeignKey -> internships_internship.id)
- `student_id` (ForeignKey -> accounts_user.id)
- `week_number` (Integer)
- `tasks_summary` (TextField)
- `skills_developed` (TextField)
- `challenges` (TextField)
- `evidence_url` (VarChar 500)
- `github_pr_url` (VarChar 500)
- `score` (Integer, 0-100)
- `feedback` (TextField)
- `status` (VarChar 20: DRAFT, SUBMITTED, UNDER_REVIEW, NEEDS_IMPROVEMENT, APPROVED)
- `reviewed_by_id` (ForeignKey -> accounts_user.id)

### `documents_document`
- `id` (BigInt, PK)
- `user_id` (ForeignKey -> accounts_user.id)
- `document_type` (VarChar 30: OFFER_LETTER, JOINING_PROOF, REPORT_EVIDENCE, CERTIFICATE, LOR)
- `file_url` (VarChar 500)
- `file_size_bytes` (BigInt, Max 5MB enforced)
- `mime_type` (VarChar 50: PDF, JPG, PNG)
- `status` (VarChar 20: SUBMITTED, VERIFIED, REJECTED)
- `verified_by_id` (ForeignKey -> accounts_user.id)
