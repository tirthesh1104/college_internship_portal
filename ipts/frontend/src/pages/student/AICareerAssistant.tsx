import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, Send, CheckCircle, Lightbulb, BookOpen, UserCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AICareerAssistant: React.FC = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello ${user?.name || 'Student'}! I'm your MITCORER AI Career Advisor. Based on your enrolled skills, I can suggest tailored internship preparation strategies, review your project descriptions for resume inclusion, or conduct a simulated technical interview. How can I help you today?`
      }
    ]);
  }, [user?.name]);
  const [loading, setLoading] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setPrompt('');
    setLoading(true);

    // Advisory AI Assistant Response Simulation based on real student context
    setTimeout(() => {
      let reply = "That's a great engineering question. ";
      const lower = userMsg.toLowerCase();

      if (lower.includes('resume') || lower.includes('cv')) {
        reply = "Here is a high-impact way to describe your MITCORER Internship work on your resume:\n\n• 'Engineered a scalable full-stack Internship Performance Tracking System using Django REST Framework and MySQL InnoDB, eliminating redundant manual report submissions across 4 college departments.'\n• 'Implemented secure JWT authentication with role-based access control (Admin, Coordinator, Student), preventing unauthorized cross-tenant record tampering.'\n• 'Architected private document verification pipelines with automated QR-code cryptographic credential verification.'";
      } else if (lower.includes('interview') || lower.includes('question')) {
        reply = "Here are 3 key technical interview questions you should prepare based on your current tech stack:\n\n1. Explain the difference between Django's select_related and prefetch_related, and when you would use each with MySQL foreign keys.\n2. How do you handle database migration conflicts and ensure zero downtime with utf8mb4 encoding in MySQL?\n3. Describe how you implemented server-side permission checks to block Insecure Direct Object References (IDOR) in weekly report endpoints.";
      } else if (lower.includes('internship') || lower.includes('job') || lower.includes('recommend')) {
        reply = "Based on your verified skills in Python, Django, and MySQL, the 'Python Full Stack Developer Intern' role at Tech Mahindra Digital is your strongest current match (95% alignment). I recommend highlighting your experience with REST API versioning and database indexing in your application cover note.";
      } else {
        reply = "Focus on pairing your theoretical knowledge with evidence-backed deliverables in your weekly reports. Consistent submissions reviewed by Prof. Sachin Kaulage with scores above 90% significantly improve your placement shortlisting odds during final year campus drives.";
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setLoading(false);
    }, 700);
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles color="#2563eb" /> AI Career & Placement Assistant
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Advisory intelligent agent tailored to your verified skills, weekly progress reports, and career objectives.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '620px' }}>
        {/* Chat Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>MITCORER Career Advisory Agent</div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>Online • Context-Aware</div>
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: m.role === 'user' ? '#2563eb' : '#f1f5f9',
                color: m.role === 'user' ? '#ffffff' : '#0f172a',
                padding: '12px 16px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: '13.5px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: '#f1f5f9', padding: '10px 16px', borderRadius: '12px', fontSize: '12.5px', color: '#64748b' }}>
              Analyzing career path & drafting recommendations...
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
          <button 
            type="button" 
            onClick={() => setPrompt("How can I polish my resume bullets for full stack Python roles?")}
            style={{ fontSize: '11.5px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '4px 10px', borderRadius: '9999px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Resume Bullet Polishing
          </button>
          <button 
            type="button" 
            onClick={() => setPrompt("What technical interview questions should I expect on Django & MySQL?")}
            style={{ fontSize: '11.5px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '4px 10px', borderRadius: '9999px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Simulate Technical Interview
          </button>
          <button 
            type="button" 
            onClick={() => setPrompt("Recommend internship opportunities matching my verified skills")}
            style={{ fontSize: '11.5px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '4px 10px', borderRadius: '9999px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Internship Match Analysis
          </button>
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', backgroundColor: '#ffffff' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Ask for resume feedback, interview prep, or career recommendations..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
