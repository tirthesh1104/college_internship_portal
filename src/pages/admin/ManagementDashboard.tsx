import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Briefcase, FileText, CheckCircle2,
  Clock, ShieldAlert, PlusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, subscribeToLiveSync } from '../../services/api';

export const ManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeInternships: 0,
    pendingOpportunities: 0,
    pendingReportsReview: 0,
  });

  const loadMetrics = useCallback(() => {
    Promise.all([
      api.get<any[]>('/students/profiles/').catch(() => []),
      api.get<any[]>('/opportunities/').catch(() => []),
      api.get<any[]>('/internships/').catch(() => []),
      api.get<any>('/analytics/overview/').catch(() => null)
    ]).then(([profiles, opps, internships, overview]) => {
      const studentList = Array.isArray(profiles) ? profiles : (profiles as any)?.results || [];
      const oppList = Array.isArray(opps) ? opps : (opps as any)?.results || [];
      const internList = Array.isArray(internships) ? internships : (internships as any)?.results || [];
      const m = overview?.metrics || {};

      setStats({
        totalStudents: studentList.length || m.total_students || 0,
        activeInternships: internList.filter((i: any) => i.status === 'ACTIVE').length || m.active_internships || 0,
        pendingOpportunities: oppList.filter((o: any) => o.status === 'PENDING_APPROVAL').length || m.pending_opportunity_approvals || 0,
        pendingReportsReview: m.pending_reports || 0
      });
    });
  }, []);

  useEffect(() => {
    loadMetrics();
    return subscribeToLiveSync(loadMetrics, 8000);
  }, [loadMetrics]);

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Institutional Management & Oversight' : 'Coordinator Department Workspace'}
          </h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Institute-wide Administrative Center • Student Roster • Opportunity Approvals & Audit Integrity' 
              : 'Department of Computer Science & Engineering • Academic Cohort Supervision & Report Reviews'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/management/opportunities" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <PlusCircle size={16} />
            Post Opportunity / Link
          </Link>
          <Link to="/management/reports" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <FileText size={16} />
            Review Weekly Reports
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Registered Students</p>
              <h3 className="stat-value">{stats.totalStudents}</h3>
            </div>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#2563eb' }}>
              <Users size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Active in MySQL database
          </p>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Active Internships</p>
              <h3 className="stat-value" style={{ color: '#059669' }}>{stats.activeInternships}</h3>
            </div>
            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
              <Briefcase size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Ongoing across partner organizations
          </p>
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
          <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '8px' }}>
            Opportunities in review queue
          </p>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-label">Database Engine</p>
              <h3 className="stat-value" style={{ fontSize: '1.25rem', color: '#2563eb' }}>MySQL 8.0</h3>
            </div>
            <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '10px', color: '#7c3aed' }}>
              <ShieldAlert size={24} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            InnoDB utf8mb4 Transactional
          </p>
        </div>
      </div>

      {/* Main Grid: Management Shortcuts & Workflows */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Shared Management Hub Workspaces
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Link to="/management/students" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Registered Students</span>
                <Users size={16} color="var(--primary)" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                View real student registrations, manage PRNs, and inspect enrolled engineering profiles.
              </p>
            </Link>

            <Link to="/management/opportunities" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Opportunities & Links</span>
                <PlusCircle size={16} color="#059669" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Post corporate internship links, review pending coordinator submissions, and manage publications.
              </p>
            </Link>

            <Link to="/management/reports" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Weekly Progress Reports</span>
                <FileText size={16} color="#d97706" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Evaluate student weekly reports, verify engineering evidence links, and submit scores out of 10.
              </p>
            </Link>

            <Link to="/management/documents" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Document Verification</span>
                <CheckCircle2 size={16} color="#7c3aed" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Inspect student offer letters and completion certificates, and issue QR verification badges.
              </p>
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Institutional Role & Context</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Signed In User:</span>
                <span style={{ fontWeight: 600 }}>{user?.name || 'Administrator'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Authorization Scope:</span>
                <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-published'}`}>
                  {isAdmin ? 'ADMIN (Global Oversight)' : 'COORDINATOR (Department Scoped)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Institution:</span>
                <span style={{ fontWeight: 500 }}>MITCORER Barshi</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: '#f8fafc' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} color="#059669" />
              Shared Opportunity System
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              All opportunities are stored in one centralized MySQL table. Published opportunities appear automatically on the shared Student Opportunities catalog.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
