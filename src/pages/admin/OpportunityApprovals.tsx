import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Building, ExternalLink, Check, Search, Eye, EyeOff,
  Edit2, Trash2, PlusCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

interface OpportunityApprovalItem {
  id: number;
  title: string;
  organization: string;
  opportunity_type: 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP';
  mode: 'REMOTE' | 'ONSITE' | 'HYBRID';
  location?: string;
  stipend: string;
  duration: string;
  eligibility?: string;
  required_skills?: string;
  description?: string;
  application_deadline?: string;
  created_by_role?: string;
  created_by_name?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'UNPUBLISHED';
  application_url: string;
  created_at: string;
  rejection_reason?: string;
}

export const OpportunityApprovals: React.FC = () => {
  const [opportunities, setOpportunities] = useState<OpportunityApprovalItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [inspectItem, setInspectItem] = useState<OpportunityApprovalItem | null>(null);
  const [selectedReject, setSelectedReject] = useState<OpportunityApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<OpportunityApprovalItem | null>(null);

  // Add / Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    opportunity_type: 'INTERNSHIP' as 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP',
    mode: 'HYBRID' as 'REMOTE' | 'ONSITE' | 'HYBRID',
    location: 'Pune / Solapur',
    stipend: '',
    duration: '8 Weeks',
    eligibility: 'B.Tech CSE / E&TC / MECH / CIVIL',
    application_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    application_url: '',
    description: '',
    required_skills: ''
  });

  const loadOpportunities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get<OpportunityApprovalItem[] | { results: OpportunityApprovalItem[] }>('/opportunities/');
      const list = Array.isArray(data) ? data : data.results || [];
      setOpportunities(list);
    } catch (err: any) {
      if (!silent) setErrorMsg(err?.message || 'Failed to load opportunities');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities(false);
    return subscribeToLiveSync(() => loadOpportunities(true), 8000);
  }, [loadOpportunities]);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleApproveAndPublish = async (id: number) => {
    setErrorMsg(null);
    try {
      await api.post(`/opportunities/${id}/publish/`, {});
      showToast('Opportunity approved and published! It is now live on the Student Opportunities catalog.');
      setInspectItem(null);
      await loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Approval failed.');
    }
  };

  const handleUnpublish = async (id: number) => {
    setErrorMsg(null);
    try {
      await api.post(`/opportunities/${id}/unpublish/`, {});
      showToast('Opportunity unpublished and hidden from public student listings.');
      setInspectItem(null);
      await loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unpublish failed.');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedReject || !rejectReason.trim()) return;
    setErrorMsg(null);
    try {
      await api.post(`/opportunities/${selectedReject.id}/reject/`, { reason: rejectReason.trim() });
      setSelectedReject(null);
      setRejectReason('');
      setInspectItem(null);
      showToast('Opportunity rejected / returned for corrections. Coordinator notified.');
      await loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Rejection failed.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setErrorMsg(null);
    try {
      await api.delete(`/opportunities/${deleteConfirmItem.id}/`);
      showToast(`Deleted "${deleteConfirmItem.title}" permanently.`);
      setDeleteConfirmItem(null);
      await loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete opportunity.');
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      organization: '',
      opportunity_type: 'INTERNSHIP',
      mode: 'HYBRID',
      location: 'Pune / Barshi',
      stipend: '₹15,000 / month',
      duration: '8 Weeks',
      eligibility: 'B.Tech CSE / E&TC / MECH / CIVIL',
      application_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      application_url: '',
      description: '',
      required_skills: ''
    });
    setShowEditModal(true);
  };

  const openEditModal = (opp: OpportunityApprovalItem) => {
    setEditingId(opp.id);
    setFormData({
      title: opp.title || '',
      organization: opp.organization || '',
      opportunity_type: opp.opportunity_type || 'INTERNSHIP',
      mode: opp.mode || 'HYBRID',
      location: opp.location || 'Hybrid',
      stipend: opp.stipend || 'Unpaid',
      duration: opp.duration || '8 Weeks',
      eligibility: opp.eligibility || 'B.Tech Students',
      application_deadline: opp.application_deadline
        ? String(opp.application_deadline).split('T')[0]
        : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      application_url: opp.application_url || '',
      description: opp.description || '',
      required_skills: opp.required_skills || ''
    });
    setShowEditModal(true);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const urlTrimmed = formData.application_url.trim();
    if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
      setErrorMsg('Application URL must start with http:// or https://');
      return;
    }
    try {
      const payload = {
        ...formData,
        application_url: urlTrimmed,
        status: 'PUBLISHED'
      };
      if (editingId) {
        await api.patch(`/opportunities/${editingId}/`, payload);
        showToast(`Updated "${formData.title}" and published.`);
      } else {
        await api.post('/opportunities/', payload);
        showToast(`Created and published "${formData.title}".`);
      }
      setShowEditModal(false);
      setEditingId(null);
      await loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save opportunity.');
    }
  };

  const filtered = opportunities.filter((opp) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(opp.title || '').toLowerCase().includes(q) ||
      String(opp.organization || '').toLowerCase().includes(q) ||
      String(opp.created_by_name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || opp.opportunity_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Internship &amp; Training Approval Governance</h1>
          <p className="page-subtitle">
            Inspect pending coordinator submissions, verify external application URLs, approve &amp; publish, unpublish, request corrections, or edit listings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => loadOpportunities(false)} disabled={loading} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={17} />
            Post &amp; Publish Opportunity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by title, organization, or submitting coordinator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {([
            { key: 'ALL', label: `All (${opportunities.length})` },
            { key: 'PENDING_APPROVAL', label: `Pending Approval (${opportunities.filter(o => o.status === 'PENDING_APPROVAL').length})` },
            { key: 'PUBLISHED', label: `Published (${opportunities.filter(o => o.status === 'PUBLISHED').length})` },
            { key: 'DRAFT', label: `Drafts (${opportunities.filter(o => o.status === 'DRAFT').length})` },
            { key: 'UNPUBLISHED', label: `Unpublished (${opportunities.filter(o => o.status === 'UNPUBLISHED').length})` },
            { key: 'REJECTED', label: `Rejected (${opportunities.filter(o => o.status === 'REJECTED').length})` }
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`btn ${statusFilter === tab.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="INTERNSHIP">Internships</option>
          <option value="TRAINING">Training Programs</option>
          <option value="WORKSHOP">Workshops</option>
        </select>
      </div>

      {actionSuccess && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Opportunities List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading opportunities from database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Building size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No opportunity submissions match this filter
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              Switch status tabs above or click "Post &amp; Publish Opportunity" to add a new listing.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Opportunity &amp; Organization</th>
                  <th>Submitted By</th>
                  <th>Type, Mode &amp; Deadline</th>
                  <th>Application URL</th>
                  <th>Status</th>
                  <th>Admin Governance Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{opp.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {opp.organization} • {opp.stipend} ({opp.duration})
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{opp.created_by_name || 'Coordinator / Admin'}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>{opp.created_by_role || 'COORDINATOR'}</span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.72rem', marginRight: '4px' }}>{opp.opportunity_type}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{opp.mode}</span>
                      {opp.application_deadline && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Deadline: {String(opp.application_deadline).split('T')[0]}
                        </div>
                      )}
                    </td>
                    <td>
                      <a
                        href={opp.application_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {String(opp.application_url || '').substring(0, 28)}...
                        <ExternalLink size={12} />
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${
                        opp.status === 'PUBLISHED' ? 'badge-success' :
                        opp.status === 'PENDING_APPROVAL' ? 'badge-warning' :
                        opp.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {opp.status === 'PENDING_APPROVAL' ? '● Pending Approval' : opp.status}
                      </span>
                      {opp.rejection_reason && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px', maxWidth: '160px' }}>
                          Reason: {opp.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setInspectItem(opp)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                        <button
                          onClick={() => openEditModal(opp)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        {opp.status !== 'PUBLISHED' ? (
                          <button
                            onClick={() => handleApproveAndPublish(opp.id)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.73rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#059669', borderColor: '#059669' }}
                          >
                            <Check size={12} /> Approve &amp; Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnpublish(opp.id)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#d97706', borderColor: '#fcd34d', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <EyeOff size={12} /> Unpublish
                          </button>
                        )}
                        {opp.status !== 'REJECTED' && (
                          <button
                            onClick={() => {
                              setSelectedReject(opp);
                              setRejectReason(opp.rejection_reason || '');
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmItem(opp)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#991b1b', borderColor: '#fecaca' }}
                          title="Delete permanently"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectItem && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{inspectItem.title}</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {inspectItem.organization} • {inspectItem.opportunity_type} ({inspectItem.mode})
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
              <div><strong>Stipend:</strong> {inspectItem.stipend}</div>
              <div><strong>Duration:</strong> {inspectItem.duration}</div>
              <div><strong>Location:</strong> {inspectItem.location || inspectItem.mode}</div>
              <div><strong>Deadline:</strong> {inspectItem.application_deadline ? String(inspectItem.application_deadline).split('T')[0] : 'Open'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Eligibility:</strong> {inspectItem.eligibility || 'B.Tech All Branches'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Required Skills:</strong> {inspectItem.required_skills || 'Engineering Fundamentals'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> {inspectItem.description || 'N/A'}</div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>External URL:</strong>{' '}
                <a href={inspectItem.application_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  {inspectItem.application_url}
                </a>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button onClick={() => setInspectItem(null)} className="btn btn-outline">Close</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {inspectItem.status !== 'PUBLISHED' ? (
                  <button onClick={() => handleApproveAndPublish(inspectItem.id)} className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                    Approve &amp; Publish
                  </button>
                ) : (
                  <button onClick={() => handleUnpublish(inspectItem.id)} className="btn btn-outline">
                    Unpublish
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedReject(inspectItem);
                    setInspectItem(null);
                  }}
                  className="btn btn-outline"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  Request Corrections / Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {editingId ? 'Edit Opportunity Details' : 'Post & Publish Official Opportunity'}
            </h2>
            <form onSubmit={handleSaveOpportunity}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input type="text" required className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization *</label>
                  <input type="text" required className="form-control" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control" value={formData.opportunity_type} onChange={(e) => setFormData({ ...formData, opportunity_type: e.target.value as any })}>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="TRAINING">Training Program</option>
                    <option value="WORKSHOP">Workshop</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-control" value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-control" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Stipend</label>
                  <input type="text" className="form-control" value={formData.stipend} onChange={(e) => setFormData({ ...formData, stipend: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input type="text" className="form-control" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-control" value={formData.application_deadline} onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Eligibility</label>
                  <input type="text" className="form-control" value={formData.eligibility} onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Skills</label>
                  <input type="text" className="form-control" value={formData.required_skills} onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Application URL (http:// or https://) *</label>
                <input type="url" required className="form-control" value={formData.application_url} onChange={(e) => setFormData({ ...formData, application_url: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save & Publish' : 'Create & Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedReject && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Reject / Request Corrections on Opportunity
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Title: <strong>{selectedReject.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Reason / Corrections Required *</label>
              <textarea
                rows={3}
                required
                placeholder="State the reason or required corrections..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-control"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedReject(null)} className="btn btn-outline">Cancel</button>
              <button onClick={handleConfirmReject} className="btn" style={{ background: '#dc2626', color: '#ffffff' }}>
                Reject &amp; Notify Coordinator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
              Confirm Permanent Deletion
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete <strong>"{deleteConfirmItem.title}"</strong> ({deleteConfirmItem.organization})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDeleteConfirmItem(null)} className="btn btn-outline">Cancel</button>
              <button onClick={handleConfirmDelete} className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
