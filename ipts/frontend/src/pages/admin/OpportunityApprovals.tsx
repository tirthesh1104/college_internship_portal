import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Globe, Building, Clock, 
  AlertCircle, ExternalLink, ShieldCheck, Plus, Check, X
} from 'lucide-react';
import { api } from '../../services/api';

interface OpportunityApprovalItem {
  id: number;
  title: string;
  organization: string;
  opportunity_type: string;
  mode: string;
  stipend: string;
  duration: string;
  created_by_role?: string;
  created_by_name?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'UNPUBLISHED';
  application_url: string;
  created_at: string;
  rejection_reason?: string;
}

export const OpportunityApprovals: React.FC = () => {
  const [opportunities, setOpportunities] = useState<OpportunityApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReject, setSelectedReject] = useState<OpportunityApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadOpportunities = () => {
    setLoading(true);
    api.get<OpportunityApprovalItem[] | { results: OpportunityApprovalItem[] }>('/opportunities/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setOpportunities(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleApproveAndPublish = async (id: number) => {
    try {
      await api.post(`/opportunities/${id}/publish/`, {});
      setActionSuccess('Opportunity approved and published! It is now instantly visible on the shared Student Opportunities catalog for all eligible students.');
      loadOpportunities();
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      await api.post(`/opportunities/${id}/unpublish/`, {});
      setActionSuccess('Opportunity unpublished. It has been hidden from student listings.');
      loadOpportunities();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Unpublish failed.');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedReject || !rejectReason) return;
    try {
      await api.post(`/opportunities/${selectedReject.id}/reject/`, { reason: rejectReason });
      setSelectedReject(null);
      setRejectReason('');
      setActionSuccess('Opportunity rejected. Feedback returned to submitting coordinator.');
      loadOpportunities();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header">
        <h1 className="page-title">Internship Link Governance & Opportunity Approvals</h1>
        <p className="page-subtitle">Centralized opportunity gatekeeper: Review coordinator drafts, verify external links, and publish opportunities to all eligible college students.</p>
      </div>

      {actionSuccess && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Opportunities List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading opportunities from database...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Building size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No opportunity submissions in queue
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              When coordinators submit internship links or Admin creates opportunities, they will appear here.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Opportunity & Organization</th>
                  <th>Submitted By</th>
                  <th>Type & Mode</th>
                  <th>Official Application URL</th>
                  <th>Status</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{opp.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opp.organization} • {opp.stipend}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opp.created_by_name || 'Coordinator / Faculty'}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{opp.created_by_role || 'COORDINATOR'}</span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem', marginRight: '4px' }}>{opp.opportunity_type}</span>
                      <span style={{ fontSize: '0.8rem' }}>{opp.mode}</span>
                    </td>
                    <td>
                      <a 
                        href={opp.application_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {opp.application_url.substring(0, 30)}...
                        <ExternalLink size={12} />
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${
                        opp.status === 'PUBLISHED' ? 'badge-success' : 
                        opp.status === 'PENDING_APPROVAL' ? 'badge-warning' : 
                        opp.status === 'REJECTED' ? 'badge-error' : 'badge-neutral'
                      }`}>
                        {opp.status === 'PENDING_APPROVAL' ? '● Needs Admin Approval' : opp.status}
                      </span>
                    </td>
                    <td>
                      {(opp.status === 'PENDING_APPROVAL' || opp.status === 'DRAFT') && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleApproveAndPublish(opp.id)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={13} />
                            Approve & Publish
                          </button>
                          <button 
                            onClick={() => setSelectedReject(opp)}
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {opp.status === 'PUBLISHED' && (
                        <button 
                          onClick={() => handleUnpublish(opp.id)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          Unpublish Link
                        </button>
                      )}
                      {opp.status === 'UNPUBLISHED' && (
                        <button 
                          onClick={() => handleApproveAndPublish(opp.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          Re-publish
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

      {/* Rejection Modal */}
      {selectedReject && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Reject Opportunity Submission
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Title: <strong>{selectedReject.title}</strong>
            </p>

            <div className="form-group">
              <label className="form-label">Reason for Rejection *</label>
              <textarea 
                rows={3}
                required
                placeholder="State the reason (e.g., duplicate posting exists, broken external registration link, insufficient stipend details)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedReject(null)} className="btn btn-outline">
                Cancel
              </button>
              <button 
                onClick={handleConfirmReject} 
                className="btn"
                style={{ background: '#dc2626', color: '#ffffff' }}
              >
                Reject & Notify Coordinator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
