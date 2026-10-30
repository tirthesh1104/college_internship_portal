import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, Mail, RefreshCw, AlertTriangle, Eye, Download,
  UserCheck, CheckCircle2, FileText, ShieldCheck, FolderCheck, BarChart3, X, Trash2, Send, Briefcase, FileSpreadsheet, Award
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const LIFECYCLE_STAGES = [
  'NOT_STARTED',
  'APPLIED',
  'SELECTED',
  'IN_PROGRESS',
  'REPORT_SUBMITTED',
  'UNDER_REVIEW',
  'COMPLETED'
];

const LIFECYCLE_STAGE_ICONS: Record<string, any> = {
  NOT_STARTED: FileText,
  APPLIED: Send,
  SELECTED: UserCheck,
  IN_PROGRESS: Briefcase,
  REPORT_SUBMITTED: FileSpreadsheet,
  UNDER_REVIEW: Award,
  COMPLETED: CheckCircle2
};

export const AssignedStudents: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELAYED' | 'COMPLETED'>('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [resumeFilter, setResumeFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'MY_ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'roll_number' | 'cgpa' | 'progress' | 'reports'>('name');

  const [students, setStudents] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([
    '2026-2027',
    '2027-2028',
    '2028-2029',
    '2029-2030',
    '2025-2026',
    '2024-2025'
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [progressModalStudent, setProgressModalStudent] = useState<any | null>(null);
  const [deleteModalStudent, setDeleteModalStudent] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const loadStudents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [studentsData, coordsData, acadCfg] = await Promise.all([
        api.get<any[]>('/reports/staff-students-list/'),
        api.get<any[]>('/coordinators/profiles/').catch(() => []),
        api.get<any>('/academic-config/').catch(() => null)
      ]);
      const studentList = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.results || [];
      const coordList = Array.isArray(coordsData) ? coordsData : (coordsData as any)?.results || [];
      setStudents(studentList);
      setCoordinators(coordList);
      if (acadCfg && Array.isArray(acadCfg.available_academic_years)) {
        setAvailableAcademicYears(acadCfg.available_academic_years);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(false);
    return subscribeToLiveSync(() => loadStudents(true), 8000);
  }, [loadStudents]);

  const handleAssignCoordinator = async (studentId: number, coordinatorIdValue: string, academicYearOverride?: string) => {
    setAssigningId(studentId);
    setError(null);
    try {
      const coordId = coordinatorIdValue === 'UNASSIGN' ? null : Number(coordinatorIdValue);
      await api.post('/coordinators/assign-student/', {
        student_id: studentId,
        coordinator_id: coordId,
        unassign: coordinatorIdValue === 'UNASSIGN',
        academic_year: academicYearOverride
      });
      setActionMessage(
        coordinatorIdValue === 'UNASSIGN'
          ? 'Coordinator assignment removed for student.'
          : 'Student coordinator assignment updated and persisted.'
      );
      await loadStudents(true);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update student assignment');
    } finally {
      setAssigningId(null);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteModalStudent?.id) return;
    setDeletingStudent(true);
    setError(null);
    setActionMessage(null);
    try {
      const targetName = deleteModalStudent.name || deleteModalStudent.student_name || 'Student';
      const targetRoll = deleteModalStudent.roll_number || deleteModalStudent.email || '';
      const res = await api.delete<any>(`/students/${deleteModalStudent.id}/`);
      setStudents(prev => prev.filter(s => Number(s.id) !== Number(deleteModalStudent.id)));
      setDeleteModalStudent(null);
      setActionMessage(
        res?.message ||
          `Student "${targetName}" (${targetRoll}) and all associated records were permanently deleted.`
      );
      await loadStudents(true);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete student record.');
      setDeleteModalStudent(null);
    } finally {
      setDeletingStudent(false);
    }
  };

  const coordDeptCode = (user as any)?.coordinator_profile?.department_code || 'CSE';

  const filteredStudents = students
    .filter(s => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q) ||
        String(s.roll_number || '').toLowerCase().includes(q) ||
        String(s.prn_number || '').toLowerCase().includes(q) ||
        String(s.company || '').toLowerCase().includes(q) ||
        String(s.assigned_coordinator_name || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesBranch = branchFilter === 'ALL' || s.department_code === branchFilter;
      const matchesResume = resumeFilter === 'ALL' || s.resume_verification_status === resumeFilter;
      const matchesAcademicYear = academicYearFilter === 'ALL' || s.academic_year === academicYearFilter;

      const matchesAssignment =
        assignmentFilter === 'ALL' ||
        (assignmentFilter === 'MY_ASSIGNED' && (
          Number(s.assigned_coordinator_id) === Number(user?.id) ||
          String(s.department_code || 'CSE').toUpperCase() === String(coordDeptCode).toUpperCase()
        )) ||
        (assignmentFilter === 'UNASSIGNED' && !s.assigned_coordinator_id);

      const skQuery = skillFilter.toLowerCase().trim();
      const matchesSkill = !skQuery ||
        (Array.isArray(s.skills) && s.skills.some((sk: string) => sk.toLowerCase().includes(skQuery))) ||
        String(s.target_domain || '').toLowerCase().includes(skQuery);

      const minCgpaVal = parseFloat(minCgpaFilter);
      const matchesCgpa = isNaN(minCgpaVal) || (parseFloat(s.cgpa || '0') || 0) >= minCgpaVal;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesBranch &&
        matchesResume &&
        matchesAcademicYear &&
        matchesAssignment &&
        matchesSkill &&
        matchesCgpa
      );
    })
    .sort((a, b) => {
      if (sortBy === 'roll_number') return String(a.roll_number || '').localeCompare(String(b.roll_number || ''));
      if (sortBy === 'cgpa') return (parseFloat(b.cgpa || '0') || 0) - (parseFloat(a.cgpa || '0') || 0);
      if (sortBy === 'progress') return (Number(b.completion_rate || 0)) - (Number(a.completion_rate || 0));
      if (sortBy === 'reports') return (Number(b.reports_submitted || 0)) - (Number(a.reports_submitted || 0));
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const handleBulkAssignToMe = async () => {
    if (!user?.id) return;
    const unassignedIds = filteredStudents
      .filter((s) => !s.assigned_coordinator_id)
      .map((s) => s.id);
    if (unassignedIds.length === 0) {
      setActionMessage('All currently filtered students already have an assigned coordinator.');
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }
    try {
      await api.post('/coordinators/assign-student/', {
        student_ids: unassignedIds,
        coordinator_id: user.id
      });
      setActionMessage(`Assigned ${unassignedIds.length} unassigned student(s) to ${user.name}.`);
      await loadStudents(true);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed bulk assignment');
    }
  };

  const handleExportShortlist = () => {
    const headers = [
      'Roll Number',
      'Name',
      'Email',
      'Branch',
      'Academic Year',
      'Assigned Coordinator',
      'CGPA',
      'Skills',
      'Company',
      'Lifecycle Stage',
      'Reports Submitted',
      'Progress %',
      'Resume Status',
      'Status'
    ];
    const rows = filteredStudents.map(s => [
      s.roll_number,
      s.name,
      s.email,
      s.department_code || 'CSE',
      s.academic_year,
      s.assigned_coordinator_name || 'Unassigned',
      s.cgpa || '0.00',
      (s.skills || []).join('; '),
      s.company,
      s.lifecycle_stage || 'NOT_STARTED',
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
    a.download = `coordinator_assigned_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Assign Students &amp; Progress Supervision</h1>
          <p className="page-subtitle">
            Assign or reassign students to coordinators, monitor weekly reports and resumes, and shortlist candidates by skill, year &amp; CGPA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleBulkAssignToMe}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Assign all unassigned students in current view to yourself"
          >
            <UserCheck size={15} />
            Assign Unassigned to Me
          </button>
          <button
            onClick={() => loadStudents(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportShortlist}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <Download size={15} /> Export CSV ({filteredStudents.length})
          </button>
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            ● {students.filter(s => s.status === 'ACTIVE').length} Active
          </span>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            ▲ {students.filter(s => s.status === 'DELAYED' || s.is_inactive).length} Need Attention
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '12px 16px' }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{actionMessage}</span>
        </div>
      )}

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
              placeholder="Search student by name, roll number, coordinator, or host organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {([
              { key: 'ALL', label: `All Students (${students.length})` },
              { key: 'MY_ASSIGNED', label: `Assigned to Me (${students.filter(s => Number(s.assigned_coordinator_id) === Number(user?.id)).length})` },
              { key: 'UNASSIGNED', label: `Unassigned (${students.filter(s => !s.assigned_coordinator_id).length})` }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAssignmentFilter(tab.key)}
                className={`btn ${assignmentFilter === tab.key ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['ALL', 'ACTIVE', 'DELAYED', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
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
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&TC</option>
            <option value="MECH">Mechanical</option>
            <option value="CIVIL">Civil</option>
          </select>
          <select className="form-control" value={academicYearFilter} onChange={(e) => setAcademicYearFilter(e.target.value)}>
            <option value="ALL">All Academic Years</option>
            {availableAcademicYears.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <select className="form-control" value={resumeFilter} onChange={(e) => setResumeFilter(e.target.value)}>
            <option value="ALL">All Resume Statuses</option>
            <option value="APPROVED">Resume Verified</option>
            <option value="PENDING">Pending Resume Review</option>
            <option value="NEEDS_IMPROVEMENT">Resume Needs Improvement</option>
          </select>
          <select className="form-control" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} title="Sort students">
            <option value="name">Sort by Name</option>
            <option value="roll_number">Sort by Roll Number</option>
            <option value="cgpa">Sort by CGPA (High–Low)</option>
            <option value="progress">Sort by Progress %</option>
            <option value="reports">Sort by Reports Filed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading student directory &amp; coordinator assignments...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No students found</h3>
              <p style={{ color: 'var(--text-muted)' }}>No students match your current search or assignment filter.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Dept &amp; Academic Year</th>
                    <th>Assigned Coordinator</th>
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
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          CGPA: {s.cgpa && s.cgpa !== '0.00' ? s.cgpa : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.department_code || 'CSE'}</div>
                        <select
                          className="form-control"
                          style={{ fontSize: '0.75rem', padding: '2px 6px', marginTop: '4px', height: '28px', width: '115px' }}
                          value={s.academic_year || '2026-2027'}
                          disabled={assigningId === s.id}
                          onChange={(e) =>
                            handleAssignCoordinator(
                              s.id,
                              s.assigned_coordinator_id ? String(s.assigned_coordinator_id) : 'UNASSIGN',
                              e.target.value
                            )
                          }
                          title="Update student's academic year"
                        >
                          {availableAcademicYears.map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{
                            fontSize: '0.78rem',
                            padding: '4px 8px',
                            height: '32px',
                            minWidth: '175px',
                            borderColor: s.assigned_coordinator_id ? '#93c5fd' : '#fcd34d',
                            backgroundColor: s.assigned_coordinator_id ? '#f8fafc' : '#fffbeb',
                            fontWeight: 600
                          }}
                          disabled={assigningId === s.id}
                          value={s.assigned_coordinator_id ? String(s.assigned_coordinator_id) : 'UNASSIGN'}
                          onChange={(e) => handleAssignCoordinator(s.id, e.target.value)}
                        >
                          <option value="UNASSIGN">— Unassigned —</option>
                          {coordinators.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name} ({c.department?.code || 'CSE'})
                            </option>
                          ))}
                          {user && !coordinators.some((c) => Number(c.id) === Number(user.id)) && (
                            <option value={String(user.id)}>{user.name} (Me)</option>
                          )}
                        </select>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {s.assigned_coordinator_name || 'No coordinator assigned'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{s.company}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.role}</div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                          {s.lifecycle_stage || 'IN_PROGRESS'}
                        </span>
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
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '280px' }}>
                          <Link
                            to={`/coordinator/students/${s.id}?tab=profile`}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View Student Profile"
                          >
                            <Eye size={12} /> View Profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => setProgressModalStudent(s)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View 7-Stage Lifecycle & Progress"
                          >
                            <BarChart3 size={12} /> View Progress
                          </button>
                          <Link
                            to={`/coordinator/students/${s.id}?tab=reports`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View Weekly Reports"
                          >
                            <FileText size={12} /> View Reports
                          </Link>
                          <Link
                            to={`/coordinator/students/${s.id}?tab=resume`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View & Review Student Resume"
                          >
                            <ShieldCheck size={12} /> View Resume
                          </Link>
                          <Link
                            to={`/coordinator/students/${s.id}?tab=documents`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Review Uploaded Documents & Certificates"
                          >
                            <FolderCheck size={12} /> Review Documents
                          </Link>
                          <a
                            href={`mailto:${s.email}`}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 7px', display: 'inline-flex', alignItems: 'center' }}
                            title={`Email ${s.name}`}
                          >
                            <Mail size={12} />
                          </a>
                          <button
                            type="button"
                            onClick={() => setDeleteModalStudent(s)}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title={`Delete ${s.name} (${s.roll_number})`}
                          >
                            <Trash2 size={12} /> Delete Student
                          </button>
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

      {/* Delete Student Confirmation Modal */}
      {deleteModalStudent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: 'var(--danger-bg)', color: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Confirm Student Deletion
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Authorized Department Coordinator Action
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingStudent && setDeleteModalStudent(null)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px' }}
                disabled={deletingStudent}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              padding: '14px', borderRadius: '10px', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-subtle)', marginBottom: '16px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {deleteModalStudent.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <strong>Roll Number:</strong> {deleteModalStudent.roll_number} &nbsp;•&nbsp; <strong>Branch:</strong> {deleteModalStudent.department_code || 'CSE'} ({deleteModalStudent.academic_year})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                <strong>Email:</strong> {deleteModalStudent.email}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <strong>Associated Records:</strong> {deleteModalStudent.reports_submitted ?? 0} Weekly Report(s) • Host: {deleteModalStudent.company || 'None'} • {deleteModalStudent.documents_verified ?? 0} Verified Document(s) • Resume: {deleteModalStudent.resume_verification_status || 'DRAFT'}
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{deleteModalStudent.name}</strong> ({deleteModalStudent.roll_number})? This action will permanently remove the student account along with associated reports, applications, documents, resume, and internship records, and log this deletion in the security audit trail.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalStudent(null)}
                className="btn btn-outline"
                disabled={deletingStudent}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="btn btn-danger"
                disabled={deletingStudent}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                {deletingStudent ? 'Deleting Student...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Progress & 7-Stage Lifecycle Modal */}
      {progressModalStudent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: '100%', maxWidth: '680px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  {progressModalStudent.name} — Internship Progress &amp; Lifecycle
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {progressModalStudent.roll_number} • {progressModalStudent.department_code || 'CSE'} • {progressModalStudent.academic_year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalStudent(null)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 7-Stage Lifecycle Bar */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                7-Stage Internship Lifecycle Tracker
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {LIFECYCLE_STAGES.map((stage, idx) => {
                  const currentIdx = Math.max(0, LIFECYCLE_STAGES.indexOf(progressModalStudent.lifecycle_stage || 'IN_PROGRESS'));
                  const reached = idx <= currentIdx;
                  const StageIcon = LIFECYCLE_STAGE_ICONS[stage] || FileText;
                  return (
                    <div key={stage} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          height: '6px',
                          width: '100%',
                          borderRadius: '4px',
                          backgroundColor: reached ? '#2563eb' : '#cbd5e1',
                          marginBottom: '6px'
                        }}
                      />
                      <StageIcon size={16} style={{ color: reached ? '#2563eb' : '#94a3b8', marginBottom: '4px' }} />
                      <div style={{ fontSize: '10px', fontWeight: reached ? 700 : 500, color: reached ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {stage.replace(/_/g, ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Organization</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{progressModalStudent.company || 'Not Enrolled'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{progressModalStudent.role || 'N/A'}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Weekly Reports</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                  {progressModalStudent.reports_submitted ?? 0} Submitted ({progressModalStudent.reports_approved ?? 0} Approved)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--success)' }}>Completion Rate: {progressModalStudent.completion_rate ?? 0}%</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified Documents</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                  {progressModalStudent.documents_verified ?? 0} Verified
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Resume: {progressModalStudent.resume_verification_status || 'DRAFT'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setProgressModalStudent(null)} className="btn btn-outline">
                Close
              </button>
              <Link
                to={`/coordinator/students/${progressModalStudent.id}?tab=internships`}
                className="btn btn-primary"
                onClick={() => setProgressModalStudent(null)}
              >
                Open Full Internship &amp; Progress Workspace
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
