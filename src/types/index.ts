export type Role = 'ADMIN' | 'COORDINATOR' | 'STUDENT';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  student_profile?: StudentProfile;
  coordinator_profile?: CoordinatorProfile;
}

export interface StudentProfile {
  id: number;
  roll_number: string;
  prn_number?: string;
  registration_date?: string;
  department_id?: number;
  department_code?: string;
  department_name?: string;
  academic_year: string;
  division: string;
  semester: number;
  phone?: string;
  cgpa?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  is_verified: boolean;
  assigned_coordinator_id?: number | null;
  assigned_coordinator_name?: string | null;
}

export interface CoordinatorProfile {
  id: number;
  employee_id?: string;
  department_id?: number;
  department_code?: string;
  designation: string;
  phone?: string;
  can_publish_directly: boolean;
  notification_preferences?: {
    email_alerts?: boolean;
    report_submission_alerts?: boolean;
    document_verification_alerts?: boolean;
    application_alerts?: boolean;
  };
}

export type OpportunityStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'PUBLISHED' 
  | 'REJECTED' 
  | 'UNPUBLISHED' 
  | 'EXPIRED';

export interface Opportunity {
  id: number;
  title: string;
  organization: string;
  opportunity_type: 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP' | 'HACKATHON';
  description: string;
  learning_outcomes?: string;
  eligibility_requirements?: string;
  required_skills: string;
  start_date?: string;
  end_date?: string;
  duration: string;
  stipend_type: 'PAID' | 'UNPAID' | 'STIPEND';
  stipend_amount?: string;
  mode: 'REMOTE' | 'ONSITE' | 'HYBRID';
  available_seats: number;
  deadline: string;
  application_type: 'INTERNAL' | 'EXTERNAL';
  application_url?: string;
  external_warning_note?: string;
  created_by: number;
  creator_name?: string;
  creator_role?: string;
  status: OpportunityStatus;
  rejection_reason?: string;
  target_department_codes?: string[];
  published_at?: string;
  is_expired?: boolean;
  created_at: string;
}

export type ApplicationStatus = 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'SHORTLISTED' 
  | 'SELECTED' 
  | 'REJECTED' 
  | 'WITHDRAWN';

export interface Application {
  id: number;
  student: number;
  student_name: string;
  student_email: string;
  roll_number?: string;
  department_code?: string;
  opportunity: number;
  opportunity_details?: Opportunity;
  status: ApplicationStatus;
  resume_url?: string;
  cover_letter?: string;
  external_applied: boolean;
  external_reference_proof?: string;
  reviewer_feedback?: string;
  applied_at: string;
}

export type InternshipStatus = 'ACTIVE' | 'COMPLETED' | 'DELAYED' | 'TERMINATED';

export interface Internship {
  id: number;
  student: number;
  student_name: string;
  student_email: string;
  roll_number?: string;
  department_code?: string;
  organization_name: string;
  role_title: string;
  start_date: string;
  end_date: string;
  status: InternshipStatus;
  supervisor_name?: string;
  supervisor_email?: string;
  coordinator?: number;
  coordinator_name?: string;
  completion_status: 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  final_score: string;
  final_remarks?: string;
  reports_count?: number;
  approved_reports_count?: number;
  created_at: string;
}

export interface ProgressReport {
  id: number;
  internship: number;
  internship_role: string;
  internship_organization: string;
  student: number;
  student_name: string;
  week_number: number;
  start_date: string | null;
  end_date: string | null;
  tasks_completed: string;
  technical_skills: string;
  learning_outcomes: string;
  challenges_faced: string;
  solutions_implemented: string;
  project_progress: string;
  github_link: string;
  demo_link: string;
  next_week_plan: string;
  student_reflection: string;
  hours_worked: number;
  organization_name?: string;
  role_title?: string;
  proof_links?: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_IMPROVEMENT' | 'APPROVED';
  version_number: number;
  coordinator_comment: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  submission_timestamp: string | null;
  review_timestamp: string | null;
  created_at: string;
  updated_at: string;
  feedback_entries?: FeedbackEntry[];
  evidence_items?: ReportEvidenceItem[];
}

export interface ReportEvidenceItem {
  id: number;
  report: number;
  file_key: string;
  evidence_url: string;
  description: string;
  uploaded_at: string;
}

export interface FeedbackEntry {
  id: number;
  report: number;
  reviewer: number;
  reviewer_name: string;
  comments: string;
  score: number;
  created_at: string;
}

export interface WeeklyReportSummary {
  id: number;
  week_number: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_IMPROVEMENT' | 'APPROVED';
  version_number: number;
  hours_worked: number;
  technical_skills: string;
  tasks_completed_excerpt: string;
  submission_timestamp: string | null;
  review_timestamp: string | null;
  coordinator_comment: string;
  student_name: string;
  organization_name: string;
  review_state?: 'pending' | 'approved' | 'needs_improvement';
  last_reviewed_at?: string | null;
  progress_percentage?: number;
}

export interface StudentProgressSummary {
  id: number;
  name: string;
  email: string;
  roll_number: string | null;
  prn_number: string | null;
  department_code: string | null;
  department_name: string | null;
  academic_year: string | null;
  division: string | null;
  semester: number | null;
  phone: string | null;
  cgpa: string | null;
  bio: string | null;
  total_reports: number;
  approved_reports: number;
  total_hours_worked: number;
  internships: StudentInternshipSummary[];
}

export interface StudentInternshipSummary {
  id: number;
  organization_name: string;
  role_title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  completion_status: string;
  coordinator_name: string | null;
  total_reports: number;
  approved_reports: number;
  total_hours: number;
  progress_percentage: number;
  reports: ProgressReport[];
}

export interface StaffStudentDetail {
  id: number;
  name: string;
  email: string;
  roll_number: string | null;
  prn_number: string | null;
  department_code: string | null;
  department_name: string | null;
  academic_year: string | null;
  division: string | null;
  semester: number | null;
  phone: string | null;
  cgpa: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  total_reports: number;
  approved_reports: number;
  total_hours_worked: number;
  internships: StaffStudentInternship[];
}

export interface StaffStudentInternship {
  id: number;
  organization_name: string;
  role_title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  completion_status: string;
  coordinator_name: string | null;
  total_reports: number;
  approved_reports: number;
  total_hours: number;
  progress_percentage: number;
  reports: ProgressReport[];
}

export interface InactiveStudent {
  student_id: number;
  name: string;
  email: string;
  roll_number: string | null;
  prn_number: string | null;
  department_code: string | null;
  department_name: string | null;
  academic_year: string | null;
  internship_id: number;
  internship_title: string;
  organization_name: string;
  start_date: string | null;
  last_report_date: string | null;
  days_inactive: number | null;
  last_report_status: string;
}

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_IMPROVEMENT' | 'APPROVED';



export interface ImprovementTask {
  id: number;
  internship: number;
  student: number;
  student_name: string;
  assigned_by: number;
  assigned_by_name: string;
  organization_name?: string;
  title: string;
  description: string;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  student_notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface SkillAssessment {
  id: number;
  student: number;
  student_name: string;
  skill: number;
  skill_name: string;
  skill_category: string;
  initial_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  current_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  score: string;
  practical_evidence?: string;
  coordinator_feedback?: string;
  assessed_by?: number;
  assessed_by_name?: string;
  assessment_date: string;
}

export type DocumentType = 
  | 'OFFER_LETTER' 
  | 'JOINING_PROOF' 
  | 'WEEKLY_EVIDENCE' 
  | 'COMPLETION_CERTIFICATE' 
  | 'LOR' 
  | 'TRAINING_CERTIFICATE' 
  | 'PROJECT_REPORT' 
  | 'OTHER';

export type DocumentStatus = 
  | 'NOT_UPLOADED' 
  | 'SUBMITTED' 
  | 'UNDER_VERIFICATION' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'RESUBMISSION_REQUIRED';

export interface DocumentRecord {
  id: number;
  internship?: number;
  student: number;
  student_name: string;
  roll_number?: string;
  organization_name?: string;
  document_type: DocumentType;
  title: string;
  file_key: string;
  file_name: string;
  file_size: number;
  issuing_organization?: string;
  document_date?: string;
  verification_reference?: string;
  verification_url?: string;
  status: DocumentStatus;
  rejection_reason?: string;
  verified_by?: number;
  verified_by_name?: string;
  verified_at?: string;
  qr_code_key: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  link?: string;
  notification_type: string;
  read_at?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  actor?: number;
  actor_name?: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface MentorProfile {
  id: number;
  mentor_name: string;
  mentor_email: string;
  organization: string;
  designation: string;
  expertise_areas: string;
  bio: string;
  linkedin_url?: string;
  is_available: boolean;
}

export interface CommunityPostItem {
  id: number;
  author_name: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  is_pinned: boolean;
  created_at: string;
}

export interface ProjectTeamItem {
  id: number;
  title: string;
  description: string;
  required_skills: string;
  lead_name: string;
  max_members: number;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  members_count: number;
  members: { student_name: string; role: string }[];
  created_at: string;
}
