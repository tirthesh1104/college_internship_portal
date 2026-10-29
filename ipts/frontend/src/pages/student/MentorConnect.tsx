import React, { useEffect, useState } from 'react';
import { Users, Calendar, Video, BookOpen, CheckCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';

export const MentorConnect: React.FC = () => {
  const [mentors, setMentors] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal
  const [bookingMentor, setBookingMentor] = useState<any>(null);
  const [topic, setTopic] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [goals, setGoals] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get<any[]>('/mentors/mentors/'),
      api.get<any[]>('/mentors/sessions/'),
    ])
      .then(([mList, sList]) => {
        setMentors(Array.isArray(mList) ? mList : []);
        setSessions(Array.isArray(sList) ? sList : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingMentor) return;

    try {
      await api.post('/mentors/sessions/', {
        mentor: bookingMentor.id,
        topic,
        scheduled_at: scheduledAt || new Date(Date.now() + 86400000 * 3).toISOString(),
        learning_goals: goals,
      });
      setSuccessMsg(`Mentorship request submitted to ${bookingMentor.mentor_name}!`);
      setTimeout(() => {
        setBookingMentor(null);
        setSuccessMsg('');
        setTopic('');
        setGoals('');
        fetchData();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to book session.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Alumni & Industry Mentor Connect</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Schedule 1-on-1 career guidance sessions with verified MITCORER alumni and senior industry architects.
        </p>
      </div>

      {/* Available Mentors */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
        Verified Industry Mentors
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading mentors...</div>
      ) : mentors.length === 0 ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          No active mentors listed right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '36px' }}>
          {mentors.map((m) => (
            <div key={m.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                    {m.mentor_name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{m.mentor_name}</h3>
                    <div style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>{m.designation} • {m.organization}</div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
                  {m.bio}
                </p>

                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                  <strong>Areas:</strong> {m.expertise_areas}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-published">Available for 1:1</span>
                <button 
                  onClick={() => setBookingMentor(m)}
                  className="btn btn-primary btn-sm"
                >
                  Request Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Sessions */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
        My Mentorship Sessions
      </h2>

      {sessions.length === 0 ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
          You have not requested any mentorship sessions yet. Book a session with an alumnus above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((s) => (
            <div key={s.id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{s.topic}</h4>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  Mentor: <strong>{s.mentor_name}</strong> • Scheduled: {new Date(s.scheduled_at).toLocaleString()}
                </div>
              </div>
              <span className="badge badge-submitted">{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingMentor && (
        <div className="modal-overlay" onClick={() => setBookingMentor(null)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Book Mentorship Session with {bookingMentor.mentor_name}
            </h3>

            {successMsg ? (
              <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '13.5px' }}>
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label className="form-label">Discussion Topic *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Preparing for Cloud Architect roles, Resume review"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Specific Questions or Goals</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Describe what specific guidance you are seeking..."
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setBookingMentor(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
