import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck, ShieldCheck, CheckCircle2, XCircle, ExternalLink, QrCode, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface VerificationDoc {
  id: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  document_type: 'OFFER_LETTER' | 'INTERNSHIP_CERTIFICATE' | 'LOR' | 'PROJECT_REPORT';
  verification_key: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  submitted_at: string;
  notes?: string;
}

export const DocumentVerification: React.FC = () => {
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDoc, setSelectedDoc] = useState<VerificationDoc | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<VerificationDoc[]>('/documents/?status=SUBMITTED');
      const list = Array.isArray(data) ? data : [];
      setDocs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleVerify = async (docId: number) => {
    try {
      await api.post(`/documents/${docId}/verify/`, {});
      setDocs(docs.map(d => d.id === docId ? { ...d, status: 'VERIFIED', notes: 'Verified and approved by Coordinator' } : d));
      setActionSuccess('Document verified successfully. A cryptographic QR verification record has been generated.');
      loadDocuments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setActionSuccess(`Failed to verify document: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectReason) return;
    try {
      await api.post(`/documents/${selectedDoc.id}/reject/`, { reason: rejectReason });
      setDocs(docs.map(d => d.id === selectedDoc.id ? { ...d, status: 'REJECTED', notes: rejectReason } : d));
      setSelectedDoc(null);
      setRejectReason('');
      setActionSuccess('Document returned with rejection reason for student resubmission.');
      loadDocuments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setActionSuccess(`Failed to reject document: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Document & Certificate Verification Queue</h1>
          <p className="page-subtitle">Inspect student-submitted offer letters, joining reports, and completion certificates. Verified documents receive a public QR code verification badge.</p>
        </div>
        <button
          onClick={loadDocuments}
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
          <button onClick={loadDocuments} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading documents...</p>
        </div>
      ) : (
        <>
          {actionSuccess && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} color="#059669" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Docs Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {docs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <FileCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No pending documents</h3>
                <p style={{ color: 'var(--text-muted)' }}>No documents awaiting verification at this time.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Host Organization</th>
                      <th>Document Type</th>
                      <th>QR / Security Key</th>
                      <th>Status</th>
                      <th>Uploaded On</th>
                      <th>Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.roll_number}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {doc.company}
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            {doc.document_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                            {doc.verification_key}
                          </code>
                        </td>
                        <td>
                          <span className={`badge ${doc.status === 'VERIFIED' ? 'badge-success' : doc.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {doc.submitted_at}
                        </td>
                        <td>
                          {doc.status === 'SUBMITTED' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleVerify(doc.id)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <ShieldCheck size={13} />
                                Verify & Approve
                              </button>
                              <button
                                onClick={() => setSelectedDoc(doc)}
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#dc2626', borderColor: '#fca5a5' }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <a
                              href={`/verify?key=${doc.verification_key}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <QrCode size={13} />
                              View QR Badge
                            </a>
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

      {/* Reject Modal */}
      {selectedDoc && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Reject Document Submission
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Student: <strong>{selectedDoc.student_name}</strong> • Document: {selectedDoc.document_type}
            </p>

            <div className="form-group">
              <label className="form-label">Mandatory Reason for Rejection *</label>
              <textarea 
                rows={3}
                required
                placeholder="State why the document was rejected (e.g., Unclear seal, missing authorized signatory date, wrong academic session)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedDoc(null)} className="btn btn-outline">
                Cancel
              </button>
              <button 
                onClick={handleReject} 
                className="btn"
                style={{ background: '#dc2626', color: '#ffffff' }}
              >
                Confirm Rejection & Notify Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
