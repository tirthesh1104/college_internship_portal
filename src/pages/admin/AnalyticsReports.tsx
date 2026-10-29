import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, FileSpreadsheet, FileText, CheckCircle2,
  AlertTriangle, RefreshCw, Printer, Award, Users, PieChart as PieIcon, FileCheck
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import { api, subscribeToLiveSync } from '../../services/api';
import { exportAnalyticsToPDF } from '../../services/pdfExporter';

export const AnalyticsReports: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingStats, setLoadingStats] = useState(false);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rawRecords, setRawRecords] = useState<{
    students: any[];
    internships: any[];
    reports: any[];
    opportunities: any[];
    documents: any[];
    applications: any[];
  }>({
    students: [],
    internships: [],
    reports: [],
    opportunities: [],
    documents: [],
    applications: []
  });

  const loadSummaryData = useCallback(async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const [students, internships, reports, applications, docs, opps] = await Promise.all([
        api.get<any[]>('/students/').catch(() => []),
        api.get<any[]>('/internships/').catch(() => []),
        api.get<any[]>('/reports/').catch(() => []),
        api.get<any[]>('/applications/').catch(() => []),
        api.get<any[]>('/documents/').catch(() => []),
        api.get<any[]>('/opportunities/').catch(() => [])
      ]);

      const toArray = (x: any) => Array.isArray(x) ? x : (Array.isArray(x?.results) ? x.results : []);

      const stArr = toArray(students);
      const intArr = toArray(internships);
      const repArr = toArray(reports);
      const appArr = toArray(applications);
      const docArr = toArray(docs);
      const oppArr = toArray(opps);

      setRawRecords({
        students: stArr,
        internships: intArr,
        reports: repArr,
        applications: appArr,
        documents: docArr,
        opportunities: oppArr
      });

      setCounts({
        students: stArr.length,
        internships: intArr.length,
        reports: repArr.length,
        applications: appArr.length,
        certificates: docArr.length,
        opportunities: oppArr.length
      });
    } finally {
      if (!silent) setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadSummaryData(false);
    return subscribeToLiveSync(() => loadSummaryData(true), 8000);
  }, [loadSummaryData]);

  // Compute status distributions from actual database records
  const computeInternshipChart = () => {
    let active = 0, completed = 0, delayed = 0, notStarted = 0;
    rawRecords.internships.forEach((i: any) => {
      const st = String(i.status || '').toUpperCase();
      if (st === 'ACTIVE' || st === 'IN_PROGRESS') active++;
      else if (st === 'COMPLETED') completed++;
      else if (st === 'DELAYED' || st === 'TERMINATED') delayed++;
      else notStarted++;
    });
    if (active === 0 && completed === 0 && delayed === 0 && notStarted === 0) {
      if (counts.internships > 0) active = counts.internships;
    }
    return [
      { name: 'Active', value: active, color: '#2563eb' },
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Delayed', value: delayed, color: '#f59e0b' },
      { name: 'Not Started', value: notStarted, color: '#64748b' }
    ].filter(item => item.value > 0);
  };

  const computeReportChart = () => {
    let approved = 0, pending = 0, needsImprovement = 0;
    rawRecords.reports.forEach((r: any) => {
      const st = String(r.status || '').toUpperCase();
      if (st === 'APPROVED' || st === 'VERIFIED') approved++;
      else if (st === 'NEEDS_IMPROVEMENT' || st === 'REJECTED') needsImprovement++;
      else pending++;
    });
    return [
      { name: 'Approved', value: approved, color: '#10b981' },
      { name: 'Pending Review', value: pending, color: '#f59e0b' },
      { name: 'Needs Improvement', value: needsImprovement, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const computeOpportunityChart = () => {
    let published = 0, pending = 0, rejected = 0;
    rawRecords.opportunities.forEach((o: any) => {
      const st = String(o.status || '').toUpperCase();
      if (st === 'PUBLISHED' || st === 'APPROVED') published++;
      else if (st === 'REJECTED' || st === 'ARCHIVED') rejected++;
      else pending++;
    });
    return [
      { name: 'Published', value: published, color: '#10b981' },
      { name: 'Pending Approval', value: pending, color: '#f59e0b' },
      { name: 'Rejected', value: rejected, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const computeDocumentChart = () => {
    let verified = 0, pending = 0, rejected = 0;
    rawRecords.documents.forEach((d: any) => {
      const st = String(d.status || d.verification_status || '').toUpperCase();
      if (st === 'VERIFIED' || st === 'APPROVED') verified++;
      else if (st === 'REJECTED') rejected++;
      else pending++;
    });
    return [
      { name: 'Verified', value: verified, color: '#10b981' },
      { name: 'Pending Verification', value: pending, color: '#f59e0b' },
      { name: 'Rejected', value: rejected, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const internshipChartData = computeInternshipChart();
  const reportChartData = computeReportChart();
  const opportunityChartData = computeOpportunityChart();
  const documentChartData = computeDocumentChart();

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    setDownloadError(null);
    setDownloadSuccess(null);
    try {
      await exportAnalyticsToPDF({
        title: 'MITCORER IPTS Analytics & Institutional Report',
        scopeInfo: `Department: ${deptFilter} | Academic Year: ${yearFilter} | Status Filter: ${statusFilter}`,
        elementIdToCapture: 'analytics-pdf-container',
        metrics: [
          { label: 'Registered Students', value: counts.students || 0 },
          { label: 'Active Internships', value: counts.internships || 0 },
          { label: 'Weekly Reports', value: counts.reports || 0 },
          { label: 'Published Opportunities', value: counts.opportunities || 0 },
          { label: 'Verified Certificates', value: counts.certificates || 0 },
          { label: 'Student Applications', value: counts.applications || 0 }
        ],
        pieChartsData: [
          { title: 'Student Internship Status Breakdown', items: internshipChartData },
          { title: 'Weekly Progress Report Status Distribution', items: reportChartData },
          { title: 'Opportunity Catalog Status', items: opportunityChartData },
          { title: 'Document & Certificate Verification Status', items: documentChartData }
        ]
      });
      setDownloadSuccess('Official Analytics PDF report generated and downloaded.');
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to generate PDF report.');
    } finally {
      setIsPdfGenerating(false);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (deptFilter !== 'ALL') params.set('department', deptFilter);
    if (yearFilter !== 'ALL') params.set('academic_year', yearFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleExport = async (typeKey: string, format: 'csv' | 'html', label: string) => {
    const busyKey = `${typeKey}_${format}`;
    setIsExporting(busyKey);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const qs = buildQuery();
      if (format === 'html') {
        const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token') || '';
        const response = await fetch(`/api/analytics/export/${typeKey}/html/${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) {
          throw new Error('Failed to generate printable report from server.');
        }
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MITCORER_${typeKey}_Report_${new Date().toISOString().split('T')[0]}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadSuccess(`Official printable ${label} downloaded.`);
        return;
      }

      const token = localStorage.getItem('ipts_access_token') || localStorage.getItem('access_token');
      const response = await fetch(`/api/analytics/export/${typeKey}/csv/${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to generate CSV report from server.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MITCORER_${typeKey}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(`Official ${label} exported from live database records as CSV.`);
    } catch (err: any) {
      setDownloadError(err?.message || 'Export failed.');
    } finally {
      setIsExporting(null);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  const reportCards = [
    {
      key: 'students',
      btnLabel: 'Export Students CSV',
      title: 'All Registered Students & Lifecycle Report',
      subtitle: 'Complete student roster, CGPA, coordinator assignment, lifecycle stage & progress %.',
      icon: <FileSpreadsheet size={26} />,
      color: 'var(--primary)',
      bg: 'rgba(30, 58, 138, 0.1)'
    },
    {
      key: 'internships',
      btnLabel: 'Export Internships CSV',
      title: 'Active & Completed Internships Master File',
      subtitle: 'Host companies, supervisors, dates, approved reports, and completion status.',
      icon: <BarChart3 size={26} />,
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      key: 'opportunities',
      btnLabel: 'Export Opportunities CSV',
      title: 'Opportunities & Training Programs Catalog',
      subtitle: 'Published, pending, and archived internships and training programs.',
      icon: <FileText size={26} />,
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.1)'
    },
    {
      key: 'reports',
      btnLabel: 'Export Reports CSV',
      title: 'Weekly Progress Reports & Scores Audit',
      subtitle: 'All weekly progress submissions, coordinator scores, and feedback comments.',
      icon: <FileText size={26} />,
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)'
    },
    {
      key: 'applications',
      btnLabel: 'Export Applications CSV',
      title: 'Student Internship Applications Log',
      subtitle: 'All applications with Shortlisted, Selected, Rejected, and Changes Requested statuses.',
      icon: <Users size={26} />,
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.1)'
    },
    {
      key: 'certificates',
      btnLabel: 'Export Certificates CSV',
      title: 'Verified Student Certificates & QR Registry',
      subtitle: 'Submitted and verified completion certificates, offer letters, and QR keys.',
      icon: <Award size={26} />,
      color: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.1)'
    }
  ];

  return (
    <div className="portal-page" id="analytics-pdf-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Analytics &amp; Accredited Data Exports</h1>
          <p className="page-subtitle">
            Real-time status breakdown charts, downloadable PDF summaries, and official CSV spreadsheet exports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="APPROVED">Approved / Published</option>
            <option value="VERIFIED">Verified</option>
            <option value="SUBMITTED">Submitted / Pending</option>
          </select>

          <button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isPdfGenerating ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            Download Analytics PDF
          </button>

          <button
            onClick={() => loadSummaryData(false)}
            disabled={loadingStats}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loadingStats ? 'animate-spin' : ''} /> Refresh
          </button>
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

      {/* COLORFUL PIE CHARTS SECTION */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieIcon size={20} color="var(--primary)" /> Live Institutional Analytics &amp; Status Breakdown
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Chart 1: Internship Status */}
          <div className="card card-3d" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Student Internship Status
            </h3>
            {internshipChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active internship records found.
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={internshipChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={30}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {internshipChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Students`, 'Count']}
                      contentStyle={{ backgroundColor: 'var(--bg-card, #ffffff)', borderColor: 'var(--border, #cbd5e1)', borderRadius: '8px', color: 'var(--text-primary, #0f172a)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      itemStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Weekly Report Status */}
          <div className="card card-3d" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Weekly Report Status
            </h3>
            {reportChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No report submissions available.
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={30}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Reports`, 'Count']}
                      contentStyle={{ backgroundColor: 'var(--bg-card, #ffffff)', borderColor: 'var(--border, #cbd5e1)', borderRadius: '8px', color: 'var(--text-primary, #0f172a)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      itemStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}
                    />
                    <Legend />
                  </PieChart>

                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Opportunities Status */}
          <div className="card card-3d" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Opportunity Catalog Status
            </h3>
            {opportunityChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No opportunities listed.
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={opportunityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {opportunityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Opportunities`, 'Count']}
                      contentStyle={{ backgroundColor: 'var(--bg-card, #ffffff)', borderColor: 'var(--border, #cbd5e1)', borderRadius: '8px', color: 'var(--text-primary, #0f172a)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      itemStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 4: Verification Status */}
          <div className="card card-3d" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Document Verification
            </h3>
            {documentChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No document records.
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={documentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {documentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Documents`, 'Count']}
                      contentStyle={{ backgroundColor: 'var(--bg-card, #ffffff)', borderColor: 'var(--border, #cbd5e1)', borderRadius: '8px', color: 'var(--text-primary, #0f172a)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      itemStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--text-primary, #0f172a)', fontWeight: 700 }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV EXPORTS SECTION */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
        Accredited Database CSV &amp; Printable Exports
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {reportCards.map((item) => (
          <div key={item.key} className="card card-3d" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '12px', background: item.bg, color: item.color, borderRadius: '10px' }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{item.title}</h3>
                  </div>
                </div>
                {counts[item.key] !== undefined && (
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {counts[item.key]} Records
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {item.subtitle}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                onClick={() => handleExport(item.key, 'csv', item.title)}
                disabled={isExporting === `${item.key}_csv`}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
              >
                {isExporting === `${item.key}_csv` ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                {item.btnLabel}
              </button>
              <button
                onClick={() => handleExport(item.key, 'html', item.title)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
              >
                <Printer size={14} />
                Printable Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
