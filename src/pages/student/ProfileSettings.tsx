import React, { useState, useEffect } from 'react';
import { User, Shield, KeyRound, CheckCircle2, AlertCircle, Bell, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (user as any)?.phone || user?.coordinator_profile?.phone || '',
    rollNumber: user?.student_profile?.roll_number || 'N/A',
    prnNumber: user?.student_profile?.prn_number || 'N/A',
    department:
      user?.student_profile?.department_name ||
      user?.coordinator_profile?.department_code ||
      (user?.role === 'COORDINATOR'
        ? 'CSE'
        : user?.role === 'ADMIN'
        ? 'Administration'
        : 'Computer Science & Engineering (CSE)'),
    designation: user?.coordinator_profile?.designation || 'Training & Placement Coordinator',
    employeeId: user?.coordinator_profile?.employee_id || 'MIT-COORD-01',
    academicYear: user?.student_profile?.academic_year || '2026-2027',
    registrationDate:
      user?.student_profile?.registration_date ||
      (user?.created_at ? user.created_at.split('T')[0] : 'N/A'),
    division: user?.student_profile?.division || 'A',
    cgpa: user?.student_profile?.cgpa || '',
    bio: user?.student_profile?.bio || '',
    github: user?.student_profile?.github_url || '',
    linkedin: user?.student_profile?.linkedin_url || '',
    notifPrefs: {
      email_alerts: user?.coordinator_profile?.notification_preferences?.email_alerts ?? true,
      report_submission_alerts: user?.coordinator_profile?.notification_preferences?.report_submission_alerts ?? true,
      document_verification_alerts: user?.coordinator_profile?.notification_preferences?.document_verification_alerts ?? true,
      application_alerts: user?.coordinator_profile?.notification_preferences?.application_alerts ?? true
    }
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: (user as any).phone || user.coordinator_profile?.phone || '',
        rollNumber: user.student_profile?.roll_number || 'N/A',
        prnNumber: user.student_profile?.prn_number || 'N/A',
        department:
          user.student_profile?.department_name ||
          user.coordinator_profile?.department_code ||
          (user.role === 'COORDINATOR'
            ? 'CSE'
            : user.role === 'ADMIN'
            ? 'Administration'
            : 'Computer Science & Engineering (CSE)'),
        designation: user.coordinator_profile?.designation || 'Training & Placement Coordinator',
        employeeId: user.coordinator_profile?.employee_id || 'MIT-COORD-01',
        academicYear: user.student_profile?.academic_year || '2026-2027',
        registrationDate:
          user.student_profile?.registration_date ||
          (user.created_at ? user.created_at.split('T')[0] : 'N/A'),
        division: user.student_profile?.division || 'A',
        cgpa: user.student_profile?.cgpa || '',
        bio: user.student_profile?.bio || '',
        github: user.student_profile?.github_url || '',
        linkedin: user.student_profile?.linkedin_url || '',
        notifPrefs: {
          email_alerts: user.coordinator_profile?.notification_preferences?.email_alerts ?? true,
          report_submission_alerts: user.coordinator_profile?.notification_preferences?.report_submission_alerts ?? true,
          document_verification_alerts: user.coordinator_profile?.notification_preferences?.document_verification_alerts ?? true,
          application_alerts: user.coordinator_profile?.notification_preferences?.application_alerts ?? true
        }
      });
    }
  }, [user]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.patch('/auth/me/', {
        name: profileData.name.trim(),
        email: profileData.email.trim().toLowerCase(),
        phone: profileData.phone.trim(),
        department_code: profileData.department,
        designation: profileData.designation,
        employee_id: profileData.employeeId,
        notification_preferences: profileData.notifPrefs,
        cgpa: profileData.cgpa,
        bio: profileData.bio,
        github_url: profileData.github,
        linkedin_url: profileData.linkedin
      });
      await refreshUser();
      setSuccessMessage('Profile, department, and notification settings saved to the database.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update profile.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    try {
      await api.post('/auth/change-password/', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      setSuccessMessage('Password updated in the database and security audit log recorded.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password.');
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header">
        <h1 className="page-title">Profile, Email &amp; Security Settings</h1>
        <p className="page-subtitle">
          Manage your profile details, personal or college email address, notification preferences, and account password.
        </p>
      </div>

      {successMessage && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--primary)" />
            {user?.role === 'ADMIN'
              ? 'Admin Profile & Email Settings'
              : user?.role === 'COORDINATOR'
              ? 'Coordinator Faculty Profile & Preferences'
              : 'Student Academic Profile & Email Settings'}
          </h2>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Personal or College Email) *</label>
              <input
                type="email"
                required
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="form-control"
                placeholder="e.g. name@gmail.com or name@mitcorer.edu.in"
              />
            </div>

            {user?.role === 'COORDINATOR' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Assigned Department *</label>
                    <select
                      className="form-control"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    >
                      <option value="CSE">Computer Science &amp; Engineering (CSE)</option>
                      <option value="E&TC">Electronics &amp; Telecommunication (E&amp;TC)</option>
                      <option value="MECH">Mechanical Engineering (MECH)</option>
                      <option value="CIVIL">Civil Engineering (CIVIL)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee / Faculty ID</label>
                    <input
                      type="text"
                      value={profileData.employeeId}
                      onChange={(e) => setProfileData({ ...profileData, employeeId: e.target.value })}
                      className="form-control"
                      placeholder="e.g. MIT-COORD-01"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Designation / Role</label>
                    <input
                      type="text"
                      value={profileData.designation}
                      onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                      className="form-control"
                      placeholder="e.g. Training & Placement Coordinator"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Official Contact Number</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="form-control"
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', marginBottom: '1rem', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={15} color="var(--primary)" /> Coordinator Notification Preferences
                  </div>
                  <div style={{ display: 'grid', gap: '6px', fontSize: '0.82rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={profileData.notifPrefs.report_submission_alerts}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            notifPrefs: { ...profileData.notifPrefs, report_submission_alerts: e.target.checked }
                          })
                        }
                      />
                      Notify when assigned students submit weekly progress reports
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={profileData.notifPrefs.document_verification_alerts}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            notifPrefs: { ...profileData.notifPrefs, document_verification_alerts: e.target.checked }
                          })
                        }
                      />
                      Notify when students upload internship certificates or offer letters
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={profileData.notifPrefs.application_alerts}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            notifPrefs: { ...profileData.notifPrefs, application_alerts: e.target.checked }
                          })
                        }
                      />
                      Notify on new student internship applications
                    </label>
                  </div>
                </div>
              </>
            )}

            {user?.role === 'STUDENT' && (
              <>
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
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                    <label className="form-label">Current CGPA</label>
                    <input
                      type="text"
                      placeholder="e.g. 8.45"
                      value={profileData.cgpa}
                      onChange={(e) => setProfileData({ ...profileData, cgpa: e.target.value })}
                      className="form-control"
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
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Save Profile &amp; Settings
            </button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--primary)" />
              Security &amp; Password Update
            </h2>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password (optional for PIN-registered staff)</label>
                <input
                  type="password"
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
                  minLength={6}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="form-control"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
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
              <Sun size={18} color="var(--primary)" />
              Appearance &amp; Display Theme
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1rem' }}>
              Switch between Light Mode and Dark Mode across all dashboards, tables, forms, and public pages. Your preference is saved automatically.
            </p>
            <ThemeToggle />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="#059669" />
              Privacy &amp; Data Protection Notice
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              MITCORER Internship Hub follows strict institutional data governance. All progress report evidence, skill evaluations, and uploaded certificates are accessible strictly by your assigned department coordinator and institute administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
