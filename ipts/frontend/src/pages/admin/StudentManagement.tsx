import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Search, Filter, ShieldCheck, Mail, CheckCircle2,
  Download, Eye, RefreshCw, AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export const StudentManagement: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const basePath = isAdmin ? '/admin' : '/coordinator';

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [resumeStatusFilter, setResumeStatusFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    roll_number: '',
    prn_number: '',
    department: 1,
    academic_year: '3rd Year (2025-26)',
    division: 'A',
    registration_date: new Date().toISOString().split('T')[0]
  });

  const loadStudents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<any[]>('/students/profiles/');
      const list = Array.isArray(data) ? data : (data as any)?.results || [];
      setStudents(list);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load registered students:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(false);
    const interval = setInterval(() => loadStudents(true), 15000);
    return () => clearInterval(interval);
  }, [loadStudents]);

  const handleAdminCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.roll_number) return;

    try {
      await api.post('/auth/register/', {
        role: 'STUDENT',
        email: newStudent.email,
        password: newStudent.password || 'Student@123',
        name: newStudent.name,
        roll_number: newStudent.roll_number,
        prn_number: newStudent.prn_number,
        academic_year: newStudent.academic_year,
        division: newStudent.division,
        department_id: newStudent.department,
        registration_date: newStudent.registration_date
      });

      setShowCreateModal(false);
      setNewStudent({
        name: '',
        email: '',
        password: '',
        roll_number: '',
        prn_number: '',
        department: 1,
        academic_year: '3rd Year (2025-26)',
        division: 'A',
        registration_date: new Date().toISOString().split('T')[0]
      });
      setActionSuccess(`Student account for ${newStudent.name} registered and saved to database.`);
      loadStudents(false);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionSuccess(err.message || 'Failed to create student account.');
    }
  };

  const filtered = students.filter(s => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      String(s.student_name || s.name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.prn_number || '').toLowerCase().includes(q) ||
      String(s.student_email || s.email || '').toLowerCase().includes(q) ||
      String(s.company || '').toLowerCase().includes(q);

    const matchesBranch = branchFilter === 'ALL' || s.department_code === branchFilter;
    const matchesYear = selectedYearFilter === 'ALL' || s.academic_year === selectedYearFilter;

    const skQuery = skillFilter.toLowerCase().trim();
    const matchesSkill = !skQuery ||
      (Array.isArray(s.skills) && s.skills.some((sk: string) => sk.toLowerCase().includes(skQuery))) ||
      String(s.target_domain || '').toLowerCase().includes(skQuery);

    const minCgpaVal = parseFloat(minCgpaFilter);
    const matchesCgpa = isNaN(minCgpaVal) || (parseFloat(s.cgpa || '0') || 0) >= minCgpaVal;

    const matchesResume = resumeStatusFilter === 'ALL' || s.resume_verification_status === resumeStatusFilter;

    let matchesReport = true;
    if (reportStatusFilter === 'PENDING_REVIEW') matchesReport = (s.reports_pending || 0) > 0;
    else if (reportStatusFilter === 'NEEDS_IMPROVEMENT') matchesReport = (s.reports_needs_improvement || 0) > 0;
    else if (reportStatusFilter === 'APPROVED') matchesReport = (s.reports_approved || 0) > 0;
    else if (reportStatusFilter === 'NO_REPORTS') matchesReport = (s.reports_submitted || 0) === 0;

    return matchesSearch && matchesBranch && matchesYear && matchesSkill && matchesCgpa && matchesResume && matchesReport;
  });

  const handleExportShortlistedCsv = () => {
    const headers = ['Roll Number', 'PRN Number', 'Student Name', 'Email', 'Branch', 'Year', 'CGPA', 'Skills', 'Internship Host', 'Reports Submitted', 'Progress %', 'Resume Status'];
    const rows = filtered.map(s => [
      s.roll_number,
      s.prn_number || '',
      s.student_name || s.name,
      s.student_email || s.email,
      s.department_code || 'CSE',
      s.academic_year || '',
      s.cgpa || '0.00',
      (s.skills || []).join('; '),
      s.company || 'Not Placed Yet',
      s.reports_submitted ?? 0,
      `${s.progress_percentage ?? 0}%`,
      s.resume_verification_status || 'NOT_SUBMITTED'
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitcorer_shortlisted_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Registered Student Roster & Shortlisting Hub</h1>
          <p className="page-subtitle">
            Comprehensive student progress directory, skill-based shortlisting, report tracking, and resume verification.
            {lastUpdated && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#2563eb' }}>• Synced at {lastUpdated}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadStudents(false)}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExportShortlistedCsv}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} /> Export Shortlist CSV ({filtered.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <UserPlus size={18} />
              Provision Student Account
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Multi-Criteria Search & Skill-Based Shortlisting Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
          Search & Skill-Based Student Shortlisting Filters (e.g. Skill: Python + Min CGPA: 7.5)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Name, Roll No, PRN, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '34px' }}
            />
          </div>

          <input
            type="text"
            placeholder="Filter by Skill (e.g. Python, AutoCAD)"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="form-control"
          />

          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="Min CGPA (e.g. 7.5)"
            value={minCgpaFilter}
            onChange={(e) => setMinCgpaFilter(e.target.value)}
            className="form-control"
          />

          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="form-control">
            <option value="ALL">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&TC</option>
            <option value="MECH">Mechanical</option>
            <option value="CIVIL">Civil</option>
          </select>

          <select value={resumeStatusFilter} onChange={(e) => setResumeStatusFilter(e.target.value)} className="form-control">
            <option value="ALL">All Resume Statuses</option>
            <option value="APPROVED">Resume Verified</option>
            <option value="PENDING">Pending Resume Review</option>
            <option value="NEEDS_IMPROVEMENT">Resume Needs Improvement</option>
            <option value="NOT_SUBMITTED">Resume Not Submitted</option>
          </select>

          <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} className="form-control">
            <option value="ALL">All Report Statuses</option>
            <option value="PENDING_REVIEW">Has Pending Reports</option>
            <option value="NEEDS_IMPROVEMENT">Reports Need Improvement</option>
            <option value="APPROVED">Has Approved Reports</option>
            <option value="NO_REPORTS">No Reports Submitted</option>
          </select>
        </div>
      </div>

      {/* Comprehensive Student Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Fetching registered students from database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No students match your filter criteria
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              When students register or update their skills/CGPA, they appear here in real time.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student & Roll / PRN</th>
                  <th>Branch & Year</th>
                  <th>CGPA & Skills</th>
                  <th>Internship & Progress</th>
                  <th>Weekly Reports</th>
                  <th>Resume & Docs Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.student_name || s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.student_email || s.email}</div>
                      <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          {s.roll_number}
                        </code>
                        {s.prn_number && (
                          <code style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            PRN: {s.prn_number}
                          </code>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.department_code || 'CSE'} • Div {s.division}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.academic_year}</div>
                      <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '2px' }}>
                        Profile: {s.profile_completion ?? 75}%
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                        CGPA: {s.cgpa && s.cgpa !== '0.00' ? s.cgpa : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(s.skills || []).length > 0 ? s.skills.join(', ') : 'No skills listed'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.company || 'Not Placed Yet'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ width: '56px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.progress_percentage ?? 0}%`, height: '100%', background: '#2563eb' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{s.progress_percentage ?? 0}%</span>
                      </div>
                      {s.is_inactive && (
                        <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>▲ Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        Total: {s.reports_submitted ?? 0} | Appr: <span style={{ color: '#059669' }}>{s.reports_approved ?? 0}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Pending: {s.reports_pending ?? 0} | Rework: {s.reports_needs_improvement ?? 0}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Tasks: {s.tasks_completed ?? 0} done / {s.tasks_pending ?? 0} open
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`badge ${
                          s.resume_verification_status === 'APPROVED' ? 'badge-success' :
                          s.resume_verification_status === 'NEEDS_IMPROVEMENT' ? 'badge-warning' :
                          s.resume_verification_status === 'PENDING' ? 'badge-published' : 'badge-neutral'
                        }`} style={{ fontSize: '0.72rem' }}>
                          Resume: {s.resume_verification_status || 'DRAFT'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Docs: {s.verified_documents_count ?? 0}/{s.documents_count ?? 0} verified
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <Link
                          to={`${basePath}/students/${s.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} /> Inspect & Review
                        </Link>
                        <a
                          href={`mailto:${s.student_email || s.email}`}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Mail size={12} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Admin Provision Account */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Provision Student Account (Admin Gateway)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Enrolls student directly into registry with role <code>STUDENT</code>.
            </p>

            <form onSubmit={handleAdminCreateStudent}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Deshmukh"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">College Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="rahul.deshmukh@mitcorer.edu.in"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="MIT-2026-CS-055"
                    value={newStudent.roll_number}
                    onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PRN Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="PRN202601055"
                    value={newStudent.prn_number}
                    onChange={(e) => setNewStudent({ ...newStudent, prn_number: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Academic Year *</label>
                  <select
                    value={newStudent.academic_year}
                    onChange={(e) => setNewStudent({ ...newStudent, academic_year: e.target.value })}
                    className="form-control"
                  >
                    <option value="4th Year (2026-27)">4th Year (2026-27)</option>
                    <option value="3rd Year (2025-26)">3rd Year (2025-26)</option>
                    <option value="2nd Year (2024-25)">2nd Year (2024-25)</option>
                    <option value="1st Year (2023-24)">1st Year (2023-24)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Division</label>
                  <input
                    type="text"
                    placeholder="A"
                    value={newStudent.division}
                    onChange={(e) => setNewStudent({ ...newStudent, division: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Academic Department *</label>
                  <select
                    value={newStudent.department}
                    onChange={(e) => setNewStudent({ ...newStudent, department: Number(e.target.value) })}
                    className="form-control"
                  >
                    <option value={1}>Computer Science & Engineering (CSE)</option>
                    <option value={2}>Electronics & Telecommunication (E&TC)</option>
                    <option value={3}>Mechanical Engineering (MECH)</option>
                    <option value={4}>Civil Engineering (CIVIL)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Date *</label>
                  <input
                    type="date"
                    required
                    value={newStudent.registration_date}
                    onChange={(e) => setNewStudent({ ...newStudent, registration_date: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="password"
                  placeholder="Leave blank for default (Student@123)"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Student to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
