import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Briefcase, Award, TrendingUp, ShieldCheck, UserCheck, ChevronRight } from 'lucide-react';
import { HeroBackground } from '../../components/common/HeroBackground';
import { AmbientParticles } from '../../components/common/AmbientParticles';
import { Logo } from '../../components/common/Logo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMousePos({ x, y });
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'COORDINATOR') return '/coordinator';
    return '/student';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.985, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="bg-ambient-glow"
      onMouseMove={handleMouseMove}
      style={{
        backgroundColor: '#030303',
        color: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* Dedicated Interactive Backgrounds & Particles */}
      <HeroBackground mousePos={mousePos} />
      <AmbientParticles />

      {/* Top Glass Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(3, 3, 3, 0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          height: '74px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Logo width={40} height={40} style={{ filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.4))' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '17.5px', color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              MITCORER <span style={{ color: '#8b5cf6' }}>Internship Hub</span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.2px' }}>
              MAEER’s MIT College of Railway Engineering &amp; Research, Barshi
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <ThemeToggle />

          {user ? (
            <Link
              to={getDashboardLink()}
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#c4b5fd',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              My Dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <Link
                to="/login"
                style={{
                  color: '#cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: '8px 14px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Log In
              </Link>

              <button
                type="button"
                className="shiny-border-btn"
                onClick={() => navigate('/home')}
                style={{ flexShrink: 0 }}
              >
                <span className="shiny-border-inner" style={{ fontSize: '13px', padding: '8px 20px', whiteSpace: 'nowrap' }}>
                  Enter Hub <ArrowRight size={14} color="#8b5cf6" />
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Content Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 24px 100px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: '920px', width: '100%' }}
        >
          {/* Institution Crest / Sub-badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <Logo width={115} height={115} style={{ filter: 'drop-shadow(0 12px 28px rgba(139, 92, 246, 0.45))' }} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(10px)',
            padding: '8px 24px',
            borderRadius: '9999px',
            marginBottom: '26px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              MITCORER Internship Hub
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ fontSize: '13px', color: '#22d3ee', fontWeight: 500 }}>
              Internship &amp; Technical Opportunities
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 'calc(38px + 2.2vw)',
            fontWeight: 400,
            lineHeight: 1.1,
            marginBottom: '22px',
            letterSpacing: '-0.02em',
            color: '#ffffff'
          }}>
            Empowering Careers Through <br />
            <span className="text-shimmer" style={{ fontStyle: 'italic', fontWeight: 400 }}>Verified Internships &amp; Practical Performance</span>
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#cbd5e1',
            lineHeight: 1.65,
            maxWidth: '780px',
            margin: '0 auto 40px',
            fontWeight: 400
          }}>
            Discover verified internships, technical training programs, practical learning opportunities, and career development resources through MAEER’s MIT College of Railway Engineering &amp; Research, Barshi.
          </p>

          {/* Prominent CTA Button */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: '60px' }}>
            <button
              type="button"
              className="shiny-border-btn"
              onClick={() => navigate('/home')}
              style={{ transform: 'scale(1.08)' }}
            >
              <span className="shiny-border-inner" style={{ fontSize: '16px', padding: '14px 34px', gap: '10px' }}>
                Enter Internship Hub <ArrowRight size={18} color="#22d3ee" />
              </span>
            </button>

            <Link
              to="/opportunities"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                padding: '14px 28px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              Browse Opportunities <ChevronRight size={16} />
            </Link>
          </div>

          {/* 3 Quick Pillar Cards (Glassmorphism) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '22px', textAlign: 'left' }}>
            <div
              className="card-3d"
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.75)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <Briefcase size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Verified Opportunities</h3>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.55 }}>
                Centralized listings published by T&amp;P Coordinators and verified industry partners for engineering students.
              </p>
            </div>

            <div
              className="card-3d"
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.75)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.2)', color: '#67e8f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <TrendingUp size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Weekly Progress Review</h3>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.55 }}>
                Weekly task logging, technical skills verification, GitHub proofs, and direct faculty coordinator review.
              </p>
            </div>

            <div
              className="card-3d"
              style={{
                backgroundColor: 'rgba(10, 10, 10, 0.75)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Award size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Career Passport &amp; QR</h3>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.55 }}>
                Accredited completion certificates with QR verification and a compiled Digital Career Passport for placement interviews.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Role Access Quick Bar Footer */}
      <footer
        style={{
          backgroundColor: 'rgba(3, 3, 3, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '24px 36px',
          position: 'relative',
          zIndex: 20
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            © {new Date().getFullYear()} MAEER's MIT College of Railway Engineering and Research, Barshi.
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px' }}>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={14} color="#8b5cf6" /> Student Login
            </Link>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={14} color="#06b6d4" /> Coordinator Login
            </Link>
            <Link to="/verify" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#10b981" /> QR Certificate Verification
            </Link>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};
