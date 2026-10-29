import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f8fafc', padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            backgroundColor: '#eff6ff', color: '#2563eb',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <GraduationCap size={24} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Password Recovery</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            MITCORER Institutional Account
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Recovery Link Sent</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
              If an account with <strong>{email}</strong> exists, password reset instructions have been forwarded to your inbox.
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/login" className="btn btn-primary btn-sm">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Registered College Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="email"
                  required
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="student@mitcorer.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '8px' }}>
              Send Reset Instructions
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
          <Link to="/login" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
