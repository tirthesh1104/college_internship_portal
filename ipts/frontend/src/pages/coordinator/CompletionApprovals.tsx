import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, ShieldCheck, CheckCircle2, Award, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface CompletionRecord {
  id: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  duration: string;
  total_reports_approved: number;
  avg_score: number;
  certificate_verified: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED';
}

export const CompletionApprovals: React.FC = () => {
  const [records, setRecords] = useState<CompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const loadCompletions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CompletionRecord[]>('/internships/?status=ACTIVE&completion_status=PENDING_APPROVAL');
      const list = Array.isArray(data) ? data : [];
      setRecords(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load completion requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  const handleApproveCompletion = async (id: number, name: string) => {
    try {
      await api.post(`/internships/${id}/approve-completion/`, {});
      setRecords(records.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
      setSuccess(`Internship completion certified for ${name}. The Digital Career Passport has been locked and permanently accredited.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setSuccess(`Failed to approve completion: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Internship Completion Approvals</h1>
          <p className="page-subtitle">Perform final coordinator sign-off for completed student internships based on report attendance, evidence score, and verified completion certificates.</p>
        </div>
        <button
          onClick={loadCompletions}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={loadCompletions} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading completion requests...</p>
        </div>
      ) : (
        <>
          {success && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} color="#059669" />
              <span>{success}</span>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <CheckSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No pending completions</h3>
                <p style={{ color: 'var(--text-muted)' }}>No internship completions awaiting approval at this time.</p>
              </div>
            ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Host Organization & Duration</th>
                <th>Reports Approved</th>
                <th>Average Quality Score</th>
                <th>Certificate Status</th>
                <th>Completion Approval</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.roll_number} • {r.department}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{r.company}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.duration}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.total_reports_approved}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> Weekly Reports</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{r.avg_score} / 10</span>
                  </td>
                  <td>
                    {r.certificate_verified ? (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        ✓ Verified by Institute
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                        Pending Document
                      </span>
                    )}
                  </td>
                  <td>
                    {r.status === 'APPROVED' ? (
                      <span className="badge badge-success" style={{ padding: '6px 12px' }}>
                        ✓ Final Sign-off Complete
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleApproveCompletion(r.id, r.student_name)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ShieldCheck size={14} />
                        Grant Completion Sign-Off
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
