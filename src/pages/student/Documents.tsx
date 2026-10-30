import React, { useEffect, useState } from 'react';
import {
  FileCheck2, Upload, QrCode, CheckCircle2,
  X, Eye, Trash2, ShieldCheck, Sparkles
} from 'lucide-react';
import { DocumentRecord, DocumentType } from '../../types';
import { api } from '../../services/api';
import { AIDocumentSummarizerModal } from '../../components/student/AIDocumentSummarizerModal';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('OFFER_LETTER');
  const [issuingOrg, setIssuingOrg] = useState('');
  const [verificationRef, setVerificationRef] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inline preview, AI summary & delete confirmation state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [summarizeDoc, setSummarizeDoc] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchDocuments = () => {
    setLoading(true);
    api.get<DocumentRecord[] | { results: DocumentRecord[] }>('/documents/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setDocuments(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
    const lowerName = selectedFile.name.toLowerCase();
    if (!allowedExtensions.some(ext => lowerName.endsWith(ext))) {
      setError('Invalid file format. Please select a .pdf, .png, .jpg, or .docx file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Encode file to data URL for preview and permanent persistence
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(selectedFile);
      });

      await api.post('/documents/', {
        title: title.trim() || selectedFile.name,
        document_type: documentType,
        issuing_organization: issuingOrg.trim() || 'Host Organization',
        verification_reference: verificationRef.trim() || `REF-${Date.now().toString().slice(-6)}`,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_data_url: dataUrl
      });
      setSuccess('Document uploaded successfully and queued for coordinator verification.');
      setTimeout(() => {
        setModalOpen(false);
        setSuccess('');
        setTitle('');
        setIssuingOrg('');
        setVerificationRef('');
        setSelectedFile(null);
        fetchDocuments();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <span className="badge badge-verified">Verified & Approved</span>;
      case 'SUBMITTED': return <span className="badge badge-submitted">Pending Verification</span>;
      case 'REJECTED': return <span className="badge badge-rejected">Rejected</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.delete('/documents/' + docId + '/');
      setConfirmDeleteId(null);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '240 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Certificates & Official Documents</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Store offer letters, completion certificates, and LORs in secure private storage. Verified credentials automatically sync to your Smart Resume Builder.
          </p>
        </div>

        <button
          onClick={() => { setError(''); setSuccess(''); setModalOpen(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <FileCheck2 size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Documents Uploaded</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>Upload your offer letter or internship certificates for verification.</p>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
            Upload First Document
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {documents.map((doc: any) => (
            <div key={doc.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge badge-draft">{doc.document_type}</span>
                  {getStatusBadge(doc.status)}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {doc.title}
                </h3>

                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px', lineHeight: 1.5 }}>
                  {(doc.issuing_organization || doc.company) && (
                    <div><strong>Issuer:</strong> {doc.issuing_organization || doc.company}</div>
                  )}
                  {doc.verification_reference && (
                    <div><strong>Ref No:</strong> {doc.verification_reference}</div>
                  )}
                  {(doc.verification_key || doc.qr_code_key) && (
                    <div style={{ fontSize: '12px', color: '#2563eb', fontFamily: 'monospace', marginTop: '2px' }}>
                      QR Key: {doc.verification_key || doc.qr_code_key}
                    </div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                    File: {doc.file_name || 'document.pdf'} • {formatFileSize(doc.file_size)}
                  </div>
                </div>

                {doc.rejection_reason && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', fontSize: '12.5px', color: '#dc2626', marginBottom: '14px', border: '1px solid #fecaca' }}>
                    <strong>Rejection Reason:</strong> {doc.rejection_reason}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                  >
                    <Eye size={14} /> View Record
                  </button>
                  <button
                    onClick={() => setSummarizeDoc(doc)}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', color: '#7c3aed', borderColor: '#d8b4fe' }}
                  >
                    <Sparkles size={14} /> AI Summary
                  </button>
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';
                      fetch(`/api/documents/${doc.id}/download/`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                      })
                        .then((r) => r.text())
                        .then((html) => {
                          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `MITCORER_${doc.document_type}_${doc.id}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', color: '#059669' }}
                  >
                    <QrCode size={14} /> Download Certificate
                  </button>
                  {confirmDeleteId === doc.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', padding: '5px 10px', fontSize: '12px' }}
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(doc.id)}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Document Summarizer Modal */}
      {summarizeDoc && (
        <AIDocumentSummarizerModal
          document={summarizeDoc}
          onClose={() => setSummarizeDoc(null)}
        />
      )}

      {/* Document Record Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Official Credential Record</h2>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13.5px', lineHeight: 1.7 }}>
              <div><strong>Document Title:</strong> {previewDoc.title}</div>
              <div><strong>Type:</strong> {previewDoc.document_type}</div>
              <div><strong>Issuing Organization:</strong> {previewDoc.issuing_organization || previewDoc.company || 'Host Organization'}</div>
              <div><strong>Reference ID:</strong> {previewDoc.verification_reference || 'N/A'}</div>
              <div><strong>Verification Status:</strong> {previewDoc.status}</div>
              <div><strong>Cryptographic QR Key:</strong> <code style={{ color: '#2563eb', fontWeight: 700 }}>{previewDoc.verification_key || previewDoc.qr_code_key || 'MIT-QR-VERIFIED'}</code></div>
              <div><strong>File Attached:</strong> {previewDoc.file_name} ({formatFileSize(previewDoc.file_size)})</div>
              <div><strong>Submitted Date:</strong> {previewDoc.submitted_at || (previewDoc.created_at ? String(previewDoc.created_at).split('T')[0] : 'N/A')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setPreviewDoc(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Credential Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Upload Credential for Verification
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '13px', marginBottom: '16px' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Document Type *</label>
                <select
                  className="form-control"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                >
                  <option value="OFFER_LETTER">Internship Offer Letter</option>
                  <option value="JOINING_PROOF">Joining Confirmation Proof</option>
                  <option value="COMPLETION_CERTIFICATE">Internship Completion Certificate</option>
                  <option value="LOR">Letter of Recommendation (LOR)</option>
                  <option value="TRAINING_CERTIFICATE">Training / Workshop Certificate</option>
                  <option value="PROJECT_REPORT">Final Project Report</option>
                  <option value="OTHER">Other Official Evidence</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title / Document Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Tech Mahindra Offer Letter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Issuing Organization</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tata Technologies"
                    value={issuingOrg}
                    onChange={(e) => setIssuingOrg(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Cert ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TM-2026-9812"
                    value={verificationRef}
                    onChange={(e) => setVerificationRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select File (.pdf, .png, .jpg, .docx — Max 10MB) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  className="form-control"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit to Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
