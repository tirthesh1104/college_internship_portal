import React, { useEffect, useState, useCallback } from 'react';
import {
  Download, FileSpreadsheet, Eye, RefreshCw, CheckCircle2,
  AlertTriangle, History, Table, Printer
} from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

type ExportDatasetType = 'students' | 'internships' | 'reports' | 'opportunities' | 'applications' | 'certificates';

interface ExportAuditRecord {
  id: number;
  user_name: string;
  export_type: string;
  format_type: string;
  filters_applied: string;
  created_at: string;
}

export const StaffExport: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ExportDatasetType>('students');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<ExportAuditRecord[]>([]);

  const loadPreview = useCallback(async (type: ExportDatasetType = selectedType, silent = false) => {
    if (!silent) setLoadingPreview(true);
    setDownloadError(null);
    try {
      let endpoint = '/reports/staff-students-list/';
      if (type === 'internships') endpoint = '/internships/';
      else if (type === 'reports') endpoint = '/reports/';
      else if (type === 'opportunities') endpoint = '/opportunities/';
      else if (type === 'applications') endpoint = '/applications/';
      else if (type === 'certificates') endpoint = '/documents/';

      const res: any = await api.get(endpoint);
      let list = Array.isArray(res) ? res : res?.results || [];

      if (deptFilter !== 'ALL') {
        list = list.filter((r: any) =>
          String(r.department_code || r.department || r.student_details?.department || 'CSE')
            .toUpperCase()
            .includes(deptFilter)
        );
      }
      if (yearFilter !== 'ALL') {
        list = list.filter((r: any) =>
          String(r.academic_year || r.student_details?.academic_year || '2026-2027') === yearFilter
        );
      }
      if (statusFilter !== 'ALL') {
        list = list.filter((r: any) => String(r.status || '').toUpperCase() === statusFilter);
      }

      setPreviewData(list);
    } catch (err: any) {
      if (!silent) setPreviewData([]);
    } finally {
      if (!silent) setLoadingPreview(false);
    }
  }, [selectedType, deptFilter, yearFilter, statusFilter]);

  useEffect(() => {
    loadPreview(selectedType, false);
    return subscribeToLiveSync(() => loadPreview(selectedType, true), 8000);
  }, [selectedType, deptFilter, yearFilter, statusFilter, loadPreview]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (deptFilter !== 'ALL') params.set('department', deptFilter);
    if (yearFilter !== 'ALL') params.set('academic_year', yearFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleDownload = async (format: 'csv' | 'html', type: ExportDatasetType = selectedType) => {
    setExporting(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const qs = buildQueryString();
      const filterDesc = [
        deptFilter !== 'ALL' ? `Dept=${deptFilter}` : null,
        yearFilter !== 'ALL' ? `Year=${yearFilter}` : null,
        statusFilter !== 'ALL' ? `Status=${statusFilter}` : null
      ]
        .filter(Boolean)
        .join(', ') || 'None (Full Cohort)';

      const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';

      if (format === 'html') {
        const res = await fetch(`/api/analytics/export/${type}/html/${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Printable report generation failed.');
        const html = await res.text();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MITCORER_${type}_Report_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const user = JSON.parse(localStorage.getItem('ipts_user') || localStorage.getItem('user_data') || '{}');
        setAuditLogs([
          {
            id: Date.now(),
            user_name: user.name || 'Coordinator / Admin',
            export_type: type.toUpperCase(),
            format_type: 'PDF / HTML',
            filters_applied: filterDesc,
            created_at: new Date().toLocaleString()
          },
          ...auditLogs.slice(0, 9)
        ]);
        setDownloadSuccess(`Printable ${type.toUpperCase()} report downloaded with summary totals.`);
        return;
      }

      const response = await fetch(`/api/analytics/export/${type}/csv/${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Export service returned an error.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MITCORER_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const user = JSON.parse(localStorage.getItem('ipts_user') || localStorage.getItem('user_data') || '{}');
      const newAudit: ExportAuditRecord = {
        id: Date.now(),
        user_name: user.name || 'Coordinator / Admin',
        export_type: type.toUpperCase(),
        format_type: 'CSV',
        filters_applied: filterDesc,
        created_at: new Date().toLocaleString()
      };
      setAuditLogs([newAudit, ...auditLogs.slice(0, 9)]);

      setDownloadSuccess(`Official ${type.toUpperCase()} CSV downloaded (${previewData.length} records).`);
    } catch (err: any) {
      setDownloadError(err?.message || 'Export generation failed. Please try again.');
    } finally {
      setExporting(false);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Reports &amp; Accredited Data Exports</h1>
          <p className="page-subtitle">
            Generate downloadable CSV spreadsheets or printable PDF/HTML reports with department, academic year, and status filters.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select className="form-control" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="E&TC">E&amp;TC</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="ALL">All Academic Years</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
            <option value="2028-2029">2028-2029</option>
            <option value="2029-2030">2029-2030</option>
            <option value="2025-2026">2025-2026</option>
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PUBLISHED">PUBLISHED</option>
          </select>
        </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'students', label: '1. Students Roster', desc: 'Profiles, CGPA & stages' },
          { key: 'internships', label: '2. Internships', desc: 'Companies & progress' },
          { key: 'reports', label: '3. Weekly Reports', desc: 'Submissions & scores' },
          { key: 'applications', label: '4. Applications', desc: 'Shortlists & selections' },
          { key: 'certificates', label: '5. Certificates', desc: 'Verified QR documents' },
          { key: 'opportunities', label: '6. Opportunities', desc: 'Internships & trainings' }
        ].map((tab) => (
          <div
            key={tab.key}
            onClick={() => setSelectedType(tab.key as ExportDatasetType)}
            className="card"
            style={{
              cursor: 'pointer',
              padding: '12px 14px',
              border: selectedType === tab.key ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedType === tab.key ? 'rgba(30, 58, 138, 0.04)' : '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '3px' }}>
              <FileSpreadsheet size={16} style={{ color: selectedType === tab.key ? 'var(--primary)' : 'var(--text-muted)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: selectedType === tab.key ? 'var(--primary)' : 'var(--text-main)' }}>
                {tab.label}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{tab.desc}</p>
          </div>
        ))}
      </div>

      {/* Live Preview & Export Actions */}
      <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Live Data Preview — Total Matching Records: {previewData.length}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDownload('csv', selectedType)}
              disabled={exporting}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            >
              {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              Download CSV ({previewData.length})
            </button>
            <button
              onClick={() => handleDownload('html', selectedType)}
              disabled={exporting}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            >
              <Printer size={15} />
              Printable PDF / HTML Report
            </button>
          </div>
        </div>

        {loadingPreview ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading live data preview...</p>
          </div>
        ) : previewData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Table size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No records match the current filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                {selectedType === 'students' ? (
                  <tr>
                    <th>Roll Number</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Dept &amp; Year</th>
                    <th>Coordinator</th>
                    <th>Lifecycle Stage</th>
                    <th>Progress</th>
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
                    <th>Company</th>
                    <th>Week #</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                ) : selectedType === 'applications' ? (
                  <tr>
                    <th>Student</th>
                    <th>Opportunity</th>
                    <th>Organization</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                  </tr>
                ) : selectedType === 'certificates' ? (
                  <tr>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Document Type</th>
                    <th>QR Key</th>
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
                {previewData.slice(0, 12).map((row: any, idx: number) => (
                  <tr key={row.id || idx}>
                    {selectedType === 'students' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.roll_number || 'N/A'}</td>
                        <td>{row.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.email}</td>
                        <td>{row.department_code || 'CSE'} ({row.academic_year})</td>
                        <td>{row.assigned_coordinator_name || 'Unassigned'}</td>
                        <td><span className="badge badge-info">{row.lifecycle_stage || 'ACTIVE'}</span></td>
                        <td style={{ fontWeight: 700 }}>{row.completion_rate ?? 0}%</td>
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
                        <td>{row.company || 'N/A'}</td>
                        <td>Week {row.week_number || 1}</td>
                        <td>{row.coordinator_score ? `${row.coordinator_score}/10` : 'Pending'}</td>
                        <td><span className="badge badge-warning">{row.status || 'SUBMITTED'}</span></td>
                      </>
                    ) : selectedType === 'applications' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.student_details?.name || `Student #${row.student_id}`}</td>
                        <td>{row.opportunity_details?.title || 'Internship'}</td>
                        <td>{row.opportunity_details?.organization || 'Organization'}</td>
                        <td>{row.applied_at ? String(row.applied_at).split('T')[0] : 'N/A'}</td>
                        <td><span className="badge badge-info">{row.status}</span></td>
                      </>
                    ) : selectedType === 'certificates' ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                        <td>{row.company}</td>
                        <td>{row.document_type}</td>
                        <td><code>{row.verification_key}</code></td>
                        <td><span className="badge badge-success">{row.status}</span></td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.title}</td>
                        <td>{row.organization || 'MITCORER'}</td>
                        <td>{row.opportunity_type || 'INTERNSHIP'}</td>
                        <td>{row.mode || 'HYBRID'}</td>
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

      {/* Export Audit Log History Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <History size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Session Export Audit History
          </h3>
        </div>

        {auditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Every CSV or PDF/HTML export generated is logged both here and in the Admin Security Audit Logs.
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
                    <td><span className="badge badge-info">{log.export_type}</span></td>
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
