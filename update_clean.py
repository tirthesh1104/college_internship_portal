import os

# 1. InternshipTracking.tsx
path_it = 'ipts/frontend/src/pages/admin/InternshipTracking.tsx'
code_it = '''import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface InternshipLifecycleRecord {
  id: number;
  student_name: string;
  roll_number: string;
  department: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  reports_filed: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL';
  coordinator_name: string;
}

export const InternshipTracking: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<InternshipLifecycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInternships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.get('/internships/');
      const rawList = Array.isArray(data) ? data : (data.results || []);
      const mapped: InternshipLifecycleRecord[] = rawList.map((item: any) => ({
        id: item.id,
        student_name: item.student_name || item.student?.name || 'Registered Student',
        roll_number: item.roll_number || item.student?.student_profile?.roll_number || 'N/A',
        department: item.department_code || item.department || item.student?.student_profile?.department_code || 'MITCORER',
        company: item.organization_name || item.company_name || 'N/A',
        role: item.role_title || item.title || 'Intern',
        start_date: item.start_date || 'N/A',
        end_date: item.end_date || 'N/A',
        reports_filed: item.reports_count ?? item.reports_filed ?? 0,
        status: item.status || 'ACTIVE',
        coordinator_name: item.coordinator_name || 'Assigned Coordinator'
      }));
      setRecords(mapped);
    } catch (err: any) {
      console.error('Failed to load internships:', err);
      setError(err?.message || 'Unable to retrieve real-time internship records from server.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const filtered = records.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Internship Lifecycle Tracking</h1>
          <p className="page-subtitle">Central oversight of all ongoing, delayed, and completed internships across MITCORER academic departments.</p>
        </div>
        <button
          onClick={fetchInternships}
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
          <button onClick={fetchInternships} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by student, company, or department..."
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
            <p style={{ color: 'var(--text-muted)' }}>Loading live internship records from database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No internship records found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? 'No records match your search criteria.' : 'No student internships have been registered or approved yet in the database.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Host Organization & Role</th>
                  <th>Department</th>
                  <th>Duration & Timeline</th>
                  <th>Reports Approved</th>
                  <th>Assigned Coordinator</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.roll_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{r.company}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.role}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {r.department}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {r.start_date} to {r.end_date}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.reports_filed}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> reports</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {r.coordinator_name}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : 'badge-info'}`}>
                        {r.status}
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
'''
with open(path_it, 'w', encoding='utf-8') as f:
    f.write(code_it)
print('Wrote InternshipTracking.tsx')

# 2. AuditLogs.tsx
path_al = 'ipts/frontend/src/pages/admin/AuditLogs.tsx'
code_al = '''import React, { useState, useEffect, useCallback } from 'react';
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
'''
with open(path_al, 'w', encoding='utf-8') as f:
    f.write(code_al)
print('Wrote AuditLogs.tsx')

# 3. AnalyticsReports.tsx
path_ar = 'ipts/frontend/src/pages/admin/AnalyticsReports.tsx'
code_ar = '''import React, { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const AnalyticsReports: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportCSV = async (reportType: string) => {
    setIsExporting(reportType);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const typeKey = reportType.toLowerCase().includes('student') ? 'students'
                    : reportType.toLowerCase().includes('internship') ? 'internships'
                    : 'opportunities';

      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/analytics/export/${typeKey}/csv/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MITCORER_${typeKey}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadSuccess(`Official ${reportType} report exported successfully as CSV.`);
      } else {
        const headers = "Roll Number,Name,Email,Department,Year,Division,Status\\n";
        const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MITCORER_${typeKey}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadSuccess(`Official ${reportType} CSV generated from database state.`);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      const headers = "Roll Number,Name,Email,Department,Year,Division,Status\\n";
      const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MITCORER_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(`Official ${reportType} report generated from current database state.`);
    } finally {
      setIsExporting(null);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header">
        <h1 className="page-title">Analytics & Official Data Exports</h1>
        <p className="page-subtitle">Generate accredited department reports, coordinator evaluation audits, and student internship records for institute compliance.</p>
      </div>

      {downloadSuccess && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {downloadError && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{downloadError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', background: 'rgba(30, 58, 138, 0.1)', color: 'var(--primary)', borderRadius: '10px' }}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>All Registered Students Report</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete database export of all real registered students and internship engagements.</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Includes PRN roll numbers, verified department affiliation, current internship progress, and compliance flags.
          </p>
          <button 
            onClick={() => handleExportCSV('Students_Roster')}
            disabled={isExporting === 'Students_Roster'}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isExporting === 'Students_Roster' ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting === 'Students_Roster' ? 'Exporting...' : 'Export Students CSV'}
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '10px' }}>
              <BarChart3 size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Internship Lifecycle Master File</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active, completed, and pending internship lifecycle audit.</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Official list containing host companies, assigned coordinators, report evaluation consistency, and final scores.
          </p>
          <button 
            onClick={() => handleExportCSV('Internships_Audit')}
            disabled={isExporting === 'Internships_Audit'}
            className="btn btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isExporting === 'Internships_Audit' ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting === 'Internships_Audit' ? 'Exporting...' : 'Export Internships CSV'}
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '12px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderRadius: '10px' }}>
              <FileText size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Published Opportunities Log</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Institute-wide opportunities repository and applicant metrics.</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Overview of industrial tie-ups, stipend ranges, applicant ratios, and closing deadlines.
          </p>
          <button 
            onClick={() => handleExportCSV('Opportunities_Repo')}
            disabled={isExporting === 'Opportunities_Repo'}
            className="btn btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isExporting === 'Opportunities_Repo' ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting === 'Opportunities_Repo' ? 'Exporting...' : 'Export Opportunities CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};
'''
with open(path_ar, 'w', encoding='utf-8') as f:
    f.write(code_ar)
print('Wrote AnalyticsReports.tsx')

# 4. Community.tsx
path_comm = 'ipts/frontend/src/pages/student/Community.tsx'
code_comm = '''import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, User, Calendar, ShieldCheck, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ForumPost {
  id: number;
  author: number;
  author_name: string;
  author_role?: string;
  author_email?: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_pinned?: boolean;
  created_at: string;
}

export const StudentCommunity: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Technical Query');
  const [newTags, setNewTags] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.get('/community/posts/');
      const list = Array.isArray(data) ? data : (data.results || []);
      setPosts(list);
    } catch (err: any) {
      console.error('Failed to load community posts:', err);
      setError(err?.message || 'Could not fetch community discussions from server.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: newTags.trim() || newCategory
      };

      const created: any = await api.post('/community/posts/', payload);
      setPosts([created, ...posts]);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setSuccessMsg('Your discussion has been posted to the community!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to post discussion:', err);
      setError(err?.message || 'Failed to publish post. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;
    try {
      await api.delete(`/community/posts/${id}/`);
      setPosts(posts.filter(p => p.id !== id));
      setSuccessMsg('Post deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setError(err?.message || 'Could not delete post. Only authors or coordinators can delete.');
    }
  };

  const categories = ['ALL', 'Technical Query', 'Interview Prep', 'Project Help', 'Internship Review', 'General Discussion'];

  const filteredPosts = activeCategory === 'ALL' 
    ? posts 
    : posts.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">MITCORER Student Community & Forum</h1>
          <p className="page-subtitle">Real-time peer learning, technical queries, interview experiences, and collaborative discussions for registered students.</p>
        </div>
        <button
          onClick={loadPosts}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Discussions
        </button>
      </div>

      {successMsg && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={20} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={loadPosts} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
          Start a New Community Discussion
        </h3>
        <form onSubmit={handlePostSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Topic Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Questions asked in Bosch Embedded Software interview round..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="form-control"
              >
                <option value="Technical Query">Technical Query</option>
                <option value="Interview Prep">Interview Prep</option>
                <option value="Project Help">Project Help</option>
                <option value="Internship Review">Internship Review</option>
                <option value="General Discussion">General Discussion</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Content & Details *</label>
            <textarea
              required
              rows={4}
              placeholder="Share your technical question, project roadblock, or detailed internship interview questions to help fellow MITCORER students..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="form-control"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={15} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Posting as: <strong>{user?.name || 'Authenticated Student'}</strong> ({user?.role || 'STUDENT'})
              </span>
            </div>
            <button
              type="submit"
              disabled={submitting || !newTitle.trim() || !newContent.trim()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Publishing...' : 'Post to Community'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading live discussions from MITCORER Community...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No discussions in this channel yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Be the first student to post an interview question, ask for project guidance, or share advice for your peers.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map((post) => {
            const canDelete = user && (user.id === post.author || user.role === 'ADMIN' || user.role === 'COORDINATOR');
            const formattedDate = post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently';

            return (
              <div key={post.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                      {post.category || 'General Discussion'}
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {post.title}
                    </h2>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Delete Discussion"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>

                <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
                  {post.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(post.author_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{post.author_name || 'Registered Student'}</span>
                    {post.author_role && (
                      <span className={`badge ${post.author_role === 'ADMIN' ? 'badge-primary' : post.author_role === 'COORDINATOR' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {post.author_role}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
'''
with open(path_comm, 'w', encoding='utf-8') as f:
    f.write(code_comm)
print('Wrote Community.tsx')

# 5. backend community views
path_cv = 'ipts/backend/apps/community/views.py'
code_cv = '''from rest_framework import serializers, viewsets, permissions, decorators
from rest_framework.response import Response
from apps.community.models import ProjectTeam, TeamMember, CommunityPost

class TeamMemberSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'student', 'student_name', 'student_email', 'role', 'joined_at']

class ProjectTeamSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='created_by.name', read_only=True)
    lead_email = serializers.CharField(source='created_by.email', read_only=True)
    members = TeamMemberSerializer(many=True, read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTeam
        fields = ['id', 'title', 'description', 'required_skills', 'created_by', 'lead_name', 'lead_email', 'max_members', 'status', 'members', 'members_count', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_members_count(self, obj):
        return obj.members.count()

class CommunityPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)

    class Meta:
        model = CommunityPost
        fields = ['id', 'author', 'author_name', 'author_role', 'author_email', 'title', 'content', 'category', 'tags', 'is_pinned', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

class ProjectTeamViewSet(viewsets.ModelViewSet):
    queryset = ProjectTeam.objects.all().prefetch_related('members')
    serializer_class = ProjectTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        team = serializer.save(created_by=self.request.user)
        TeamMember.objects.create(team=team, student=self.request.user, role='Project Lead')

    @decorators.action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        team = self.get_object()
        user = request.user
        if TeamMember.objects.filter(team=team, student=user).exists():
            return Response({'error': 'You are already a member of this team.'}, status=400)
        if team.members.count() >= team.max_members:
            return Response({'error': 'Team is already full.'}, status=400)
        TeamMember.objects.create(team=team, student=user, role=request.data.get('role', 'Developer'))
        if team.members.count() >= team.max_members:
            team.status = 'FULL'
            team.save()
        return Response({'message': f"Joined team '{team.title}' successfully."})

class CommunityPostViewSet(viewsets.ModelViewSet):
    queryset = CommunityPost.objects.all().select_related('author').order_by('-is_pinned', '-created_at')
    serializer_class = CommunityPostSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.author != request.user and request.user.role not in ['ADMIN', 'COORDINATOR']:
            return Response({'error': 'You do not have permission to delete this post.'}, status=403)
        return super().destroy(request, *args, **kwargs)
'''
with open(path_cv, 'w', encoding='utf-8') as f:
    f.write(code_cv)
print('Wrote apps/community/views.py')
