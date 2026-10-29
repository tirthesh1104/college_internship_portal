import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { ManagementLayout } from './layouts/ManagementLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { CoordinatorLayout } from './layouts/CoordinatorLayout';

// Public Pages
import { Home } from './pages/public/Home';
import { Opportunities } from './pages/public/Opportunities';
import { Training } from './pages/public/Training';
import { About } from './pages/public/About';
import { HelpSupport } from './pages/public/HelpSupport';
import { QRVerification } from './pages/public/QRVerification';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyApplications } from './pages/student/MyApplications';
import { MyInternships } from './pages/student/MyInternships';
import { WeeklyReports } from './pages/student/WeeklyReports';
import { PerformanceTracker } from './pages/student/PerformanceTracker';
import { Leaderboard } from './pages/student/Leaderboard';
import { TasksDeadlines } from './pages/student/TasksDeadlines';
import { SkillsAssessments } from './pages/student/SkillsAssessments';
import { Documents } from './pages/student/Documents';
import { CareerPassport } from './pages/student/CareerPassport';
import { Resume } from './pages/student/Resume';
import { StaffStudentDetail } from './pages/student/StaffStudentDetail';
import { AICareerAssistant } from './pages/student/AICareerAssistant';
import { MentorConnect } from './pages/student/MentorConnect';
import { ProjectTeamFinder } from './pages/student/ProjectTeamFinder';
import { StudentCommunity } from './pages/student/Community';
import { NotificationsPage } from './pages/student/Notifications';
import { ProfileSettings } from './pages/student/ProfileSettings';

// Coordinator Pages
import { CoordinatorDashboard } from './pages/coordinator/CoordinatorDashboard';
import { AssignedStudents } from './pages/coordinator/AssignedStudents';
import { OpportunityManagement } from './pages/coordinator/OpportunityManagement';
import { ReportReviews } from './pages/coordinator/ReportReviews';
import { CoordinatorSkillAssessments } from './pages/coordinator/SkillAssessments';
import { DocumentVerification } from './pages/coordinator/DocumentVerification';
import { CompletionApprovals } from './pages/coordinator/CompletionApprovals';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManagementDashboard } from './pages/admin/ManagementDashboard';
import { StudentManagement } from './pages/admin/StudentManagement';
import { CoordinatorManagement } from './pages/admin/CoordinatorManagement';
import { OpportunityApprovals } from './pages/admin/OpportunityApprovals';
import { AnalyticsReports } from './pages/admin/AnalyticsReports';
import { SecurityAuditLogs } from './pages/admin/AuditLogs';
import { InternshipTracking } from './pages/admin/InternshipTracking';
import { StaffOverview } from './pages/admin/StaffOverview';
import { StaffExport } from './pages/admin/StaffExport';

// Role Protected Guard
interface ProtectedRouteProps {
  allowedRoles: ('ADMIN' | 'COORDINATOR' | 'STUDENT')[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Authenticating user session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'COORDINATOR') return <Navigate to="/coordinator" replace />;
    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes with Header & Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/training" element={<Training />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/verify" element={<QRVerification />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Student Portal (Role: STUDENT) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="opportunities" element={<Opportunities />} />
            <Route path="training" element={<Training />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="internships" element={<MyInternships />} />
            <Route path="reports" element={<WeeklyReports />} />
            <Route path="performance" element={<PerformanceTracker />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="tasks" element={<TasksDeadlines />} />
            <Route path="skills" element={<SkillsAssessments />} />
            <Route path="documents" element={<Documents />} />
            <Route path="resume" element={<Resume />} />
            <Route path="career-passport" element={<CareerPassport />} />
            <Route path="ai-assistant" element={<AICareerAssistant />} />
            <Route path="mentors" element={<MentorConnect />} />
            <Route path="teams" element={<ProjectTeamFinder />} />
            <Route path="community" element={<StudentCommunity />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Dedicated Coordinator Portal (Role: COORDINATOR) */}
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
                <CoordinatorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CoordinatorDashboard />} />
            <Route path="students" element={<AssignedStudents />} />
            <Route path="students/:id" element={<StaffStudentDetail />} />
            <Route path="applications" element={<OpportunityManagement />} />
            <Route path="progress-reports" element={<ReportReviews />} />
            <Route path="opportunities" element={<OpportunityManagement />} />
            <Route path="skills" element={<CoordinatorSkillAssessments />} />
            <Route path="documents" element={<DocumentVerification />} />
            <Route path="completions" element={<CompletionApprovals />} />
            <Route path="analytics" element={<AnalyticsReports />} />
            <Route path="overview" element={<StaffOverview />} />
            <Route path="export" element={<StaffExport />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Dedicated Central Administration Portal (Role: ADMIN) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="students/:id" element={<StaffStudentDetail />} />
            <Route path="coordinators" element={<CoordinatorManagement />} />
            <Route path="opportunities" element={<OpportunityApprovals />} />
            <Route path="internships" element={<InternshipTracking />} />
            <Route path="analytics" element={<AnalyticsReports />} />
            <Route path="overview" element={<StaffOverview />} />
            <Route path="export" element={<StaffExport />} />
            <Route path="audit-logs" element={<SecurityAuditLogs />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Shared Management Hub (Roles: ADMIN & COORDINATOR) */}
          <Route
            path="/management"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR']}>
                <ManagementLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ManagementDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="students/:id" element={<StaffStudentDetail />} />
            <Route path="applications" element={<InternshipTracking />} />
            <Route path="reports" element={<ReportReviews />} />
            <Route path="opportunities" element={<OpportunityApprovals />} />
            <Route path="tasks" element={<TasksDeadlines />} />
            <Route path="skills" element={<CoordinatorSkillAssessments />} />
            <Route path="documents" element={<DocumentVerification />} />
            <Route path="completions" element={<CompletionApprovals />} />
            <Route path="analytics" element={<AnalyticsReports />} />
            <Route path="overview" element={<StaffOverview />} />
            <Route path="export" element={<StaffExport />} />
            <Route path="coordinators" element={<CoordinatorManagement />} />
            <Route path="audit-logs" element={<SecurityAuditLogs />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
