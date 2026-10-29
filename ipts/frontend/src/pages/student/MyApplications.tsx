import React, { useEffect, useState } from 'react';
import { Send, Building2, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Application } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const MyApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Application[] | { results: Application[] }>('/applications/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setApplications(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELECTED': return <span className="badge badge-published">Selected & Offer Issued</span>;
      case 'SHORTLISTED': return <span className="badge badge-approved">Shortlisted</span>;
      case 'UNDER_REVIEW': return <span className="badge badge-submitted">Under Review</span>;
      case 'REJECTED': return <span className="badge badge-rejected">Not Selected</span>;
      default: return <span className="badge badge-draft">Submitted</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>My Applications</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Track real-time selection decisions and reviewer feedback for your submitted applications.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Send size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Applications Yet</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>Explore published opportunities to apply.</p>
          <Link to="/student/opportunities" className="btn btn-primary btn-sm">
            Browse Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => (
            <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                      {app.opportunity_details?.title || 'Internship Application'}
                    </h3>
                    {getStatusBadge(app.status)}
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#2563eb', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} /> {app.opportunity_details?.organization}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Applied: {new Date(app.applied_at).toLocaleDateString()}
                </div>
              </div>

              {app.cover_letter && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', fontSize: '13px', color: '#475569', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
                  <strong>Your Statement:</strong> {app.cover_letter}
                </div>
              )}

              {app.reviewer_feedback && (
                <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '6px', fontSize: '13px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                  <strong>Coordinator Review:</strong> {app.reviewer_feedback}
                </div>
              )}

              {app.status === 'SELECTED' && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Link to="/student/documents" className="btn btn-primary btn-sm">
                    Upload Offer Letter &rarr;
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
