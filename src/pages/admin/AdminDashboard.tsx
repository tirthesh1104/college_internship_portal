import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserCheck, Briefcase, FileText, CheckCircle2, 
  Clock, ShieldAlert, BarChart3, TrendingUp, RefreshCw, Download, PieChart as PieIcon, MessageSquare
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend 
} from 'recharts';
import { Link } from 'react-router-dom';
import { api, subscribeToLiveSync } from '../../services/api';
import { exportAnalyticsToPDF } from '../../services/pdfExporter';
import { FeedbackAnalyticsPanel } from '../../components/admin/FeedbackAnalyticsPanel';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeInternships: 0,
    pendingOpportunities: 0,
    pendingReportsReview: 0,
    verifiedCertificates: 0,
    coordinatorsActive: 1
  });

  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [deptList, setDeptList] = useState<any[]>([
    { code: 'CSE', name: 'Computer Science & Engineering', student_count: 0, coordinator_name: 'Tirthesh Gutte', has_coordinator: true },
    { code: 'E&TC', name: 'Electronics & Telecommunication', student_count: 0, coordinator_name: 'Unassigned', has_coordinator: false },
    { code: 'MECH', name: 'Mechanical Engineering', student_count: 0, coordinator_name: 'Unassigned', has_coordinator: false },
    { code: 'CIVIL', name: 'Civil Engineering', student_count: 0, coordinator_name: 'Unassigned', has_coordinator: false }
  ]);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data: any = await api.get('/analytics/overview/');
      const m = data?.metrics || {};
      setStats({
        totalStudents: m.total_students ?? 0,
        activeInternships: m.active_internships ?? 0,
        pendingOpportunities: m.pending_opportunity_approvals ?? 0,
        pendingReportsReview: m.pending_reports ?? 0,
        verifiedCertificates: m.verified_documents ?? 0,
        coordinatorsActive: m.total_coordinators ?? 1
      });
      if (Array.isArray(data?.department_distribution) && data.department_distribution.length > 0) {
        setDeptList(data.department_distribution);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
    return subscribeToLiveSync(() => fetchStats(true), 8000);
  }, [fetchStats]);

  // Real-data Pie Chart distributions for Admin Institution Overview
  const departmentChartData = deptList.map((d, i) => {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
    return {
      name: d.code || d.name,
      value: d.student_count || 0,
      color: colors[i % colors.length]
    };
  }).filter(item => item.value > 0);

  const statusBreakdownData = [
    { name: 'Active Internships', value: stats.activeInternships || 0, color: '#2563eb' },
    { name: 'Pending Review', value: stats.pendingReportsReview || 0, color: '#f59e0b' },
    { name: 'Verified Certificates', value: stats.verifiedCertificates || 0, color: '#10b981' },
    { name: 'Pending Opp Approvals', value: stats.pendingOpportunities || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      await exportAnalyticsToPDF({
        title: 'MITCORER Central Administration Institutional Analytics Report',
        scopeInfo: 'Scope: Institution-wide All Departments (CSE, E&TC, MECH, CIVIL)',
        elementIdToCapture: 'admin-dashboard-container',
        metrics: [
          { label: 'Enrolled Students', value: stats.totalStudents },
          { label: 'Active Internships', value: stats.activeInternships },
          { label: 'Pending Opportunities', value: stats.pendingOpportunities },
          { label: 'Pending Weekly Reports', value: stats.pendingReportsReview },
          { label: 'Verified Certificates', value: stats.verifiedCertificates },
          { label: 'Active Coordinators', value: stats.coordinatorsActive }
        ],
        pieChartsData: [
          { title: 'Department Student Enrollment Distribution', items: departmentChartData.length > 0 ? departmentChartData : [{ name: 'CSE', value: stats.totalStudents || 1, color: '#2563eb' }] },
          { title: 'Institutional Lifecycle Status Distribution', items: statusBreakdownData.length > 0 ? statusBreakdownData : [{ name: 'Active Internships', value: stats.activeInternships || 1, color: '#2563eb' }] }
        ]
      });
    } catch (err) {
      console.error('Failed to generate admin PDF:', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="portal-page" id="admin-dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">MITCORER Central Administration</h1>
          <p className="page-subtitle">Institute Oversight • Department Analytics • Opportunity Approvals &amp; Audit Integrity</p>
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
            onClick={() => fetchStats(false)} 
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/admin/opportunities" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} />
            Review Opportunities ({stats.pendingOpportunities})
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card stat-card card-3d">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Enrolled Students</p>
              <h3 className="stat-value">{stats.totalStudents}</h3>
            </div>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#2563eb' }}>
              <Users size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Real registered students</p>
        </div>

        <div className="card stat-card card-3d" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Active Internships</p>
              <h3 className="stat-value" style={{ color: '#6d28d9' }}>{stats.activeInternships}</h3>
            </div>
            <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '10px', color: '#7c3aed' }}>
              <Briefcase size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6d28d9', marginTop: '8px' }}>Tracking in live database</p>
        </div>

        <div className="card stat-card card-3d" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Pending Approval</p>
              <h3 className="stat-value" style={{ color: '#d97706' }}>{stats.pendingOpportunities}</h3>
            </div>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#d97706' }}>
              <Clock size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '8px' }}>Coordinator submitted links</p>
        </div>

        <div className="card stat-card card-3d">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Verified Documents</p>
              <h3 className="stat-value">{stats.verifiedCertificates}</h3>
            </div>
            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>With official QR verification</p>
        </div>
      </div>

      {/* INSTITUTIONAL ANALYTICS PIE CHARTS */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieIcon size={20} color="var(--primary)" /> Institutional Distribution Analytics
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Chart 1: Department Enrollment Distribution */}
          <div className="card card-3d">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Department Student Distribution
            </h3>
            {departmentChartData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                All enrolled students currently in primary department.
              </div>
            ) : (
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {departmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Students`, 'Enrolled']}
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

          {/* Chart 2: Institutional Status Breakdown */}
          <div className="card card-3d">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Institutional Lifecycle Breakdown
            </h3>
            {statusBreakdownData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active metrics to break down.
              </div>
            ) : (
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {statusBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} Items`, 'Count']}
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

      {/* Main Grid: Management Workspaces */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Department Overview Table */}
        <div className="card card-3d">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Departmental Internship Metrics
          </h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Students</th>
                  <th>Assigned Coordinator</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deptList.map((dept) => {
                  const fullDeptName =
                    dept.name ||
                    (dept.code === 'CSE'
                      ? 'Computer Science & Engineering'
                      : dept.code === 'E&TC'
                        ? 'Electronics & Telecommunication'
                        : dept.code === 'MECH'
                          ? 'Mechanical Engineering'
                          : 'Civil Engineering');
                  const isActive = (dept.student_count ?? 0) > 0 || dept.has_coordinator;
                  return (
                    <tr key={dept.code}>
                      <td style={{ fontWeight: 600 }}>{fullDeptName} ({dept.code})</td>
                      <td style={{ fontWeight: 700 }}>{dept.student_count ?? 0}</td>
                      <td>{dept.coordinator_name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {isActive ? 'ACTIVE' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback Analytics Recharts Panel */}
        <div style={{ gridColumn: '1 / -1', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <FeedbackAnalyticsPanel />
        </div>

        {/* Quick Admin Actions */}
        <div className="card card-3d">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Administrative Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/admin/feedback" className="btn btn-outline" style={{ justifyContent: 'flex-start', color: '#2563eb' }}>
              <MessageSquare size={16} style={{ marginRight: '8px' }} />
              Feedback &amp; Support Analytics Hub
            </Link>
            <Link to="/admin/students" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <Users size={16} style={{ marginRight: '8px' }} />
              View Registered Students List
            </Link>
            <Link to="/admin/coordinators" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <UserCheck size={16} style={{ marginRight: '8px' }} />
              Manage Department Coordinators
            </Link>
            <Link to="/admin/internships" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <Briefcase size={16} style={{ marginRight: '8px' }} />
              Track Internship Lifecycles
            </Link>
            <Link to="/admin/overview" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <BarChart3 size={16} style={{ marginRight: '8px' }} />
              View Institutional Charts &amp; Analytics
            </Link>
            <Link to="/admin/analytics" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              Export Accreditation Reports (CSV &amp; PDF)
            </Link>
            <Link to="/admin/audit-logs" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <ShieldAlert size={16} style={{ marginRight: '8px' }} />
              Security &amp; Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
