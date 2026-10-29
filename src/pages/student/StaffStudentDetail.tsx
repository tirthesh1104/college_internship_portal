import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Mail, Phone, GraduationCap, Building2,
  Award, Download, Bookmark, Star, FileText,
  CheckCircle2, AlertTriangle, Clock, ShieldCheck,
  ArrowLeft, RefreshCw, ExternalLink, CheckSquare, History, Trash2, X
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

export const StaffStudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [student, setStudent] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(id ? parseInt(id, 10) : null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>(searchParams.get('tab') || 'profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setCurrentTab(tabParam);
  }, [searchParams]);

  // Resume Review state
  const [resumeStatus, setResumeStatus] = useState<'PENDING' | 'APPROVED' | 'NEEDS_IMPROVEMENT'>('APPROVED');
  const [resumeFeedback, setResumeFeedback] = useState('');
  const [submittingResumeReview, setSubmittingResumeReview] = useState(false);

  // Report Review state
  const [reviewingReport, setReviewingReport] = useState<any | null>(null);
  const [reportScore, setReportScore] = useState<number>(9);
  const [reportComments, setReportComments] = useState('');
  const [reportTaskTitle, setReportTaskTitle] = useState('');

  // Skill Assessment state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('ADVANCED');
  const [newSkillScore, setNewSkillScore] = useState(90);
  const [newSkillFeedback, setNewSkillFeedback] = useState('');

  // Delete Student state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const loadStudentList = useCallback(async () => {
    try {
      const list = await api.get<any[]>('/students/');
      const arr = Array.isArray(list) ? list : ((list as any)?.results || []);
      setAllStudents(arr);
      if (!selectedStudentId && arr.length > 0) {
        setSelectedStudentId(arr[0].id);
      }
    } catch (err) {
      console.error('Error loading student directory:', err);
    }
  }, [selectedStudentId]);

  const fetchStudentDetail = useCallback(async (targetId: number | null, silent = false) => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const data = await api.get<any>(`/students/${targetId}/`);
      setStudent(data);
      if (data?.resume) {
        setResumeStatus(
          data.resume.verification_status === 'NEEDS_IMPROVEMENT' ? 'NEEDS_IMPROVEMENT' :
          data.resume.verification_status === 'PENDING' ? 'PENDING' : 'APPROVED'
        );
        setResumeFeedback(data.resume.review_feedback || '');
      }
    } catch (err) {
      console.error('Failed to fetch student details:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentList();
  }, [loadStudentList]);

  useEffect(() => {
    if (id) {
      setSelectedStudentId(parseInt(id, 10));
    }
  }, [id]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentDetail(selectedStudentId);
    } else {
      setLoading(false);
    }
  }, [selectedStudentId, fetchStudentDetail]);

  useEffect(() => {
    return subscribeToLiveSync(() => {
      loadStudentList();
      if (selectedStudentId) {
        fetchStudentDetail(selectedStudentId, true);
      }
    }, 8000);
  }, [loadStudentList, selectedStudentId, fetchStudentDetail]);

  const handleResumeReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;
    setSubmittingResumeReview(true);
    setActionMessage(null);
    try {
      await api.post(`/resumes/${student.id}/review/`, {
        status: resumeStatus,
        feedback: resumeFeedback
      });
      setActionMessage({
        type: 'success',
        text: `Resume marked as ${resumeStatus.replace('_', ' ')} and feedback sent to ${student.name}.`
      });
      fetchStudentDetail(student.id);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save resume review.' });
    } finally {
      setSubmittingResumeReview(false);
    }
  };

  const handleReportReview = async (decision: 'APPROVE' | 'NEEDS_IMPROVEMENT') => {
    if (!reviewingReport) return;
    try {
      await api.post(`/reports/${reviewingReport.id}/feedback/`, {
        score: reportScore * 10,
        comments: reportComments,
        decision,
        task_title: reportTaskTitle || undefined
      });
      setActionMessage({
        type: 'success',
        text: `Week ${reviewingReport.week_number} report marked as ${decision === 'APPROVE' ? 'APPROVED' : 'NEEDS_IMPROVEMENT'}.`
      });
      setReviewingReport(null);
      setReportComments('');
      setReportTaskTitle('');
      if (student?.id) fetchStudentDetail(student.id);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit report review.' });
    }
  };

  const handleDocumentAction = async (docId: number, action: 'verify' | 'reject') => {
    try {
      if (action === 'verify') {
        await api.post(`/documents/${docId}/verify/`, {});
      } else {
        await api.post(`/documents/${docId}/reject/`, { reason: 'Requires clearer institutional verification stamp' });
      }
      setActionMessage({ type: 'success', text: `Document ${action === 'verify' ? 'verified' : 'returned'} successfully.` });
      if (student?.id) fetchStudentDetail(student.id);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Document action failed.' });
    }
  };

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id || !newSkillName.trim()) return;
    try {
      await api.post('/assessments/records/', {
        student_id: student.id,
        skill_name: newSkillName.trim(),
        current_level: newSkillLevel,
        score: newSkillScore,
        coordinator_feedback: newSkillFeedback
      });
      setNewSkillName('');
      setNewSkillFeedback('');
      setActionMessage({ type: 'success', text: 'Skill assessment recorded and linked to student profile.' });
      fetchStudentDetail(student.id);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to add skill assessment.' });
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!student?.id) return;
    setDeletingStudent(true);
    setActionMessage(null);
    try {
      const res = await api.delete<any>(`/students/${student.id}/`);
      setShowDeleteModal(false);
      const remaining = allStudents.filter(s => Number(s.id) !== Number(student.id));
      setAllStudents(remaining);
      setActionMessage({
        type: 'success',
        text: res?.message || `Student "${student.name}" (${student.roll_number || student.email}) was permanently deleted.`
      });
      if (remaining.length > 0) {
        setSelectedStudentId(remaining[0].id);
      } else {
        setSelectedStudentId(null);
        setStudent(null);
        navigate(-1);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete student.' });
      setShowDeleteModal(false);
    } finally {
      setDeletingStudent(false);
    }
  };

  const tabs = [
    { id: 'profile', label: '1. Profile', icon: User },
    { id: 'internships', label: '2. Internship Details', icon: Building2 },
    { id: 'reports', label: '3. Weekly Reports', icon: FileText },
    { id: 'tasks_projects', label: '4. Tasks & Projects', icon: CheckSquare },
    { id: 'skills', label: '5. Skills & Assessments', icon: Star },
    { id: 'documents', label: '6. Documents & Certificates', icon: Download },
    { id: 'resume', label: '7. Resume & Review', icon: ShieldCheck },
    { id: 'activity', label: '8. Activity & History', icon: History }
  ];

  const filteredSidebarStudents = allStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.department_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="portal-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} /> Back to Roster
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Student Complete Progress & Supervision Workspace
            </h1>
            <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>
              Inspect profile, internships, weekly reports, tasks, assessments, documents, resume verification, and audit history.
            </p>
          </div>
        </div>

        {selectedStudentId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchStudentDetail(selectedStudentId)}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Refresh Student Record
            </button>
            {student && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 700
                }}
              >
                <Trash2 size={14} /> Delete Student
              </button>
            )}
          </div>
        )}
      </div>

      {actionMessage && (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: actionMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderColor: actionMessage.type === 'success' ? '#a7f3d0' : '#fecaca',
            color: actionMessage.type === 'success' ? '#065f46' : '#dc2626',
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          {actionMessage.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Student Switcher */}
        <div className="card" style={{ padding: '14px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: '10px', fontSize: '13px' }}
          />
          <div style={{ maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredSidebarStudents.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', padding: '16px 8px' }}>
                No registered students found.
              </div>
            ) : (
              filteredSidebarStudents.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudentId(s.id)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: selectedStudentId === s.id ? '1px solid #2563eb' : '1px solid #f1f5f9',
                    backgroundColor: selectedStudentId === s.id ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{s.name}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {s.roll_number} • {s.department_code} • {s.progress_percentage ?? 0}%
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right 8-Tab Workspace */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading student journey...</div>
          ) : !student ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Select a registered student from the directory to inspect their internship journey.
            </div>
          ) : (
            <>
              {/* Student Summary Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{student.name}</h2>
                    <span className="badge badge-published">{student.roll_number}</span>
                    {student.is_inactive && (
                      <span className="badge badge-warning">Inactive (&gt;10 days since report)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    {student.department_name} ({student.department_code}) • {student.academic_year} • Div {student.division} • Email: {student.email}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{student.profile_completion}%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Profile Complete</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{student.progress_percentage}%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Internship Progress</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>{student.resume_completeness_score}/100</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Resume Score</div>
                  </div>
                </div>
              </div>

              {/* 8 Tabs Navigation */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', backgroundColor: '#ffffff' }}>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCurrentTab(tab.id)}
                      style={{
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: currentTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                        backgroundColor: currentTab === tab.id ? '#eff6ff' : 'transparent',
                        color: currentTab === tab.id ? '#1e40af' : '#64748b',
                        fontWeight: currentTab === tab.id ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon size={15} /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Area */}
              <div style={{ padding: '24px' }}>
                {/* TAB 1: PROFILE */}
                {currentTab === 'profile' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Full Name</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{student.name}</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Roll Number & PRN</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{student.roll_number} / {student.prn_number || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Branch & Academic Year</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{student.department_code} • {student.academic_year}</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Recorded CGPA</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#059669' }}>{student.cgpa || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Current Host Organization</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{student.company} ({student.internship_status})</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Weekly Reports Summary</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                        Submitted: {student.reports_submitted} • Approved: {student.reports_approved} • Pending: {student.reports_pending}
                      </div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Last Report Submission</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{student.last_report_date || 'No reports yet'}</div>
                    </div>
                    <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Resume Verification Status</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>{student.resume_verification_status}</div>
                    </div>
                  </div>
                )}

                {/* TAB 2: INTERNSHIP DETAILS */}
                {currentTab === 'internships' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Active & Completed Internships ({student.internships?.length || 0})
                    </h3>
                    {(student.internships || []).length === 0 ? (
                      <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13.5px' }}>
                        No internships registered for this student yet.
                      </div>
                    ) : (
                      student.internships.map((intern: any) => (
                        <div key={intern.id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '15px', color: '#0f172a' }}>{intern.role_title || intern.role}</strong>
                            <span className="badge badge-published">{intern.status}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                            {intern.organization_name || intern.company}
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                            Duration: {intern.start_date} to {intern.end_date}
                          </div>
                        </div>
                      ))
                    )}

                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '12px', marginBottom: 0 }}>
                      Opportunity Applications ({student.applications?.length || 0})
                    </h3>
                    {(student.applications || []).map((app: any) => (
                      <div key={app.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{app.opportunity_title}</div>
                          <div style={{ fontSize: '12.5px', color: '#64748b' }}>{app.organization} • Applied {app.applied_at?.split('T')[0]}</div>
                        </div>
                        <span className="badge badge-published">{app.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: WEEKLY PROGRESS REPORTS */}
                {currentTab === 'reports' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(student.reports || []).length === 0 ? (
                      <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                        No weekly progress reports submitted yet.
                      </div>
                    ) : (
                      student.reports.map((r: any) => (
                        <div key={r.id} style={{ padding: '18px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>Week {r.week_number} Report — {r.company || r.organization_name}</strong>
                              <span style={{ marginLeft: '10px' }} className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'NEEDS_IMPROVEMENT' ? 'badge-warning' : 'badge-published'}`}>
                                {r.status}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingReport(r);
                                setReportScore(r.coordinator_score || 9);
                                setReportComments(r.coordinator_comments || '');
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Review / Update Feedback
                            </button>
                          </div>

                          <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.55 }}>
                            <div><strong>Tasks Completed:</strong> {r.tasks_completed}</div>
                            {r.learning_outcomes && <div style={{ marginTop: '4px' }}><strong>Learning Outcomes:</strong> {r.learning_outcomes}</div>}
                            {r.challenges_faced && <div style={{ marginTop: '4px' }}><strong>Challenges:</strong> {r.challenges_faced}</div>}
                            {r.evidence_url && (
                              <div style={{ marginTop: '6px' }}>
                                <strong>Evidence:</strong>{' '}
                                <a href={r.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{r.evidence_url}</a>
                              </div>
                            )}
                          </div>

                          {r.coordinator_comments && (
                            <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#ecfdf5', borderRadius: '6px', fontSize: '12.5px', color: '#065f46' }}>
                              <strong>Coordinator Assessment ({r.score || (r.coordinator_score || 9) * 10}/100):</strong> "{r.coordinator_comments}" — {r.reviewed_by_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {reviewingReport && (
                      <div style={{ padding: '18px', border: '2px solid #2563eb', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700 }}>
                          Evaluate Week {reviewingReport.week_number} Report
                        </h4>
                        <div className="form-group">
                          <label className="form-label">Score (1 to 10)</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            className="form-control"
                            value={reportScore}
                            onChange={(e) => setReportScore(Number(e.target.value))}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Review Comments & Remarks *</label>
                          <textarea
                            rows={2}
                            className="form-control"
                            value={reportComments}
                            onChange={(e) => setReportComments(e.target.value)}
                            placeholder="Enter constructive feedback..."
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Assign Follow-up Task (Optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={reportTaskTitle}
                            onChange={(e) => setReportTaskTitle(e.target.value)}
                            placeholder="e.g. Add unit tests for API module"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => handleReportReview('APPROVE')} className="btn btn-primary btn-sm">
                            Approve Report
                          </button>
                          <button type="button" onClick={() => handleReportReview('NEEDS_IMPROVEMENT')} className="btn btn-outline btn-sm" style={{ color: '#dc2626' }}>
                            Request Improvement
                          </button>
                          <button type="button" onClick={() => setReviewingReport(null)} className="btn btn-secondary btn-sm">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: TASKS AND PROJECTS */}
                {currentTab === 'tasks_projects' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                        Assigned Tasks ({student.tasks_completed} Completed / {student.tasks_pending} Pending)
                      </h3>
                      {(student.tasks || []).length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#64748b' }}>No tasks assigned to this student.</p>
                      ) : (
                        student.tasks.map((t: any) => (
                          <div key={t.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.title}</div>
                              <div style={{ fontSize: '12.5px', color: '#64748b' }}>{t.description} • Due: {t.due_date}</div>
                              {t.student_notes && <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>Student Note: {t.student_notes}</div>}
                            </div>
                            <span className="badge badge-published">{t.status}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                        Student Engineering Projects ({student.projects?.length || 0})
                      </h3>
                      {(student.projects || []).map((p: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{p.title}</div>
                          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>{p.technologies}</div>
                          <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0 0' }}>{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 5: SKILLS AND ASSESSMENTS */}
                {currentTab === 'skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        Recorded Technical Skills
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(student.skills || []).map((sk: string, i: number) => (
                          <span key={i} style={{ padding: '4px 12px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        Faculty Competency Assessments ({student.verified_skills?.length || 0})
                      </h3>
                      {(student.verified_skills || []).map((vs: any, i: number) => (
                        <div key={i} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <strong style={{ fontSize: '14px' }}>{vs.skill_name}</strong> ({vs.current_level})
                            {vs.coordinator_feedback && <div style={{ fontSize: '12.5px', color: '#475569' }}>"{vs.coordinator_feedback}"</div>}
                          </div>
                          <div style={{ fontWeight: 800, color: '#059669' }}>{vs.score}/100</div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddAssessment} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Record New Skill Assessment</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '10px', marginBottom: '10px' }}>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="Skill Name (e.g. Python, AutoCAD)"
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                        />
                        <select className="form-control" value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value)}>
                          <option value="BEGINNER">BEGINNER</option>
                          <option value="INTERMEDIATE">INTERMEDIATE</option>
                          <option value="ADVANCED">ADVANCED</option>
                          <option value="EXPERT">EXPERT</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className="form-control"
                          value={newSkillScore}
                          onChange={(e) => setNewSkillScore(Number(e.target.value))}
                        />
                      </div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Faculty assessment remarks..."
                        value={newSkillFeedback}
                        onChange={(e) => setNewSkillFeedback(e.target.value)}
                        style={{ marginBottom: '10px' }}
                      />
                      <button type="submit" className="btn btn-primary btn-sm">Save Skill Assessment</button>
                    </form>
                  </div>
                )}

                {/* TAB 6: DOCUMENTS AND CERTIFICATES */}
                {currentTab === 'documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(student.documents || []).length === 0 ? (
                      <div style={{ padding: '24px', color: '#64748b' }}>No documents uploaded by this student yet.</div>
                    ) : (
                      student.documents.map((doc: any) => (
                        <div key={doc.id} style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{doc.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {doc.document_type} • Issuer: {doc.issuing_organization || doc.company} • Key: <code>{doc.verification_key}</code>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`badge ${doc.status === 'VERIFIED' ? 'badge-success' : doc.status === 'REJECTED' ? 'badge-warning' : 'badge-published'}`}>
                              {doc.status}
                            </span>
                            <a href={`/api/documents/${doc.id}/download/`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                              View
                            </a>
                            {doc.status !== 'VERIFIED' && (
                              <button type="button" onClick={() => handleDocumentAction(doc.id, 'verify')} className="btn btn-primary btn-sm">
                                Verify
                              </button>
                            )}
                            {doc.status !== 'REJECTED' && (
                              <button type="button" onClick={() => handleDocumentAction(doc.id, 'reject')} className="btn btn-outline btn-sm" style={{ color: '#dc2626' }}>
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 7: RESUME & COORDINATOR REVIEW */}
                {currentTab === 'resume' && student.resume && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.3fr)', gap: '20px', alignItems: 'start' }}>
                    {/* Coordinator Review Form */}
                    <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                        Coordinator / Admin Resume Verification
                      </h3>
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
                        Completeness Score: <strong>{student.resume.analysis?.completeness_score ?? 0}/100</strong> • Template: <strong>{student.resume.template}</strong>
                      </div>

                      <form onSubmit={handleResumeReviewSubmit}>
                        <div className="form-group">
                          <label className="form-label">Verification Decision *</label>
                          <select
                            className="form-control"
                            value={resumeStatus}
                            onChange={(e) => setResumeStatus(e.target.value as any)}
                          >
                            <option value="APPROVED">Approved / Verified</option>
                            <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                            <option value="PENDING">Pending Review</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Feedback & Correction Suggestions</label>
                          <textarea
                            rows={4}
                            className="form-control"
                            placeholder="Provide specific suggestions on project descriptions, missing skills, or formatting..."
                            value={resumeFeedback}
                            onChange={(e) => setResumeFeedback(e.target.value)}
                          />
                        </div>

                        <button type="submit" disabled={submittingResumeReview} className="btn btn-primary" style={{ width: '100%' }}>
                          {submittingResumeReview ? 'Saving Review...' : 'Save Resume Verification & Notify Student'}
                        </button>
                      </form>

                      {/* Review History */}
                      {student.resume.review_history?.length > 0 && (
                        <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                            Resume Review History
                          </h4>
                          {student.resume.review_history.map((rh: any) => (
                            <div key={rh.id} style={{ fontSize: '12px', padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '6px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{rh.status} — by {rh.reviewer_name}</div>
                              {rh.feedback && <div style={{ color: '#475569', marginTop: '2px' }}>"{rh.feedback}"</div>}
                              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{rh.reviewed_at?.split('T')[0]}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Saved Resume Preview */}
                    <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                      <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                          MAEER's MITCORER Barshi — Official Student Resume
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 2px' }}>{student.name}</h3>
                        <div style={{ fontSize: '12.5px', color: '#475569' }}>
                          {student.roll_number} • {student.department_name} • CGPA: {student.cgpa} • {student.email}
                        </div>
                      </div>
                      {student.resume.summary && (
                        <div style={{ marginBottom: '12px', fontSize: '12.5px' }}>
                          <strong>Summary:</strong> {student.resume.summary}
                        </div>
                      )}
                      <div style={{ marginBottom: '12px', fontSize: '12.5px' }}>
                        <strong>Technical Skills ({student.resume.target_domain}):</strong> {(student.resume.skills || []).join(', ') || 'None listed'}
                      </div>
                      {student.resume.projects?.length > 0 && (
                        <div style={{ marginBottom: '12px', fontSize: '12.5px' }}>
                          <strong>Projects:</strong>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                            {student.resume.projects.map((p: any, i: number) => (
                              <li key={i}><strong>{p.title}</strong> ({p.technologies}): {p.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 8: ACTIVITY AND REVIEW HISTORY */}
                {currentTab === 'activity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(student.activity_history || []).length === 0 ? (
                      <div style={{ padding: '24px', color: '#64748b' }}>No recorded activity events yet.</div>
                    ) : (
                      student.activity_history.map((log: any) => (
                        <div key={log.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{log.action}</div>
                            <div style={{ fontSize: '12.5px', color: '#475569' }}>{log.details || `${log.entity_type} (${log.entity_id})`}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {log.created_at ? log.created_at.replace('T', ' ').slice(0, 16) : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Student Deletion Modal */}
      {showDeleteModal && student && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
        >
          <div
            className="card modal-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              borderTop: '4px solid #dc2626'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Confirm Student Deletion
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Permanent removal from MITCORER IPTS
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingStudent && setShowDeleteModal(false)}
                className="btn btn-outline btn-sm"
                disabled={deletingStudent}
                style={{ padding: '4px 8px' }}
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                marginBottom: '14px'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                {student.name}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <strong>Roll Number:</strong> {student.roll_number || 'N/A'} &bull; <strong>Branch:</strong> {student.department_code || student.department_name || 'N/A'} ({student.academic_year || 'N/A'})
              </div>
              {student.email && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <strong>Email:</strong> {student.email}
                </div>
              )}
            </div>

            <p style={{ margin: '0 0 18px 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Are you sure you want to delete this student? This action will permanently remove the student account and all associated internship records, weekly reports, documents, and resume data from the system.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={deletingStudent}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                disabled={deletingStudent}
                onClick={handleConfirmDeleteStudent}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} />
                {deletingStudent ? 'Deleting Student...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

