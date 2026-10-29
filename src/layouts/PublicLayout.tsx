import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShieldCheck, HelpCircle, Briefcase, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';

import { ThemeToggle } from '../components/common/ThemeToggle';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'COORDINATOR') return '/coordinator';
    return '/student';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Navigation */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)', height: '70px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
      }}>
        <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Logo width={42} height={42} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              MITCORER <span style={{ color: 'var(--primary)' }}>Internship Hub</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              MAEER’s MIT College of Railway Engineering & Research, Barshi
            </div>
          </div>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/home" style={{ fontSize: '14px', fontWeight: (location.pathname === '/home' || location.pathname === '/') ? 700 : 500, color: (location.pathname === '/home' || location.pathname === '/') ? 'var(--primary)' : 'var(--text-secondary)' }}>
            Home
          </Link>
          <Link to="/opportunities" style={{ fontSize: '14px', fontWeight: location.pathname.startsWith('/opportunities') ? 700 : 500, color: location.pathname.startsWith('/opportunities') ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={16} /> Opportunities
          </Link>
          <Link to="/training" style={{ fontSize: '14px', fontWeight: location.pathname === '/training' ? 700 : 500, color: location.pathname === '/training' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} /> Training Programs
          </Link>
          <Link to="/about" style={{ fontSize: '14px', fontWeight: location.pathname === '/about' ? 700 : 500, color: location.pathname === '/about' ? 'var(--primary)' : 'var(--text-secondary)' }}>
            About
          </Link>
          <Link to="/verify" style={{ fontSize: '14px', fontWeight: location.pathname.startsWith('/verify') ? 700 : 500, color: location.pathname.startsWith('/verify') ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> Certificate Verify
          </Link>
          <Link to="/help" style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={16} /> Help
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <ThemeToggle />
          {user ? (
            <Link to={getDashboardLink()} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', height: '42px', padding: '0 20px' }}>
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <Link to="/login" className="btn btn-secondary" style={{ whiteSpace: 'nowrap', height: '42px', padding: '0 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0 }}>
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ whiteSpace: 'nowrap', height: '42px', padding: '0 22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                Student Registration
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Page Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '48px 32px 24px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff', fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>
              <Logo width={22} height={22} style={{ flexShrink: 0 }} /> MITCORER Internship Hub
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#94a3b8' }}>
              Centralized platform for managing student internships, industry training, weekly performance verification, technical skill assessments, and accredited career credentials.
            </p>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Contact Institution</div>
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
              MAEER's MIT College of Railway Engineering & Research<br />
              Jamgaon Road, Barshi, Dist. Solapur - 413401<br />
              Maharashtra, India<br />
              Email: tnpoffice@mitcorer.edu.in
            </p>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Quick Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <Link to="/opportunities" style={{ color: '#cbd5e1' }}>Available Opportunities</Link>
              <Link to="/training" style={{ color: '#cbd5e1' }}>Training & Workshops</Link>
              <Link to="/verify" style={{ color: '#cbd5e1' }}>QR Certificate Verification</Link>
              <Link to="/login" style={{ color: '#cbd5e1' }}>Portal Login</Link>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          © {new Date().getFullYear()} MAEER's MIT College of Railway Engineering and Research, Barshi. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
