import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Search, Download, XCircle, Lock, Unlock, FileText, Eye, User
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

interface ReportForReview {
  id: number;
  student?: number;
  student_id?: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  week_number: number;
  tasks_completed: string;
  learning_outcomes: string;
  challenges_faced: string;
  solutions_implemented: string;
  next_week_plan: string;
  evidence_url: string;
  github_link?: string;
  demo_link?: string;
  proof_links?: string[];
  evidence_file_name?: string;
  evidence_data_url?: string;
  submitted_at: string;
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_IMPROVEMENT' | 'REJECTED';
  locked?: boolean;
  coordinator_score?: number;
  coordinator_comments?: string;
  evidence_feedback?: string;
  required_corrections?: string;
  review_history?: Array<{
    reviewer_name: string;
    decision: string;
    score?: number;
    comments: string;
    evidence_feedback?: string;
    required_corrections?: string;
    timestamp?: string;
    reviewed_at?: string;
  }>;
}

export const ReportReviews: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<ReportForReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_IMPROVEMENT' | 'REJECTED'>(
    (searchParams.get('status') as any) || 'ALL'
  );
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<ReportForReview | null>(null);
  const [evidenceModalReport, setEvidenceModalReport] = useState<ReportForReview | null>(null);
  const [score, setScore] = useState<number>(9);
  const [comments, setComments] = useState<string>('');
  const [evidenceFeedback, setEvidenceFeedback] = useState<string>('');
  const [requiredCorrections, setRequiredCorrections] = useState<string>('');
  const [improvementTask, setImprovementTask] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [reviewActionSuccess, setReviewActionSuccess] = useState<string | null>(null);

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<ReportForReview[]>('/reports/');
      const list = Array.isArray(data) ? data : ((data as any)?.results || []);
      setReports(list);
      setLastUpdated(new Date().toLocaleTimeString());
      const reportIdParam = searchParams.get('reportId');
      if (reportIdParam && !silent) {
        const target = list.find((r: ReportForReview) => String(r.id) === String(reportIdParam));
        if (target) {
          setSelectedReport(target);
          setScore(target.coordinator_score || 9);
          setComments(target.coordinator_comments || '');
          setEvidenceFeedback(target.evidence_feedback || '');
          setRequiredCorrections(target.required_corrections || '');
        }
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const st = searchParams.get('status');
    if (st && ['ALL', 'SUBMITTED', 'APPROVED', 'NEEDS_IMPROVEMENT', 'REJECTED'].includes(st)) {
      setStatusFilter(st as any);
    }
  }, [searchParams]);

  useEffect(() => {
    loadReports(false);
    return subscribeToLiveSync(() => loadReports(true), 8000);
  }, [loadReports]);

  const handleReviewSubmit = async (action: 'APPROVE' | 'NEEDS_IMPROVEMENT' | 'REJECT', unlock = false) => {
    if (!selectedReport) return;
    setModalError(null);

    if ((action === 'NEEDS_IMPROVEMENT' || action === 'REJECT') && !comments.trim() && !requiredCorrections.trim()) {
      setModalError('Coordinator remarks or required corrections are mandatory when requesting improvement or rejecting a report.');
      return;
    }

    try {
      await api.post(`/reports/${selectedReport.id}/feedback/`, {
        comments: comments.trim() || (action === 'APPROVE' ? 'Approved by Coordinator.' : requiredCorrections.trim()),
        evidence_feedback: evidenceFeedback.trim(),
        required_corrections: requiredCorrections.trim(),
        score: score * 10, // Convert 1-10 to 1-100 scale for backend
        decision: action,
        task_title: improvementTask.trim() || undefined,
        unlock_for_correction: unlock
      });

      const newStatus =
        action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'NEEDS_IMPROVEMENT';

      setReviewActionSuccess(
        `Report for ${selectedReport.student_name} (Week ${selectedReport.week_number}) marked as ${newStatus}. Feedback and score (${score}/10) saved to database.`
      );
      setSelectedReport(null);
      setComments('');
      setEvidenceFeedback('');
      setRequiredCorrections('');
      setImprovementTask('');
      await loadReports();
      setTimeout(() => setReviewActionSuccess(null), 5000);
    } catch (err) {
      setModalError(`Failed to submit review: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDownloadReport = (report: ReportForReview) => {
    const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';
    fetch(`/api/reports/${report.id}/download/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => {
        if (!res.ok) throw new Error('Fallback to text');
        return res.text();
      })
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MITCORER_Week_${report.week_number}_Report_${report.roll_number || report.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        const content = [
          `MITCORER INTERNSHIP HUB (IPTS) — WEEKLY PROGRESS REPORT`,
          `========================================================`,
          `Student Name:       ${report.student_name} (${report.roll_number})`,
          `Department:         ${report.department}`,
          `Host Organization:  ${report.company}`,
          `Week Number:        Week ${report.week_number}`,
          `Submitted On:       ${report.submitted_at}`,
          `Review Status:      ${report.status}`,
          `Coordinator Score:  ${report.coordinator_score ? `${report.coordinator_score}/10` : 'Pending'}`,
          ``,
          `1. TASKS COMPLETED:`,
          `${report.tasks_completed || 'N/A'}`,
          ``,
          `2. LEARNING OUTCOMES:`,
          `${report.learning_outcomes || 'N/A'}`,
          ``,
          `3. CHALLENGES FACED & SOLUTIONS:`,
          `${report.challenges_faced || 'N/A'} -> ${report.solutions_implemented || 'N/A'}`,
          ``,
          `4. NEXT WEEK PLAN:`,
          `${report.next_week_plan || 'N/A'}`,
          ``,
          `5. TECHNICAL EVIDENCE:`,
          `${report.evidence_url || report.evidence_file_name || 'None attached'}`,
          ``,
          `6. COORDINATOR FEEDBACK:`,
          `${report.coordinator_comments || 'No feedback recorded yet.'}`
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Week_${report.week_number}_Report_${report.roll_number || report.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const uniqueWeeks = Array.from(new Set(reports.map((r) => Number(r.week_number)).filter(Boolean))).sort((a, b) => a - b);

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesDept =
      deptFilter === 'ALL' ||
      String(r.department || '').toUpperCase().includes(deptFilter.toUpperCase());
    const matchesWeek = weekFilter === 'ALL' || String(r.week_number) === weekFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(r.student_name || '').toLowerCase().includes(q) ||
      String(r.roll_number || '').toLowerCase().includes(q) ||
      String(r.company || '').toLowerCase().includes(q) ||
      String(r.tasks_completed || '').toLowerCase().includes(q);
    return matchesStatus && matchesDept && matchesWeek && matchesSearch;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Student Progress Reports &amp; Coordinator Review</h1>
          <p className="page-subtitle">
            Filter reports by review status, department, or week, inspect and download submitted evidence, assign technical scores, and maintain review history.
          </p>
        </div>
        <button
          onClick={() => loadReports(false)}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search, Department, Week & Status Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by student name, roll number, company, or task..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&amp;TC</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
          </select>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
          >
            <option value="ALL">All Weeks</option>
            {(uniqueWeeks.length > 0 ? uniqueWeeks : [1, 2, 3, 4, 5, 6, 7, 8]).map((w) => (
              <option key={w} value={String(w)}>
                Week {w}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {([
            { key: 'ALL', label: `All (${reports.length})` },
            { key: 'SUBMITTED', label: `Pending Review (${reports.filter(r => r.status === 'SUBMITTED').length})` },
            { key: 'APPROVED', label: `Approved (${reports.filter(r => r.status === 'APPROVED').length})` },
            { key: 'NEEDS_IMPROVEMENT', label: `Needs Improvement (${reports.filter(r => r.status === 'NEEDS_IMPROVEMENT').length})` },
            { key: 'REJECTED', label: `Rejected (${reports.filter(r => r.status === 'REJECTED').length})` }
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

      {lastUpdated && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Last updated: {lastUpdated} • Showing {filteredReports.length} of {reports.length} reports
        </p>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => loadReports(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading weekly progress reports...</p>
        </div>
      ) : (
        <>
          {reviewActionSuccess && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="#059669" />
              <span>{reviewActionSuccess}</span>
            </div>
          )}

          {filteredReports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No reports match this filter</h3>
              <p style={{ color: 'var(--text-muted)' }}>Try switching status, department, or week filters above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="card"
                  style={{
                    borderLeft:
                      report.status === 'APPROVED'
                        ? '4px solid #059669'
                        : report.status === 'NEEDS_IMPROVEMENT' || report.status === 'REJECTED'
                        ? '4px solid #dc2626'
                        : '4px solid #f59e0b'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                          {report.student_name}
                        </h2>
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {report.roll_number}
                        </span>
                        <span className={`badge ${
                          report.status === 'APPROVED' ? 'badge-success' :
                          report.status === 'NEEDS_IMPROVEMENT' ? 'badge-warning' :
                          report.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {report.status}
                        </span>
                        {report.status === 'APPROVED' && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                            <Lock size={12} /> Locked
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {report.department} • <strong>{report.company}</strong> • Week {report.week_number} Report
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Submitted: {report.submitted_at ? String(report.submitted_at).split('T')[0] : 'N/A'}
                      </span>
                      {(report.student_id || report.student) && (
                        <Link
                          to={`/coordinator/students/${report.student_id || report.student}`}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Open Student Profile & Progress Workspace"
                        >
                          <User size={13} /> View Student
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setEvidenceModalReport(report)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Inspect Submitted Evidence & Deliverables"
                      >
                        <Eye size={13} /> View Evidence
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Download Official Printable Report Sheet"
                      >
                        <Download size={13} /> Download Report
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setScore(report.coordinator_score || 9);
                          setComments(report.coordinator_comments || '');
                          setEvidenceFeedback(report.evidence_feedback || '');
                          setRequiredCorrections(report.required_corrections || '');
                          setModalError(null);
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        {report.status === 'SUBMITTED' ? 'View Report & Review' : 'Update Review'}
                      </button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fafafa', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tasks Completed:</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>{report.tasks_completed}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Learning Outcomes:</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>{report.learning_outcomes}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.84rem' }}>
                    {report.evidence_url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Evidence Link:</span>
                        <a
                          href={report.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Open Evidence URL <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                    {report.evidence_data_url && (
                      <a
                        href={report.evidence_data_url}
                        download={report.evidence_file_name || `week_${report.week_number}_evidence`}
                        style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={13} /> Download Attached File ({report.evidence_file_name || 'Evidence'})
                      </a>
                    )}
                  </div>

                  {report.coordinator_comments && (
                    <div style={{ marginTop: '0.75rem', padding: '8px 12px', background: '#ecfdf5', borderRadius: '6px', borderLeft: '3px solid #059669' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#065f46' }}>
                          Coordinator Assessment (Score: {report.coordinator_score}/10):{' '}
                        </span>
                        <span style={{ fontSize: '0.825rem', color: '#065f46' }}>"{report.coordinator_comments}"</span>
                      </div>
                      {report.evidence_feedback && (
                        <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '3px' }}>
                          <strong>Evidence Feedback:</strong> {report.evidence_feedback}
                        </div>
                      )}
                      {report.required_corrections && (
                        <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: '3px' }}>
                          <strong>Required Corrections:</strong> {report.required_corrections}
                        </div>
                      )}
                    </div>
                  )}

                  {Array.isArray(report.review_history) && report.review_history.length > 0 && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <strong>Review History ({report.review_history.length}):</strong>{' '}
                      {report.review_history.map((h, idx) => (
                        <span key={idx} style={{ marginRight: '10px' }}>
                          [{String(h.timestamp).split('T')[0]} — {h.decision} by {h.reviewer_name}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Review Modal Dialog */}
      {selectedReport && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Coordinator Evaluation &amp; Scoring
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Student: <strong>{selectedReport.student_name} ({selectedReport.roll_number})</strong> • Week {selectedReport.week_number} • {selectedReport.company}
            </p>

            {modalError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.84rem' }}>
                {modalError}
              </div>
            )}

            <div style={{ marginBottom: '1rem', background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 6px' }}><strong>Tasks Completed:</strong> {selectedReport.tasks_completed || 'N/A'}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Learning Outcomes:</strong> {selectedReport.learning_outcomes || 'N/A'}</p>
              <p style={{ margin: '0 0 6px' }}>
                <strong>Challenges &amp; Solution:</strong> "{selectedReport.challenges_faced || 'N/A'} → {selectedReport.solutions_implemented || 'N/A'}"
              </p>
              <p style={{ margin: 0 }}><strong>Next Week Plan:</strong> "{selectedReport.next_week_plan || 'N/A'}"</p>
            </div>

            <div className="form-group">
              <label className="form-label">Technical Assessment Score (out of 10) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', width: '60px', textAlign: 'right' }}>
                  {score} / 10
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Coordinator Feedback &amp; Constructive Comments *</label>
              <textarea
                rows={3}
                required
                placeholder="Provide constructive assessment on deliverables, engineering rigor, and progress..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Evidence Quality Feedback (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GitHub commit & screenshots verified"
                  value={evidenceFeedback}
                  onChange={(e) => setEvidenceFeedback(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Corrections (if requesting revision)</label>
                <input
                  type="text"
                  placeholder="e.g. Attach database schema diagram"
                  value={requiredCorrections}
                  onChange={(e) => setRequiredCorrections(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Follow-up / Improvement Task (Optional - creates a student task)</label>
              <input
                type="text"
                placeholder="e.g. Include benchmark load test results before final approval"
                value={improvementTask}
                onChange={(e) => setImprovementTask(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="btn btn-outline"
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedReport.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleReviewSubmit('NEEDS_IMPROVEMENT', true)}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', borderColor: '#fcd34d' }}
                  >
                    <Unlock size={14} /> Unlock for Student Revision
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleReviewSubmit('REJECT')}
                  className="btn btn-outline"
                  style={{ color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewSubmit('NEEDS_IMPROVEMENT')}
                  className="btn"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                >
                  Request Improvement
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewSubmit('APPROVE')}
                  className="btn btn-primary"
                >
                  Approve Report (Score: {score}/10)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Evidence Modal */}
      {evidenceModalReport && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Week {evidenceModalReport.week_number} Evidence &amp; Proof of Work
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {evidenceModalReport.student_name} ({evidenceModalReport.roll_number}) • {evidenceModalReport.company}
                </p>
              </div>
              <button onClick={() => setEvidenceModalReport(null)} className="btn btn-outline btn-sm">Close</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>Primary Evidence URL:</strong>{' '}
                {evidenceModalReport.evidence_url ? (
                  <a href={evidenceModalReport.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    {evidenceModalReport.evidence_url} <ExternalLink size={12} style={{ display: 'inline' }} />
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No external URL provided</span>
                )}
              </div>
              {evidenceModalReport.github_link && (
                <div>
                  <strong>GitHub Repository:</strong>{' '}
                  <a href={evidenceModalReport.github_link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    {evidenceModalReport.github_link}
                  </a>
                </div>
              )}
              {evidenceModalReport.demo_link && (
                <div>
                  <strong>Live Demo Link:</strong>{' '}
                  <a href={evidenceModalReport.demo_link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    {evidenceModalReport.demo_link}
                  </a>
                </div>
              )}
              {evidenceModalReport.evidence_file_name && (
                <div>
                  <strong>Attached File:</strong> {evidenceModalReport.evidence_file_name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setEvidenceModalReport(null)} className="btn btn-outline">
                Close
              </button>
              <button
                onClick={() => {
                  const target = evidenceModalReport;
                  setEvidenceModalReport(null);
                  setSelectedReport(target);
                  setScore(target.coordinator_score || 9);
                  setComments(target.coordinator_comments || '');
                  setEvidenceFeedback(target.evidence_feedback || '');
                  setRequiredCorrections(target.required_corrections || '');
                }}
                className="btn btn-primary"
              >
                Proceed to Review &amp; Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
