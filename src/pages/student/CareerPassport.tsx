import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, Award, Building2, CheckCircle2, 
  Printer, Download, ExternalLink, QrCode, Code2, Share2, Globe 
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const CareerPassport: React.FC = () => {
  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/students/career-passport/')
      .then((data) => setPassport(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Generating Career Passport...</div>;
  }

  if (!passport) {
    return <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Unable to load Career Passport.</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Digital Student Career Passport</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Accredited engineering career portfolio endorsed by MITCORER Training & Placement Cell.
          </p>
        </div>

        <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* Main Passport Card */}
      <div className="card" style={{ padding: '40px 48px', border: '2px solid #2563eb', position: 'relative', overflow: 'hidden' }}>
        {/* Header Ribbon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              MAEER's MIT College of Railway Engineering & Research, Barshi
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {passport.student_name}
            </h2>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Roll Number: <strong>{passport.roll_number}</strong> • Dept: <strong>{passport.department} ({passport.department_code})</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '12px',
              backgroundColor: '#eff6ff', color: '#1e40af', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 0 6px auto'
            }}>
              <ShieldCheck size={36} />
            </div>
            <span className="badge badge-published">Accredited Passport</span>
          </div>
        </div>

        {/* Academic Details & Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '8px', marginBottom: '28px', fontSize: '13.5px' }}>
          <div>
            <span style={{ color: '#64748b' }}>Academic Year:</span> <strong>{passport.academic_year}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Division & Sem:</span> <strong>Div {passport.division} • Sem {passport.semester}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Academic CGPA:</span> <strong style={{ color: '#059669' }}>{passport.cgpa} / 10.0</strong>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {passport.github_url && (
              <a href={passport.github_url} target="_blank" rel="noreferrer" title="GitHub" style={{ color: '#0f172a' }}>
                <Code2 size={18} />
              </a>
            )}
            {passport.linkedin_url && (
              <a href={passport.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ color: '#2563eb' }}>
                <Share2 size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Section 1: Verified Technical Skills */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#2563eb" /> Verified Technical Skills & Practical Competencies
          </h3>

          {passport.verified_skills?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {passport.verified_skills.map((s: any, idx: number) => (
                <div key={idx} style={{ padding: '12px 16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{s.skill_name}</strong>
                    <span className="badge badge-published">{s.current_level}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Assessed Score: <strong>{s.score}/100</strong> by {s.assessed_by}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No skill assessments completed yet.</div>
          )}
        </div>

        {/* Section 2: Industry Internship Records */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#059669" /> Industrial Internship History
          </h3>

          {passport.internships?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {passport.internships.map((intern: any) => (
                <div key={intern.id} style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {intern.role}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600 }}>
                      {intern.organization}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {intern.start_date} to {intern.end_date}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${intern.status === 'COMPLETED' ? 'badge-completed' : 'badge-published'}`}>
                      {intern.status}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                      Score: {intern.final_score}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No internship records available.</div>
          )}
        </div>

        {/* Section 3: Verified Official Credentials */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#7c3aed" /> Officially Authenticated Credentials
          </h3>

          {passport.verified_credentials?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {passport.verified_credentials.map((doc: any, i: number) => (
                <div key={i} style={{ padding: '12px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                    Ref: {doc.verification_reference}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <Link to={`/verify?key=${doc.qr_code_key}`} target="_blank" style={{ fontSize: '11.5px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <QrCode size={12} /> Verify Authenticity
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No verified credentials on record yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
