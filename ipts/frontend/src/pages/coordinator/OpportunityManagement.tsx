import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Clock, CheckCircle2, XCircle, AlertCircle, Send, Globe, Building } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface OpportunityDraft {
  id: number;
  title: string;
  organization: string;
  opportunity_type: 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP';
  mode: 'REMOTE' | 'ONSITE' | 'HYBRID';
  stipend: string;
  duration: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
  application_url: string;
  created_at: string;
}

export const OpportunityManagement: React.FC = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    opportunity_type: 'INTERNSHIP' as const,
    mode: 'HYBRID' as const,
    stipend: '',
    duration: '',
    application_url: '',
    description: '',
    skills_required: ''
  });

  const loadOpportunities = () => {
    setLoading(true);
    api.get<OpportunityDraft[] | { results: OpportunityDraft[] }>('/opportunities/')
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

  const handleSubmitDraft = async (submitForApproval: boolean) => {
    if (!formData.title || !formData.organization || !formData.application_url) return;

    try {
      const payload = {
        title: formData.title,
        organization: formData.organization,
        opportunity_type: formData.opportunity_type,
        mode: formData.mode,
        stipend: formData.stipend || 'Unpaid',
        duration: formData.duration || '8 Weeks',
        application_url: formData.application_url,
        description: formData.description || 'Comprehensive training and internship program.',
        required_skills: formData.skills_required || 'Basic Engineering Skills',
        status: submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT'
      };

      await api.post('/opportunities/', payload);
      setShowModal(false);
      setFormData({
        title: '', organization: '', opportunity_type: 'INTERNSHIP', 
        mode: 'HYBRID', stipend: '', duration: '', application_url: '', 
        description: '', skills_required: ''
      });

      setSuccessMessage(
        submitForApproval 
          ? `Opportunity "${payload.title}" created and submitted for Admin approval. Once approved, it will automatically publish to the shared Student Opportunities catalog.`
          : `Opportunity "${payload.title}" saved to database as draft.`
      );
      loadOpportunities();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity.');
    }
  };

  const handleSendForReview = async (id: number, title: string) => {
    try {
      await api.post(`/opportunities/${id}/submit-review/`, {});
      setSuccessMessage(`Opportunity "${title}" submitted to Admin for review & publication.`);
      loadOpportunities();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Internship & Training Opportunity Central Manager</h1>
          <p className="page-subtitle">Add official internship links, track coordinator drafts, and submit opportunities for Admin approval to publish across MITCORER.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <PlusCircle size={18} />
          Post New Internship Link
        </button>
      </div>

      {successMessage && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Opportunities Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading opportunities from MySQL database...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Building size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No opportunities posted yet
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Click "Post New Internship Link" to create your first opportunity draft.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Opportunity & Organization</th>
                  <th>Type & Mode</th>
                  <th>Stipend & Duration</th>
                  <th>Approval / Publication Status</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{opp.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opp.organization}</div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem', marginRight: '6px' }}>{opp.opportunity_type}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{opp.mode}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opp.stipend}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opp.duration}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        opp.status === 'PUBLISHED' ? 'badge-success' : 
                        opp.status === 'PENDING_APPROVAL' ? 'badge-warning' : 
                        opp.status === 'APPROVED' ? 'badge-info' : 'badge-neutral'
                      }`}>
                        {opp.status === 'PENDING_APPROVAL' ? '● Awaiting Admin Approval' : opp.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {opp.created_at ? opp.created_at.split('T')[0] : 'Today'}
                    </td>
                    <td>
                      {opp.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleSendForReview(opp.id, opp.title)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Send size={12} />
                          Submit for Admin Review
                        </button>
                      )}
                      {opp.status === 'PENDING_APPROVAL' && (
                        <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}>In Admin Review Queue</span>
                      )}
                      {opp.status === 'PUBLISHED' && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>Live for Eligible Students</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Opportunity Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Add Centralized Internship or Training Link
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Coordinators submit links for Admin verification to prevent duplicate postings and guarantee valid corporate links for students.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitDraft(true); }}>
              <div className="form-group">
                <label className="form-label">Opportunity Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Graduate Engineering Trainee - Signal & Telecom"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Host Organization / Company *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Indian Railway Catering and Tourism Corp"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Opportunity Type *</label>
                  <select 
                    value={formData.opportunity_type}
                    onChange={(e) => setFormData({ ...formData, opportunity_type: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="INTERNSHIP">Internship</option>
                    <option value="TRAINING">Technical Training</option>
                    <option value="WORKSHOP">Workshop / Hackathon</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Work Mode</label>
                  <select 
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Stipend Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ₹12,000 / month"
                    value={formData.stipend}
                    onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 12 Weeks"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Official Application Link or Career Portal URL *</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://company.com/apply"
                  value={formData.application_url}
                  onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => handleSubmitDraft(false)}
                    className="btn btn-outline"
                  >
                    Save as Draft
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit for Admin Approval
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
