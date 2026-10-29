import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserPlus, Search, ShieldCheck, Mail, Building, CheckCircle2, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { api, subscribeToLiveSync, broadcastLiveSync } from '../../services/api';

interface CoordinatorRecord {
  id: number;
  name: string;
  email: string;
  department: string;
  assigned_students_count: number;
  status: 'ACTIVE' | 'ON_LEAVE';
  assigned_since: string;
}

export const CoordinatorManagement: React.FC = () => {
  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmCoord, setDeleteConfirmCoord] = useState<CoordinatorRecord | null>(null);
  const [deletingCoord, setDeletingCoord] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computer Science & Engineering'
  });

  const loadCoordinators = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<CoordinatorRecord[]>('/coordinators/profiles/');
      const list = Array.isArray(data) ? data : (data as any)?.results || [];
      setCoordinators(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coordinators');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoordinators(false);
    return subscribeToLiveSync(() => loadCoordinators(true), 8000);
  }, [loadCoordinators]);

  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    try {
      await api.post('/coordinators/profiles/', formData);
      setShowModal(false);
      setFormData({ name: '', email: '', department: 'Computer Science & Engineering' });
      setSuccess(`Coordinator account for ${formData.name} provisioned with COORDINATOR role and departmental access scope.`);
      broadcastLiveSync('/coordinators/');
      loadCoordinators(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setSuccess(`Failed to create coordinator: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const handleDeleteCoordinator = async () => {
    if (!deleteConfirmCoord) return;
    setDeletingCoord(true);
    const target = deleteConfirmCoord;
    try {
      // Optimistic removal: removes immediately from the UI
      setCoordinators(prev => prev.filter(c => c.id !== target.id));
      setDeleteConfirmCoord(null);

      await api.delete(`/coordinators/profiles/${target.id}/`);
      broadcastLiveSync('/coordinators/');
      setSuccess(`Coordinator ${target.name} was permanently removed.`);
      loadCoordinators(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      loadCoordinators(false);
      setError(`Failed to delete coordinator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingCoord(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Coordinator Scope & Department Assignment</h1>
          <p className="page-subtitle">Configure department assignments, workload balancing, and review authorization scopes for faculty coordinators.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => loadCoordinators(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserPlus size={18} />
            Assign New Coordinator
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => loadCoordinators(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading coordinators...</p>
        </div>
      ) : (
        <>
          {success && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={20} color="#059669" />
              <span>{success}</span>
            </div>
          )}

          {/* Coordinators Table */}
          {coordinators.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <UserCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No coordinators assigned</h3>
              <p style={{ color: 'var(--text-muted)' }}>Add faculty coordinators to manage departmental internship activities.</p>
            </div>
          ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Coordinator Faculty</th>
                <th>Assigned Department Scope</th>
                <th>Students Managed</th>
                <th>Active Since</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coordinators.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                      {c.department}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.assigned_students_count}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> students</span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {c.assigned_since}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      ● Active
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <a 
                        href={`mailto:${c.email}`}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Mail size={13} />
                        Email
                      </a>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmCoord(c)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Delete coordinator account"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Assign Department Coordinator
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Create a faculty account with coordinator permissions scoped strictly to their assigned department.
            </p>

            <form onSubmit={handleCreateCoordinator}>
              <div className="form-group">
                <label className="form-label">Faculty Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Prof. R. K. Joshi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">College Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="r.joshi@mitcorer.edu.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department Scope *</label>
                <select 
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="form-control"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Coordinator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Coordinator Confirmation Modal */}
      {deleteConfirmCoord && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Delete Faculty Coordinator?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {deleteConfirmCoord.name} &bull; {deleteConfirmCoord.department}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete this coordinator account? Any assigned students will be safely unassigned and all actions will be logged in security audit logs.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmCoord(null)}
                className="btn btn-outline"
                disabled={deletingCoord}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCoordinator}
                className="btn btn-danger"
                disabled={deletingCoord}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {deletingCoord ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
