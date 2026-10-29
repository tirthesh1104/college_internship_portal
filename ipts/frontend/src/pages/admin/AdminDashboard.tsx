import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserCheck, Briefcase, FileText, CheckCircle2, 
  Clock, ShieldAlert, BarChart3, ArrowUpRight, TrendingUp, RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

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
  const [deptList, setDeptList] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
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
      setDeptList(data?.department_distribution || [
        { code: 'CSE', student_count: m.total_students ?? 0 }
      ]);
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">MITCORER Central Administration</h1>
          <p className="page-subtitle">Institute Oversight • Department Analytics • Opportunity Approvals & Audit Integrity</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={fetchStats} 
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/admin/opportunities" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} />
            Review Opportunities ({stats.pendingOpportunities})
          </Link>
          <Link to="/admin/overview" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <BarChart3 size={16} />
            Overview & Charts
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card stat-card">
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

        <div className="card stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
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

        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
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

        <div className="card stat-card">
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

      {/* Main Grid: Management Workspaces */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Department Overview Table */}
        <div className="card">
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
                <tr>
                  <td style={{ fontWeight: 600 }}>Computer Science & Engineering (CSE)</td>
                  <td>{stats.totalStudents}</td>
                  <td>Tirthesh Gutte</td>
                  <td><span className="badge badge-success">ACTIVE</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Electronics & Telecommunication (E&TC)</td>
                  <td>0</td>
                  <td>Department Faculty</td>
                  <td><span className="badge badge-neutral">PENDING</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Mechanical Engineering (MECH)</td>
                  <td>0</td>
                  <td>Department Faculty</td>
                  <td><span className="badge badge-neutral">PENDING</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Civil Engineering (CIVIL)</td>
                  <td>0</td>
                  <td>Department Faculty</td>
                  <td><span className="badge badge-neutral">PENDING</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Administrative Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              View Institutional Charts & Analytics
            </Link>
            <Link to="/admin/export" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              Export Accreditation Reports (CSV)
            </Link>
            <Link to="/admin/audit-logs" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <ShieldAlert size={16} style={{ marginRight: '8px' }} />
              Security & Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
