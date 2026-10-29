import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, CheckSquare, FileCheck2,
  AlertCircle, Clock, Star,
  Send, Sparkles, Mic, FileText, Compass, Github, BookOpen, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api, subscribeToLiveSync } from '../../services/api';
import { AIMockInterviewSection } from '../../components/student/AIMockInterviewSection';
import { AIResumeAnalyzerSection } from '../../components/student/AIResumeAnalyzerSection';
import { AICareerRoadmapSection } from '../../components/student/AICareerRoadmapSection';
import { GitHubPortfolioSyncSection } from '../../components/student/GitHubPortfolioSyncSection';
import { AITechnicalQuizSection } from '../../components/student/AITechnicalQuizSection';
import { MyFeedbackSection } from '../../components/student/MyFeedbackSection';
import { CentralizedErrorBoundary } from '../../components/common/GlobalToastAndErrorBoundary';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [activeAITab, setActiveAITab] = useState<'INTERVIEW' | 'RESUME_ANALYZER' | 'ROADMAP' | 'GITHUB_SYNC' | 'QUIZ' | 'MY_FEEDBACK'>('INTERVIEW');

  const loadDashboard = useCallback(() => {
    api.get<any>('/analytics/overview/')
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    loadDashboard();
    return subscribeToLiveSync(loadDashboard, 8000);
  }, [loadDashboard]);

  const metrics = data?.metrics || {};

  // Deduplicate recent coordinator feedback entries so repeated items never appear
  const uniqueRecentFeedback = useMemo(() => {
    const raw: any[] = Array.isArray(data?.recent_feedback) ? data.recent_feedback : [];
    const seen = new Set<string>();
    return raw.filter((fb) => {
      const key = `${fb.id ?? ''}-${fb.week_number ?? ''}-${fb.comments ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.recent_feedback]);

  // Deduplicate upcoming opportunity deadlines by id and title+organization
  const uniqueUpcomingDeadlines = useMemo(() => {
    const raw: any[] = Array.isArray(data?.upcoming_deadlines) ? data.upcoming_deadlines : [];
    const seen = new Set<string>();
    return raw.filter((opp) => {
      const key = `${opp.title || ''}::${opp.organization || ''}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.upcoming_deadlines]);

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
            Track your weekly internship progress, coordinator assessments, and AI career preparation tools.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveAITab('INTERVIEW')}
            className={`btn ${activeAITab === 'INTERVIEW' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mic size={16} /> AI Mock Interview
          </button>
          <button
            type="button"
            onClick={() => setActiveAITab('RESUME_ANALYZER')}
            className={`btn ${activeAITab === 'RESUME_ANALYZER' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} /> AI Resume Analyzer
          </button>
          <Link to="/student/feedback" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} color="#059669" /> My Feedback
          </Link>
          <Link to="/student/ai-assistant" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="#7c3aed" /> 10-in-1 AI Career Suite
          </Link>
          <Link to="/student/reports" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCheck2 size={16} color="#2563eb" /> Progress Reports
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid — Real Data */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
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

      {/* Interactive AI Career Tools Hub Section */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#7c3aed" /> Student AI Features Hub
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveAITab('INTERVIEW')}
              className={`btn btn-sm ${activeAITab === 'INTERVIEW' ? 'btn-primary' : 'btn-outline'}`}
              style={activeAITab === 'INTERVIEW' ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' } : {}}
            >
              <Mic size={14} style={{ marginRight: '4px' }} /> AI Mock Interviewer
            </button>
            <button
              type="button"
              onClick={() => setActiveAITab('RESUME_ANALYZER')}
              className={`btn btn-sm ${activeAITab === 'RESUME_ANALYZER' ? 'btn-primary' : 'btn-outline'}`}
            >
              <FileText size={14} style={{ marginRight: '4px' }} /> AI Resume & ATS
            </button>
            <button
              type="button"
              onClick={() => setActiveAITab('MY_FEEDBACK')}
              className={`btn btn-sm ${activeAITab === 'MY_FEEDBACK' ? 'btn-primary' : 'btn-outline'}`}
              style={activeAITab === 'MY_FEEDBACK' ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
            >
              <MessageSquare size={14} style={{ marginRight: '4px' }} /> My Feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveAITab('ROADMAP')}
              className={`btn btn-sm ${activeAITab === 'ROADMAP' ? 'btn-primary' : 'btn-outline'}`}
            >
              <Compass size={14} style={{ marginRight: '4px' }} /> 30-60-90 Roadmap
            </button>
            <button
              type="button"
              onClick={() => setActiveAITab('GITHUB_SYNC')}
              className={`btn btn-sm ${activeAITab === 'GITHUB_SYNC' ? 'btn-primary' : 'btn-outline'}`}
            >
              <Github size={14} style={{ marginRight: '4px' }} /> GitHub Portfolio
            </button>
            <button
              type="button"
              onClick={() => setActiveAITab('QUIZ')}
              className={`btn btn-sm ${activeAITab === 'QUIZ' ? 'btn-primary' : 'btn-outline'}`}
            >
              <BookOpen size={14} style={{ marginRight: '4px' }} /> Technical Quiz
            </button>
          </div>
        </div>

        <CentralizedErrorBoundary key={activeAITab}>
          {activeAITab === 'INTERVIEW' && <AIMockInterviewSection />}
          {activeAITab === 'RESUME_ANALYZER' && <AIResumeAnalyzerSection />}
          {activeAITab === 'MY_FEEDBACK' && <MyFeedbackSection />}
          {activeAITab === 'ROADMAP' && <AICareerRoadmapSection />}
          {activeAITab === 'GITHUB_SYNC' && <GitHubPortfolioSyncSection />}
          {activeAITab === 'QUIZ' && <AITechnicalQuizSection />}
        </CentralizedErrorBoundary>
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

      {/* Two Column Layout: Recent Coordinator Feedback + Upcoming Opportunity Deadlines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {/* Recent Coordinator Feedback */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} color="#eab308" /> Recent Coordinator Feedback
            </h3>
            <Link to="/student/reports" style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
              View All
            </Link>
          </div>

          {uniqueRecentFeedback.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {uniqueRecentFeedback.map((fb: any) => (
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

        {/* Upcoming Opportunity Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2563eb" /> Upcoming Opportunity Deadlines
            </h3>
            <Link to="/student/opportunities" style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>
              Browse
            </Link>
          </div>

          {uniqueUpcomingDeadlines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {uniqueUpcomingDeadlines.map((opp: any) => (
                <div key={opp.id} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                      {opp.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {opp.organization} • {opp.mode}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: 600 }}>
                      Due: {opp.deadline}
                    </div>
                    <Link to="/student/opportunities" style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>
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
