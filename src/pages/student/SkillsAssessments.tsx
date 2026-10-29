import React, { useEffect, useState } from 'react';
import { Award, CheckCircle, TrendingUp, BookOpen, Star } from 'lucide-react';
import { SkillAssessment } from '../../types';
import { api } from '../../services/api';

export const SkillsAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SkillAssessment[] | { results: SkillAssessment[] }>('/assessments/records/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setAssessments(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ADVANCED':
      case 'EXPERT':
        return <span className="badge badge-published">{level}</span>;
      case 'INTERMEDIATE':
        return <span className="badge badge-approved">{level}</span>;
      default:
        return <span className="badge badge-submitted">{level}</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Technical Skills & Competency Lab</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Verified skill progression evaluated by Faculty Coordinators based on project deliverables and weekly evidence.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading skill assessments...</div>
      ) : assessments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Award size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Skill Assessments Yet</h3>
          <p style={{ fontSize: '14px' }}>As you submit weekly reports and project code, your coordinator will assess and score your technical competencies.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {assessments.map((a) => (
            <div key={a.id} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {a.skill_category}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {a.skill_name}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                    {a.score}/100
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Rating</div>
                </div>
              </div>

              {/* Level Progression Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Baseline:</span>
                {getLevelBadge(a.initial_level)}
                <span style={{ color: '#94a3b8' }}>&rarr;</span>
                <span style={{ color: '#64748b' }}>Current:</span>
                {getLevelBadge(a.current_level)}
              </div>

              {a.practical_evidence && (
                <div style={{ marginBottom: '14px', fontSize: '13px', color: '#475569' }}>
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Verified Evidence:</strong>
                  <p style={{ lineHeight: 1.5 }}>{a.practical_evidence}</p>
                </div>
              )}

              {a.coordinator_feedback && (
                <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '12.5px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                  <strong>Faculty Assessment:</strong> "{a.coordinator_feedback}"
                </div>
              )}

              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94a3b8' }}>
                <span>Evaluator: {a.assessed_by_name || 'T&P Coordinator'}</span>
                <span>Date: {a.assessment_date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
