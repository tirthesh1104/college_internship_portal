import React, { useEffect, useState, useCallback } from 'react';
import { 
  Download, FileSpreadsheet, Eye, Filter, RefreshCw, CheckCircle2, 
  AlertTriangle, History, Table, Calendar, User 
} from 'lucide-react';
import { api } from '../../services/api';

interface ExportAuditRecord {
  id: number;
  user_name: string;
  export_type: string;
  format_type: string;
  filters_applied: string;
  created_at: string;
}

export const StaffExport: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'students' | 'internships' | 'reports' | 'opportunities'>('students');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<ExportAuditRecord[]>([]);

  // Load preview data based on selectedType
  const loadPreview = useCallback(async (type = selectedType) => {
    setLoadingPreview(true);
    setDownloadError(null);
    try {
      if (type === 'students') {
        const res: any = await api.get('/students/');
        const list = Array.isArray(res) ? res : (res.results || []);
        setPreviewData(list.slice(0, 10));
      } else if (type === 'internships') {
        const res: any = await api.get('/internships/');
        const list = Array.isArray(res) ? res : (res.results || []);
        setPreviewData(list.slice(0, 10));
      } else if (type === 'reports') {
        const res: any = await api.get('/reports/');
        const list = Array.isArray(res) ? res : (res.results || []);
        setPreviewData(list.slice(0, 10));
      } else {
        const res: any = await api.get('/opportunities/');
        const list = Array.isArray(res) ? res : (res.results || []);
        setPreviewData(list.slice(0, 10));
      }
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      setPreviewData([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadPreview(selectedType);
  }, [selectedType, loadPreview]);

  // Execute export download
  const handleDownload = async (type = selectedType) => {
    setExporting(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/analytics/export/${type}/csv/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Export service returned an error.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mitcorer_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const user = JSON.parse(localStorage.getItem('user_data') || '{}');
      const newAudit: ExportAuditRecord = {
        id: Date.now(),
        user_name: user.name || 'Staff User',
        export_type: type.toUpperCase(),
        format_type: 'CSV',
        filters_applied: 'None (Full Cohort)',
        created_at: new Date().toLocaleString()
      };
      setAuditLogs([newAudit, ...auditLogs.slice(0, 9)]);

      setDownloadSuccess(`Official ${type.toUpperCase()} data export downloaded successfully.`);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Export generation failed. Please try again.');
    } finally {
      setExporting(false);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Institutional Data Exports & Accredited Reporting</h1>
        <p className="page-subtitle">Export official student cohorts, internship audits, and compliance records with pre-download verification previews.</p>
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

      {/* Export Type Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'students', label: '1. Students Roster', desc: 'Registered student database' },
          { key: 'internships', label: '2. Internships Lifecycle', desc: 'Host companies & performance' },
          { key: 'reports', label: '3. Weekly Reports', desc: 'Weekly submissions & scores' },
          { key: 'opportunities', label: '4. Opportunities Log', desc: 'Published industry postings' }
        ].map((tab) => (
          <div
            key={tab.key}
            onClick={() => setSelectedType(tab.key as any)}
            className="card"
            style={{
              cursor: 'pointer',
              border: selectedType === tab.key ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedType === tab.key ? 'rgba(30, 58, 138, 0.04)' : '#ffffff',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
              <FileSpreadsheet size={18} style={{ color: selectedType === tab.key ? 'var(--primary)' : 'var(--text-muted)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedType === tab.key ? 'var(--primary)' : 'var(--text-main)' }}>
                {tab.label}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{tab.desc}</p>
          </div>
        ))}
      </div>

      {/* 10-Row Data Preview Section */}
      <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Live Export Preview (First 10 Rows)
            </h3>
          </div>
          <button
            onClick={() => handleDownload(selectedType)}
            disabled={exporting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Generating...' : `Export ${selectedType.toUpperCase()} (.csv)`}
          </button>
        </div>

        {loadingPreview ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading live data preview...</p>
          </div>
        ) : previewData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Table size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No records currently found in the database for this category.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>The exported CSV will download with certified column headers.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                {selectedType === 'students' ? (
                  <tr>
                    <th>Roll Number</th>
                    <th>Full Name</th>
                    <th>College Email</th>
                    <th>Department</th>
                    <th>Year & Div</th>
                    <th>Status</th>
                  </tr>
                ) : selectedType === 'internships' ? (
                  <tr>
                    <th>Student Name</th>
                    <th>Host Company</th>
                    <th>Role</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                ) : selectedType === 'reports' ? (
                  <tr>
                    <th>Student</th>
                    <th>Week #</th>
                    <th>Submission Date</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Title</th>
                    <th>Organization</th>
                    <th>Type</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {previewData.map((row: any, idx: number) => (
                  <tr key={row.id || idx}>
                    {selectedType === 'students' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.roll_number || 'N/A'}</td>
                        <td>{row.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.email}</td>
                        <td>{row.department || 'Engineering'}</td>
                        <td>{row.academic_year} - {row.division}</td>
                        <td><span className="badge badge-success">{row.status || 'ACTIVE'}</span></td>
                      </>
                    ) : selectedType === 'internships' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.student_name || 'Student'}</td>
                        <td>{row.organization_name || row.company || 'N/A'}</td>
                        <td>{row.role_title || row.role || 'Intern'}</td>
                        <td>{row.start_date || 'N/A'}</td>
                        <td>{row.end_date || 'N/A'}</td>
                        <td><span className="badge badge-info">{row.status || 'ACTIVE'}</span></td>
                      </>
                    ) : selectedType === 'reports' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.student_name || 'Student'}</td>
                        <td>Week {row.week_number || 1}</td>
                        <td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recent'}</td>
                        <td>{row.score ?? 'Pending'}</td>
                        <td><span className="badge badge-warning">{row.status || 'SUBMITTED'}</span></td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.title}</td>
                        <td>{row.organization || 'MITCORER'}</td>
                        <td>{row.opportunity_type || 'Internship'}</td>
                        <td>{row.mode || 'Hybrid'}</td>
                        <td><span className="badge badge-success">{row.status || 'PUBLISHED'}</span></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Audit Log History Table (Latest 10 Events) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <History size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Recent Export Audit History (Latest Events)
          </h3>
        </div>

        {auditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No export downloads initiated during this session yet. Every export action is recorded for compliance.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Staff Member</th>
                  <th>Export Type</th>
                  <th>Format</th>
                  <th>Filters Applied</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.created_at}</td>
                    <td style={{ fontWeight: 600 }}>{log.user_name}</td>
                    <td><span className="badge badge-primary">{log.export_type}</span></td>
                    <td>{log.format_type}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.filters_applied}</td>
                    <td><span className="badge badge-success">GENERATED</span></td>
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

export default StaffExport;
