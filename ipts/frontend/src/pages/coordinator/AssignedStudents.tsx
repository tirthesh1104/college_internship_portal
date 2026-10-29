import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, Mail, RefreshCw, AlertTriangle, Eye, Download
} from 'lucide-react';
import { api } from '../../services/api';

export const AssignedStudents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELAYED' | 'COMPLETED'>('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [resumeFilter, setResumeFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<any[]>('/reports/staff-students-list/');
      const list = Array.isArray(data) ? data : [];
      setStudents(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(false);
    const interval = setInterval(() => loadStudents(true), 15000);
    return () => clearInterval(interval);
  }, [loadStudents]);

  const filteredStudents = students.filter(s => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.company || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || s.department_code === branchFilter;
    const matchesResume = resumeFilter === 'ALL' || s.resume_verification_status === resumeFilter;

    const skQuery = skillFilter.toLowerCase().trim();
    const matchesSkill = !skQuery ||
      (Array.isArray(s.skills) && s.skills.some((sk: string) => sk.toLowerCase().includes(skQuery))) ||
      String(s.target_domain || '').toLowerCase().includes(skQuery);

    const minCgpaVal = parseFloat(minCgpaFilter);
    const matchesCgpa = isNaN(minCgpaVal) || (parseFloat(s.cgpa || '0') || 0) >= minCgpaVal;

    return matchesSearch && matchesStatus && matchesBranch && matchesResume && matchesSkill && matchesCgpa;
  });

  const handleExportShortlist = () => {
    const headers = ['Roll Number', 'Name', 'Email', 'Branch', 'Year', 'CGPA', 'Skills', 'Company', 'Reports Submitted', 'Progress %', 'Resume Status', 'Status'];
    const rows = filteredStudents.map(s => [
      s.roll_number,
      s.name,
      s.email,
      s.department_code || 'CSE',
      s.academic_year,
      s.cgpa || '0.00',
      (s.skills || []).join('; '),
      s.company,
      s.reports_submitted ?? 0,
      `${s.completion_rate ?? 0}%`,
      s.resume_verification_status || 'NOT_SUBMITTED',
      s.status
    ]);
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coordinator_shortlisted_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Assigned Students Supervision & Shortlisting</h1>
          <p className="page-subtitle">
            Monitor student progress, review weekly reports and resumes, identify inactive students, and shortlist candidates by skill &amp; CGPA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadStudents(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportShortlist}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} /> Export CSV ({filteredStudents.length})
          </button>
          <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            ● {students.filter(s => s.status === 'ACTIVE').length} Active
          </span>
          <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            ▲ {students.filter(s => s.status === 'DELAYED' || s.is_inactive).length} Need Attention
          </span>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => loadStudents(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Filter and Skill-Based Shortlisting Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student by name, roll number, or host organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['ALL', 'ACTIVE', 'DELAYED', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Filter by Skill (e.g. Python)"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            className="form-control"
            placeholder="Min CGPA (e.g. 7.5)"
            value={minCgpaFilter}
            onChange={(e) => setMinCgpaFilter(e.target.value)}
          />
          <select className="form-control" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="ALL">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&TC</option>
            <option value="MECH">Mechanical</option>
            <option value="CIVIL">Civil</option>
          </select>
          <select className="form-control" value={resumeFilter} onChange={(e) => setResumeFilter(e.target.value)}>
            <option value="ALL">All Resume Statuses</option>
            <option value="APPROVED">Resume Verified</option>
            <option value="PENDING">Pending Resume Review</option>
            <option value="NEEDS_IMPROVEMENT">Resume Needs Improvement</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading assigned students...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No assigned students found</h3>
              <p style={{ color: 'var(--text-muted)' }}>No students match your current filters or department assignments.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Branch &amp; CGPA</th>
                    <th>Skills &amp; Domain</th>
                    <th>Current Internship</th>
                    <th>Reports &amp; Progress</th>
                    <th>Resume Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.roll_number} • Div {s.division}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.department_code || 'CSE'} • {s.academic_year}</div>
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                          CGPA: {s.cgpa && s.cgpa !== '0.00' ? s.cgpa : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>{s.target_domain || 'Engineering'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(s.skills || []).length > 0 ? s.skills.join(', ') : 'No skills listed'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{s.company}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.role}</div>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.reports_submitted}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> filed ({s.reports_approved ?? 0} appr)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <div style={{ width: '56px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${s.completion_rate}%`, height: '100%', background: s.completion_rate >= 80 ? '#059669' : '#2563eb' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{s.completion_rate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          s.resume_verification_status === 'APPROVED' ? 'badge-success' :
                          s.resume_verification_status === 'NEEDS_IMPROVEMENT' ? 'badge-warning' :
                          s.resume_verification_status === 'PENDING' ? 'badge-published' : 'badge-neutral'
                        }`} style={{ fontSize: '0.72rem' }}>
                          {s.resume_verification_status || 'DRAFT'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Link
                            to={`/coordinator/students/${s.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> Progress &amp; Resume
                          </Link>
                          <a
                            href={`mailto:${s.email}`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Contact Student"
                          >
                            <Mail size={13} />
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
      )}
    </div>
  );
};
