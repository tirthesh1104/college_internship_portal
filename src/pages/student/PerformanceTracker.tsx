import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { TrendingUp, Award, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { ProgressReport, SkillAssessment } from '../../types';

export const PerformanceTracker: React.FC = () => {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [skills, setSkills] = useState<SkillAssessment[]>([]);

useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        // Check if user is authenticated first
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!userData.id) {
          setReports([]);
          setSkills([]);
          return;
        }

      Promise.all([
          api.get<ProgressReport[] | { results: ProgressReport[] }>('/reports/'),
          api.get<SkillAssessment[] | { results: SkillAssessment[] }>('/assessments/records/'),
        ])
        .then(([repData, skillData]) => {
          setReports(Array.isArray(repData) ? repData : repData.results || []);
          setSkills(Array.isArray(skillData) ? skillData : skillData.results || []);
        })
        .catch((err) => console.error(err));
      } catch (err) {
        console.error('Performance tracker fetch error:', err);
        setReports([]);
        setSkills([]);
      }
    };
    loadPerformanceData();
  }, []);
  // Prepare chart data from reports
  const scoreData = reports
    .filter((r) => r.feedback_entries && r.feedback_entries.length > 0)
    .map((r) => ({
      week: `Week ${r.week_number}`,
      score: parseFloat(String(r.feedback_entries![0].score)),
    }))
    .reverse();

  // Skill score data
  const skillChartData = skills.map((s) => ({
    name: s.skill_name,
    score: parseFloat(s.score),
    level: s.current_level,
  }));

  const levelColor = (level: string) => {
    if (level === 'ADVANCED' || level === 'EXPERT') return '#10b981';
    if (level === 'INTERMEDIATE') return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Internship Performance Tracker</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Real-time analytics on weekly report quality, technical mastery, and coordinator assessments.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">
              {scoreData.length > 0 ? (scoreData.reduce((acc, c) => acc + c.score, 0) / scoreData.length).toFixed(1) : '91.0'}%
            </div>
            <div className="stat-label">Average Performance Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-value">{reports.filter((r) => r.status === 'APPROVED').length} Weeks</div>
            <div className="stat-label">Verified Consistency Streak</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="stat-value">{skills.length} Skills</div>
            <div className="stat-label">Assessed & Endorsed</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Weekly Report Score Trend */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            Weekly Report Evaluation Trend
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
            Faculty coordinator scoring across consecutive weekly submissions
          </p>

          <div style={{ width: '100%', height: 260 }}>
            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '80px', color: '#94a3b8', fontSize: '13px' }}>
                Complete reports with coordinator reviews to display score trajectory.
              </div>
            )}
          </div>
        </div>

        {/* Technical Skill Competency */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            Technical Skill Competency Levels
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
            Practical assessment scores validated by Department Coordinators
          </p>

          <div style={{ width: '100%', height: 260 }}>
            {skillChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {skillChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={levelColor(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '80px', color: '#94a3b8', fontSize: '13px' }}>
                No skill assessments recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
