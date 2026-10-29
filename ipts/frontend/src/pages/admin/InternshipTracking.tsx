import React, { useState, useEffect, useCallback } from 'react';
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
