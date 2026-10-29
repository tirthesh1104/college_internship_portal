import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, Search, Building2, Calendar, User, FileText } from 'lucide-react';
import { api } from '../../services/api';

export const QRVerification: React.FC = () => {
  const { qrKey } = useParams<{ qrKey?: string }>();
  const [inputKey, setInputKey] = useState(qrKey || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verifyCertificate = (keyToVerify: string) => {
    if (!keyToVerify.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    api.get(`/documents/verify-qr/${encodeURIComponent(keyToVerify.trim())}/`)
      .then((data) => setResult(data))
      .catch((err) => setError(err.message || 'No authentic MITCORER certificate found for this verification key.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (qrKey) {
      verifyCertificate(qrKey);
    }
  }, [qrKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCertificate(inputKey);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 80px', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          backgroundColor: '#eff6ff', color: '#2563eb', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ShieldCheck size={32} />
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Official Certificate & Credential Verification
        </h1>
        <p style={{ color: '#64748b', fontSize: '14.5px' }}>
          Instant cryptographic and database validation for certificates issued or verified by MITCORER Barshi.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Enter Certificate Reference or QR Verification Key..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Now'}
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', padding: '24px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>Verification Unsuccessful</h3>
          <p style={{ fontSize: '13.5px', color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: '32px', border: '2px solid #10b981', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
            <CheckCircle2 size={36} color="#059669" />
            <div>
              <span className="badge badge-approved" style={{ marginBottom: '4px' }}>Officially Verified</span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Authentic Document Endorsed by MITCORER
              </h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>CANDIDATE NAME</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <User size={16} color="#2563eb" /> {result.student_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ROLL NUMBER</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {result.roll_number}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>DEPARTMENT</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {result.department}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ISSUING ORGANIZATION</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Building2 size={16} color="#059669" /> {result.issuing_organization}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>DOCUMENT TYPE</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <FileText size={16} color="#d97706" /> {result.document_type}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>VERIFICATION REFERENCE</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {result.verification_reference}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.6 }}>
            <strong>Institutional Declaration:</strong> This record was checked and officially authenticated by {result.verified_by} for {result.institution}. The details shown above correspond to verified records in the college database.
          </div>
        </div>
      )}
    </div>
  );
};
