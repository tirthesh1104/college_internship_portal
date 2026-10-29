import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle2, Clock, AlertCircle, FileText,
  ArrowRight, Award, PlusCircle, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export const CoordinatorDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    assignedStudents: 0,
    pendingReports: 0,
    pendingApplications: 0,
    pendingDocuments: 0,
    activeInternships: 0,
    completionRequests: 0
  });

  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Load analytics overview metrics
      const analyticsData = await api.get<any>('/analytics/overview/');

      if (analyticsData?.role === 'COORDINATOR' && analyticsData?.metrics) {
        const metrics = analyticsData.metrics;
        setStats({
          assignedStudents: metrics.assigned_students_count || 0,
          pendingReports: metrics.pending_reports || 0,
          pendingApplications: metrics.pending_applications || 0,
          pendingDocuments: metrics.pending_document_verifications || 0,
          activeInternships: metrics.active_internships || 0,
          completionRequests: metrics.completion_approvals_pending || 0
        });
      }

      // Load pending reports for review
      const reportsData = await api.get<any[]>('/reports/');
      const reportsArray = Array.isArray(reportsData) ? reportsData : (reportsData as any)?.results || [];
      const submittedReports = reportsArray
        .filter((r: any) => r.status === 'SUBMITTED')
        .slice(0, 5)
        .map((r: any) => ({
          id: r.id,
          student_name: r.student?.name || 'Unknown',
          roll_no: r.student?.student_profile?.roll_number || 'N/A',
          company: r.internship?.organization_name || 'N/A',
          week: r.week_number,
          submitted_at: r.submission_timestamp || r.created_at,
          tasks_summary: r.tasks_summary || r.summary || 'No summary provided',
          status: r.status
        }));

      setPendingReports(submittedReports);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Coordinator Dashboard</h1>
          <p className="page-subtitle">Department of Computer Science & Engineering • Academic Year 2025-26</p>
          {lastUpdated && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
            title="Refresh dashboard data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <Link to="/coordinator/opportunities" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <PlusCircle size={16} />
            Post Internship Link
          </Link>
          <Link to="/coordinator/progress-reports" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <FileText size={16} />
            Review Weekly Reports
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
            onClick={loadDashboardData}
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
      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Assigned Students</p>
              <h3 className="stat-value">{stats.assignedStudents}</h3>
            </div>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#2563eb' }}>
              <Users size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Active in department cohort</p>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Reports To Review</p>
              <h3 className="stat-value" style={{ color: '#d97706' }}>{stats.pendingReports}</h3>
            </div>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
              <Clock size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '8px' }}>Action required within 48h</p>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Active Internships</p>
              <h3 className="stat-value">{stats.activeInternships}</h3>
            </div>
            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Ongoing across organizations</p>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Pending Verifications</p>
              <h3 className="stat-value">{stats.pendingDocuments}</h3>
            </div>
            <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '10px', color: '#7c3aed' }}>
              <Award size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Offer letters & certificates</p>
        </div>
      </div>

      {/* Main Grid: Pending Action Items */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Pending Weekly Reports Queue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Weekly Reports Awaiting Coordinator Review
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Verify tasks completed, learning outcomes, and score engineering evidence.
              </p>
            </div>
            <Link to="/coordinator/progress-reports" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              View All ({stats.pendingReports})
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingReports.length > 0 ? (
              pendingReports.map((report) => (
                <div key={report.id} style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '1rem', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        {report.student_name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({report.roll_no})</span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {report.company} • <strong>Week {report.week} Progress Report</strong>
                      </p>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                      Needs Review
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f3f4f6', margin: '0.5rem 0 0.75rem' }}>
                    "{report.tasks_summary}"
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Submitted on: {new Date(report.submitted_at).toLocaleDateString()}
                    </span>
                    <Link
                      to="/coordinator/progress-reports"
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                    >
                      Assess & Provide Feedback
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>All caught up!</p>
                <p>No weekly reports are currently pending review.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Coordinator Actions & Workload Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="#d97706" />
              Workload & Overdue Alerts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                <p style={{ fontSize: '0.825rem', fontWeight: 600, color: '#92400e', margin: 0 }}>2 Students with Overdue Reports</p>
                <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '2px 0 0' }}>Week 3 report missing for mechanical batch students.</p>
              </div>

              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                <p style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1e40af', margin: 0 }}>3 Opportunity Drafts in Review</p>
                <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: '2px 0 0' }}>Awaiting Admin approval before student publication.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Quick Workspaces</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/coordinator/students" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span>My Assigned Students</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/coordinator/opportunities" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span>Create Opportunity Draft</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/coordinator/skills" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span>Assess Technical Skills</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/coordinator/documents" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span>Verify Certificates & Offers</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
