import React, { useEffect, useState, useCallback } from 'react';
import { Send, Building2, Eye, XCircle, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const MyApplications: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[] | { results: any[] }>('/applications/');
      const list = Array.isArray(data) ? data : data.results || [];
      setApplications(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleWithdraw = async (appId: number) => {
    setWithdrawingId(appId);
    setErrorMsg(null);
    try {
      await api.post(`/applications/${appId}/withdraw/`, {});
      setMessage('Application withdrawn and removed from active review queue.');
      setSelectedApp(null);
      await loadApplications();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to withdraw application.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELECTED':
        return <span className="badge badge-success">Selected &amp; Enrolled</span>;
      case 'SHORTLISTED':
        return <span className="badge badge-info">Shortlisted</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge badge-warning">Changes Requested</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Not Selected</span>;
      case 'WITHDRAWN':
        return <span className="badge badge-neutral">Withdrawn</span>;
      default:
        return <span className="badge badge-warning">Applied / Pending Review</span>;
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">My Internship Applications</h1>
          <p className="page-subtitle">
            Track real-time Coordinator decisions, view opportunity details, or withdraw pending applications.
          </p>
        </div>
        <Link to="/student/opportunities" className="btn btn-primary btn-sm">
          Browse More Opportunities
        </Link>
      </div>

      {message && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading your applications...</div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Send size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Applications Submitted Yet</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>Explore published opportunities to submit your first application.</p>
          <Link to="/student/opportunities" className="btn btn-primary btn-sm">
            Browse Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => {
            const canWithdraw = app.status === 'APPLIED' || app.status === 'UNDER_REVIEW' || app.status === 'CHANGES_REQUESTED';
            return (
              <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {app.opportunity_details?.title || app.role_title || 'Internship Application'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#2563eb', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={15} /> {app.opportunity_details?.organization || app.organization_name || 'Organization'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                    >
                      <Eye size={13} /> View Details
                    </button>
                    {canWithdraw && (
                      <button
                        disabled={withdrawingId === app.id}
                        onClick={() => handleWithdraw(app.id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        <XCircle size={13} /> Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {(app.cover_note || app.cover_letter) && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#475569', marginBottom: '10px', border: '1px solid #f1f5f9' }}>
                    <strong>Your Statement:</strong> {app.cover_note || app.cover_letter}
                  </div>
                )}

                {(app.coordinator_remarks || app.reviewer_feedback) && (
                  <div style={{ backgroundColor: '#eff6ff', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                    <strong>Coordinator Feedback:</strong> {app.coordinator_remarks || app.reviewer_feedback}
                  </div>
                )}

                {app.status === 'SELECTED' && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Link to="/student/internships" className="btn btn-outline btn-sm">
                      Go to My Internship
                    </Link>
                    <Link to="/student/documents" className="btn btn-primary btn-sm">
                      Upload Offer Letter / Certificate &rarr;
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>
              {selectedApp.opportunity_details?.title || 'Internship Application Details'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#2563eb', fontWeight: 600, marginBottom: '12px' }}>
              {selectedApp.opportunity_details?.organization}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div><strong>Application ID:</strong> #{selectedApp.id}</div>
              <div><strong>Current Status:</strong> {selectedApp.status}</div>
              <div><strong>Mode / Location:</strong> {selectedApp.opportunity_details?.location || selectedApp.opportunity_details?.mode || 'Hybrid'}</div>
              <div><strong>Stipend:</strong> {selectedApp.opportunity_details?.stipend || 'As per company'}</div>
              <div><strong>Duration:</strong> {selectedApp.opportunity_details?.duration || '8 Weeks'}</div>
              <div><strong>Applied Date:</strong> {selectedApp.applied_at ? String(selectedApp.applied_at).split('T')[0] : 'N/A'}</div>
            </div>
            {selectedApp.opportunity_details?.description && (
              <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, marginBottom: '12px' }}>
                {selectedApp.opportunity_details.description}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button onClick={() => setSelectedApp(null)} className="btn btn-outline">Close</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedApp.opportunity_details?.application_url && (
                  <a
                    href={selectedApp.opportunity_details.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    External Company Link <ExternalLink size={12} />
                  </a>
                )}
                {(selectedApp.status === 'APPLIED' || selectedApp.status === 'CHANGES_REQUESTED') && (
                  <button
                    onClick={() => handleWithdraw(selectedApp.id)}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  >
                    Withdraw Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
