import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, Briefcase, Building2, Clock, ExternalLink, CheckCircle, AlertTriangle, X, MapPin, Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);

  // Application submission states
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchOpportunities = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (typeFilter) params.type = typeFilter;
    if (modeFilter) params.mode = modeFilter;

    api.get<any[] | { results: any[] }>('/opportunities/', params)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        // Show only published & active opportunities to students/public
        const activePublished = list.filter((o: any) => o.status === 'PUBLISHED');
        setOpportunities(activePublished);

        const paramId = searchParams.get('id');
        if (paramId) {
          const found = activePublished.find((o: any) => o.id === parseInt(paramId, 10));
          if (found) setSelectedOpp(found);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOpportunities();
  }, [typeFilter, modeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const handleApplyInternal = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'STUDENT') {
      setApplyError('Only registered students can submit internship applications.');
      return;
    }
    if (!selectedOpp) return;

    setIsApplying(true);
    setApplyError('');
    setApplySuccess('');

    try {
      await api.post('/applications/', {
        opportunity_id: selectedOpp.id,
        opportunity: selectedOpp.id,
        cover_note: coverLetter,
        cover_letter: coverLetter,
        resume_url: resumeUrl || user.student_profile?.github_url || 'Provided in student profile'
      });
      setApplySuccess('Your internal IPTS application has been recorded and sent to your Department Coordinator for review!');
      setCoverLetter('');
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Internship &amp; Training Opportunities
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          All verified, approved, and published opportunities available to MITCORER students.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '32px', padding: '18px 24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by title, organization, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-control"
            >
              <option value="">All Types</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="TRAINING">Training Program</option>
              <option value="WORKSHOP">Workshop</option>
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="form-control"
            >
              <option value="">All Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="ONSITE">On-Site</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading published opportunities from database...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Briefcase size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No opportunities found</h3>
          <p style={{ fontSize: '14px' }}>Try adjusting your search criteria or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {opportunities.map((opp) => {
            const skills = String(opp.required_skills || 'Engineering')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const stipendText = opp.stipend || opp.stipend_amount || opp.stipend_type || 'Unpaid';
            const deadlineText = opp.application_deadline || opp.deadline
              ? String(opp.application_deadline || opp.deadline).split('T')[0]
              : 'Open';

            return (
              <div
                key={opp.id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => { setSelectedOpp(opp); setApplySuccess(''); setApplyError(''); }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-published">{opp.opportunity_type || 'INTERNSHIP'}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> {opp.duration || '8 Weeks'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    {opp.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#2563eb', fontWeight: 600, marginBottom: '8px' }}>
                    <Building2 size={15} /> {opp.organization}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {opp.location || opp.mode}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> Due: {deadlineText}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {opp.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {skills.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Stipend / Support</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                      {stipendText}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOpp(opp);
                        setApplySuccess('');
                        setApplyError('');
                      }}
                    >
                      View Details
                    </button>
                    {opp.application_url && (
                      <a
                        href={opp.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Apply Now <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Opportunity Detail & Application Modal */}
      {selectedOpp && (
        <div className="modal-backdrop" onClick={() => setSelectedOpp(null)}>
          <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-published" style={{ marginBottom: '8px' }}>
                  {selectedOpp.opportunity_type} • {selectedOpp.mode}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                  {selectedOpp.title}
                </h2>
                <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                  {selectedOpp.organization}
                </div>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Duration:</span> <strong>{selectedOpp.duration || '8 Weeks'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Location:</span> <strong>{selectedOpp.location || selectedOpp.mode}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Deadline:</span>{' '}
                <strong>{selectedOpp.application_deadline ? String(selectedOpp.application_deadline).split('T')[0] : selectedOpp.deadline || 'Open'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Stipend:</span>{' '}
                <strong style={{ color: '#059669' }}>{selectedOpp.stipend || selectedOpp.stipend_amount || 'Unpaid'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Eligibility Criteria</h4>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{selectedOpp.eligibility || 'B.Tech CSE / E&TC / MECH / CIVIL'}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Description</h4>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>{selectedOpp.description}</p>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Required Technical Skills</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {String(selectedOpp.required_skills || 'Engineering')
                  .split(',')
                  .map((skill, i) => (
                    <span key={i} style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {skill.trim()}
                    </span>
                  ))}
              </div>
            </div>

            {/* Validated External Application Link Section */}
            {selectedOpp.application_url && (
              <div style={{ padding: '14px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                  <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.45 }}>
                    <strong>Step 1 — External Company Portal:</strong> Click "Open External Application Portal" to complete the company's official form in a new tab. Then record your internal IPTS application below for Coordinator tracking.
                  </div>
                </div>
                <a
                  href={selectedOpp.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#d97706', borderColor: '#d97706' }}
                >
                  Open External Application Portal <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Internal IPTS Application Form */}
            {applySuccess ? (
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46' }}>
                <CheckCircle size={20} />
                <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{applySuccess}</span>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Step 2 — Submit / Record Internal IPTS Application for Coordinator Approval
                </h4>

                {applyError && (
                  <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                    {applyError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Statement of Interest / Cover Note</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Briefly state your relevant skills, project experience, or external application reference..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Resume Link / Portfolio Proof (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://github.com/... or Google Drive Resume Link"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedOpp(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApplyInternal}
                    disabled={isApplying}
                  >
                    {isApplying ? 'Submitting...' : 'Submit Internal Application'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
