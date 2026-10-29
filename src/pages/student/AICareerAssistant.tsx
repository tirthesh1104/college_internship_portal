import React, { useState, useEffect } from 'react';
import { 
  Sparkles, FileText, Target, Mic, BarChart2, Code, 
  Compass, FileCheck, Lightbulb, Mail, ShieldCheck, 
  Send, RefreshCw, Copy, Check, Bot, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

type AIFeatureId = 
  | 'RESUME_ANALYZER'
  | 'INTERNSHIP_MATCHER'
  | 'MOCK_INTERVIEW'
  | 'SKILL_GAP'
  | 'CODING_TUTOR'
  | 'CAREER_ROADMAP'
  | 'WEEKLY_REPORT'
  | 'PROJECT_MENTOR'
  | 'COVER_LETTER'
  | 'CAREER_PASSPORT';

interface AIFeatureConfig {
  id: AIFeatureId;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  badgeColor: string;
  defaultPrompt: string;
  placeholder: string;
  systemInstruction: string;
}

export const AICareerAssistant: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AIFeatureId>('RESUME_ANALYZER');
  const [inputData, setInputData] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('Full Stack Software Developer');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [savedResume, setSavedResume] = useState<any>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  useEffect(() => {
    api.get<any>('/resumes/me/')
      .then((res) => {
        if (res) setSavedResume(res);
      })
      .catch(() => {});
  }, []);

  const studentProfile: any = user?.student_profile || {};
  const studentDept = savedResume?.department || studentProfile.department_code || studentProfile.department_name || 'Not specified';
  const rawCgpa = savedResume?.cgpa ?? studentProfile.cgpa;
  const studentCGPA = rawCgpa !== undefined && rawCgpa !== null && String(rawCgpa).trim() !== '' ? String(rawCgpa) : 'Not recorded in profile';
  const rawSkills = savedResume?.skills || studentProfile.skills;
  const studentSkills = Array.isArray(rawSkills) && rawSkills.length > 0
    ? rawSkills.join(', ')
    : (typeof rawSkills === 'string' && rawSkills.trim() ? rawSkills.trim() : 'No skills listed in profile yet');

  const features: AIFeatureConfig[] = [
    {
      id: 'RESUME_ANALYZER',
      title: '1. Smart Resume Builder & ATS Analyzer',
      shortDesc: 'Evaluate resume bullets, calculate ATS match score, and detect missing industry keywords.',
      icon: FileText,
      badgeColor: '#2563eb',
      defaultPrompt: `Analyze my resume text and rate its ATS compliance for a ${targetRole} role.
Student Skills: ${studentSkills}
Department: ${studentDept}
CGPA: ${studentCGPA}`,
      placeholder: 'Paste your resume bullet points, summary, or work history here...',
      systemInstruction: `You are an expert HR ATS Resume Reviewer for MAEER's MITCORER Barshi.
Calculate an ATS Score out of 100, list top matched keywords, identify formatting/phrasing issues, and provide 3-5 polished action-verb bullet points tailored to engineering internships.`
    },
    {
      id: 'INTERNSHIP_MATCHER',
      title: '2. Internship Opportunity Matcher',
      shortDesc: 'Get instant compatibility match scores and gap analysis against published opportunities.',
      icon: Target,
      badgeColor: '#059669',
      defaultPrompt: `Match my profile with engineering internships in ${studentDept}.
My Skills: ${studentSkills}
My CGPA: ${studentCGPA}`,
      placeholder: 'Add any specific companies, preferred locations, or domain interests (e.g. Pune, Remote AI/ML, Embedded Systems)...',
      systemInstruction: `You are the Official Placement Officer AI for MITCORER Internship Hub.
Evaluate student skills and CGPA against current engineering internship roles. Provide a percentage match score (0-100%), required vs missing technical competencies, and step-by-step application prep advice.`
    },
    {
      id: 'MOCK_INTERVIEW',
      title: '3. AI Mock Interview Simulator',
      shortDesc: 'Conduct a simulated technical & HR interview with live scoring and model answers.',
      icon: Mic,
      badgeColor: '#7c3aed',
      defaultPrompt: `Simulate a technical interview for a ${targetRole} position in ${studentDept}.
Ask me a challenging question on core fundamentals, algorithms, or practical engineering scenarios.`,
      placeholder: 'Type your answer to the interview question or request a new topic...',
      systemInstruction: `You are a Senior Technical Interviewer conducting a mock technical interview for MITCORER engineering students.
Evaluate user answers constructively, provide a rating out of 10, explain ideal solution code/architectures, and ask logical follow-up questions.`
    },
    {
      id: 'SKILL_GAP',
      title: '4. Skill Gap & Learning Roadmap',
      shortDesc: 'Compare current skills with industry requirements and get a 4-week learning path.',
      icon: BarChart2,
      badgeColor: '#d97706',
      defaultPrompt: `Perform a skill gap analysis for ${targetRole} in ${studentDept}.
Current Verified Skills: ${studentSkills}`,
      placeholder: 'Specify any target technologies or missing frameworks you wish to master...',
      systemInstruction: `You are an Engineering Skill Assessor. Compare student skills against industry requirements. Output a breakdown of Mastered Skills, Critical Gaps, and a structured 4-Week Learning Roadmap with recommended project milestones.`
    },
    {
      id: 'CODING_TUTOR',
      title: '5. Technical Coding & System Tutor',
      shortDesc: 'Instant code debugging, algorithmic explanations, and system design guidance.',
      icon: Code,
      badgeColor: '#0284c7',
      defaultPrompt: `Debug and optimize this code or explain system design principles:
Languages/Skills: ${studentSkills}`,
      placeholder: 'Paste code snippet, error stack trace, or algorithm question (e.g. binary search, REST API rate limiting, CAN bus protocol)...',
      systemInstruction: `You are a Senior Software & Embedded Systems Architect tutor for MITCORER students. Provide clean, well-commented code blocks, algorithmic complexity analysis (Time & Space O(N)), and step-by-step explanations.`
    },
    {
      id: 'CAREER_ROADMAP',
      title: '6. Post-Graduation Career & Higher Ed Advisor',
      shortDesc: 'Explore tailored roadmaps for GATE, GRE, PSU recruitment, Core Industry, or R&D.',
      icon: Compass,
      badgeColor: '#4f46e5',
      defaultPrompt: `Guide my post-graduation career path in ${studentDept} Engineering.
Current CGPA: ${studentCGPA}`,
      placeholder: 'Specify your primary goal (e.g. GATE Computer Science, Master’s abroad in US/Germany, Product Startup, Core Mechanical R&D)...',
      systemInstruction: `You are an Academic & Career Pathway Advisor for MITCORER engineering graduates. Compare GATE, Higher Studies, Core Placements, and Industry Certifications with preparation timelines.`
    },
    {
      id: 'WEEKLY_REPORT',
      title: '7. Weekly Report & Deliverable Assistant',
      shortDesc: 'Transform informal rough work notes into formal MITCORER weekly progress reports.',
      icon: FileCheck,
      badgeColor: '#16a34a',
      defaultPrompt: `Draft an official MITCORER Weekly Progress Report.
Department: ${studentDept}
Tasks completed this week: Learned React hooks, optimized PostgreSQL database queries, integrated JWT authentication middleware.`,
      placeholder: 'Enter rough notes of what you built, debugged, or learned this week...',
      systemInstruction: `You are the MITCORER Internship Progress Report Assistant. Format informal notes into a structured formal report with: Executive Summary, Key Technical Deliverables, Challenges Resolved, Hours Worked, and Objectives for Next Week.`
    },
    {
      id: 'PROJECT_MENTOR',
      title: '8. Capstone Project & Team Mentor',
      shortDesc: 'Generate innovative project ideas, technical architecture diagrams, and role allocations.',
      icon: Lightbulb,
      badgeColor: '#c026d3',
      defaultPrompt: `Suggest an innovative Capstone/Final Year project for ${studentDept} engineering with architecture overview.
Team Skills: ${studentSkills}`,
      placeholder: 'Enter domain preferences (e.g., Smart Railway IoT Telemetry, AI Medical Imaging, Autonomous Drone Navigation)...',
      systemInstruction: `You are a Project Research Mentor for MITCORER Barshi. Provide high-impact capstone project ideas, system design architecture, tech stack breakdown, and team member workload distribution.`
    },
    {
      id: 'COVER_LETTER',
      title: '9. Cover Letter & Outreach Email Assistant',
      shortDesc: 'Generate custom cover letters and recruiter cold emails for target internship listings.',
      icon: Mail,
      badgeColor: '#e11d48',
      defaultPrompt: `Draft a professional Cover Letter and Recruiter Outreach Email for a ${targetRole} internship.
Student Name: ${user?.name || 'Student'}
Department: ${studentDept} Engineering
Key Skills: ${studentSkills}`,
      placeholder: 'Add company name or job description details if available...',
      systemInstruction: `You are an Executive Business Communication Coach. Draft tailored, professional, high-converting cover letters and concise LinkedIn/email outreach messages highlighting engineering competencies.`
    },
    {
      id: 'CAREER_PASSPORT',
      title: '10. Career Passport & Executive Bio Assistant',
      shortDesc: 'Summarize verified achievements, certificates, and projects into a shareable profile bio.',
      icon: ShieldCheck,
      badgeColor: '#0d9488',
      defaultPrompt: `Generate a verifiable Executive Professional Summary and LinkedIn Bio for my MITCORER Career Passport.
Name: ${user?.name || 'Student'}
Department: ${studentDept}
Skills: ${studentSkills}
CGPA: ${studentCGPA}`,
      placeholder: 'Add any specific awards, publications, or completed certifications (e.g. AWS Certified Developer, NPTEL Gold Badge)...',
      systemInstruction: `You are a Professional Portfolio & Executive Branding Consultant. Produce a compelling Executive Summary, 3-sentence elevator pitch, and portfolio highlight section suitable for employers and QR Verification.`
    }
  ];

  const activeFeature = features.find(f => f.id === activeTab) || features[0];

  useEffect(() => {
    setInputData(activeFeature.defaultPrompt);
    setResponseOutput(null);
    setProviderInfo(null);
    setIsFallbackMode(false);
    setError(null);
  }, [activeTab, savedResume]);

  const buildLocalRuleBasedResponse = (featureId: AIFeatureId, promptText: string): string => {
    return `[LOCAL RULE-BASED GUIDANCE MODE — Live AI Provider Unavailable]

Feature: ${activeFeature.title}
Target Role / Context: ${targetRole}
Authenticated Profile Context:
• Student: ${user?.name || 'Student'}
• Department: ${studentDept}
• Recorded CGPA: ${studentCGPA}
• Recorded Skills: ${studentSkills}

Structured Recommendations:
1. Alignment & Core Focus:
   • Review your input context ("${promptText.slice(0, 120)}${promptText.length > 120 ? '...' : ''}") against industry expectations for ${targetRole}.
   • Ensure measurable outcomes (latency reductions, test coverage %, or throughput metrics) are explicitly stated in your documentation.

2. Actionable Next Steps:
   • Cross-check your listed skills (${studentSkills}) with the requirements of your target opportunity in the MITCORER Internship Hub.
   • Add concrete repository links, architecture notes, and verification artifacts to strengthen your submission.

(Note: This structured checklist was generated locally because the live AI service did not respond.)`;
  };

  const handleExecuteAI = async () => {
    if (!inputData.trim()) {
      setError('Please enter a prompt or input context before running analysis.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponseOutput(null);
    setIsFallbackMode(false);

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt: inputData.trim(),
        systemInstruction: activeFeature.systemInstruction,
        featureName: activeFeature.id
      });

      if (res && res.text) {
        setResponseOutput(res.text);
        setProviderInfo({ provider: res.provider || 'Google Gemini', model: res.model || 'gemini-3.1-flash-lite' });
      } else {
        throw new Error('Empty response received from AI provider.');
      }
    } catch (err: any) {
      console.warn('Live AI unavailable, using clearly labeled local rule-based guidance:', err);
      setIsFallbackMode(true);
      setProviderInfo({ provider: 'Local Rule-Based Engine', model: 'Offline Deterministic Guide' });
      setResponseOutput(buildLocalRuleBasedResponse(activeFeature.id, inputData.trim()));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(responseOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const ActiveIcon = activeFeature.icon;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: '24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#ffffff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> 10-in-1 Student AI Intelligence Suite • Server Proxy Integration
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
              MITCORER Student AI Career & Technical Suite
            </h1>
            <p style={{ color: '#c7d2fe', fontSize: '13.5px', marginTop: '4px', maxWidth: '750px' }}>
              Empowering {user?.name || 'Students'} ({studentDept}) with real-time AI guidance for resume ATS scoring, mock interviews, skill gap analysis, coding tutoring, and capstone project mentorship.
            </p>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>Active Student Context</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{studentDept} • CGPA: {studentCGPA}</div>
          </div>
        </div>
      </div>

      {/* 10 Feature Navigation Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {features.map((f) => {
          const IconComp = f.icon;
          const isActive = f.id === activeTab;
          return (
            <button
              key={f.id}
              onClick={() => setActiveTab(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: isActive ? `2px solid ${f.badgeColor}` : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${f.badgeColor}15`, color: f.badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: isActive ? 700 : 600, color: isActive ? '#0f172a' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.title.split('. ')[1] || f.title}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.shortDesc.slice(0, 32)}...
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feature Workspace Main Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: `${activeFeature.badgeColor}18`, color: activeFeature.badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ActiveIcon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {activeFeature.title}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              {activeFeature.shortDesc}
            </p>
          </div>
        </div>

        {/* Input Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          {(activeTab === 'RESUME_ANALYZER' || activeTab === 'INTERNSHIP_MATCHER' || activeTab === 'SKILL_GAP' || activeTab === 'MOCK_INTERVIEW') && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Target Role / Domain
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer, AI Engineer, Embedded Systems Specialist"
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>
              Prompt & Input Data Context
            </label>
            <textarea
              className="form-control"
              rows={5}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder={activeFeature.placeholder}
              style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => setInputData(activeFeature.defaultPrompt)}
              className="btn btn-outline btn-sm"
              style={{ color: '#64748b' }}
            >
              <RefreshCw size={14} style={{ marginRight: '4px' }} /> Reset Context Prompt
            </button>

            <button
              onClick={handleExecuteAI}
              disabled={loading || !inputData.trim()}
              className="btn btn-primary"
              style={{ backgroundColor: activeFeature.badgeColor, borderColor: activeFeature.badgeColor, minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Analyzing via AI...
                </>
              ) : (
                <>
                  <Send size={16} /> Execute AI Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            <div>
              <strong>AI Execution Error:</strong> {error}
              <div style={{ fontSize: '11.5px', color: '#7f1d1d', marginTop: '2px' }}>
                Please ask your Administrator to configure and test the Gemini/Claude API keys in Admin AI Settings.
              </div>
            </div>
          </div>
        )}

        {/* AI Output Result Section */}
        {responseOutput && (
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={20} color={activeFeature.badgeColor} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  AI Analysis & Recommendations
                </h3>
                {providerInfo && (
                  <span
                    className="badge badge-approved"
                    style={{
                      fontSize: '11px',
                      backgroundColor: isFallbackMode ? '#fffbeb' : '#eff6ff',
                      color: isFallbackMode ? '#b45309' : '#1e40af',
                      border: `1px solid ${isFallbackMode ? '#fde68a' : '#bfdbfe'}`
                    }}
                  >
                    {isFallbackMode
                      ? 'Local Rule-Based Guidance Mode (Live AI Unavailable)'
                      : `Powered by ${providerInfo.provider} (${providerInfo.model})`}
                  </span>
                )}
              </div>

              <button
                onClick={handleCopy}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copied ? 'Copied to Clipboard!' : 'Copy Result'}
              </button>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              fontSize: '14px',
              lineHeight: 1.7,
              color: '#1e293b',
              whiteSpace: 'pre-wrap',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
            }}>
              {responseOutput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

