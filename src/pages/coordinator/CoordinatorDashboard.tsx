import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle2, Clock, AlertCircle, FileText,
  ArrowRight, Award, PlusCircle, RefreshCw, Download, PieChart as PieIcon, MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { api, subscribeToLiveSync } from '../../services/api';
import { exportAnalyticsToPDF } from '../../services/pdfExporter';
import { FeedbackAnalyticsPanel } from '../../components/admin/FeedbackAnalyticsPanel';

export const CoordinatorDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    assignedStudents: 0,
    totalStudents: 0,
    pendingReports: 0,
    pendingApplications: 0,
    pendingDocuments: 0,
    activeInternships: 0,
    completionRequests: 0,
    overdueReports: 0,
    opportunityDraftsAwaitingApproval: 0
  });

  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const [analyticsData, reportsData, oppsData, studentsData] = await Promise.all([
        api.get<any>('/analytics/overview/'),
        api.get<any[]>('/reports/').catch(() => []),
        api.get<any[]>('/opportunities/').catch(() => []),
        api.get<any[]>('/reports/staff-students-list/').catch(() => [])
      ]);

      const reportsArray = Array.isArray(reportsData) ? reportsData : (reportsData as any)?.results || [];
      const oppsArray = Array.isArray(oppsData) ? oppsData : (oppsData as any)?.results || [];
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.results || [];

      if (analyticsData?.metrics) {
        const metrics = analyticsData.metrics;
        const draftsCount = metrics.opportunity_drafts_awaiting_approval !== undefined
          ? metrics.opportunity_drafts_awaiting_approval
          : oppsArray.filter((o: any) => o.status === 'PENDING_APPROVAL' || o.status === 'DRAFT').length;
        const overdueCount = metrics.overdue_reports !== undefined
          ? metrics.overdue_reports
          : reportsArray.filter((r: any) => r.status === 'NEEDS_IMPROVEMENT' || r.status === 'REJECTED').length;

        const actualAssigned = studentsArray.length > 0
          ? studentsArray.length
          : (metrics.assigned_students_count ?? metrics.total_students ?? 0);

        setStats({
          assignedStudents: actualAssigned,
          totalStudents: metrics.total_students ?? actualAssigned,
          pendingReports: metrics.pending_reports ?? 0,
          pendingApplications: metrics.pending_applications ?? 0,
          pendingDocuments: metrics.pending_document_verifications ?? 0,
          activeInternships: metrics.active_internships ?? 0,
          completionRequests: metrics.completion_approvals_pending ?? 0,
          overdueReports: overdueCount,
          opportunityDraftsAwaitingApproval: draftsCount
        });
      }

      const submittedReports = reportsArray
        .filter((r: any) => r.status === 'SUBMITTED')
        .slice(0, 5)
        .map((r: any) => ({
          id: r.id,
          student_id: r.student_id || r.student,
          student_name: r.student_name || r.student?.name || 'Unknown Student',
          roll_no: r.roll_number || r.student?.student_profile?.roll_number || 'N/A',
          company: r.company || r.organization_name || r.internship?.organization_name || 'N/A',
          week: r.week_number,
          submitted_at: r.submitted_at || r.submission_timestamp || r.created_at,
          tasks_summary: r.tasks_completed || r.tasks_summary || r.summary || 'No summary provided',
          status: r.status
        }));

      setPendingReports(submittedReports);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(false);
    return subscribeToLiveSync(() => loadDashboardData(true), 8000);
  }, [loadDashboardData]);

  // Chart datasets for Coordinator Authorized Scope
  const studentStatusChart = [
    { name: 'Active Internships', value: stats.activeInternships || 0, color: '#2563eb' },
    { name: 'Assigned / Unplaced', value: Math.max(0, stats.assignedStudents - stats.activeInternships), color: '#64748b' }
  ].filter(i => i.value > 0);

  const reportStatusChart = [
    { name: 'Pending Review', value: stats.pendingReports || 0, color: '#f59e0b' },
    { name: 'Needs Revision / Overdue', value: stats.overdueReports || 0, color: '#ef4444' },
    { name: 'Approved / Completed', value: Math.max(1, (stats.assignedStudents * 2) - stats.pendingReports), color: '#10b981' }
  ].filter(i => i.value > 0);

  const documentChart = [
    { name: 'Pending Verification', value: stats.pendingDocuments || 0, color: '#f59e0b' },
    { name: 'Verified', value: Math.max(1, stats.activeInternships), color: '#10b981' }
  ].filter(i => i.value > 0);

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      await exportAnalyticsToPDF({
        title: 'Coordinator Department Analytics & Supervision Report',
        scopeInfo: 'Department of Computer Science & Engineering | Academic Year 2026-27',
        elementIdToCapture: 'coordinator-dashboard-container',
        metrics: [
          { label: 'Assigned Students', value: stats.assignedStudents },
          { label: 'Reports To Review', value: stats.pendingReports },
          { label: 'Active Internships', value: stats.activeInternships },
          { label: 'Pending Verifications', value: stats.pendingDocuments },
          { label: 'Overdue Reports', value: stats.overdueReports },
          { label: 'Opportunity Drafts Pending Approval', value: stats.opportunityDraftsAwaitingApproval }
        ],
        pieChartsData: [
          { title: 'Authorized Cohort Internship Placement', items: studentStatusChart },
          { title: 'Weekly Reports Review & Improvement Breakdown', items: reportStatusChart },
          { title: 'Document & Certificate Verification Status', items: documentChart }
        ]
      });
    } catch (err) {
      console.error('Failed to export coordinator PDF:', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="portal-page" id="coordinator-dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Coordinator Dashboard</h1>
          <p className="page-subtitle">Department of Computer Science &amp; Engineering • Academic Year 2026-27</p>
          {lastUpdated && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          >
            {isPdfGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Download Analytics PDF
          </button>
          <button
            onClick={() => loadDashboardData(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
            title="Refresh dashboard data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <Link to="/coordinator/opportunities?action=create" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <PlusCircle size={16} />
            Post Internship Link
          </Link>
          <Link to="/coordinator/reports" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <FileText size={16} />
            Review Weekly Reports ({stats.pendingReports})
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex',
          alignItems: 'center', gap: '8px', marginBottom: '20px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button
            onClick={() => loadDashboardData(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* KPI Stats Cards (All 6 Required Metrics) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card stat-card card-3d">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Assigned Students</p>
                  <h3 className="stat-value">{stats.assignedStudents}</h3>
                </div>
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#2563eb' }}>
                  <Users size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Cohort Total: {stats.totalStudents}</p>
                <Link to="/coordinator/students" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>View All</Link>
              </div>
            </div>

            <div className="card stat-card card-3d" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Reports To Review</p>
                  <h3 className="stat-value" style={{ color: '#d97706' }}>{stats.pendingReports}</h3>
                </div>
                <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
                  <Clock size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#d97706', margin: 0 }}>Action required within 48h</p>
                <Link to="/coordinator/reports?status=SUBMITTED" style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>View All</Link>
              </div>
            </div>

            <div className="card stat-card card-3d">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Active Internships</p>
                  <h3 className="stat-value">{stats.activeInternships}</h3>
                </div>
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Ongoing across organizations</p>
                <Link to="/coordinator/completions" style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>View All</Link>
              </div>
            </div>

            <div className="card stat-card card-3d">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Pending Verifications</p>
                  <h3 className="stat-value">{stats.pendingDocuments}</h3>
                </div>
                <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '10px', color: '#7c3aed' }}>
                  <Award size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Offer letters &amp; certificates</p>
                <Link to="/coordinator/documents?status=SUBMITTED" style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>View All</Link>
              </div>
            </div>

            <div className="card stat-card card-3d" style={{ borderLeft: stats.overdueReports > 0 ? '4px solid #dc2626' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Overdue Reports</p>
                  <h3 className="stat-value" style={{ color: stats.overdueReports > 0 ? '#dc2626' : undefined }}>{stats.overdueReports}</h3>
                </div>
                <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '10px', color: '#dc2626' }}>
                  <AlertCircle size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Needs revision / delayed</p>
                <Link to="/coordinator/reports?status=NEEDS_IMPROVEMENT" style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>View All</Link>
              </div>
            </div>

            <div className="card stat-card card-3d">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label">Opportunity Drafts Awaiting Approval</p>
                  <h3 className="stat-value">{stats.opportunityDraftsAwaitingApproval}</h3>
                </div>
                <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '10px', color: '#0284c7' }}>
                  <FileText size={24} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Draft &amp; pending approval</p>
                <Link to="/coordinator/opportunities?status=PENDING_APPROVAL" style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>View All</Link>
              </div>
            </div>
          </div>

          {/* COLORFUL PIE CHARTS SECTION FOR COORDINATOR */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieIcon size={20} color="var(--primary)" /> Department Supervision Analytics
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="card card-3d">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem' }}>
                  Cohort Placement Breakdown
                </h3>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={studentStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={3}>
                        {studentStatusChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val} Students`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card card-3d">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem' }}>
                  Weekly Report Review Status
                </h3>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={3}>
                        {reportStatusChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val} Reports`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card card-3d">
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem' }}>
                  Certificate Verification
                </h3>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={documentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={3}>
                        {documentChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val} Documents`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Pending Action Items */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
            {/* Pending Weekly Reports Queue */}
            <div className="card card-3d">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    Weekly Reports Awaiting Coordinator Review
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Verify tasks completed, learning outcomes, and score engineering evidence.
                  </p>
                </div>
                <Link to="/coordinator/reports" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  View All ({stats.pendingReports})
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingReports.length > 0 ? (
                  pendingReports.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {report.student_name}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                            {report.roll_no}
                          </span>
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                            Week {report.week}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          Company: <strong style={{ color: 'var(--text-main)' }}>{report.company}</strong>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, fontStyle: 'italic' }}>
                          "{report.tasks_summary}"
                        </p>
                      </div>
                      <Link
                        to={`/coordinator/reports?reviewId=${report.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        Review &amp; Grade <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No pending weekly reports awaiting review.
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Analytics Recharts Panel */}
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', marginBottom: '1rem' }}>
              <FeedbackAnalyticsPanel />
            </div>

            {/* Quick Actions & Links */}
            <div className="card card-3d">
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
                Management Shortcuts
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link to="/coordinator/feedback" className="btn btn-outline" style={{ justifyContent: 'flex-start', color: '#2563eb' }}>
                  <MessageSquare size={16} style={{ marginRight: '8px' }} />
                  Feedback &amp; Support Analytics Hub
                </Link>
                <Link to="/coordinator/students" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <Users size={16} style={{ marginRight: '8px' }} />
                  View Assigned Student Roster
                </Link>
                <Link to="/coordinator/reports" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <FileText size={16} style={{ marginRight: '8px' }} />
                  Review Progress Submissions
                </Link>
                <Link to="/coordinator/opportunities" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <PlusCircle size={16} style={{ marginRight: '8px' }} />
                  Manage Internship Links
                </Link>
                <Link to="/coordinator/analytics" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <PieIcon size={16} style={{ marginRight: '8px' }} />
                  View Department Analytics
                </Link>
                <Link to="/coordinator/export" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Export Department Spreadsheets
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CoordinatorDashboard;
