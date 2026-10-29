import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CheckCircle, FileText, PlusCircle, 
  Award, FileCheck, CheckSquare, BarChart3, Bell, User, LogOut, Menu, X, MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { api } from '../services/api';

export const CoordinatorLayout: React.FC = () => {
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
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', to: '/coordinator', icon: LayoutDashboard, end: true },
    { label: 'Assigned Students', to: '/coordinator/students', icon: Users },
    { label: 'Application Reviews', to: '/coordinator/applications', icon: CheckCircle },
    { label: 'Progress Report Reviews', to: '/coordinator/progress-reports', icon: FileText },
    { label: 'Manage Opportunities', to: '/coordinator/opportunities', icon: PlusCircle },
    { label: 'Skill Assessments', to: '/coordinator/skills', icon: Award },
    { label: 'Document Verification', to: '/coordinator/documents', icon: FileCheck },
    { label: 'Completion Approvals', to: '/coordinator/completions', icon: CheckSquare },
    { label: 'Reports & Analytics', to: '/coordinator/analytics', icon: BarChart3 },
    { label: 'Feedback & Support', to: '/coordinator/feedback', icon: MessageSquare },
    { label: 'Notifications', to: '/coordinator/notifications', icon: Bell, badge: unreadCount },
    { label: 'Profile & Settings', to: '/coordinator/profile', icon: User },
  ];

  return (
    <div className="app-container">
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand-box">
          <Logo width={38} height={38} style={{ flexShrink: 0 }} />
          <div className="brand-text">
            <h1>MITCORER Hub</h1>
            <p>Coordinator Workspace</p>
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '999px' }}>
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="user-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              backgroundColor: '#ecfdf5', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', flexShrink: 0
            }}>
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.coordinator_profile?.department_code || 'T&P Coordinator'}
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

      <div className="main-content">
        <header className="topbar">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)', backgroundColor: 'var(--success-bg)', padding: '4px 10px', borderRadius: '6px' }}>
              Training & Placement Coordinator
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <Link to="/coordinator/notifications" style={{ color: 'var(--text-secondary)', position: 'relative', display: 'inline-flex', alignItems: 'center' }} title="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-6px', background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '999px', lineHeight: 1.2 }}>
                  {unreadCount}
                </span>
              )}
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
