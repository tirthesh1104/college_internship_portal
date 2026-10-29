import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare, ShieldCheck, CheckCircle2, RefreshCw, AlertTriangle, Search, Eye, XCircle, FileText, Award
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

interface CompletionRecord {
  id: number;
  user?: number;
  student_id?: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  role?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  duration: string;
  total_reports_submitted?: number;
  total_reports_approved: number;
  avg_score: number;
  certificate_verified: boolean;
  certificate_document?: any;
  reports_list?: any[];
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'NEEDS_CORRECTION' | 'REJECTED';
  completion_status?: string;
  internship_status?: string;
  completion_remarks?: string;
  final_evaluation_score?: number;
}

export const CompletionApprovals: React.FC = () => {
  const [records, setRecords] = useState<CompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'NEEDS_CORRECTION'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [inspectRecord, setInspectRecord] = useState<CompletionRecord | null>(null);
  const [approvingRecord, setApprovingRecord] = useState<CompletionRecord | null>(null);
  const [finalScore, setFinalScore] = useState<number>(90);
  const [approvalRemarks, setApprovalRemarks] = useState<string>('');

  const [rejectingRecord, setRejectingRecord] = useState<CompletionRecord | null>(null);
  const [rejectStatus, setRejectStatus] = useState<'NEEDS_CORRECTION' | 'REJECTED'>('NEEDS_CORRECTION');
  const [rejectReason, setRejectReason] = useState<string>('');

  const loadCompletions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<any[]>('/internships/');
      const rawList = Array.isArray(data) ? data : ((data as any)?.results || []);
      const normalized: CompletionRecord[] = rawList.map((item: any) => {
        const rawComp = String(item.completion_status || item.status || '').toUpperCase();
        let normStatus: CompletionRecord['status'] = 'IN_PROGRESS';
        if (rawComp === 'COMPLETED' || rawComp === 'APPROVED' || String(item.status || '').toUpperCase() === 'COMPLETED') {
          normStatus = 'APPROVED';
        } else if (rawComp === 'NEEDS_CORRECTION' || rawComp === 'CORRECTION_REQUESTED') {
          normStatus = 'NEEDS_CORRECTION';
        } else if (rawComp === 'REJECTED') {
          normStatus = 'REJECTED';
        } else if (
          rawComp === 'PENDING_APPROVAL' ||
          (Number(item.total_reports_approved || 0) >= 1 && Boolean(item.certificate_verified))
        ) {
          normStatus = 'PENDING_APPROVAL';
        }
        return {
          ...item,
          student_id: item.student_id || item.user,
          role: item.role || item.position || 'Intern',
          duration: item.duration || (item.start_date && item.end_date ? `${item.start_date} to ${item.end_date}` : item.start_date || 'Active Tenure'),
          status: normStatus
        };
      });
      setRecords(normalized);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load completion requests');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompletions(false);
    return subscribeToLiveSync(() => loadCompletions(true), 8000);
  }, [loadCompletions]);

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRecord) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/internships/${approvingRecord.id}/approve-completion/`, {
        final_score: finalScore,
        remarks: approvalRemarks.trim() || 'Completed all internship requirements and verified by Coordinator.'
      });
      setSuccess(
        `Internship completion certified for ${approvingRecord.student_name}. Digital Career Passport has been accredited.`
      );
      setApprovingRecord(null);
      setApprovalRemarks('');
      await loadCompletions();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve completion');
      setApprovingRecord(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRecord || !rejectReason.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/internships/${rejectingRecord.id}/reject-completion/`, {
        status: rejectStatus,
        reason: rejectReason.trim()
      });
      setSuccess(
        `Completion request for ${rejectingRecord.student_name} marked as ${rejectStatus.replace('_', ' ')} and student notified.`
      );
      setRejectingRecord(null);
      setRejectReason('');
      await loadCompletions();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update completion status');
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter ||
      (statusFilter === 'NEEDS_CORRECTION' && (r.status === 'NEEDS_CORRECTION' || r.status === 'REJECTED'));
    const matchesDept =
      deptFilter === 'ALL' ||
      String(r.department || '').toUpperCase().includes(deptFilter.toUpperCase());
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(r.student_name || '').toLowerCase().includes(q) ||
      String(r.roll_number || '').toLowerCase().includes(q) ||
      String(r.company || '').toLowerCase().includes(q);
    return matchesStatus && matchesDept && matchesSearch;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Internship Completion Approvals</h1>
          <p className="page-subtitle">
            Perform final coordinator sign-off for completed student internships based on approved weekly reports, evidence score, and verified completion certificates.
          </p>
        </div>
        <button
          onClick={() => loadCompletions(false)}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by student name, roll number, or host company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&amp;TC</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {([
            { key: 'ALL', label: `All Internships (${records.length})` },
            { key: 'PENDING_APPROVAL', label: `Ready for Approval (${records.filter(r => r.status === 'PENDING_APPROVAL').length})` },
            { key: 'APPROVED', label: `Completed & Signed Off (${records.filter(r => r.status === 'APPROVED').length})` },
            { key: 'IN_PROGRESS', label: `In Progress (${records.filter(r => r.status === 'IN_PROGRESS').length})` },
            { key: 'NEEDS_CORRECTION', label: `Needs Correction (${records.filter(r => r.status === 'NEEDS_CORRECTION' || r.status === 'REJECTED').length})` }
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`btn ${statusFilter === tab.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading internship completion records...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No internship records match this filter</h3>
              <p style={{ color: 'var(--text-muted)' }}>Switch status tabs above to view all active or completed internships.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Host Organization &amp; Role</th>
                    <th>Reports Approved</th>
                    <th>Average Score</th>
                    <th>Certificate Status</th>
                    <th>Completion Status</th>
                    <th>Coordinator Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.roll_number} • {r.department}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.company}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {r.role || 'Intern'} • {r.duration}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.total_reports_approved}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {' '}/ {r.total_reports_submitted ?? r.total_reports_approved} Submitted
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                          {r.avg_score > 10 ? `${r.avg_score} / 100` : `${r.avg_score || 0} / 10`}
                        </span>
                      </td>
                      <td>
                        {r.certificate_verified ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                            ✓ Verified by Institute
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            Pending Verification
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === 'APPROVED' ? 'badge-success' :
                          r.status === 'PENDING_APPROVAL' ? 'badge-info' :
                          r.status === 'NEEDS_CORRECTION' || r.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                        }`}>
                          {r.status === 'APPROVED' ? 'COMPLETED' : r.status.replace(/_/g, ' ')}
                        </span>
                        {r.completion_remarks && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '160px' }}>
                            "{r.completion_remarks}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setInspectRecord(r)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.74rem', padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="View Internship Details & Completion Audit"
                          >
                            <Eye size={13} /> View Internship
                          </button>

                          {r.student_id && (
                            <Link
                              to={`/coordinator/students/${r.student_id}?tab=reports`}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.74rem', padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              title="View Student Weekly Reports"
                            >
                              <FileText size={13} /> View Reports
                            </Link>
                          )}

                          {r.student_id && (
                            <Link
                              to={`/coordinator/students/${r.student_id}?tab=documents`}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.74rem', padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              title="View Student Certificate & Documents"
                            >
                              <Award size={13} /> View Certificate
                            </Link>
                          )}

                          {r.status !== 'APPROVED' && (
                            <>
                              <button
                                onClick={() => {
                                  setApprovingRecord(r);
                                  const defaultScore = r.avg_score > 10 ? Math.round(r.avg_score) : Math.round((r.avg_score || 8.5) * 10);
                                  setFinalScore(defaultScore || 90);
                                  setApprovalRemarks(r.completion_remarks || '');
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.74rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                              >
                                <ShieldCheck size={13} /> Approve Completion
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingRecord(r);
                                  setRejectStatus('NEEDS_CORRECTION');
                                  setRejectReason('');
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.74rem', padding: '5px 8px', color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <XCircle size={13} /> Request Correction
                              </button>
                            </>
                          )}
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

      {/* Inspect Reports & Certificate Modal */}
      {inspectRecord && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Internship Completion Audit — {inspectRecord.student_name}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {inspectRecord.roll_number} • {inspectRecord.department} • {inspectRecord.company} ({inspectRecord.duration})
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><strong>Approved Reports:</strong> {inspectRecord.total_reports_approved} / {inspectRecord.total_reports_submitted ?? inspectRecord.total_reports_approved}</div>
              <div><strong>Average Report Score:</strong> {inspectRecord.avg_score} / 10</div>
              <div>
                <strong>Certificate Verification:</strong>{' '}
                {inspectRecord.certificate_verified
                  ? `Verified (${inspectRecord.certificate_document?.verification_key || 'QR Issued'})`
                  : 'Not yet verified — verify certificate in Document Verification first'}
              </div>
            </div>

            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Submitted Weekly Reports ({(inspectRecord.reports_list || []).length})
            </h4>
            {(inspectRecord.reports_list || []).length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No weekly reports submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                {(inspectRecord.reports_list || []).map((rep: any) => (
                  <div key={rep.id} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Week {rep.week_number}:</strong> {rep.tasks_completed}
                    </div>
                    <span className={`badge ${rep.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                      {rep.status} ({rep.score ? `${rep.score}/100` : 'Pending'})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setInspectRecord(null)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Completion Sign-Off Modal */}
      {approvingRecord && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Grant Final Internship Completion Sign-Off
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Student: <strong>{approvingRecord.student_name}</strong> • {approvingRecord.company}
            </p>

            {(!approvingRecord.certificate_verified || approvingRecord.total_reports_approved < 1) && (
              <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                <strong>Requirement Check:</strong> Student has <strong>{approvingRecord.total_reports_approved}</strong> approved report(s) and certificate verified = <strong>{approvingRecord.certificate_verified ? 'Yes' : 'No'}</strong>. Both at least 1 approved weekly report and 1 verified certificate are required.
              </div>
            )}

            <form onSubmit={handleConfirmApprove}>
              <div className="form-group">
                <label className="form-label">Final Evaluation Score (out of 100) *</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  required
                  value={finalScore}
                  onChange={(e) => setFinalScore(Number(e.target.value))}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coordinator Final Sign-Off Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Enter final accreditation remarks for the student's Career Passport..."
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setApprovingRecord(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  Confirm Final Sign-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Correction / Reject Completion Modal */}
      {rejectingRecord && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Return or Reject Internship Completion
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Student: <strong>{rejectingRecord.student_name}</strong> • {rejectingRecord.company}
            </p>

            <form onSubmit={handleConfirmReject}>
              <div className="form-group">
                <label className="form-label">Decision *</label>
                <select
                  className="form-control"
                  value={rejectStatus}
                  onChange={(e) => setRejectStatus(e.target.value as any)}
                >
                  <option value="NEEDS_CORRECTION">Request Correction / Missing Deliverables</option>
                  <option value="REJECTED">Reject Completion Claim</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mandatory Remarks / Required Actions *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain what the student must submit or correct before final completion sign-off..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setRejectingRecord(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>
                  Submit &amp; Notify Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
