import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, CheckCircle2, ArrowLeft, KeyRound, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [tokenAvailable, setTokenAvailable] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res: any = await api.post('/auth/forgot-password/', { email: email.trim().toLowerCase() });
      setTokenAvailable(res.token_available === true);
      if (res.token) {
        setResetToken(res.token);
        setToken(res.token); // Pre-fill token field for convenience
      }
      setStep('reset');
    } catch (err: any) {
      setError(err?.message || 'Unable to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter both fields.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password/', {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        new_password: newPassword,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please check your reset token and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-main)', padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: 'var(--info-bg)', color: 'var(--info)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <GraduationCap size={26} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {step === 'done' ? 'Password Reset Complete' : 'Password Recovery'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            MITCORER Internship Portal — Student Account
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger)', borderRadius: '8px',
            color: 'var(--danger)', fontSize: '13px',
            display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Enter email */}
        {step === 'request' && (
          <form onSubmit={handleRequestReset}>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
              Enter your registered student email address. A reset token will be generated for your account.
            </p>
            <div className="form-group">
              <label className="form-label">Registered Student Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="email"
                  required
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="student@mitcorer.edu.in or gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '14px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Generating Reset Token...' : 'Request Password Reset'}
            </button>
          </form>
        )}

        {/* Step 2: Enter token + new password */}
        {step === 'reset' && (
          <>
            {tokenAvailable && resetToken && (
              <div style={{
                padding: '12px 14px', backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning)', borderRadius: '8px',
                fontSize: '13px', color: 'var(--warning)', marginBottom: '18px', lineHeight: 1.6
              }}>
                <strong>Your reset token:</strong>
                <code style={{
                  display: 'block', marginTop: '6px', padding: '6px 10px',
                  backgroundColor: 'var(--bg-card)', borderRadius: '6px',
                  fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-primary)',
                  border: '1px solid var(--border)'
                }}>
                  {resetToken}
                </code>
                <p style={{ marginTop: '6px', fontSize: '12px' }}>Copy this token — it expires in 1 hour.</p>
              </div>
            )}
            {!tokenAvailable && (
              <div style={{
                padding: '12px 14px', backgroundColor: 'var(--info-bg)',
                border: '1px solid var(--info)', borderRadius: '8px',
                fontSize: '13px', color: 'var(--info)', marginBottom: '18px', lineHeight: 1.6
              }}>
                If your email is registered, a reset token was generated. Please contact your coordinator or admin if you cannot proceed.
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reset Token *</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ paddingLeft: '38px', fontFamily: 'monospace', fontSize: '13px' }}
                    placeholder="Paste reset token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="form-control"
                    style={{ paddingLeft: '38px', paddingRight: '38px' }}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', fontSize: '14px', marginTop: '4px' }}
                disabled={loading}
              >
                {loading ? 'Resetting Password...' : 'Set New Password'}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Success */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Password Reset Successful</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              Your password has been reset successfully. You can now log in with your new credentials.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', gap: '6px', padding: '10px 20px' }}>
              Go to Login
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
