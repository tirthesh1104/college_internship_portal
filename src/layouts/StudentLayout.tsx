import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, BookOpen, Send, CalendarCheck, 
  FileText, TrendingUp, CheckSquare, Award, FileCheck2, 
  Sparkles, Users, UserPlus, MessageSquare, Bell, User, 
  HelpCircle, LogOut, Menu, X, ShieldCheck, Trophy
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', to: '/student', icon: LayoutDashboard, end: true },
    { label: 'Internship Opportunities', to: '/student/opportunities', icon: Briefcase },
    { label: 'Training Programs', to: '/student/training', icon: BookOpen },
    { label: 'My Applications', to: '/student/applications', icon: Send },
    { label: 'My Internships', to: '/student/internships', icon: CalendarCheck },
    { label: 'Weekly Progress Reports', to: '/student/reports', icon: FileText },
    { label: 'Performance Tracker', to: '/student/performance', icon: TrendingUp },
    { label: 'Leaderboard', to: '/student/leaderboard', icon: Trophy },
    { label: 'Tasks & Deadlines', to: '/student/tasks', icon: CheckSquare },
    { label: 'Skills & Assessments', to: '/student/skills', icon: Award },
    { label: 'Certificates & Documents', to: '/student/documents', icon: FileCheck2 },
    { label: 'Resume Builder & Matcher', to: '/student/resume', icon: FileText },
    { label: 'Career Passport', to: '/student/career-passport', icon: ShieldCheck },
    { label: 'AI Career Assistant', to: '/student/ai-assistant', icon: Sparkles },
    { label: 'Mentor Connect', to: '/student/mentors', icon: Users },
    { label: 'Project Team Finder', to: '/student/teams', icon: UserPlus },
    { label: 'Student Community', to: '/student/community', icon: MessageSquare },
    { label: 'Notifications', to: '/student/notifications', icon: Bell },
    { label: 'Feedback & Support', to: '/student/feedback', icon: MessageSquare },
    { label: 'My Profile & Settings', to: '/student/profile', icon: User },
    { label: 'Help & Support', to: '/help', icon: HelpCircle },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand-box">
          <Logo width={38} height={38} style={{ flexShrink: 0 }} />
          <div className="brand-text">
            <h1>MITCORER Hub</h1>
            <p>Student Portal</p>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="user-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              backgroundColor: 'var(--info-light)', color: 'var(--info)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', flexShrink: 0
            }}>
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.student_profile?.roll_number || 'Student'}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Log Out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Academic Year: <span style={{ color: 'var(--primary)' }}>{user?.student_profile?.academic_year || '2026-2027'}</span>
            </div>
            {user?.student_profile?.department_code && (
              <span className="badge badge-published">
                {user.student_profile.department_code}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <Link to="/student/notifications" style={{ position: 'relative', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px',
                borderRadius: '50%', backgroundColor: 'var(--danger)'
              }}></span>
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
