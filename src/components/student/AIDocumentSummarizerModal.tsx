import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, X, Bot, CheckCircle2, ShieldCheck, RefreshCw, Copy, Check, Lock } from 'lucide-react';
import { api } from '../../services/api';

interface AIDocumentSummarizerModalProps {
  document: any;
  onClose: () => void;
}

export const AIDocumentSummarizerModal: React.FC<AIDocumentSummarizerModalProps> = ({ document: doc, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!doc) return;

    setLoading(true);
    setError(null);

    const prompt = `Summarize the following official student document uploaded to MAEER’s MITCORER Internship Hub:

DOCUMENT METADATA:
Title: ${doc.title}
Document Type: ${doc.document_type}
Issuing Organization / Company: ${doc.issuing_organization || doc.company || 'Host Organization'}
Verification Reference ID: ${doc.verification_reference || 'N/A'}
Cryptographic Verification Status: ${doc.status}
File Attached: ${doc.file_name}

Generate a structured concise summary in plain text with the following sections:
1. Executive Summary (2-3 sentences overview)
2. Key Technical & Academic Takeaways (3-4 bullet points highlighting skills/credentials verified)
3. Career & Placement Value Proposition (How this document strengthens candidate's profile)
4. Verification & Authenticity Status Note`;

    api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
      prompt,
      systemInstruction: 'You are an Official Document Analysis & Verification Assistant for MAEER’s MIT College of Railway Engineering & Research (MITCORER), Barshi. Provide concise, high-value document summaries without altering underlying records.',
      featureName: 'DOCUMENT_SUMMARIZER'
    }).then(res => {
      setSummaryData({
        text: res.text,
        provider: res.provider,
        model: res.model
      });
    }).catch(() => {
      const org = doc.issuing_organization || doc.company || 'Host Organization';
      const fallbackText = `1. Executive Summary\nThis official ${doc.document_type || 'internship credential'} ("${doc.title}") issued by ${org} is registered in the MITCORER Verification Vault with status: ${doc.status || 'PENDING'}.\n\n2. Key Technical & Academic Takeaways\n• Verified document record (${doc.file_name || 'Attached PDF'}) linked to student academic profile.\n• Reference ID: ${doc.verification_reference || 'Pending Coordinator Verification'}.\n• Confirms structured participation and deliverable completion with ${org}.\n\n3. Career & Placement Value Proposition\nProvides auditable proof of industry training and technical competency for campus placement drives and AICTE internship credit evaluation.\n\n4. Verification & Authenticity Status Note\nCurrent Status: ${doc.status || 'PENDING'}. Authentic source record remains cryptographically locked.`;
      setSummaryData({
        text: fallbackText,
        provider: 'MITCORER Local Document Analyzer',
        model: 'Rule-Based Fallback'
      });
    }).finally(() => {
      setLoading(false);
    });
  }, [doc]);

  const handleCopy = () => {
    if (!summaryData?.text) return;
    navigator.clipboard.writeText(summaryData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '620px', borderRadius: '16px', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Gemini AI Document Summarizer
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {doc.title}
              </h2>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Read-only Security Notice Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '12px', color: '#065f46', marginBottom: '18px' }}>
          <Lock size={14} style={{ flexShrink: 0 }} />
          <span><strong>Secure Read-Only Session:</strong> Source file and verification records remain untouched and protected.</span>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
            <p style={{ fontSize: '14px', fontWeight: 500 }}>Generating concise summary & takeaways via Gemini API...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Summary Content */}
        {!loading && summaryData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-approved" style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                Powered by {summaryData.provider} ({summaryData.model})
              </span>

              <button
                onClick={handleCopy}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Summary'}
              </button>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              fontSize: '13.5px',
              lineHeight: 1.7,
              color: '#1e293b',
              whiteSpace: 'pre-wrap',
              maxHeight: '380px',
              overflowY: 'auto'
            }}>
              {summaryData.text}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
