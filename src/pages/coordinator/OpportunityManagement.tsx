import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import {
  PlusCircle, Search, CheckCircle2, XCircle, AlertCircle, Send,
  Building, Edit2, Trash2, Eye, EyeOff, ExternalLink, Users, FileText, RefreshCw
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface OpportunityRecord {
  id: number;
  title: string;
  organization: string;
  opportunity_type: 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP';
  mode: 'REMOTE' | 'ONSITE' | 'HYBRID';
  location?: string;
  department?: string;
  stipend: string;
  stipend_amount?: string;
  duration: string;
  eligibility?: string;
  eligibility_requirements?: string;
  required_skills?: string;
  description?: string;
  application_deadline?: string;
  deadline?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'UNPUBLISHED' | 'REJECTED' | 'EXPIRED' | 'CLOSED';
  application_url: string;
  rejection_reason?: string;
  created_by_name?: string;
  created_at: string;
}

export const OpportunityManagement: React.FC = () => {
  const { user } = useAuth();
  const canPublishDirectly =
    user?.role === 'ADMIN' || Boolean(user?.coordinator_profile?.can_publish_directly);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isApplicationsRoute = location.pathname.includes('/applications');
  const [activeTab, setActiveTab] = useState<'OPPORTUNITIES' | 'APPLICATIONS'>(
    isApplicationsRoute ? 'APPLICATIONS' : 'OPPORTUNITIES'
  );

  useEffect(() => {
    setActiveTab(location.pathname.includes('/applications') ? 'APPLICATIONS' : 'OPPORTUNITIES');
  }, [location.pathname]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewDetailOpp, setViewDetailOpp] = useState<OpportunityRecord | null>(null);
  const [deleteConfirmOpp, setDeleteConfirmOpp] = useState<OpportunityRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [oppSearch, setOppSearch] = useState('');
  const [oppTypeFilter, setOppTypeFilter] = useState('ALL');
  const [oppModeFilter, setOppModeFilter] = useState('ALL');
  const [oppDeptFilter, setOppDeptFilter] = useState('ALL');
  const [oppStatusFilter, setOppStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [loading, setLoading] = useState(true);

  // Applications state
  const [applications, setApplications] = useState<any[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processingAppId, setProcessingAppId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    opportunity_type: 'INTERNSHIP' as 'INTERNSHIP' | 'TRAINING' | 'WORKSHOP',
    mode: 'HYBRID' as 'REMOTE' | 'ONSITE' | 'HYBRID',
    location: 'Pune / Solapur',
    department: 'ALL',
    stipend: '',
    duration: '',
    eligibility: 'B.Tech CSE / E&TC / MECH / CIVIL',
    application_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    application_url: '',
    description: '',
    skills_required: ''
  });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const [oppData, appData] = await Promise.all([
        api.get<OpportunityRecord[] | { results: OpportunityRecord[] }>('/opportunities/'),
        api.get<any[]>('/applications/').catch(() => [])
      ]);
      const list = Array.isArray(oppData) ? oppData : oppData.results || [];
      setOpportunities(list);
      setApplications(Array.isArray(appData) ? appData : ((appData as any)?.results || []));
    } catch (err: any) {
      if (!silent) setErrorMessage(err?.message || 'Failed to load data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    return subscribeToLiveSync(() => loadData(true), 8000);
  }, [loadData]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setFormData({
      title: '',
      organization: '',
      opportunity_type: 'INTERNSHIP',
      mode: 'HYBRID',
      location: 'Pune / Barshi',
      department: user?.coordinator_profile?.department_code || 'ALL',
      stipend: '',
      duration: '8 Weeks',
      eligibility: 'B.Tech CSE / E&TC / MECH / CIVIL',
      application_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      application_url: '',
      description: '',
      skills_required: ''
    });
    setShowModal(true);
  }, [user?.coordinator_profile?.department_code]);

  useEffect(() => {
    const actionParam = searchParams.get('action');
    const statusParam = searchParams.get('status');
    if (statusParam) setOppStatusFilter(statusParam);
    if (actionParam === 'create' || actionParam === 'new') {
      openAddModal();
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, openAddModal]);

  const openEditModal = (opp: OpportunityRecord) => {
    setEditingId(opp.id);
    setFormData({
      title: opp.title || '',
      organization: opp.organization || '',
      opportunity_type: opp.opportunity_type || 'INTERNSHIP',
      mode: opp.mode || 'HYBRID',
      location: opp.location || 'Remote / Hybrid',
      department: opp.department || 'ALL',
      stipend: opp.stipend || 'Unpaid',
      duration: opp.duration || '8 Weeks',
      eligibility: opp.eligibility || 'B.Tech Engineering Students',
      application_deadline: opp.application_deadline
        ? String(opp.application_deadline).split('T')[0]
        : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      application_url: opp.application_url || '',
      description: opp.description || '',
      skills_required: opp.required_skills || ''
    });
    setShowModal(true);
  };

  const handleSaveOpportunity = async (targetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED') => {
    setErrorMessage(null);
    if (!formData.title.trim() || !formData.organization.trim()) {
      setErrorMessage('Title and Organization are required.');
      return;
    }
    const urlTrimmed = formData.application_url.trim();
    if (!urlTrimmed || (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://'))) {
      setErrorMessage('Application link must be a valid URL starting with http:// or https://');
      return;
    }

    try {
      const effectiveStatus =
        targetStatus === 'PUBLISHED' && !canPublishDirectly ? 'PENDING_APPROVAL' : targetStatus;

      const payload = {
        title: formData.title.trim(),
        organization: formData.organization.trim(),
        opportunity_type: formData.opportunity_type,
        mode: formData.mode,
        location: formData.location.trim() || formData.mode,
        department: formData.department,
        stipend: formData.stipend.trim() || 'Unpaid',
        duration: formData.duration.trim() || '8 Weeks',
        eligibility: formData.eligibility.trim() || 'B.Tech Students',
        application_deadline: formData.application_deadline,
        application_url: urlTrimmed,
        description: formData.description.trim() || 'Comprehensive training and internship program.',
        required_skills: formData.skills_required.trim() || 'Engineering Fundamentals',
        status: effectiveStatus
      };

      if (editingId) {
        const updated: any = await api.patch(`/opportunities/${editingId}/`, payload);
        const actualStatus = updated?.status || effectiveStatus;
        showToast(
          actualStatus === 'PENDING_APPROVAL' && targetStatus === 'PUBLISHED'
            ? `Opportunity "${payload.title}" updated and submitted for Admin approval.`
            : `Opportunity "${payload.title}" updated (${actualStatus}).`
        );
      } else {
        const created: any = await api.post('/opportunities/', payload);
        const actualStatus = created?.status || effectiveStatus;
        showToast(
          actualStatus === 'PUBLISHED'
            ? `Opportunity "${payload.title}" created and published directly to the Student Catalog.`
            : actualStatus === 'PENDING_APPROVAL'
            ? `Opportunity "${payload.title}" submitted for Admin approval.`
            : `Opportunity "${payload.title}" saved as draft.`
        );
      }
      setShowModal(false);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save opportunity.');
    }
  };

  const handleStatusAction = async (opp: OpportunityRecord, action: 'submit-review' | 'publish' | 'unpublish') => {
    setErrorMessage(null);
    try {
      const res: any = await api.post(`/opportunities/${opp.id}/${action}/`, {});
      const resultingStatus = res?.status;
      showToast(
        action === 'publish'
          ? resultingStatus === 'PENDING_APPROVAL'
            ? `"${opp.title}" submitted to Admin for publishing approval.`
            : `"${opp.title}" is now PUBLISHED and visible to students.`
          : action === 'unpublish'
          ? `"${opp.title}" has been UNPUBLISHED and hidden from public catalog.`
          : `"${opp.title}" submitted to Admin for approval.`
      );
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update opportunity status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOpp) return;
    setErrorMessage(null);
    try {
      await api.delete(`/opportunities/${deleteConfirmOpp.id}/`);
      showToast(`Deleted "${deleteConfirmOpp.title}" from database.`);
      setDeleteConfirmOpp(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete opportunity.');
    }
  };

  const handleApplicationStatusUpdate = async (
    appId: number,
    newStatus: 'SHORTLISTED' | 'SELECTED' | 'CHANGES_REQUESTED' | 'REJECTED',
    customRemarks?: string
  ) => {
    setProcessingAppId(appId);
    setErrorMessage(null);
    try {
      await api.post(`/applications/${appId}/status/`, {
        status: newStatus,
        remarks: customRemarks ?? reviewRemarks
      });
      showToast(
        newStatus === 'SELECTED'
          ? 'Application APPROVED & SELECTED! Student has been enrolled into an active internship and notified.'
          : newStatus === 'SHORTLISTED'
          ? 'Student application SHORTLISTED and student notified.'
          : newStatus === 'CHANGES_REQUESTED'
          ? 'Requested changes on student application and notified student.'
          : 'Student application REJECTED and student notified.'
      );
      setSelectedApplication(null);
      setReviewRemarks('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update application status.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const q = oppSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(opp.title || '').toLowerCase().includes(q) ||
      String(opp.organization || '').toLowerCase().includes(q) ||
      String(opp.required_skills || '').toLowerCase().includes(q);
    const matchesType = oppTypeFilter === 'ALL' || opp.opportunity_type === oppTypeFilter;
    const matchesMode = oppModeFilter === 'ALL' || opp.mode === oppModeFilter;
    const matchesDept =
      oppDeptFilter === 'ALL' ||
      opp.department === 'ALL' ||
      String(opp.department || '').toUpperCase().includes(oppDeptFilter) ||
      String(opp.eligibility || '').toUpperCase().includes(oppDeptFilter);
    const matchesStatus = oppStatusFilter === 'ALL' || opp.status === oppStatusFilter;
    return matchesSearch && matchesType && matchesMode && matchesDept && matchesStatus;
  });

  const filteredApplications = applications.filter((app) => {
    const q = appSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(app.student_details?.name || '').toLowerCase().includes(q) ||
      String(app.student_details?.roll_number || '').toLowerCase().includes(q) ||
      String(app.opportunity_details?.title || '').toLowerCase().includes(q) ||
      String(app.opportunity_details?.organization || '').toLowerCase().includes(q);
    const matchesStatus = appStatusFilter === 'ALL' || app.status === appStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">
            {activeTab === 'APPLICATIONS'
              ? 'Manage Student Internship Applications'
              : 'Internship & Training Opportunity Manager'}
          </h1>
          <p className="page-subtitle">
            {activeTab === 'APPLICATIONS'
              ? 'Review student internship applications, inspect student profiles & resumes, and shortlist, select, or reject applicants.'
              : 'Add, edit, publish, unpublish, or delete internships and training programs with validated external links.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <PlusCircle size={18} />
            Post New Internship Link
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('OPPORTUNITIES')}
          className={`btn ${activeTab === 'OPPORTUNITIES' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Building size={16} />
          Internships &amp; Training Catalog ({opportunities.length})
        </button>
        <button
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`btn ${activeTab === 'APPLICATIONS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Users size={16} />
          Student Applications Review ({applications.length})
        </button>
      </div>

      {successMessage && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '12px 16px' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '12px 16px' }}>
          <AlertCircle size={20} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === 'OPPORTUNITIES' ? (
        <>
          {/* Filters for Opportunities */}
          <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Search by title, organization, or skills..."
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={oppTypeFilter} onChange={(e) => setOppTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="INTERNSHIP">Internships</option>
              <option value="TRAINING">Training Programs</option>
              <option value="WORKSHOP">Workshops</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={oppModeFilter} onChange={(e) => setOppModeFilter(e.target.value)}>
              <option value="ALL">All Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="ONSITE">Onsite</option>
              <option value="HYBRID">Hybrid</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={oppDeptFilter} onChange={(e) => setOppDeptFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="E&TC">E&amp;TC</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={oppStatusFilter} onChange={(e) => setOppStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DRAFT">Draft</option>
              <option value="UNPUBLISHED">Unpublished</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading opportunities...</p>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <Building size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  No matching opportunities found
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  Click "Add Internship / Training" to create a new listing.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Opportunity &amp; Organization</th>
                      <th>Type, Mode &amp; Location</th>
                      <th>Stipend, Duration &amp; Deadline</th>
                      <th>Skills &amp; Eligibility</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opp) => (
                      <tr key={opp.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{opp.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opp.organization}</div>
                          {opp.application_url && (
                            <a
                              href={opp.application_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.73rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                            >
                              External Link <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem', marginRight: '6px' }}>{opp.opportunity_type}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{opp.mode}</span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {opp.location || opp.mode} {opp.department && opp.department !== 'ALL' ? `• Dept: ${opp.department}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{opp.stipend}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opp.duration}</div>
                          {opp.application_deadline && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706' }}>
                              Due: {String(opp.application_deadline).split('T')[0]}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.76rem', color: '#1e293b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {opp.required_skills || 'Engineering Skills'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {opp.eligibility || 'B.Tech All Branches'}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const due = opp.application_deadline || opp.deadline || '';
                            const isExpired = Boolean(due && String(due).split('T')[0] < new Date().toISOString().split('T')[0]);
                            const displayStatus = isExpired && opp.status === 'PUBLISHED' ? 'EXPIRED' : opp.status;
                            return (
                              <>
                                <span className={`badge ${
                                  displayStatus === 'PUBLISHED' ? 'badge-success' :
                                  displayStatus === 'PENDING_APPROVAL' ? 'badge-warning' :
                                  displayStatus === 'REJECTED' || displayStatus === 'EXPIRED' ? 'badge-danger' : 'badge-neutral'
                                }`}>
                                  {displayStatus}
                                </span>
                                {opp.rejection_reason && (
                                  <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px', maxWidth: '180px' }}>
                                    Admin Remark: {opp.rejection_reason}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setViewDetailOpp(opp)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="View Complete Opportunity Details"
                            >
                              <Eye size={12} /> View Details
                            </button>

                            {opp.application_url && (
                              <a
                                href={opp.application_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}
                                title="Open External Application Link"
                              >
                                <ExternalLink size={12} /> View Application Link
                              </a>
                            )}

                            <button
                              onClick={() => openEditModal(opp)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Edit Opportunity"
                            >
                              <Edit2 size={12} /> Edit
                            </button>

                            {opp.status !== 'PUBLISHED' ? (
                              canPublishDirectly ? (
                                <button
                                  onClick={() => handleStatusAction(opp, 'publish')}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669' }}
                                  title="Publish to Student Catalog"
                                >
                                  <Eye size={12} /> Publish
                                </button>
                              ) : opp.status !== 'PENDING_APPROVAL' ? (
                                <button
                                  onClick={() => handleStatusAction(opp, 'submit-review')}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Submit to Admin for Approval"
                                >
                                  <Send size={12} /> Submit for Approval
                                </button>
                              ) : null
                            ) : (
                              <button
                                onClick={() => handleStatusAction(opp, 'unpublish')}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', borderColor: '#fcd34d' }}
                                title="Unpublish from Student Catalog"
                              >
                                <EyeOff size={12} /> Unpublish
                              </button>
                            )}

                            {canPublishDirectly && (opp.status === 'DRAFT' || opp.status === 'REJECTED') && (
                              <button
                                onClick={() => handleStatusAction(opp, 'submit-review')}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Send size={12} /> Submit for Approval
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirmOpp(opp)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Delete Opportunity"
                            >
                              <Trash2 size={12} /> Delete
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
        </>
      ) : (
        /* TAB 2: STUDENT APPLICATIONS REVIEW */
        <>
          <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Search applicant by student name, roll number, or company..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(['ALL', 'APPLIED', 'SHORTLISTED', 'SELECTED', 'CHANGES_REQUESTED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setAppStatusFilter(st)}
                  className={`btn ${appStatusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredApplications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No student applications match the filter</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  When students apply for internships on the portal, their applications appear here for Coordinator review.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Applicant</th>
                      <th>Internship &amp; Organization</th>
                      <th>Student Skills &amp; CGPA</th>
                      <th>Applied Date</th>
                      <th>Current Status</th>
                      <th>Coordinator Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {app.student_details?.name || `Student #${app.student_id}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {app.student_details?.roll_number || 'N/A'} • {app.student_details?.department || 'CSE'} ({app.student_details?.academic_year || '2026-2027'})
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {app.opportunity_details?.title || app.role_title || 'Internship Role'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {app.opportunity_details?.organization || app.organization_name || 'Organization'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669' }}>
                            CGPA: {app.student_details?.cgpa || 'N/A'} • Resume: {app.student_details?.resume_status || 'DRAFT'}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {(app.student_details?.skills || []).join(', ') || 'No skills listed'}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {app.applied_at ? String(app.applied_at).split('T')[0] : 'N/A'}
                        </td>
                        <td>
                          <span className={`badge ${
                            app.status === 'SELECTED' ? 'badge-success' :
                            app.status === 'SHORTLISTED' ? 'badge-info' :
                            app.status === 'REJECTED' ? 'badge-danger' :
                            app.status === 'CHANGES_REQUESTED' ? 'badge-warning' : 'badge-neutral'
                          }`}>
                            {app.status}
                          </span>
                          {app.coordinator_remarks && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '170px' }}>
                              "{app.coordinator_remarks}"
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setSelectedApplication(app);
                                setReviewRemarks(app.coordinator_remarks || '');
                              }}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.73rem', padding: '4px 10px' }}
                            >
                              Review &amp; Decide
                            </button>
                            {app.student_details?.id && (
                              <Link
                                to={`/coordinator/students/${app.student_details.id}`}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.73rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <FileText size={12} /> Profile &amp; Resume
                              </Link>
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

      {/* Add / Edit Opportunity Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {editingId ? 'Edit Internship / Training Opportunity' : 'Add Internship or Training Opportunity'}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Enter complete details and a valid external application URL (http:// or https://).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveOpportunity(canPublishDirectly ? 'PUBLISHED' : 'PENDING_APPROVAL');
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Opportunity / Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineering Intern"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization / Company *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Railway / TCS"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    value={formData.opportunity_type}
                    onChange={(e) => setFormData({ ...formData, opportunity_type: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="INTERNSHIP">Internship</option>
                    <option value="TRAINING">Training Program</option>
                    <option value="WORKSHOP">Workshop / Certification</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Work Mode *</label>
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
                  <label className="form-label">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="form-control"
                  >
                    <option value="ALL">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="E&TC">E&amp;TC</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune / Barshi"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Stipend / Fee</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹15,000 / month or Free"
                    value={formData.stipend}
                    onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 8 Weeks / 3 Months"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Eligibility Criteria</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech CSE / E&TC / MECH, Min CGPA 6.5"
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, React, SQL, Embedded C"
                    value={formData.skills_required}
                    onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description &amp; Key Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Describe the internship tasks, learning outcomes, or training syllabus..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">External Application / Registration Link (http:// or https://) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://careers.company.com/apply"
                  value={formData.application_url}
                  onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSaveOpportunity('DRAFT')}
                    className="btn btn-outline"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveOpportunity('PENDING_APPROVAL')}
                    className="btn btn-secondary"
                  >
                    Submit for Admin Approval
                  </button>
                  {canPublishDirectly && (
                    <button type="submit" className="btn btn-primary">
                      {editingId ? 'Save & Publish Now' : 'Publish Directly'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Opportunity Details Modal */}
      {viewDetailOpp && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>{viewDetailOpp.opportunity_type}</span>
                <span className={`badge ${
                  viewDetailOpp.status === 'PUBLISHED' ? 'badge-success' :
                  viewDetailOpp.status === 'PENDING_APPROVAL' ? 'badge-warning' :
                  viewDetailOpp.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                }`}>
                  {viewDetailOpp.status}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 2px' }}>{viewDetailOpp.title}</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>{viewDetailOpp.organization}</p>
              </div>
              <button onClick={() => setViewDetailOpp(null)} className="btn btn-outline btn-sm">Close</button>
            </div>

            {viewDetailOpp.rejection_reason && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', marginBottom: '12px' }}>
                <strong>Admin Review Remark:</strong> {viewDetailOpp.rejection_reason}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '14px' }}>
              <div><strong>Mode &amp; Location:</strong> {viewDetailOpp.mode} ({viewDetailOpp.location || 'India'})</div>
              <div><strong>Duration:</strong> {viewDetailOpp.duration || '8 Weeks'}</div>
              <div><strong>Stipend / Fee:</strong> {viewDetailOpp.stipend || viewDetailOpp.stipend_amount || 'Unpaid'}</div>
              <div><strong>Application Deadline:</strong> {String(viewDetailOpp.application_deadline || viewDetailOpp.deadline || 'N/A').split('T')[0]}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Eligibility Criteria:</strong> {viewDetailOpp.eligibility || viewDetailOpp.eligibility_requirements || 'Open to B.Tech Engineering Students'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Required Skills:</strong> {viewDetailOpp.required_skills || 'Engineering Fundamentals'}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>Description &amp; Program Overview</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: 0 }}>
                {viewDetailOpp.description || 'No additional description provided.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
              {viewDetailOpp.application_url ? (
                <a
                  href={viewDetailOpp.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={15} /> Open External Application Link
                </a>
              ) : <span />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const target = viewDetailOpp;
                    setViewDetailOpp(null);
                    openEditModal(target);
                  }}
                  className="btn btn-outline"
                >
                  <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit Listing
                </button>
                {viewDetailOpp.status !== 'PUBLISHED' && viewDetailOpp.status !== 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => {
                      const target = viewDetailOpp;
                      setViewDetailOpp(null);
                      handleStatusAction(target, 'submit-review');
                    }}
                    className="btn btn-primary"
                  >
                    <Send size={14} style={{ marginRight: '4px' }} /> Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpp && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
              Confirm Delete Opportunity
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete <strong>"{deleteConfirmOpp.title}"</strong> at <strong>{deleteConfirmOpp.organization}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDeleteConfirmOpp(null)} className="btn btn-outline">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Application Review Modal */}
      {selectedApplication && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Review Student Internship Application
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Note: Approving/Selecting an application enrolls the student in the internship and is separate from weekly progress report reviews.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div>
                  <strong>Student:</strong> {selectedApplication.student_details?.name} ({selectedApplication.student_details?.roll_number})
                </div>
                <div>
                  <strong>Email:</strong> {selectedApplication.student_details?.email}
                </div>
                <div>
                  <strong>Department / Year:</strong> {selectedApplication.student_details?.department} • {selectedApplication.student_details?.academic_year}
                </div>
                <div>
                  <strong>CGPA &amp; Resume:</strong> {selectedApplication.student_details?.cgpa} ({selectedApplication.student_details?.resume_status})
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Skills:</strong> {(selectedApplication.student_details?.skills || []).join(', ') || 'Not specified'}
                </div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                  <strong>Applied Role:</strong> {selectedApplication.opportunity_details?.title} at {selectedApplication.opportunity_details?.organization}
                </div>
                {selectedApplication.cover_note && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Applicant Note:</strong> "{selectedApplication.cover_note}"
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Coordinator Feedback / Remarks (sent to student)</label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="Enter remarks on eligibility, interview shortlist, or required resume updates..."
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button onClick={() => setSelectedApplication(null)} className="btn btn-outline">
                Close
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  disabled={processingAppId === selectedApplication.id}
                  onClick={() => handleApplicationStatusUpdate(selectedApplication.id, 'SHORTLISTED')}
                  className="btn btn-outline"
                  style={{ borderColor: '#3b82f6', color: '#2563eb' }}
                >
                  Shortlist
                </button>
                <button
                  disabled={processingAppId === selectedApplication.id}
                  onClick={() => handleApplicationStatusUpdate(selectedApplication.id, 'CHANGES_REQUESTED')}
                  className="btn btn-outline"
                  style={{ borderColor: '#f59e0b', color: '#d97706' }}
                >
                  Request Changes
                </button>
                <button
                  disabled={processingAppId === selectedApplication.id}
                  onClick={() => handleApplicationStatusUpdate(selectedApplication.id, 'REJECTED')}
                  className="btn btn-outline"
                  style={{ borderColor: '#ef4444', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  disabled={processingAppId === selectedApplication.id}
                  onClick={() => handleApplicationStatusUpdate(selectedApplication.id, 'SELECTED')}
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <CheckCircle2 size={14} /> Approve &amp; Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
