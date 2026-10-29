import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CheckCircle, FileText, PlusCircle, 
  Award, FileCheck, CheckSquare, BarChart3, Bell, User, LogOut, Menu, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const CoordinatorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { label: 'Notifications', to: '/coordinator/notifications', icon: Bell },
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
                <span>{item.label}</span>
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
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {user?.coordinator_profile?.department_code || 'T&P Coordinator'}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Log Out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a' }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
              Training & Placement Coordinator
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <Link to="/coordinator/notifications" style={{ color: '#64748b' }}>
              <Bell size={20} />
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
