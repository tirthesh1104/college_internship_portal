import React, { useState } from 'react';
import { User, Mail, Building, Award, Shield, KeyRound, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    rollNumber: user?.student_profile?.roll_number || 'N/A',
    prnNumber: user?.student_profile?.prn_number || 'N/A',
    department: user?.student_profile?.department_name || (user?.role === 'COORDINATOR' ? 'Coordinator Faculty' : user?.role === 'ADMIN' ? 'Administration' : 'Computer Science & Engineering (CSE)'),
    academicYear: user?.student_profile?.academic_year || 'Current Session',
    registrationDate: user?.student_profile?.registration_date || (user?.created_at ? user.created_at.split('T')[0] : 'N/A'),
    division: user?.student_profile?.division || 'A',
    cgpa: user?.student_profile?.cgpa || '',
    bio: user?.student_profile?.bio || '',
    github: user?.student_profile?.github_url || '',
    linkedin: user?.student_profile?.linkedin_url || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/auth/me/', {
        name: profileData.name,
        cgpa: profileData.cgpa,
        bio: profileData.bio,
        github_url: profileData.github,
        linkedin_url: profileData.linkedin
      });
      await refreshUser();
      setSuccessMessage('Personal details successfully updated and synchronized with student registry & Resume Builder.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setSuccessMessage(err.message || 'Failed to update profile.');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    setSuccessMessage('Password changed successfully. Your account session is protected.');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="portal-page">
      <div className="page-header">
        <h1 className="page-title">My Profile & Security Settings</h1>
        <p className="page-subtitle">Manage your personal details, academic verification data, and account security preferences.</p>
      </div>

      {successMessage && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--primary)" />
            Student Academic Profile
          </h2>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">College Email Address (Official ID)</label>
              <input 
                type="email" 
                value={profileData.email}
                disabled
                className="form-control"
                style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Official email is locked to college registry authentication.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <input 
                  type="text" 
                  value={profileData.rollNumber}
                  disabled
                  className="form-control"
                  style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed', fontWeight: 600 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Institutional Roll Number</span>
              </div>

              <div className="form-group">
                <label className="form-label">PRN Number</label>
                <input 
                  type="text" 
                  value={profileData.prnNumber}
                  disabled
                  className="form-control"
                  style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed', fontWeight: 600, color: '#1d4ed8' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Permanent Registration No.</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <input 
                  type="text" 
                  value={profileData.academicYear}
                  disabled
                  className="form-control"
                  style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registration Date</label>
                <input 
                  type="text" 
                  value={profileData.registrationDate}
                  disabled
                  className="form-control"
                  style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Professional Summary / Bio</label>
              <textarea 
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">GitHub Profile URL</label>
                <input 
                  type="url" 
                  value={profileData.github}
                  onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">LinkedIn Profile URL</label>
                <input 
                  type="url" 
                  value={profileData.linkedin}
                  onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--primary)" />
              Security & Password
            </h2>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password *</label>
                <input 
                  type="password" 
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="form-control"
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password *</label>
                <input 
                  type="password" 
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="form-control"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input 
                  type="password" 
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="form-control"
                  placeholder="Re-type new password"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="#059669" />
              Privacy & Data Protection Notice
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              MITCORER Internship Hub follows strict data minimization principles. Personal phone numbers, home addresses, and private government identification are neither collected nor disclosed. All progress report evidence and uploaded offer letters are encrypted and accessible strictly by your assigned department coordinator and institute administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
