import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, CheckCircle2, TrendingUp, ShieldCheck, 
  ArrowRight, Award, Users, BookOpen, Clock, MapPin, Building2
} from 'lucide-react';
import { Opportunity } from '../../types';
import { api } from '../../services/api';
import { Logo } from '../../components/common/Logo';

export const Home: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Opportunity[] | { results: Opportunity[] }>('/opportunities/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setOpportunities(list.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
        color: '#ffffff',
        padding: '80px 24px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <Logo width={110} height={110} style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))' }} />
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 28px',
            borderRadius: '9999px', marginBottom: '24px', maxWidth: '100%'
          }}>
            <img
              src="/assets/aistudio/mitcorer_logo_transparent.png"
              alt="MAEER's MIT College of Railway Engineering & Research, Barshi"
              style={{
                width: '100%',
                maxWidth: '520px',
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
            />
          </div>

          <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px', letterSpacing: '-0.5px' }}>
            Empowering Careers Through <span style={{ color: '#60a5fa' }}>Verified Internships</span> & Practical Performance
          </h1>

          <p style={{ fontSize: '17px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '750px', margin: '0 auto 36px' }}>
            A unified college hub connecting students, Training & Placement coordinators, and industry partners. Track weekly progress, verify engineering skills, review evidence, and build accredited credentials.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/opportunities" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px', backgroundColor: '#2563eb' }}>
              Explore Opportunities <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: '15px' }}>
              Student Self-Registration
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights / Stats Banner */}
      <section style={{ maxWidth: '1100px', margin: '-40px auto 60px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '16px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)', border: '1px solid #e2e8f0',
          padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e40af' }}>100%</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Centralized Tracking</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>MySQL</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Secure Relational DB</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706' }}>Weekly</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Progress & Evidence Reports</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed' }}>QR Verified</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Accredited Certificates</div>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            Comprehensive Performance Tracking Ecosystem
          </h2>
          <p style={{ color: '#64748b', maxWidth: '650px', margin: '0 auto', fontSize: '15px' }}>
            From verified opportunity discovery to supervisor feedback, evidence review, and Career Passport compilation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Briefcase size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Centralized Opportunities</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Both Admin and Coordinators add verified internships with multi-tier approval workflows. All eligible students browse published positions in one shared portal.
            </p>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Weekly Progress & Evidence</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Students record weekly tasks, technical skills learned, GitHub repos, and demo proofs. Coordinators provide direct constructive feedback, scores, and improvement tasks.
            </p>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Award size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Verified Skills & Passport</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              Assessments evaluate skill progression from Beginner to Advanced with practical evidence. Students generate a Digital Career Passport for placement interviews.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Opportunities Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '70px 24px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Latest Published Opportunities
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Approved by College T&P Cell for active student applications
              </p>
            </div>
            <Link to="/opportunities" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading opportunities...</div>
          ) : opportunities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No published opportunities currently available. Check back soon.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {opportunities.map((opp) => (
                <div key={opp.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="badge badge-published">{opp.opportunity_type}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Deadline: {opp.deadline}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      {opp.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#475569', marginBottom: '14px', fontWeight: 500 }}>
                      <Building2 size={15} color="#2563eb" /> {opp.organization}
                    </div>

                    <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {opp.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {opp.required_skills.split(',').slice(0, 3).map((s, idx) => (
                        <span key={idx} style={{ fontSize: '11.5px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                      {opp.stipend_amount || 'Stipend Offered'}
                    </div>
                    <Link to={`/opportunities?id=${opp.id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
