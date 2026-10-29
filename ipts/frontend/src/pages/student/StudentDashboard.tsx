import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, CheckSquare, FileCheck2,
  AlertCircle, Clock, Star, Award,
  Send, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get<any>('/analytics/overview/')
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, []);

  const metrics = data?.metrics || {};

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '28px 32px', marginBottom: '28px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
            Student Portal • Academic Year {user?.student_profile?.academic_year || '2026-2027'}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Track your weekly internship progress, coordinator assessments, and verified credentials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/student/reports" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCheck2 size={16} /> Submit Progress Report
          </Link>
          <Link to="/student/resume" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} color="#2563eb" /> Smart Resume &amp; Matcher
          </Link>
          <Link to="/student/career-passport" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#2563eb" /> Career Passport
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid — Real MySQL Data */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Send size={24} />
          </div>
          <div>
            <div className="stat-value">{metrics.total_applications ?? 0}</div>
            <div className="stat-label">Applications Submitted</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div className="stat-value">{metrics.active_internships ?? 0}</div>
            <div className="stat-label">Active Internships</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="stat-value">{metrics.task_completion_rate ?? 100}%</div>
            <div className="stat-label">Task Completion Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="stat-value">{metrics.verified_documents ?? 0}</div>
            <div className="stat-label">Verified Credentials</div>
          </div>
        </div>
      </div>

      {/* Pending Weekly Reports Alert */}
      {metrics.pending_reports > 0 && (
        <div style={{
          backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                You have {metrics.pending_reports} weekly progress report(s) needing attention
              </div>
              <div style={{ fontSize: '12.5px', color: '#b45309' }}>
                Save drafts or update requested revisions to maintain your consistency streak.
              </div>
            </div>
          </div>
          <Link to="/student/reports" className="btn btn-secondary btn-sm" style={{ borderColor: '#d97706', color: '#92400e' }}>
            Open Reports &rarr;
          </Link>
        </div>
      )}

      {/* Two Column Layout: Recent Feedback + Upcoming Deadlines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {/* Recent Feedback */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} color="#eab308" /> Recent Coordinator Feedback
            </h3>
            <Link to="/student/reports" style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
              View All
            </Link>
          </div>

          {data?.recent_feedback?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.recent_feedback.map((fb: any) => (
                <div key={fb.id} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      Week {fb.week_number} Review
                    </span>
                    <span className="badge badge-approved">
                      Score: {fb.score}/100
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, marginBottom: '6px' }}>
                    "{fb.comments}"
                  </p>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Reviewed by {fb.reviewer_name} • {fb.date}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '13.5px' }}>
              No review feedback recorded yet. Submit your weekly report to receive assessment.
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2563eb" /> Upcoming Opportunity Deadlines
            </h3>
            <Link to="/student/opportunities" style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
              Browse
            </Link>
          </div>

          {data?.upcoming_deadlines?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.upcoming_deadlines.map((opp: any) => (
                <div key={opp.id} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                      {opp.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {opp.organization} • {opp.mode}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: 600 }}>
                      Due: {opp.deadline}
                    </div>
                    <Link to={`/student/opportunities`} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>
                      Apply Now &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '13.5px' }}>
              No immediate closing deadlines found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
