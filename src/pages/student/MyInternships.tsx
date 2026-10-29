import React, { useEffect, useState } from 'react';
import { CalendarCheck, Building2, User, Mail, Phone, Award, CheckCircle2, Clock } from 'lucide-react';
import { Internship } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const MyInternships: React.FC = () => {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Internship[] | { results: Internship[] }>('/internships/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setInternships(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>My Internships</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Active and completed internships recorded under MITCORER Training & Placement Cell.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading internships...</div>
      ) : internships.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No Active Internships</h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>Apply to opportunities and get selected to activate your tracking.</p>
          <Link to="/student/opportunities" className="btn btn-primary btn-sm">
            Find Internships
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {internships.map((i) => (
            <div key={i.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className={`badge ${i.status === 'ACTIVE' ? 'badge-published' : 'badge-completed'}`}>
                    {i.status}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {i.start_date} to {i.end_date}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {i.role_title}
                </h3>

                <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} /> {i.organization_name}
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {i.supervisor_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#64748b" /> <strong>Supervisor:</strong> {i.supervisor_name}
                    </div>
                  )}
                  {i.supervisor_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#64748b" /> {i.supervisor_email}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="#64748b" /> <strong>Faculty Coordinator:</strong> {i.coordinator_name || 'Assigned by T&P'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#0f172a', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
                  <span>Reports Approved:</span>
                  <strong>{i.approved_reports_count || 0} / {i.reports_count || 0} Weeks</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/student/reports" className="btn btn-primary btn-sm">
                  View Weekly Reports
                </Link>
                <Link to="/student/documents" className="btn btn-secondary btn-sm">
                  Upload Letters
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
