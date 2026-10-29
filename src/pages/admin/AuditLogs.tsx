import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, RefreshCw, AlertTriangle, Eye, Trash2, X, CheckCircle, Shield } from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface AuditLogEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  actor_id?: number;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
  created_at?: string;
  details?: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export const SecurityAuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [deleteLogTarget, setDeleteLogTarget] = useState<AuditLogEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Multi-select & Bulk Delete state
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedLogIds.size === logs.length && logs.length > 0) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(logs.map(l => l.id)));
    }
  };

  const toggleSelectLog = (id: number) => {
    const next = new Set(selectedLogIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLogIds(next);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedLogIds.size === 0) return;
    setBulkDeleting(true);
    setError(null);
    try {
      const ids = Array.from(selectedLogIds);
      const res: any = await api.post('/audit-logs/bulk-delete/', { ids });
      setSuccessMessage(res?.message || `Successfully soft-deleted ${ids.length} audit log record(s). Traceable bulk deletion audit record appended.`);
      setSelectedLogIds(new Set());
      setShowBulkDeleteModal(false);
      fetchLogs(false, currentPage);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Failed to bulk soft-delete selected audit records.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchLogs = useCallback(async (silent = false, page = currentPage) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (outcomeFilter && outcomeFilter !== 'ALL') params.append('outcome', outcomeFilter);
      params.append('page', String(page));
      params.append('limit', '50');

      const response: any = await api.get(`/audit-logs/?${params.toString()}`);
      const rawList = Array.isArray(response) ? response : (response.results || []);
      
      const mapped: AuditLogEntry[] = rawList.map((item: any) => ({
        id: item.id,
        actor_name: item.actor_name || (item.actor ? item.actor.name : 'System / Automated'),
        actor_role: item.actor_role || (item.actor ? item.actor.role : 'SYSTEM'),
        actor_id: item.actor?.id,
        action: item.action || 'SECURITY_EVENT',
        entity_type: item.entity_type || 'System',
        entity_id: item.entity_id || String(item.id),
        ip_address: item.ip_address || '127.0.0.1',
        created_at: item.created_at,
        timestamp: item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent',
        details: item.details || item.message || 'Standard audit event recorded',
        status: (item.status || 'SUCCESS') as 'SUCCESS' | 'WARNING' | 'FAILED'
      }));

      setLogs(mapped);
      if (response.total_pages) {
        setTotalPages(response.total_pages);
        setTotalRecords(response.total);
      } else {
        setTotalPages(1);
        setTotalRecords(mapped.length);
      }
    } catch (err: any) {
      if (!silent) {
        console.error('Failed to load audit logs:', err);
        setError(err?.message || 'Unable to retrieve security audit logs from server.');
        setLogs([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchTerm, outcomeFilter, currentPage]);

  useEffect(() => {
    fetchLogs(false, currentPage);
    return subscribeToLiveSync(() => fetchLogs(true, currentPage), 8000);
  }, [fetchLogs, currentPage]);

  const handleConfirmDelete = async () => {
    if (!deleteLogTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const res: any = await api.delete(`/audit-logs/${deleteLogTarget.id}/`);
      setSuccessMessage(res?.message || `Audit record #${deleteLogTarget.id} soft-deleted. Traceable deletion record created.`);
      setDeleteLogTarget(null);
      fetchLogs(false, currentPage);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Failed to soft-delete audit log record.');
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield color="#2563eb" size={26} /> Security & Activity Audit Logs
          </h1>
          <p className="page-subtitle">
            Real-time traceable audit trail of role actions, credential access, AI inference, data exports, and administrative actions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && selectedLogIds.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn"
              style={{ backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedLogIds.size})
            </button>
          )}
          <button
            onClick={() => fetchLogs(false, currentPage)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Dataset
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={20} color="#16a34a" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => fetchLogs(false, currentPage)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by actor, action type, IP address, target entity ID, or outcome..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <select 
            className="form-control"
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Outcomes (SUCCESS / WARNING / FAILED)</option>
            <option value="SUCCESS">SUCCESS Only</option>
            <option value="WARNING">WARNING Only</option>
            <option value="FAILED">FAILED Only</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading real database audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <ShieldAlert size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No audit records found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchTerm || outcomeFilter !== 'ALL' ? 'No audit records match your selected query and outcome filters.' : 'No audit records have been captured yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={logs.length > 0 && selectedLogIds.size === logs.length}
                          onChange={toggleSelectAll}
                          title="Select all visible logs"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                    )}
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target Entity</th>
                    <th>IP Address</th>
                    <th>Outcome</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ backgroundColor: selectedLogIds.has(log.id) ? 'rgba(219, 234, 254, 0.3)' : undefined }}>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedLogIds.has(log.id)}
                            onChange={() => toggleSelectLog(log.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.timestamp}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.actor_name}</div>
                        <span className={`badge ${log.actor_role === 'ADMIN' ? 'badge-primary' : log.actor_role === 'COORDINATOR' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                          {log.actor_role}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 500 }}>{log.entity_type}</span>: {log.entity_id}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {log.ip_address}
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'WARNING' ? 'badge-warning' : 'badge-danger'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-outline btn-sm"
                          title="View Complete Audit Metadata"
                          style={{ marginRight: '6px', padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} /> View
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteLogTarget(log)}
                            className="btn btn-outline btn-sm"
                            title="Soft-Delete Audit Record (Admin Only)"
                            style={{ borderColor: '#fca5a5', color: '#dc2626', padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing page {currentPage} of {totalPages} ({totalRecords} total audit logs)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="btn btn-outline btn-sm"
                  >
                    &laquo; Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="btn btn-outline btn-sm"
                  >
                    Next &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '28px' }}>
            <button 
              onClick={() => setSelectedLog(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} color="#2563eb" /> Audit Record Details #{selectedLog.id}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Action Executed</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                  {selectedLog.action}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Actor Name & Role:</strong>
                  <div>{selectedLog.actor_name} ({selectedLog.actor_role})</div>
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Timestamp:</strong>
                  <div>{selectedLog.timestamp}</div>
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Target Entity:</strong>
                  <div>{selectedLog.entity_type} (ID: {selectedLog.entity_id})</div>
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Client IP Address:</strong>
                  <div style={{ fontFamily: 'monospace' }}>{selectedLog.ip_address}</div>
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Outcome Status:</strong>
                  <div>
                    <span className={`badge ${selectedLog.status === 'SUCCESS' ? 'badge-success' : selectedLog.status === 'WARNING' ? 'badge-warning' : 'badge-danger'}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '12px' }}>Record ID:</strong>
                  <div>#{selectedLog.id}</div>
                </div>
              </div>

              <div>
                <strong style={{ color: '#475569', fontSize: '12px' }}>Event Details / Context:</strong>
                <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '12.5px', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteLogTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="#dc2626" size={22} /> Confirm Audit Log Soft-Deletion
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to soft-delete audit record <strong>#{deleteLogTarget.id}</strong> ({deleteLogTarget.action})?
            </p>
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b', marginBottom: '20px' }}>
              <strong>Audit Integrity Protection:</strong> Deleting an audit record will soft-delete it from standard views and append an immutable deletion record (<code>AUDIT_LOG_SOFT_DELETED</code>) to preserve system traceability.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDeleteLogTarget(null)} className="btn btn-secondary" disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={deleting}>
                {deleting ? 'Soft-Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BULK DELETE MODAL */}
      {showBulkDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px', position: 'relative' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="#dc2626" size={22} /> Confirm Bulk Audit Log Soft-Deletion
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to soft-delete <strong>{selectedLogIds.size}</strong> selected audit log record(s)?
            </p>
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b', marginBottom: '20px' }}>
              <strong>Audit Integrity Protection:</strong> Selected audit records will be soft-deleted from active views, and a secondary traceable audit event (<code>AUDIT_LOGS_BULK_SOFT_DELETED</code>) will be recorded.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowBulkDeleteModal(false)} className="btn btn-secondary" disabled={bulkDeleting}>
                Cancel
              </button>
              <button onClick={handleConfirmBulkDelete} className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={bulkDeleting}>
                {bulkDeleting ? 'Bulk Soft-Deleting...' : `Confirm Bulk Delete (${selectedLogIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

