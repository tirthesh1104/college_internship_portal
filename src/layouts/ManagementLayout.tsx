import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CheckCircle, FileText, PlusCircle, 
  Award, FileCheck, CheckSquare, BarChart3, Bell, User, LogOut, Menu, X,
  Shield, Layers, ShieldAlert, MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { api } from '../services/api';

export const ManagementLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    api.get<any[]>('/notifications/')
      .then((list) => {
        if (active && Array.isArray(list)) {
          setUnreadCount(list.filter((n) => !n.is_read).length);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  // Common Management Dashboard Navigation Items (Admin & Coordinator)
  const navItems = [
    { label: 'Overview', to: '/management', icon: LayoutDashboard, end: true },
    { label: 'Registered Students', to: '/management/students', icon: Users },
    { label: 'Application Reviews', to: '/management/applications', icon: CheckCircle },
    { label: 'Weekly Progress Reports', to: '/management/reports', icon: FileText },
    { label: 'Opportunities & Links', to: '/management/opportunities', icon: PlusCircle },
    { label: 'Tasks & Deadlines', to: '/management/tasks', icon: CheckSquare },
    { label: 'Skill Assessments', to: '/management/skills', icon: Award },
    { label: 'Document Verification', to: '/management/documents', icon: FileCheck },
    { label: 'Completion Approvals', to: '/management/completions', icon: Shield },
    { label: 'Reports & Analytics', to: '/management/analytics', icon: BarChart3 },
    { label: 'Feedback & Support', to: '/management/feedback', icon: MessageSquare },
    { label: 'Staff Overview', to: '/management/overview', icon: LayoutDashboard },
    { label: 'Staff Export', to: '/management/export', icon: FileText },
    ...(isAdmin ? [
      { label: 'Coordinator Scoping', to: '/management/coordinators', icon: Layers },
      { label: 'Security Audit Logs', to: '/management/audit-logs', icon: ShieldAlert },
    ] : []),
    { label: 'Profile & Settings', to: '/management/profile', icon: User },
  ];

  return (
    <div className="app-container">
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand-box">
          <Logo width={38} height={38} style={{ flexShrink: 0 }} />
          <div className="brand-text">
            <h1>MITCORER Hub</h1>
            <p>{isAdmin ? 'Admin Control Center' : 'Coordinator Workspace'}</p>
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
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: isAdmin ? '#7c3aed' : '#059669', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', flexShrink: 0
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : (isAdmin ? 'A' : 'C')}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || (isAdmin ? 'Admin' : 'Coordinator')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '6px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '6px' }}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              MAEER's MIT College of Railway Engineering & Research, Barshi
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <Link
              to={isAdmin ? '/management/audit-logs' : '/management/profile'}
              style={{ color: 'var(--text-secondary)', position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-6px', background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '999px', lineHeight: 1.2 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-published'}`}>
              {isAdmin ? 'Institutional Admin' : 'Department Coordinator'}
            </span>
            <Link to="/management/profile" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12.5px' }}>
              <User size={14} /> My Profile
            </Link>
          </div>
        </header>

        <main className="page-body content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
