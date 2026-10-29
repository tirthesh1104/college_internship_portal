import React, { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, AlertTriangle, MessageSquare, ExternalLink, Award, Clock, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface ReportForReview {
  id: number;
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
  submitted_at: string;
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_IMPROVEMENT';
  coordinator_score?: number;
  coordinator_comments?: string;
}

export const ReportReviews: React.FC = () => {
  const [reports, setReports] = useState<ReportForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<ReportForReview | null>(null);
  const [score, setScore] = useState<number>(9);
  const [comments, setComments] = useState<string>('');
  const [improvementTask, setImprovementTask] = useState<string>('');
  const [reviewActionSuccess, setReviewActionSuccess] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ReportForReview[]>('/reports/?status=SUBMITTED');
      const list = Array.isArray(data) ? data : [];
      setReports(list);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReviewSubmit = async (action: 'APPROVE' | 'NEEDS_IMPROVEMENT') => {
    if (!selectedReport) return;

    try {
      await api.post(`/reports/${selectedReport.id}/feedback/`, {
        comments,
        score: score * 10, // Convert 1-10 to 1-100 scale for backend
        decision: action,
        task_title: improvementTask || undefined,
      });

      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'NEEDS_IMPROVEMENT';
      setReports(reports.map(r => r.id === selectedReport.id ? {
        ...r,
        status: newStatus,
        coordinator_score: score,
        coordinator_comments: comments
      } : r));

      setReviewActionSuccess(`Report for ${selectedReport.student_name} (Week ${selectedReport.week_number}) was successfully marked as ${newStatus}. Feedback and score (${score}/10) saved to database.`);
      setSelectedReport(null);
      setComments('');
      setImprovementTask('');
      setTimeout(() => setReviewActionSuccess(null), 5000);
    } catch (err) {
      setReviewActionSuccess(`Failed to submit review: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setReviewActionSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Weekly Progress Report Review Queue</h1>
          <p className="page-subtitle">Evaluate assigned students' weekly technical reports, assess engineering evidence, assign scores, and guide improvement tasks.</p>
        </div>
        <button
          onClick={loadReports}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {lastUpdated && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Last updated: {lastUpdated}
        </p>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={loadReports} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading reports...</p>
        </div>
      ) : (
        <>
          {reviewActionSuccess && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="#059669" />
              <span>{reviewActionSuccess}</span>
            </div>
          )}

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckCircle size={48} color="#059669" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>All caught up!</h3>
              <p style={{ color: 'var(--text-muted)' }}>No pending reports to review at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {reports.map((report) => (
          <div key={report.id} className="card" style={{ borderLeft: report.status === 'APPROVED' ? '4px solid #059669' : report.status === 'NEEDS_IMPROVEMENT' ? '4px solid #dc2626' : '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {report.student_name}
                  </h2>
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                    {report.roll_number}
                  </span>
                  <span className={`badge ${report.status === 'APPROVED' ? 'badge-success' : report.status === 'NEEDS_IMPROVEMENT' ? 'badge-error' : 'badge-warning'}`}>
                    {report.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {report.department} • <strong>{report.company}</strong> • Week {report.week_number} Report
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Submitted: {report.submitted_at}
                </span>
                <button 
                  onClick={() => {
                    setSelectedReport(report);
                    setScore(report.coordinator_score || 9);
                    setComments(report.coordinator_comments || '');
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                >
                  {report.status === 'SUBMITTED' ? 'Review & Score Report' : 'Update Review'}
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

            {report.evidence_url && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Technical Evidence:</span>
                <a href={report.evidence_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {report.evidence_url}
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {report.coordinator_comments && (
              <div style={{ marginTop: '0.75rem', padding: '8px 12px', background: '#ecfdf5', borderRadius: '6px', borderLeft: '3px solid #059669' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#065f46' }}>Coordinator Assessment (Score: {report.coordinator_score}/10): </span>
                <span style={{ fontSize: '0.825rem', color: '#065f46' }}>"{report.coordinator_comments}"</span>
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
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Coordinator Evaluation & Scoring
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Student: <strong>{selectedReport.student_name}</strong> • Week {selectedReport.week_number} • {selectedReport.company}
            </p>

            <div style={{ marginBottom: '1rem', background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 6px' }}><strong>Challenges & Solution:</strong></p>
              <p style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>"{selectedReport.challenges_faced} → {selectedReport.solutions_implemented}"</p>
              <p style={{ margin: '0 0 4px' }}><strong>Next Week Plan:</strong></p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>"{selectedReport.next_week_plan}"</p>
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
              <label className="form-label">Coordinator Feedback & Constructive Comments *</label>
              <textarea 
                rows={3}
                required
                placeholder="Provide constructive assessment on evidence quality, architecture decisions, and code deliverables..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Improvement Task (Optional - if report requires rework)</label>
              <input 
                type="text"
                placeholder="e.g. Include benchmark load test results before final approval"
                value={improvementTask}
                onChange={(e) => setImprovementTask(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button 
                type="button" 
                onClick={() => setSelectedReport(null)} 
                className="btn btn-outline"
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => handleReviewSubmit('NEEDS_IMPROVEMENT')}
                  className="btn"
                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
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
    </div>
  );
};
