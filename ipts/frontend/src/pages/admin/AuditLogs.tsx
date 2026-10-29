import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface AuditLogEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export const SecurityAuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.get('/audit-logs/');
      const rawList = Array.isArray(data) ? data : (data.results || []);
      const mapped: AuditLogEntry[] = rawList.map((item: any) => ({
        id: item.id,
        actor_name: item.actor_name || (item.actor ? item.actor.name : 'System / Automated'),
        actor_role: item.actor_role || (item.actor ? item.actor.role : 'SYSTEM'),
        action: item.action || 'SECURITY_EVENT',
        entity_type: item.entity_type || 'System',
        entity_id: item.entity_id || String(item.id),
        ip_address: item.ip_address || '127.0.0.1',
        timestamp: item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent',
        status: (item.status || 'SUCCESS') as 'SUCCESS' | 'WARNING' | 'FAILED'
      }));
      setLogs(mapped);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err?.message || 'Unable to retrieve security audit logs from server.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(l => 
    l.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entity_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Security & Activity Audit Logs</h1>
          <p className="page-subtitle">Real-time immutable audit trail of role actions, credential access, data exports, and administrative state changes.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={fetchLogs} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by actor, action type, IP address, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading audit logs from database...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <ShieldAlert size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No audit logs found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? 'No logs match your search filter.' : 'No audit records have been captured yet in the system.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>IP Address</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
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
                      <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
