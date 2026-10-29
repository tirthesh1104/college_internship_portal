import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import { Opportunity } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const Training: React.FC = () => {
  const [trainings, setTrainings] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Opportunity[] | { results: Opportunity[] }>('/opportunities/', { type: 'TRAINING' })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setTrainings(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto 80px', padding: '0 24px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Industry Training & Certification Programs
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Hands-on technical training workshops, specialized domain bootcamps, and faculty-guided industrial skill modules.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading training programs...</div>
      ) : trainings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <BookOpen size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Active Training Programs</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>Check back soon for upcoming industrial certification sessions.</p>
          <Link to="/opportunities" className="btn btn-primary btn-sm">
            Explore All Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {trainings.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge-published" style={{ marginBottom: '12px' }}>
                  {t.mode} • {t.duration}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {t.title}
                </h3>
                <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600, marginBottom: '12px' }}>
                  {t.organization}
                </div>
                <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, marginBottom: '16px' }}>
                  {t.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {t.required_skills.split(',').map((skill, i) => (
                    <span key={i} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 500 }}>
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Deadline: {t.deadline}</span>
                <Link to={`/opportunities?id=${t.id}`} className="btn btn-primary btn-sm">
                  Enroll / Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
