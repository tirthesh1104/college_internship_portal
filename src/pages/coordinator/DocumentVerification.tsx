import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileCheck, ShieldCheck, CheckCircle2, QrCode, RefreshCw, AlertTriangle, Download, Search, Eye, User
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

interface VerificationDoc {
  id: number;
  user?: number;
  student?: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  title?: string;
  document_type: 'OFFER_LETTER' | 'INTERNSHIP_CERTIFICATE' | 'LOR' | 'PROJECT_REPORT' | 'TRAINING_CERTIFICATE';
  verification_key: string;
  verification_reference?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  submitted_at: string;
  verified_at?: string;
  verified_by_name?: string;
  rejection_reason?: string;
  file_url?: string;
  file_name?: string;
  file_data_url?: string;
  notes?: string;
}

export const DocumentVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'VERIFIED' | 'CORRECTION_REQUESTED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDoc, setSelectedDoc] = useState<VerificationDoc | null>(null);
  const [rejectMode, setRejectMode] = useState<'REJECTED' | 'CORRECTION_REQUESTED'>('REJECTED');
  const [rejectReason, setRejectReason] = useState('');

  const [previewDoc, setPreviewDoc] = useState<VerificationDoc | null>(null);
  const [qrVerificationResult, setQrVerificationResult] = useState<any | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<VerificationDoc[]>('/documents/');
      const list = Array.isArray(data) ? data : ((data as any)?.results || []);
      setDocs(list);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments(false);
    return subscribeToLiveSync(() => loadDocuments(true), 8000);
  }, [loadDocuments]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['ALL', 'SUBMITTED', 'VERIFIED', 'CORRECTION_REQUESTED', 'REJECTED'].includes(statusParam.toUpperCase())) {
      setStatusFilter(statusParam.toUpperCase() as any);
    } else if (statusParam?.toUpperCase() === 'PENDING') {
      setStatusFilter('SUBMITTED');
    }
  }, [searchParams]);

  const handleVerify = async (docId: number) => {
    setError(null);
    try {
      await api.post(`/documents/${docId}/verify/`, { notes: 'Verified and approved by Coordinator' });
      setActionSuccess('Certificate / Document verified! Student notified and cryptographic QR verification key issued.');
      await loadDocuments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to verify document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRejectOrCorrection = async () => {
    if (!selectedDoc || !rejectReason.trim()) return;
    setError(null);
    try {
      await api.post(`/documents/${selectedDoc.id}/reject/`, {
        reason: rejectReason.trim(),
        status: rejectMode
      });
      setSelectedDoc(null);
      setRejectReason('');
      setActionSuccess(
        rejectMode === 'CORRECTION_REQUESTED'
          ? 'Correction requested on document and student notified for resubmission.'
          : 'Document rejected with remarks and student notified.'
      );
      await loadDocuments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to update document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleViewQrVerification = async (qrKey: string) => {
    setError(null);
    try {
      const data = await api.get<any>(`/documents/verify-qr/${encodeURIComponent(qrKey)}/`);
      setQrVerificationResult(data);
    } catch (err: any) {
      setError(err?.message || 'QR verification key is only active for verified documents.');
    }
  };

  const handleDownloadCertificate = (doc: VerificationDoc) => {
    if (doc.file_data_url) {
      const a = document.createElement('a');
      a.href = doc.file_data_url;
      a.download = doc.file_name || `${doc.document_type}_${doc.roll_number}.pdf`;
      a.click();
      return;
    }
    const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';
    fetch(`/api/documents/${doc.id}/download/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.text())
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MITCORER_${doc.document_type}_${doc.roll_number || doc.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setError('Could not download certificate document.'));
  };

  const filteredDocs = docs.filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || d.document_type === typeFilter;
    const matchesDept =
      deptFilter === 'ALL' ||
      String(d.department || '').toUpperCase().includes(deptFilter.toUpperCase());
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(d.student_name || '').toLowerCase().includes(q) ||
      String(d.roll_number || '').toLowerCase().includes(q) ||
      String(d.company || '').toLowerCase().includes(q) ||
      String(d.verification_key || '').toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesDept && matchesSearch;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Student Certificates &amp; Document Verification</h1>
          <p className="page-subtitle">
            Preview, download, and verify student-submitted completion certificates and offer letters with QR code authenticity records.
          </p>
        </div>
        <button
          onClick={() => loadDocuments(false)}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by student, roll number, organization, or QR key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select className="form-control" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Document Types</option>
            <option value="OFFER_LETTER">Offer Letter</option>
            <option value="INTERNSHIP_CERTIFICATE">Internship Certificate</option>
            <option value="TRAINING_CERTIFICATE">Training Certificate</option>
            <option value="PROJECT_REPORT">Project Report</option>
            <option value="LOR">Letter of Recommendation</option>
          </select>

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
            { key: 'ALL', label: `All (${docs.length})` },
            { key: 'SUBMITTED', label: `Pending Review (${docs.filter(d => d.status === 'SUBMITTED').length})` },
            { key: 'VERIFIED', label: `Verified (${docs.filter(d => d.status === 'VERIFIED').length})` },
            { key: 'CORRECTION_REQUESTED', label: `Correction Requested (${docs.filter(d => d.status === 'CORRECTION_REQUESTED').length})` },
            { key: 'REJECTED', label: `Rejected (${docs.filter(d => d.status === 'REJECTED').length})` }
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
          <button onClick={() => loadDocuments(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading student certificates and documents...</p>
        </div>
      ) : (
        <>
          {actionSuccess && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} color="#059669" />
              <span>{actionSuccess}</span>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <FileCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No certificates match this filter</h3>
                <p style={{ color: 'var(--text-muted)' }}>Switch status, document type, or department filters above.</p>
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
                      <th>Certificate File &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{doc.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.roll_number} • {doc.department}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {doc.company}
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            {String(doc.document_type || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {doc.status === 'VERIFIED' && doc.verification_key ? (
                            <code style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {doc.verification_key}
                            </code>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Issued upon verification
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            doc.status === 'VERIFIED' ? 'badge-success' :
                            doc.status === 'REJECTED' ? 'badge-danger' :
                            doc.status === 'CORRECTION_REQUESTED' ? 'badge-warning' : 'badge-warning'
                          }`}>
                            {doc.status.replace(/_/g, ' ')}
                          </span>
                          {(doc.notes || doc.rejection_reason) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '170px' }}>
                              "{doc.rejection_reason || doc.notes}"
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {doc.submitted_at ? String(doc.submitted_at).split('T')[0] : 'N/A'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="View Document Details"
                            >
                              <Eye size={12} /> View Document
                            </button>

                            {(doc.student || doc.user) && (
                              <Link
                                to={`/coordinator/students/${doc.student || doc.user}?tab=documents`}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                title="View Student Profile & Documents"
                              >
                                <User size={12} /> View Student
                              </Link>
                            )}

                            <button
                              onClick={() => handleDownloadCertificate(doc)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Download Certificate / Document"
                            >
                              <Download size={12} /> Download
                            </button>

                            {doc.status === 'VERIFIED' && doc.verification_key && (
                              <button
                                onClick={() => handleViewQrVerification(doc.verification_key)}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Inspect QR Verification Record"
                              >
                                <QrCode size={12} /> QR Record
                              </button>
                            )}

                            {doc.status !== 'VERIFIED' && (
                              <button
                                onClick={() => handleVerify(doc.id)}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                              >
                                <ShieldCheck size={12} /> Verify
                              </button>
                            )}

                            {doc.status !== 'CORRECTION_REQUESTED' && doc.status !== 'VERIFIED' && (
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setRejectMode('CORRECTION_REQUESTED');
                                  setRejectReason('');
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#d97706', borderColor: '#fcd34d' }}
                              >
                                Request Correction
                              </button>
                            )}

                            {doc.status !== 'REJECTED' && (
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setRejectMode('REJECTED');
                                  setRejectReason('');
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                              >
                                Reject
                              </button>
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
        </>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Document &amp; Certificate Preview
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {previewDoc.student_name} ({previewDoc.roll_number}) • {previewDoc.department}
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', marginBottom: '1rem' }}>
              <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                    MAEER's MITCORER Barshi — Document Record
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {previewDoc.title || String(previewDoc.document_type).replace(/_/g, ' ')}
                  </div>
                </div>
                <span className={`badge ${previewDoc.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                  {previewDoc.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong>Student:</strong> {previewDoc.student_name}</div>
                <div><strong>Roll Number:</strong> {previewDoc.roll_number}</div>
                <div><strong>Host Organization:</strong> {previewDoc.company}</div>
                <div><strong>Document Type:</strong> {String(previewDoc.document_type).replace(/_/g, ' ')}</div>
                <div><strong>Submitted Date:</strong> {previewDoc.submitted_at ? String(previewDoc.submitted_at).split('T')[0] : 'N/A'}</div>
                <div><strong>QR Key:</strong> {previewDoc.status === 'VERIFIED' ? <code>{previewDoc.verification_key}</code> : 'Pending Verification'}</div>
              </div>

              {previewDoc.file_data_url && previewDoc.file_data_url.startsWith('data:image/') && (
                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                  <img
                    src={previewDoc.file_data_url}
                    alt={previewDoc.file_name || 'Document Preview'}
                    style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDownloadCertificate(previewDoc)} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} /> Download File
                </button>
                {(previewDoc.student || previewDoc.user) && (
                  <Link
                    to={`/coordinator/students/${previewDoc.student || previewDoc.user}?tab=documents`}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <User size={14} /> View Student
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {previewDoc.status !== 'VERIFIED' && (
                  <button
                    onClick={() => {
                      const id = previewDoc.id;
                      setPreviewDoc(null);
                      handleVerify(id);
                    }}
                    className="btn btn-primary"
                    style={{ background: '#059669', borderColor: '#059669' }}
                  >
                    Verify &amp; Issue QR Key
                  </button>
                )}
                <button onClick={() => setPreviewDoc(null)} className="btn btn-outline">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Verification Modal */}
      {qrVerificationResult && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <QrCode size={22} color="#059669" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Cryptographic QR Verification Record
              </h2>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', fontSize: '0.86rem', display: 'grid', gap: '8px' }}>
              <div><strong>Verification Key:</strong> <code>{qrVerificationResult.verification_key || qrVerificationResult.qr_code_key}</code></div>
              <div><strong>Authenticity Status:</strong> <span className={`badge ${qrVerificationResult.verified || qrVerificationResult.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>{qrVerificationResult.status || 'VERIFIED'}</span></div>
              <div><strong>Student Name:</strong> {qrVerificationResult.student_name} ({qrVerificationResult.roll_number})</div>
              <div><strong>Department:</strong> {qrVerificationResult.department}</div>
              <div><strong>Organization:</strong> {qrVerificationResult.issuing_organization || qrVerificationResult.organization || qrVerificationResult.company}</div>
              <div><strong>Document Type:</strong> {qrVerificationResult.document_type}</div>
              <div><strong>Issued / Verified At:</strong> {qrVerificationResult.verified_at || qrVerificationResult.submitted_at}</div>
              <div><strong>Issuing Authority:</strong> {qrVerificationResult.verified_by_name || qrVerificationResult.issuer || 'MITCORER T&P Cell'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setQrVerificationResult(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Request Correction Modal */}
      {selectedDoc && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {rejectMode === 'CORRECTION_REQUESTED'
                ? 'Request Document Correction'
                : 'Reject Certificate / Document Submission'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Student: <strong>{selectedDoc.student_name}</strong> • Document: {selectedDoc.document_type}
            </p>

            <div className="form-group">
              <label className="form-label">
                {rejectMode === 'CORRECTION_REQUESTED'
                  ? 'Required Corrections / Instructions for Student *'
                  : 'Mandatory Reason for Rejection *'}
              </label>
              <textarea
                rows={3}
                required
                placeholder="State why the document requires correction or was rejected (e.g., Unclear seal, missing authorized signatory date)..."
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
                onClick={handleRejectOrCorrection}
                disabled={!rejectReason.trim()}
                className="btn"
                style={{
                  background: rejectMode === 'CORRECTION_REQUESTED' ? '#d97706' : '#dc2626',
                  color: '#ffffff'
                }}
              >
                {rejectMode === 'CORRECTION_REQUESTED'
                  ? 'Request Correction & Notify Student'
                  : 'Confirm Rejection & Notify Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
