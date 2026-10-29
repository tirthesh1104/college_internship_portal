import React, { useState } from 'react';
import { HelpCircle, Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const HelpSupport: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto 80px', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Help & Support Desk
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Get assistance with student registration, weekly report submissions, document verification, or portal access.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', marginBottom: '40px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <Mail size={24} color="#2563eb" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Email Support</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Reach out to our college technical desk:</p>
          <a href="mailto:support.hub@mitcorer.edu.in" style={{ color: '#2563eb', fontWeight: 600, fontSize: '14px' }}>
            support.hub@mitcorer.edu.in
          </a>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <Phone size={24} color="#059669" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>T&P Cell Helpline</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Operating Mon–Sat, 9:30 AM to 5:30 PM:</p>
          <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px' }}>
            +91 02184 222333 / 222444
          </span>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <MapPin size={24} color="#d97706" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Campus Office</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Training & Placement Cell, Admin Block, MITCORER Campus, Jamgaon Road, Barshi - 413401.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          Submit an Online Support Ticket
        </h2>

        {submitted ? (
          <div style={{ padding: '20px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: '#065f46' }}>
            <CheckCircle2 size={24} />
            <div>
              <strong>Ticket Submitted Successfully!</strong>
              <div style={{ fontSize: '13px' }}>Our Training & Placement team will review your query and reply to {email}.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Tirthesh Gutte"
                />
              </div>

              <div className="form-group">
                <label className="form-label">College Email</label>
                <input 
                  type="email" 
                  required 
                  className="form-control" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="e.g. student@mitcorer.edu.in"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Describe your query or technical issue</label>
              <textarea 
                rows={4} 
                required 
                className="form-control" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Mention details like your Roll Number, Internship title, or the specific error encountered..."
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} /> Send Support Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
