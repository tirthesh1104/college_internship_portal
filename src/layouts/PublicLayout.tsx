import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShieldCheck, HelpCircle, Briefcase, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'COORDINATOR') return '/coordinator';
    return '/student';
  };

  const navLinks = [
    { to: '/home', label: 'Home' },
    { to: '/opportunities', label: 'Opportunities', icon: <Briefcase size={15} /> },
    { to: '/training', label: 'Training', icon: <BookOpen size={15} /> },
    { to: '/about', label: 'About' },
    { to: '/verify', label: 'Verify', icon: <ShieldCheck size={15} /> },
    { to: '/help', label: 'Help', icon: <HelpCircle size={15} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Navigation */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)', height: '70px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
      }}>
        <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <Logo width={42} height={42} style={{ flexShrink: 0 }} />
          <div className="public-brand-text">
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              MITCORER <span style={{ color: 'var(--primary)' }}>Internship Hub</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              MAEER's MIT College of Railway Engineering &amp; Research, Barshi
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="public-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname === to || (to !== '/home' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                style={{
                  fontSize: '14px', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'color 0.15s ease'
                }}
              >
                {icon} {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <ThemeToggle />

          {/* Desktop CTA */}
          <div className="public-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user ? (
              <Link to={getDashboardLink()} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', height: '40px', padding: '0 18px' }}>
                My Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" style={{ whiteSpace: 'nowrap', height: '40px', padding: '0 18px', fontSize: '14px', fontWeight: 600 }}>
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary" style={{ whiteSpace: 'nowrap', height: '40px', padding: '0 18px', fontSize: '14px', fontWeight: 700 }}>
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileNavOpen(v => !v)}
            className="public-mobile-toggle"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '6px', display: 'none' }}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div style={{
          position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 49,
          backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '4px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileNavOpen(false)}
              style={{
                fontSize: '15px', fontWeight: 600,
                color: location.pathname === to ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '12px 0', borderBottom: '1px solid var(--border-light)',
                display: 'block'
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ paddingTop: '12px', display: 'flex', gap: '10px' }}>
            {user ? (
              <Link to={getDashboardLink()} className="btn btn-primary btn-sm" onClick={() => setMobileNavOpen(false)}>
                My Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => setMobileNavOpen(false)}>Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMobileNavOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '48px 32px 24px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', marginBottom: '32px' }}>
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
            <p style={{ fontSize: '13px', lineHeight: 1.8 }}>
              MAEER's MIT College of Railway Engineering &amp; Research<br />
              Jamgaon Road, Barshi, Dist. Solapur – 413401<br />
              Maharashtra, India<br />
              <a href="mailto:tnpoffice@mitcorer.edu.in" style={{ color: '#94a3b8' }}>tnpoffice@mitcorer.edu.in</a>
            </p>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Quick Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link to="/opportunities" style={{ color: '#cbd5e1' }}>Available Opportunities</Link>
              <Link to="/training" style={{ color: '#cbd5e1' }}>Training &amp; Workshops</Link>
              <Link to="/verify" style={{ color: '#cbd5e1' }}>QR Certificate Verification</Link>
              <Link to="/about" style={{ color: '#cbd5e1' }}>About the Institution</Link>
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
