import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCheck, CheckCircle2, 
  Layers, BarChart2, ShieldAlert, User, LogOut, Menu, X, Cpu, MessageSquare, Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { api } from '../services/api';

export const AdminLayout: React.FC = () => {
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

  const navItems = [
    { label: 'System Overview', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Student Management', to: '/admin/students', icon: Users },
    { label: 'Coordinator Management', to: '/admin/coordinators', icon: UserCheck },
    { label: 'Opportunity Approvals', to: '/admin/opportunities', icon: CheckCircle2 },
    { label: 'Internship Lifecycle Tracking', to: '/admin/internships', icon: Layers },
    { label: 'Analytics & Data Exports', to: '/admin/analytics', icon: BarChart2 },
    { label: 'Feedback & Support', to: '/admin/feedback', icon: MessageSquare },
    { label: 'Security Audit Logs', to: '/admin/audit-logs', icon: ShieldAlert },
    { label: 'AI Provider Settings', to: '/admin/ai-settings', icon: Cpu },
    { label: 'System Settings', to: '/admin/profile', icon: User },
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
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand-box">
          <Logo width={38} height={38} style={{ flexShrink: 0 }} />
          <div className="brand-text">
            <h1>MITCORER Hub</h1>
            <p>Admin Control Center</p>
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
              backgroundColor: '#f3e8ff', color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', flexShrink: 0
            }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                System Administrator
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '6px' }}
            className="mobile-toggle"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '6px' }}>
              College Administrator / Principal Portal
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <Link to="/admin/audit-logs" style={{ color: 'var(--text-secondary)', position: 'relative', display: 'inline-flex', alignItems: 'center' }} title="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-6px', background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '999px', lineHeight: 1.2 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
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
