import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Calendar, ExternalLink, PlusCircle, Edit2, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export const Training: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'COORDINATOR' || user?.role === 'ADMIN';

  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    opportunity_type: 'TRAINING' as 'TRAINING' | 'WORKSHOP',
    mode: 'HYBRID' as 'REMOTE' | 'ONSITE' | 'HYBRID',
    location: 'MITCORER Campus / Online',
    stipend: 'Free Certification',
    duration: '4 Weeks',
    application_deadline: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
    required_skills: '',
    description: '',
    application_url: ''
  });

  const loadTrainings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[] | { results: any[] }>('/opportunities/');
      const list = Array.isArray(data) ? data : data.results || [];
      const trainingList = list.filter(
        (item: any) =>
          (item.opportunity_type === 'TRAINING' || item.opportunity_type === 'WORKSHOP') &&
          (isStaff || item.status === 'PUBLISHED')
      );
      setTrainings(trainingList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const openAddTrainingModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      organization: 'MITCORER T&P Cell / Industry Partner',
      opportunity_type: 'TRAINING',
      mode: 'HYBRID',
      location: 'MITCORER Campus / Online',
      stipend: 'Free Certification',
      duration: '4 Weeks',
      application_deadline: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      required_skills: 'Python, SQL, Cloud Basics',
      description: '',
      application_url: 'https://'
    });
    setShowEditModal(true);
  };

  const openEditTrainingModal = (t: any) => {
    setEditingId(t.id);
    setFormData({
      title: t.title || '',
      organization: t.organization || '',
      opportunity_type: t.opportunity_type === 'WORKSHOP' ? 'WORKSHOP' : 'TRAINING',
      mode: t.mode || 'HYBRID',
      location: t.location || 'Online',
      stipend: t.stipend || 'Free',
      duration: t.duration || '4 Weeks',
      application_deadline: t.application_deadline
        ? String(t.application_deadline).split('T')[0]
        : new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      required_skills: t.required_skills || '',
      description: t.description || '',
      application_url: t.application_url || 'https://'
    });
    setShowEditModal(true);
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const urlTrimmed = formData.application_url.trim();
    if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
      setErrorMsg('Registration / Join link must start with http:// or https://');
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
        showToast(`Training program "${formData.title}" updated.`);
      } else {
        await api.post('/opportunities/', payload);
        showToast(`Training program "${formData.title}" created and published.`);
      }
      setShowEditModal(false);
      setEditingId(null);
      await loadTrainings();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save training program.');
    }
  };

  const handleTogglePublish = async (t: any) => {
    try {
      const action = t.status === 'PUBLISHED' ? 'unpublish' : 'publish';
      await api.post(`/opportunities/${t.id}/${action}/`, {});
      showToast(`Training program "${t.title}" ${action === 'publish' ? 'published' : 'unpublished'}.`);
      await loadTrainings();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Status update failed.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.delete(`/opportunities/${deleteConfirmItem.id}/`);
      showToast(`Deleted "${deleteConfirmItem.title}".`);
      setDeleteConfirmItem(null);
      await loadTrainings();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Delete failed.');
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '36px auto 80px', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Industry Training, Workshops &amp; Certification Programs
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            Hands-on technical training workshops, specialized domain bootcamps, and faculty-guided industrial skill modules.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={openAddTrainingModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <PlusCircle size={18} />
            Add Training Program
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading training programs...</div>
      ) : trainings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <BookOpen size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Active Training Programs</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            {isStaff
              ? 'Click "Add Training Program" above to publish a new workshop or certification course.'
              : 'Check back soon for upcoming industrial certification sessions.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {trainings.map((t) => {
            const deadlineStr = t.application_deadline || t.deadline
              ? String(t.application_deadline || t.deadline).split('T')[0]
              : 'Open';
            return (
              <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-published">
                      {t.opportunity_type} • {t.mode} ({t.duration})
                    </span>
                    {isStaff && (
                      <span className={`badge ${t.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
                        {t.status}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    {t.title}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600, marginBottom: '10px' }}>
                    Provider: {t.organization}
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, marginBottom: '16px' }}>
                    {t.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {String(t.required_skills || 'Engineering')
                      .split(',')
                      .map((skill, i) => (
                        <span key={i} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 500 }}>
                          {skill.trim()}
                        </span>
                      ))}
                  </div>
                </div>

                <div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> Schedule/Due: {deadlineStr}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedTraining(t)}
                        className="btn btn-outline btn-sm"
                      >
                        View Details
                      </button>
                      {t.application_url && (
                        <a
                          href={t.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Register / Join <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {isStaff && (
                    <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditTrainingModal(t)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(t)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {t.status === 'PUBLISHED' ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(t)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '3px 8px', color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Details Modal */}
      {selectedTraining && (
        <div className="modal-backdrop" onClick={() => setSelectedTraining(null)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <span className="badge badge-published" style={{ marginBottom: '8px' }}>
              {selectedTraining.opportunity_type} • {selectedTraining.mode}
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{selectedTraining.title}</h2>
            <p style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600, marginBottom: '14px' }}>
              Provider: {selectedTraining.organization}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><strong>Duration:</strong> {selectedTraining.duration}</div>
              <div><strong>Fee / Support:</strong> {selectedTraining.stipend || 'Free'}</div>
              <div><strong>Location:</strong> {selectedTraining.location || selectedTraining.mode}</div>
              <div><strong>Schedule / Deadline:</strong> {selectedTraining.application_deadline ? String(selectedTraining.application_deadline).split('T')[0] : 'Open'}</div>
            </div>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
              {selectedTraining.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setSelectedTraining(null)} className="btn btn-outline">Close</button>
              {selectedTraining.application_url && (
                <a
                  href={selectedTraining.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Open Registration / Join Link <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Training Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '620px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {editingId ? 'Edit Training Program / Workshop' : 'Add Training Program / Workshop'}
            </h2>
            <form onSubmit={handleSaveTraining}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Program Title *</label>
                  <input type="text" required className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Provider / Organization *</label>
                  <input type="text" required className="form-control" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control" value={formData.opportunity_type} onChange={(e) => setFormData({ ...formData, opportunity_type: e.target.value as any })}>
                    <option value="TRAINING">Training Program</option>
                    <option value="WORKSHOP">Workshop / Bootcamp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-control" value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="REMOTE">Online / Remote</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input type="text" className="form-control" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Schedule / Registration Deadline *</label>
                  <input type="date" required className="form-control" value={formData.application_deadline} onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Skills Covered (comma-separated)</label>
                  <input type="text" className="form-control" value={formData.required_skills} onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description &amp; Learning Syllabus</label>
                <textarea rows={3} className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Registration / Join Link (http:// or https://) *</label>
                <input type="url" required className="form-control" value={formData.application_url} onChange={(e) => setFormData({ ...formData, application_url: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Publish Training'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
              Delete Training Program
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>"{deleteConfirmItem.title}"</strong>?
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
