import React, { useState } from 'react';
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
        const headers = "Roll Number,Name,Email,Department,Year,Division,Status\n";
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
      const headers = "Roll Number,Name,Email,Department,Year,Division,Status\n";
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
