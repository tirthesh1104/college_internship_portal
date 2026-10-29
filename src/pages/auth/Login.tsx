import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  UserCheck,
  Shield,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/common/Logo';

export const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'COORDINATOR' | 'ADMIN'>('STUDENT');
  const [staffMode, setStaffMode] = useState<'OPEN' | 'REGISTER'>('OPEN');

  // Student Email + Password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Coordinator / Admin PIN & Registration fields (No email/password required)
  const [securityPin, setSecurityPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [designation, setDesignation] = useState('Department T&P Coordinator');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, pinLogin, register } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (role: string) => {
    if (role === 'ADMIN') {
      navigate('/admin');
    } else if (role === 'COORDINATOR') {
      navigate('/coordinator');
    } else {
      navigate('/student');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      redirectByRole(user.role);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent, role: 'COORDINATOR' | 'ADMIN') => {
    e.preventDefault();
    setError('');

    if (role === 'ADMIN') {
      const trimmedPin = securityPin.trim();
      if (!trimmedPin) {
        setError('Admin Security PIN is required.');
        return;
      }
      if (!/^\d+$/.test(trimmedPin)) {
        setError('Admin Security PIN must contain digits only.');
        return;
      }
      if (trimmedPin.length < 1 || trimmedPin.length > 4) {
        setError('Admin Security PIN must be strictly 1 to 4 digits.');
        return;
      }
    }

    setLoading(true);

    try {
      if (staffMode === 'OPEN') {
        const user = await pinLogin(role, securityPin.trim());
        redirectByRole(user.role);
      } else {
        const user = await register({
          role,
          name: staffName.trim(),
          department_id: departmentId,
          designation: role === 'COORDINATOR' ? designation.trim() : 'System Administrator',
          security_pin: securityPin.trim(),
        });
        redirectByRole(user.role);
      }
    } catch (err: any) {
      setError(err?.message || `Invalid ${role === 'ADMIN' ? 'Admin' : 'Coordinator'} Access Key / Security PIN.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-main)', padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Logo width={100} height={100} style={{ margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>MITCORER Portal Login</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Internship Performance Tracking System
          </p>
        </div>

        {/* Role Selector Buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px',
          padding: '4px', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px',
          marginBottom: '22px', border: '1px solid var(--border)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('STUDENT'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: activeTab === 'STUDENT' ? 700 : 500,
              backgroundColor: activeTab === 'STUDENT' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'STUDENT' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: activeTab === 'STUDENT' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <GraduationCap size={16} />
            Student
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('COORDINATOR'); setStaffMode('OPEN'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: activeTab === 'COORDINATOR' ? 700 : 500,
              backgroundColor: activeTab === 'COORDINATOR' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'COORDINATOR' ? 'var(--success)' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: activeTab === 'COORDINATOR' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={16} />
            Coordinator
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('ADMIN'); setStaffMode('OPEN'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: activeTab === 'ADMIN' ? 700 : 500,
              backgroundColor: activeTab === 'ADMIN' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'ADMIN' ? '#8b5cf6' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: activeTab === 'ADMIN' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={16} />
            Admin
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex',
            alignItems: 'center', gap: '8px', marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. STUDENT EMAIL + PASSWORD LOGIN */}
        {activeTab === 'STUDENT' && (
          <>
            <form onSubmit={handleStudentLogin}>
              <div className="form-group">
                <label className="form-label">Student Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    className="form-control"
                    style={{ paddingLeft: '38px' }}
                    placeholder="name@mitcorer.edu.in or name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-control"
                    style={{ paddingLeft: '38px', paddingRight: '38px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', marginTop: '8px', fontSize: '14px' }}
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In as Student'} <ArrowRight size={16} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
              Don't have a student account?{' '}
              <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>
                Self-Register here
              </Link>
            </div>
          </>
        )}

        {/* 2. COORDINATOR DIRECT PIN ACCESS & REGISTRATION */}
        {activeTab === 'COORDINATOR' && (
          <form onSubmit={(e) => handleStaffSubmit(e, 'COORDINATOR')}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setStaffMode('OPEN'); setError(''); }}
                className={staffMode === 'OPEN' ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', backgroundColor: staffMode === 'OPEN' ? '#059669' : undefined, borderColor: staffMode === 'OPEN' ? '#059669' : undefined }}
              >
                <KeyRound size={14} /> Open Dashboard
              </button>
              <button
                type="button"
                onClick={() => { setStaffMode('REGISTER'); setError(''); }}
                className={staffMode === 'REGISTER' ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', backgroundColor: staffMode === 'REGISTER' ? '#059669' : undefined, borderColor: staffMode === 'REGISTER' ? '#059669' : undefined }}
              >
                <UserPlus size={14} /> New Coordinator Register
              </button>
            </div>

            {staffMode === 'REGISTER' && (
              <>
                <div className="form-group">
                  <label className="form-label">Coordinator Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Enter Coordinator Full Name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-control"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(Number(e.target.value))}
                    >
                      <option value={1}>CSE</option>
                      <option value={2}>E&TC</option>
                      <option value={3}>MECH</option>
                      <option value={4}>CIVIL</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="T&P Coordinator"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Coordinator Secret Access Key / PIN *</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#059669' }} />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
                  className="form-control"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  placeholder="Enter Coordinator Secret PIN"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '8px', fontSize: '14px', backgroundColor: '#059669', borderColor: '#059669' }}
              disabled={loading}
            >
              {loading
                ? 'Verifying PIN...'
                : staffMode === 'OPEN'
                ? 'Open Coordinator Dashboard'
                : 'Register & Open Coordinator Dashboard'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* 3. ADMIN DIRECT PIN ACCESS & REGISTRATION */}
        {activeTab === 'ADMIN' && (
          <form onSubmit={(e) => handleStaffSubmit(e, 'ADMIN')}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setStaffMode('OPEN'); setError(''); }}
                className={staffMode === 'OPEN' ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', backgroundColor: staffMode === 'OPEN' ? '#7c3aed' : undefined, borderColor: staffMode === 'OPEN' ? '#7c3aed' : undefined }}
              >
                <KeyRound size={14} /> Open Dashboard
              </button>
              <button
                type="button"
                onClick={() => { setStaffMode('REGISTER'); setError(''); }}
                className={staffMode === 'REGISTER' ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', backgroundColor: staffMode === 'REGISTER' ? '#7c3aed' : undefined, borderColor: staffMode === 'REGISTER' ? '#7c3aed' : undefined }}
              >
                <UserPlus size={14} /> New Admin Register
              </button>
            </div>

            {staffMode === 'REGISTER' && (
              <div className="form-group">
                <label className="form-label">Administrator Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Enter Administrator Full Name"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Admin Secret Access Key / PIN (1–4 Digits) *</label>
              <div style={{ position: 'relative' }}>
                <Shield size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#7c3aed' }} />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]{1,4}"
                  className="form-control"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  placeholder="Enter 1–4 digit Admin PIN"
                  value={securityPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setSecurityPin(val);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '8px', fontSize: '14px', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              disabled={loading}
            >
              {loading
                ? 'Verifying PIN...'
                : staffMode === 'OPEN'
                ? 'Open Admin Dashboard'
                : 'Register & Open Admin Dashboard'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
