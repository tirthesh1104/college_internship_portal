import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Search, RefreshCw, AlertTriangle, Eye, CheckCircle2,
  Calendar, Award, FileText, Users, Download, Send, UserCheck, Briefcase, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

const LIFECYCLE_STAGES = [
  { step: 1, key: 'APPLIED', label: 'Applied', icon: Send },
  { step: 2, key: 'SHORTLISTED', label: 'Shortlisted', icon: UserCheck },
  { step: 3, key: 'APPROVED_ACTIVE', label: 'Approved/Active', icon: Briefcase },
  { step: 4, key: 'WEEKLY_REPORTS', label: 'Weekly Reports', icon: FileSpreadsheet },
  { step: 5, key: 'EVALUATION', label: 'Evaluation', icon: Award },
  { step: 6, key: 'CERTIFICATE_VERIFIED', label: 'Certificate Verified', icon: ShieldCheck },
  { step: 7, key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 }
];

export const InternshipTracking: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');

  const [students, setStudents] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [academicConfig, setAcademicConfig] = useState<any>({
    current_academic_year: '2026-2027',
    available_academic_years: ['2026-2027', '2027-2028', '2028-2029', '2029-2030', '2025-2026', '2024-2025']
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Student Detail Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Academic Year Manager Modal State
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('2030-2031');
  const [promoteFromYear, setPromoteFromYear] = useState('2026-2027');
  const [promoteToYear, setPromoteToYear] = useState('2027-2028');

  const fetchAllTrackingData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [studentsRes, coordsRes, acadRes] = await Promise.all([
        api.get<any[]>('/reports/staff-students-list/'),
        api.get<any[]>('/coordinators/profiles/').catch(() => []),
        api.get<any>('/academic-config/').catch(() => null)
      ]);
      setStudents(Array.isArray(studentsRes) ? studentsRes : ((studentsRes as any)?.results || []));
      setCoordinators(Array.isArray(coordsRes) ? coordsRes : ((coordsRes as any)?.results || []));
      if (acadRes && Array.isArray(acadRes.available_academic_years)) {
        setAcademicConfig(acadRes);
      }
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Unable to retrieve complete student tracking records.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTrackingData(false);
    return subscribeToLiveSync(() => fetchAllTrackingData(true), 8000);
  }, [fetchAllTrackingData]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handlePrintReport = async () => {
    try {
      const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';
      const res = await fetch('/api/analytics/export/students/html/', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to generate printable report');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MITCORER_Student_Lifecycle_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Official printable student lifecycle report downloaded.');
    } catch (err: any) {
      setError(err?.message || 'Could not download report');
    }
  };

  const openStudentDetails = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setLoadingDetail(true);
    try {
      const detail = await api.get<any>(`/reports/staff-student-detail/${studentId}/`);
      setStudentDetail(detail);
    } catch (err: any) {
      setError(err?.message || 'Failed to load student details');
      setSelectedStudentId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssignCoordinator = async (studentId: number, coordIdStr: string) => {
    try {
      await api.post('/coordinators/assign-student/', {
        student_id: studentId,
        coordinator_id: coordIdStr === 'UNASSIGN' ? null : Number(coordIdStr),
        unassign: coordIdStr === 'UNASSIGN'
      });
      showToast('Coordinator assignment updated.');
      await fetchAllTrackingData();
      if (selectedStudentId === studentId) {
        await openStudentDetails(studentId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to assign coordinator');
    }
  };

  const handleAddAcademicYear = async () => {
    if (!newYearInput.trim()) return;
    try {
      const res = await api.post<any>('/academic-config/', {
        add_academic_year: newYearInput.trim(),
        current_academic_year: academicConfig.current_academic_year
      });
      setAcademicConfig(res);
      showToast(`Academic year ${newYearInput.trim()} added to system configuration.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update academic config');
    }
  };

  const handlePromoteCohort = async () => {
    try {
      const res = await api.post<any>('/academic-config/', {
        current_academic_year: promoteToYear,
        advance_cohort_from: promoteFromYear,
        advance_cohort_to: promoteToYear
      });
      setAcademicConfig(res);
      showToast(`Cohort progressed from ${promoteFromYear} to ${promoteToYear} (${res.promoted_students_count || 0} student records updated with historical preservation).`);
      setShowYearModal(false);
      await fetchAllTrackingData();
    } catch (err: any) {
      setError(err?.message || 'Cohort progression failed');
    }
  };

  const filtered = students.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.company || '').toLowerCase().includes(q) ||
      String(s.assigned_coordinator_name || '').toLowerCase().includes(q);
    const matchesDept = deptFilter === 'ALL' || s.department_code === deptFilter;
    const matchesYear = yearFilter === 'ALL' || s.academic_year === yearFilter;
    const matchesStage = stageFilter === 'ALL' || s.lifecycle_stage === stageFilter;
    return matchesSearch && matchesDept && matchesYear && matchesStage;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Complete Student &amp; Internship Lifecycle Tracking</h1>
          <p className="page-subtitle">
            End-to-end monitoring of every student across Applications, Active Internships, Weekly Reports, Tasks, Skills, Resumes, and Verified Certificates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowYearModal(true)}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Calendar size={16} />
            Academic Year &amp; Cohort Config ({academicConfig.current_academic_year})
          </button>
          <button
            onClick={handlePrintReport}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} />
            Print / PDF Report
          </button>
          <button
            onClick={() => fetchAllTrackingData(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{toastMsg}</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => fetchAllTrackingData(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by student name, roll number, company, or coordinator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="E&TC">E&amp;TC</option>
          <option value="MECH">MECH</option>
          <option value="CIVIL">CIVIL</option>
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="ALL">All Academic Years</option>
          {(academicConfig.available_academic_years || []).map((yr: string) => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="ALL">All Lifecycle Stages</option>
          <option value="NOT_STARTED">Not Started</option>
          {LIFECYCLE_STAGES.map((st) => (
            <option key={st.key} value={st.key}>{st.label}</option>
          ))}
        </select>
      </div>

      {/* Main Tracking Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading complete student tracking records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No student records found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Adjust your search or filter criteria above.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student &amp; Dept</th>
                  <th>Assigned Coordinator</th>
                  <th>Internship &amp; Applications</th>
                  <th>Lifecycle Progress (7 Stages)</th>
                  <th>Reports, Tasks &amp; Progress</th>
                  <th>Skills, Resume &amp; Certificates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const step = Number(s.lifecycle_step ?? 0);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.roll_number} • {s.department_code || 'CSE'} ({s.academic_year})
                        </div>
                        {s.is_inactive && (
                          <span className="badge badge-danger" style={{ fontSize: '0.66rem', marginTop: '3px' }}>
                            ▲ Overdue / Inactive ({s.days_since_activity}d)
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ fontSize: '0.76rem', padding: '3px 6px', height: '30px', minWidth: '155px' }}
                          value={s.assigned_coordinator_id ? String(s.assigned_coordinator_id) : 'UNASSIGN'}
                          onChange={(e) => handleAssignCoordinator(s.id, e.target.value)}
                        >
                          <option value="UNASSIGN">— Unassigned —</option>
                          {coordinators.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name} ({c.department?.code || 'CSE'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                          {s.company}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.role} • {s.applications_count ?? 0} App(s)
                        </div>
                      </td>
                      <td style={{ minWidth: '215px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px', color: step >= 6 ? '#059669' : '#2563eb' }}>
                          <span>{String(s.lifecycle_stage || 'NOT_STARTED').replace(/_/g, ' ')}</span>
                          <span>Stage {step}/7</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                          {LIFECYCLE_STAGES.map((st) => (
                            <div
                              key={st.step}
                              title={`${st.step}. ${st.label}`}
                              style={{
                                height: '7px',
                                borderRadius: '3px',
                                backgroundColor:
                                  step >= st.step
                                    ? st.step >= 6
                                      ? '#059669'
                                      : '#2563eb'
                                    : '#e2e8f0'
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem' }}>
                          <strong>Reports:</strong> {s.reports_approved ?? 0}/{s.reports_submitted ?? 0} appr
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <strong>Tasks:</strong> {s.tasks_completed ?? 0}/{s.tasks_total ?? 0} done
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <div style={{ width: '50px', height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${s.completion_rate ?? 0}%`, height: '100%', background: '#059669' }} />
                          </div>
                          <span style={{ fontSize: '0.73rem', fontWeight: 700 }}>{s.completion_rate ?? 0}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem' }}>
                          <strong>Resume:</strong>{' '}
                          <span className={`badge ${s.resume_verification_status === 'APPROVED' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                            {s.resume_verification_status || 'DRAFT'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                          <strong>Certs:</strong> {s.documents_verified ?? 0}/{s.documents_submitted ?? 0} verified •{' '}
                          <strong>Score:</strong> {s.assessment_score ?? 0}%
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => openStudentDetails(s.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Student Details Modal */}
      {selectedStudentId !== null && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' }}>
            {loadingDetail || !studentDetail ? (
              <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                <p>Loading complete student dossier...</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                      {studentDetail.student?.name} ({studentDetail.student?.roll_number})
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      {studentDetail.student?.department} • Academic Year {studentDetail.student?.academic_year} • Division {studentDetail.student?.division} • Email: {studentDetail.student?.email}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedStudentId(null); setStudentDetail(null); }} className="btn btn-outline btn-sm">
                    Close
                  </button>
                </div>

                {/* Visual 7-Stage Lifecycle Bar */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
                    Internship Lifecycle Stage: <span style={{ color: '#2563eb' }}>{studentDetail.student?.lifecycle_stage}</span> (Progress: {studentDetail.student?.completion_rate}%)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                    {LIFECYCLE_STAGES.map((st) => {
                      const active = Number(studentDetail.student?.lifecycle_step || 0) >= st.step;
                      const StageIcon = st.icon;
                      return (
                        <div
                          key={st.step}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: active ? '#dbeafe' : '#f1f5f9',
                            color: active ? '#1e40af' : '#64748b',
                            border: active ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {StageIcon && <StageIcon size={18} style={{ color: active ? '#2563eb' : '#94a3b8' }} />}
                          <span>{st.step}. {st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <strong>Host Organization:</strong>
                    <div>{studentDetail.student?.company} ({studentDetail.student?.role})</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <strong>Coordinator:</strong>
                    <div>{studentDetail.student?.assigned_coordinator_name || 'Unassigned'}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <strong>CGPA &amp; Assessment:</strong>
                    <div>CGPA: {studentDetail.student?.cgpa || 'N/A'} • Score: {studentDetail.student?.assessment_score ?? 0}%</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <strong>Resume Status:</strong>
                    <div>{studentDetail.student?.resume_verification_status}</div>
                  </div>
                </div>

                {/* Weekly Reports History */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#2563eb" /> Weekly Progress Reports ({(studentDetail.reports || []).length})
                </h3>
                {(studentDetail.reports || []).length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No weekly reports submitted yet.</p>
                ) : (
                  <div className="table-responsive" style={{ marginBottom: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Week</th>
                          <th>Tasks Completed</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Coordinator Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(studentDetail.reports || []).map((r: any) => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 700 }}>Week {r.week_number}</td>
                            <td style={{ fontSize: '0.8rem' }}>{r.tasks_completed}</td>
                            <td style={{ fontWeight: 700 }}>{r.coordinator_score ? `${r.coordinator_score}/10` : '—'}</td>
                            <td>
                              <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.coordinator_comments || 'Pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Certificates & Documents */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} color="#059669" /> Certificates &amp; Documents ({(studentDetail.documents || []).length})
                </h3>
                {(studentDetail.documents || []).length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No certificates uploaded yet.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {(studentDetail.documents || []).map((d: any) => (
                      <div key={d.id} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', background: '#ffffff' }}>
                        <strong>{d.document_type}</strong> • <span className={`badge ${d.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>{d.status}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Key: {d.qr_code_key || d.verification_key}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills & Tasks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>Verified Skills &amp; Ratings</h4>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(studentDetail.student?.skills || []).map((sk: string, idx: number) => (
                        <span key={idx} className="badge badge-info" style={{ fontSize: '0.74rem' }}>{sk}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>Assigned Tasks ({(studentDetail.tasks || []).length})</h4>
                    {(studentDetail.tasks || []).slice(0, 4).map((t: any) => (
                      <div key={t.id} style={{ fontSize: '0.78rem', marginBottom: '3px' }}>
                        • {t.title} — <strong>{t.status}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Academic Year & Cohort Progression Modal */}
      {showYearModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Academic Year Configuration &amp; Cohort Progression
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Configure available academic years for student registration and promote cohorts while preserving historical academic year records.
            </p>

            <div className="form-group">
              <label className="form-label">Add Future Academic Year Option</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 2030-2031"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                />
                <button type="button" onClick={handleAddAcademicYear} className="btn btn-outline">
                  Add Year
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Available Years: {(academicConfig.available_academic_years || []).join(', ')}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Promote Student Cohort to Next Academic Year
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">From Academic Year</label>
                  <select className="form-control" value={promoteFromYear} onChange={(e) => setPromoteFromYear(e.target.value)}>
                    {(academicConfig.available_academic_years || []).map((yr: string) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Academic Year</label>
                  <select className="form-control" value={promoteToYear} onChange={(e) => setPromoteToYear(e.target.value)}>
                    {(academicConfig.available_academic_years || []).map((yr: string) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" onClick={handlePromoteCohort} className="btn btn-primary" style={{ width: '100%' }}>
                Promote Cohort &amp; Preserve Historical Records
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowYearModal(false)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
