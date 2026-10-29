import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  UserCheck,
  Shield,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/common/Logo';

export const Register: React.FC = () => {
  const [roleTab, setRoleTab] = useState<'STUDENT' | 'COORDINATOR' | 'ADMIN'>('STUDENT');

  // Common field
  const [name, setName] = useState('');

  // Student fields (Preserving existing fields)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [prnNumber, setPrnNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [division, setDivision] = useState('A');

  // Coordinator fields (No email/password required)
  const [departmentId, setDepartmentId] = useState<number>(1);
  const [designation, setDesignation] = useState('Assistant Professor & T&P Coordinator');

  // Role verification security PIN (Validated on backend)
  const [securityPin, setSecurityPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (roleTab === 'STUDENT') {
        const user = await register({
          role: 'STUDENT',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          roll_number: rollNumber.trim().toUpperCase(),
          prn_number: prnNumber.trim().toUpperCase(),
          department_id: 1, // CSE strictly enforced
          academic_year: academicYear,
          registration_date: registrationDate,
          division: division.trim().toUpperCase(),
        });
        redirectByRole(user.role);
      } else if (roleTab === 'COORDINATOR') {
        const user = await register({
          role: 'COORDINATOR',
          name: name.trim(),
          department_id: departmentId,
          designation: designation.trim(),
          security_pin: securityPin.trim(),
        });
        redirectByRole(user.role);
      } else if (roleTab === 'ADMIN') {
        const user = await register({
          role: 'ADMIN',
          name: name.trim(),
          security_pin: securityPin.trim(),
        });
        redirectByRole(user.role);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details and verification PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f8fafc', padding: '32px 20px'
    }}>
      <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Logo width={100} height={100} style={{ margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {roleTab === 'STUDENT' && 'MITCORER Student Registration'}
            {roleTab === 'COORDINATOR' && 'MITCORER Coordinator Registration'}
            {roleTab === 'ADMIN' && 'MITCORER Admin Registration'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Internship Hub • Department of Computer Science & Engineering (CSE)
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px',
          padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '10px',
          marginBottom: '22px'
        }}>
          <button
            type="button"
            onClick={() => { setRoleTab('STUDENT'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: roleTab === 'STUDENT' ? 700 : 500,
              backgroundColor: roleTab === 'STUDENT' ? '#ffffff' : 'transparent',
              color: roleTab === 'STUDENT' ? '#2563eb' : '#64748b',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: roleTab === 'STUDENT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <GraduationCap size={16} />
            Student
          </button>

          <button
            type="button"
            onClick={() => { setRoleTab('COORDINATOR'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: roleTab === 'COORDINATOR' ? 700 : 500,
              backgroundColor: roleTab === 'COORDINATOR' ? '#ffffff' : 'transparent',
              color: roleTab === 'COORDINATOR' ? '#059669' : '#64748b',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: roleTab === 'COORDINATOR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={16} />
            Coordinator
          </button>

          <button
            type="button"
            onClick={() => { setRoleTab('ADMIN'); setError(''); setSecurityPin(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 4px', fontSize: '13px', fontWeight: roleTab === 'ADMIN' ? 700 : 500,
              backgroundColor: roleTab === 'ADMIN' ? '#ffffff' : 'transparent',
              color: roleTab === 'ADMIN' ? '#7c3aed' : '#64748b',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              boxShadow: roleTab === 'ADMIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder={roleTab === 'STUDENT' ? 'e.g. Atharva Kulkarni' : 'Enter full name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* STUDENT SPECIFIC FIELDS (Preserved intact) */}
          {roleTab === 'STUDENT' && (
            <>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="e.g. name@gmail.com or name@mitcorer.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Accepts college or personal email address.
                </span>
              </div>

              {/* Roll Number and PRN Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. 24CSE105"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PRN Number *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. 72412850K"
                    value={prnNumber}
                    onChange={(e) => setPrnNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Department strictly CSE only */}
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select
                  className="form-control"
                  disabled
                  value={1}
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: '#0f172a' }}
                >
                  <option value={1}>CSE — Computer Science & Engineering</option>
                </select>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Registration is presently configured for Computer Science & Engineering students.
                </span>
              </div>

              {/* Academic Year Dropdown, Calendar Date Picker, and Division */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Academic Year *</label>
                  <select
                    className="form-control"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Division *</label>
                  <select
                    className="form-control"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                  >
                    <option value="A">Div A</option>
                    <option value="B">Div B</option>
                    <option value="C">Div C</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Create Password (min. 6 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {/* COORDINATOR SPECIFIC FIELDS (PIN-based, no email/password needed) */}
          {roleTab === 'COORDINATOR' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="form-control"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                  >
                    <option value={1}>CSE — Computer Science & Engineering</option>
                    <option value={2}>E&TC — Electronics & Telecom</option>
                    <option value={3}>MECH — Mechanical Engineering</option>
                    <option value={4}>CIVIL — Civil Engineering</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. T&P Coordinator"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Coordinator Secret Access PIN *</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#059669' }} />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
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
            </>
          )}

          {/* ADMIN SPECIFIC FIELDS (PIN-based, no email/password needed) */}
          {roleTab === 'ADMIN' && (
            <div className="form-group">
              <label className="form-label">Admin Secret Access PIN *</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#7c3aed' }} />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  className="form-control"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  placeholder="Enter Admin Secret PIN"
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
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px' }}
            disabled={loading}
          >
            {loading
              ? 'Verifying & Opening Dashboard...'
              : roleTab === 'STUDENT'
              ? 'Complete Student Registration'
              : roleTab === 'COORDINATOR'
              ? 'Register & Open Coordinator Dashboard'
              : 'Register & Open Admin Dashboard'}{' '}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>
            Sign In / Open Dashboard here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
