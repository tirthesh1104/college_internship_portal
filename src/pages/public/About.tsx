import React from 'react';
import { Building2, Award, Users, CheckCircle, GraduationCap, Target } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto 80px', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
          About MITCORER Internship Hub
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', maxWidth: '750px', margin: '0 auto', lineHeight: 1.6 }}>
          Dedicated platform for managing and verifying engineering internships, industrial training, technical performance, and professional certifications at MITCORER Barshi.
        </p>
      </div>

      <div className="card" style={{ padding: '36px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GraduationCap color="#2563eb" /> Institutional Vision & Mission
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '14.5px', marginBottom: '16px' }}>
          MAEER's MIT College of Railway Engineering & Research (MITCORER), Barshi is dedicated to providing cutting-edge engineering education with specialized industry exposure. 
          The Internship Hub was established by the Training & Placement Cell to bridge academic coursework with hands-on industrial practice.
        </p>
        <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '14.5px' }}>
          Unlike generic job portals, the MITCORER Internship Hub ensures accountability through verified weekly reports, evidence submissions, coordinator evaluations, and accredited Digital Career Passports.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Target size={22} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Verified Competence</h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
            Every skill reported by students is tied to practical project outcomes, code repositories, and faculty reviews rather than simple self-declarations.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Award size={22} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Tamper-Proof Credentials</h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
            Official internship completion certificates carry unique QR codes allowing recruiters to instantly verify authenticity via our public database verification system.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Users size={22} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Active Coordinator Mentorship</h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
            Departmental Training & Placement Coordinators actively review weekly submissions, offer feedback, and assign improvement tasks to ensure steady career progress.
          </p>
        </div>
      </div>
    </div>
  );
};
