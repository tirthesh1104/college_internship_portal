import React, { useEffect, useState, useCallback } from 'react';
import {
  Printer, Download, FileText, CheckCircle2, AlertTriangle,
  Award, Building2, GraduationCap, Star, Mail, Phone, User,
  ExternalLink, Plus, Trash2, Save, Send, Sparkles, Briefcase,
  Target, BookOpen, RefreshCw, ShieldCheck, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

type TemplateType = 'MITCORER_STANDARD' | 'MODERN_TECH' | 'CORE_ENGINEERING';

const DOMAINS = [
  'Web Development',
  'AI/ML',
  'Data Science',
  'VLSI/Embedded Systems',
  'CAD/CAM',
  'Structural Engineering'
];

export const Resume: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BUILDER' | 'ANALYZER' | 'RECOMMENDATIONS'>('BUILDER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [resume, setResume] = useState<any>({
    student_name: '',
    email: '',
    roll_number: '',
    prn_number: '',
    department_code: 'CSE',
    department_name: 'Computer Science & Engineering',
    academic_year: '2026-2027',
    division: 'A',
    cgpa: '',
    phone: '',
    summary: '',
    target_domain: 'Web Development',
    template: 'MITCORER_STANDARD' as TemplateType,
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    skills: [] as string[],
    education: [] as any[],
    projects: [] as any[],
    internships: [] as any[],
    certifications: [] as any[],
    achievements: [] as string[],
    verification_status: 'NOT_SUBMITTED',
    review_feedback: '',
    reviewed_by_name: '',
    reviewed_at: null,
    review_history: [] as any[]
  });

  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [methodologyNote, setMethodologyNote] = useState<string>('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newAchievementInput, setNewAchievementInput] = useState('');
  const [suggestedBullets, setSuggestedBullets] = useState<{ [idx: number]: string }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resData, recData] = await Promise.all([
        api.get<any>('/resumes/me/'),
        api.get<any>('/recommendations/internships/')
      ]);
      if (resData?.resume) {
        setResume(resData.resume);
      }
      if (resData?.analysis) {
        setAnalysis(resData.analysis);
      }
      if (recData?.recommendations) {
        setRecommendations(recData.recommendations);
        setMethodologyNote(recData.methodology_note || '');
      }
    } catch (err: any) {
      console.error('Failed to load resume workspace:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run live deterministic analyzer whenever resume state changes
  const runLiveAnalysis = async (updatedResume: any) => {
    try {
      const res = await api.post<any>('/resumes/analyze/', updatedResume);
      setAnalysis(res);
    } catch {
      // ignore transient error
    }
  };

  const handleSaveResume = async (submitForReview = false) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.post<any>('/resumes/me/', {
        ...resume,
        submit_for_review: submitForReview
      });
      if (res.resume) setResume(res.resume);
      if (res.analysis) setAnalysis(res.analysis);
      setMessage({
        type: 'success',
        text: res.message || (submitForReview ? 'Resume submitted for Coordinator review!' : 'Resume saved successfully.')
      });
      // Refresh internship recommendations after saving skills/domain/CGPA
      const recData = await api.get<any>('/recommendations/internships/');
      if (recData?.recommendations) setRecommendations(recData.recommendations);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save resume.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const val = (skillToAdd ?? newSkillInput).trim();
    if (!val) return;
    if (!resume.skills.some((s: string) => s.toLowerCase() === val.toLowerCase())) {
      const next = { ...resume, skills: [...resume.skills, val] };
      setResume(next);
      runLiveAnalysis(next);
    }
    if (!skillToAdd) setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const next = { ...resume, skills: resume.skills.filter((s: string) => s !== skillToRemove) };
    setResume(next);
    runLiveAnalysis(next);
  };

  const handleAddProject = () => {
    const nextProjects = [
      ...(resume.projects || []),
      { title: '', technologies: '', description: '', link: '' }
    ];
    setResume({ ...resume, projects: nextProjects });
  };

  const handleProjectChange = (idx: number, field: string, value: string) => {
    const nextProjects = [...(resume.projects || [])];
    nextProjects[idx] = { ...nextProjects[idx], [field]: value };
    const next = { ...resume, projects: nextProjects };
    setResume(next);
  };

  const handleRemoveProject = (idx: number) => {
    const nextProjects = (resume.projects || []).filter((_: any, i: number) => i !== idx);
    const next = { ...resume, projects: nextProjects };
    setResume(next);
    runLiveAnalysis(next);
  };

  // AI + Deterministic Action-Verb Bullet Enhancer (Never invents fake metrics, proposes structured phrasing for student confirmation)
  const handleGenerateBulletSuggestion = async (idx: number) => {
    const proj = resume.projects?.[idx];
    if (!proj) return;
    const rawDesc = String(proj.description || '').trim();
    const tech = String(proj.technologies || resume.skills?.slice(0, 3).join(', ') || 'engineering tools').trim();
    const verbs = analysis?.domain_guidance?.recommended_action_verbs || ['Engineered', 'Developed', 'Implemented', 'Optimized'];
    const verb = verbs[idx % verbs.length] || 'Engineered';

    const cleanRaw = rawDesc.replace(/^[•\-*]\s*/, '').replace(/\.$/, '');
    const deterministicSuggestion = cleanRaw
      ? `${verb} ${proj.title || 'technical module'} using ${tech} to ${cleanRaw.charAt(0).toLowerCase() + cleanRaw.slice(1)}, improving system reliability and maintainability.`
      : `${verb} and validated ${proj.title || 'engineering project'} utilizing ${tech}, delivering documented technical milestones and verified test results.`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt: `Rewrite this engineering resume project description into a single, strong, ATS-optimized action-verb bullet point (1-2 sentences max, no markdown bullets, do not invent fake percentages if none are given).\nProject Title: ${proj.title || 'Engineering Project'}\nTechnologies: ${tech}\nCurrent Draft: ${rawDesc || 'Built and tested core project module'}`,
        systemInstruction: 'You are an expert engineering resume writer for MITCORER. Return ONLY the rewritten single sentence without quotes or prefixes.',
        featureName: 'RESUME_BULLET_ENHANCER'
      });
      const aiBullet = String(res?.text || '').trim().replace(/^["'•\-*]+\s*/, '').replace(/["']+$/, '');
      setSuggestedBullets(prev => ({ ...prev, [idx]: aiBullet || deterministicSuggestion }));
    } catch {
      setSuggestedBullets(prev => ({ ...prev, [idx]: deterministicSuggestion }));
    }
  };

  const handleApplyBulletSuggestion = (idx: number) => {
    const suggestion = suggestedBullets[idx];
    if (!suggestion) return;
    handleProjectChange(idx, 'description', suggestion);
    const copy = { ...suggestedBullets };
    delete copy[idx];
    setSuggestedBullets(copy);
    runLiveAnalysis({
      ...resume,
      projects: resume.projects.map((p: any, i: number) => i === idx ? { ...p, description: suggestion } : p)
    });
  };

  const handleAddCert = () => {
    setResume({
      ...resume,
      certifications: [...(resume.certifications || []), { title: '', issuer: '', issue_date: '2026' }]
    });
  };

  const handleCertChange = (idx: number, field: string, val: string) => {
    const nextCerts = [...(resume.certifications || [])];
    nextCerts[idx] = { ...nextCerts[idx], [field]: val };
    setResume({ ...resume, certifications: nextCerts });
  };

  const handleRemoveCert = (idx: number) => {
    setResume({
      ...resume,
      certifications: (resume.certifications || []).filter((_: any, i: number) => i !== idx)
    });
  };

  const handleAddAchievement = () => {
    const val = newAchievementInput.trim();
    if (!val) return;
    setResume({ ...resume, achievements: [...(resume.achievements || []), val] });
    setNewAchievementInput('');
  };

  const handlePrintA4Pdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
        <p style={{ fontSize: '14px' }}>Loading your Smart Resume Builder, Analyzer & Internship Recommendations...</p>
      </div>
    );
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success">Verified & Approved by Coordinator</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="badge badge-warning">Needs Improvement (See Feedback)</span>;
      case 'PENDING':
        return <span className="badge badge-published">Pending Coordinator Review</span>;
      default:
        return <span className="badge">Draft (Not Yet Submitted for Review)</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header Bar (Hidden when printing A4 PDF) */}
      <div className="non-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Smart Resume Builder, Analyzer & Internship Matcher
            </h1>
            {getVerificationBadge(resume.verification_status)}
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Auto-integrated with your MITCORER academic profile, weekly internship reports, and verified skill assessments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSaveResume(false)}
            disabled={saving}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Resume'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveResume(true)}
            disabled={saving}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={16} /> Submit to Coordinator
          </button>
          <button
            type="button"
            onClick={handlePrintA4Pdf}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} /> Download A4 PDF
          </button>
        </div>
      </div>

      {/* Coordinator Review Feedback Banner */}
      {resume.review_feedback && (
        <div
          className="non-print card"
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            backgroundColor: resume.verification_status === 'APPROVED' ? '#ecfdf5' : '#fffbeb',
            borderColor: resume.verification_status === 'APPROVED' ? '#a7f3d0' : '#fde68a'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: resume.verification_status === 'APPROVED' ? '#065f46' : '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} />
              Coordinator Review Feedback ({resume.verification_status.replace('_', ' ')}):
            </div>
            {resume.reviewed_by_name && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Reviewed by {resume.reviewed_by_name} {resume.reviewed_at ? `on ${resume.reviewed_at.split('T')[0]}` : ''}
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#1e293b' }}>
            "{resume.review_feedback}"
          </p>
        </div>
      )}

      {message && (
        <div
          className="non-print"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="non-print" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('BUILDER')}
          className={`btn ${activeTab === 'BUILDER' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={16} /> 1. Smart Resume Builder & Live A4 Preview
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('ANALYZER'); runLiveAnalysis(resume); }}
          className={`btn ${activeTab === 'ANALYZER' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sparkles size={16} /> 2. Resume Analyzer & Improvement Score ({analysis?.completeness_score ?? 0}/100)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RECOMMENDATIONS')}
          className={`btn ${activeTab === 'RECOMMENDATIONS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Target size={16} /> 3. Personalized Internship & Skill Gap Matches ({recommendations.length})
        </button>
      </div>

      {/* TAB 1: SMART RESUME BUILDER + LIVE PREVIEW */}
      {activeTab === 'BUILDER' && (
        <div className="resume-workspace-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(460px, 1.15fr)', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Editor Controls (Hidden in Print) */}
          <div className="non-print" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Template & Career Domain Selector */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Select ATS-Friendly Resume Template & Career Domain
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '14px' }}>
                {([
                  { id: 'MITCORER_STANDARD', name: '1. MITCORER Standard Template', desc: 'Official institutional format for campus drives & T&P cell' },
                  { id: 'MODERN_TECH', name: '2. Modern Technology Template', desc: 'Clean software, AI/ML & full-stack engineering layout' },
                  { id: 'CORE_ENGINEERING', name: '3. Core Engineering Template', desc: 'Structured for E&TC, Mechanical, Civil & Industrial R&D' }
                ] as const).map(t => (
                  <div
                    key={t.id}
                    onClick={() => setResume({ ...resume, template: t.id })}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: resume.template === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: resume.template === t.id ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Career Domain (Used for Keyword & Internship Matching)</label>
                <select
                  className="form-control"
                  value={resume.target_domain}
                  onChange={(e) => {
                    const next = { ...resume, target_domain: e.target.value };
                    setResume(next);
                    runLiveAnalysis(next);
                  }}
                >
                  {DOMAINS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact, Academic & Summary */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Academic & Professional Profile (Auto-Filled)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Student Name (Verified)</label>
                  <input type="text" className="form-control" value={resume.student_name} disabled style={{ backgroundColor: '#f8fafc' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Roll No & Branch (Verified)</label>
                  <input type="text" className="form-control" value={`${resume.roll_number} (${resume.department_code})`} disabled style={{ backgroundColor: '#f8fafc' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cumulative GPA (CGPA / 10)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 8.45"
                    value={resume.cgpa}
                    onChange={(e) => setResume({ ...resume, cgpa: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 9876543210"
                    value={resume.phone}
                    onChange={(e) => setResume({ ...resume, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">GitHub URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://github.com/..."
                    value={resume.github_url}
                    onChange={(e) => setResume({ ...resume, github_url: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://linkedin.com/in/..."
                    value={resume.linkedin_url}
                    onChange={(e) => setResume({ ...resume, linkedin_url: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Portfolio URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={resume.portfolio_url}
                    onChange={(e) => setResume({ ...resume, portfolio_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Professional Summary / Career Objective</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder={`Dedicated ${resume.department_name} undergraduate at MITCORER specializing in ${resume.target_domain}, seeking an industrial internship to apply practical engineering skills...`}
                  value={resume.summary}
                  onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                />
              </div>
            </div>

            {/* Technical Skills */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Technical & Domain Skills
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Add a skill (e.g. Python, React, AutoCAD, Verilog, SQL)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                />
                <button type="button" onClick={() => handleAddSkill()} className="btn btn-primary">
                  Add
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {(resume.skills || []).map((sk: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    {sk}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk)}
                      style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {analysis?.domain_guidance?.recommended_keywords?.length > 0 && (
                <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px' }}>
                  <strong>Suggested {resume.target_domain} keywords (click to add if you know them):</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {analysis.domain_guidance.recommended_keywords.slice(0, 6).map((kw: string) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleAddSkill(kw)}
                        style={{
                          fontSize: '11.5px',
                          padding: '2px 8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#0f172a'
                        }}
                      >
                        + {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Engineering Projects with Bullet Enhancer */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Academic & Technical Projects
                </h3>
                <button type="button" onClick={handleAddProject} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Add Project
                </button>
              </div>

              {(resume.projects || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No projects added yet. Click "Add Project" to document your technical work.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {resume.projects.map((proj: any, idx: number) => (
                    <div key={idx} style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Project Title (e.g. Smart Railway Track Crack Detection)"
                          value={proj.title || ''}
                          onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                        />
                        <button type="button" onClick={() => handleRemoveProject(idx)} className="btn btn-outline btn-sm" style={{ color: '#dc2626' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Technologies / Tools used"
                          value={proj.technologies || ''}
                          onChange={(e) => handleProjectChange(idx, 'technologies', e.target.value)}
                        />
                        <input
                          type="url"
                          className="form-control"
                          placeholder="GitHub / Demo Link (optional)"
                          value={proj.link || ''}
                          onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                        />
                      </div>
                      <textarea
                        rows={2}
                        className="form-control"
                        placeholder="Describe what you built, tools used, and measurable outcome..."
                        value={proj.description || ''}
                        onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleGenerateBulletSuggestion(idx)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0
                          }}
                        >
                          <Sparkles size={13} /> Suggest Action-Verb Phrasing
                        </button>
                      </div>
                      {suggestedBullets[idx] && (
                        <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                            Suggested Phrasing (Review & Confirm before applying):
                          </div>
                          <div style={{ color: '#1e293b', marginBottom: '8px' }}>"{suggestedBullets[idx]}"</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleApplyBulletSuggestion(idx)} className="btn btn-primary btn-sm" style={{ padding: '3px 10px', fontSize: '11.5px' }}>
                              Confirm & Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const c = { ...suggestedBullets };
                                delete c[idx];
                                setSuggestedBullets(c);
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 10px', fontSize: '11.5px' }}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications & Achievements */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Certifications & Achievements
                </h3>
                <button type="button" onClick={handleAddCert} className="btn btn-outline btn-sm">
                  + Add Certification
                </button>
              </div>
              {(resume.certifications || []).map((cert: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 90px 36px', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Certification Title"
                    value={cert.title || ''}
                    onChange={(e) => handleCertChange(idx, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Issuer (e.g. NPTEL, AWS)"
                    value={cert.issuer || ''}
                    onChange={(e) => handleCertChange(idx, 'issuer', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Year"
                    value={cert.issue_date || ''}
                    onChange={(e) => handleCertChange(idx, 'issue_date', e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveCert(idx)} className="btn btn-outline btn-sm" style={{ color: '#dc2626' }}>
                    ×
                  </button>
                </div>
              ))}

              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Key Achievements / Co-Curricular Highlights</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Finalist in Smart India Hackathon 2026..."
                    value={newAchievementInput}
                    onChange={(e) => setNewAchievementInput(e.target.value)}
                  />
                  <button type="button" onClick={handleAddAchievement} className="btn btn-secondary">
                    Add
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155' }}>
                  {(resume.achievements || []).map((ach: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {ach}{' '}
                      <button
                        type="button"
                        onClick={() => setResume({ ...resume, achievements: resume.achievements.filter((_: any, i: number) => i !== idx) })}
                        style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                      >
                        [Remove]
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Live A4 Printable Resume Preview */}
          <div className="a4-resume-sheet card" style={{
            padding: '36px 42px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            border: resume.template === 'MITCORER_STANDARD' ? '2px solid #1e3a8a' : resume.template === 'MODERN_TECH' ? '2px solid #0f172a' : '2px solid #047857',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
            minHeight: '840px'
          }}>
            {/* Template Header */}
            <div style={{
              borderBottom: resume.template === 'MITCORER_STANDARD' ? '2px solid #1e3a8a' : resume.template === 'MODERN_TECH' ? '2px solid #2563eb' : '2px solid #059669',
              paddingBottom: '16px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
              <div>
                {resume.template === 'MITCORER_STANDARD' && (
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                    MAEER's MIT College of Railway Engineering & Research, Barshi
                  </div>
                )}
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {resume.student_name || 'Student Name'}
                </h2>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>
                  B.Tech — {resume.department_name} ({resume.department_code}) • {resume.target_domain}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <span>Roll No: <strong>{resume.roll_number}</strong></span>
                  {resume.prn_number && <span>• PRN: <strong>{resume.prn_number}</strong></span>}
                  {resume.email && <span>• {resume.email}</span>}
                  {resume.phone && <span>• {resume.phone}</span>}
                </div>
                <div style={{ fontSize: '11.5px', color: '#2563eb', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {resume.github_url && <span>GitHub: {resume.github_url}</span>}
                  {resume.linkedin_url && <span>LinkedIn: {resume.linkedin_url}</span>}
                  {resume.portfolio_url && <span>Portfolio: {resume.portfolio_url}</span>}
                </div>
              </div>

              {resume.cgpa && (
                <div style={{
                  textAlign: 'right',
                  backgroundColor: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>CGPA</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{resume.cgpa}</div>
                </div>
              )}
            </div>

            {/* Career Summary */}
            {resume.summary && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                  Professional Summary
                </h4>
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.55, margin: 0 }}>
                  {resume.summary}
                </p>
              </div>
            )}

            {/* Academic Education */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                Academic Qualification
              </h4>
              {(resume.education || []).map((edu: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>{edu.degree}</strong>
                    <div style={{ color: '#475569', fontSize: '12px' }}>{edu.institution}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#334155' }}>
                    <div>{edu.year}</div>
                    {(resume.cgpa || edu.cgpa) && <strong>CGPA: {resume.cgpa || edu.cgpa}</strong>}
                  </div>
                </div>
              ))}
            </div>

            {/* Technical Skills */}
            {(resume.skills?.length > 0 || resume.verified_assessments?.length > 0) && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                  Technical Skills & Core Competencies
                </h4>
                <div style={{ fontSize: '12.5px', color: '#1e293b', lineHeight: 1.6 }}>
                  <strong>Core Skills ({resume.target_domain}):</strong> {(resume.skills || []).join(' • ') || 'Not specified'}
                </div>
                {resume.verified_assessments?.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                    <strong>Faculty-Assessed Competencies:</strong>{' '}
                    {resume.verified_assessments.map((a: any) => `${a.skill_name} (${a.score}/100 - ${a.current_level})`).join(' • ')}
                  </div>
                )}
              </div>
            )}

            {/* Industrial Internships */}
            {resume.internships?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                  Industrial Internship Experience
                </h4>
                {resume.internships.map((intern: any, i: number) => (
                  <div key={i} style={{ marginBottom: '10px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                      <span>{intern.role_title} — {intern.organization_name}</span>
                      <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                        {intern.start_date} to {intern.end_date} ({intern.status})
                      </span>
                    </div>
                    {intern.description && (
                      <p style={{ fontSize: '12px', color: '#334155', margin: '3px 0 0', lineHeight: 1.5 }}>
                        {intern.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {resume.projects?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                  Engineering Projects
                </h4>
                {resume.projects.map((proj: any, i: number) => (
                  <div key={i} style={{ marginBottom: '10px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                      <span>{proj.title}</span>
                      {proj.technologies && (
                        <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>{proj.technologies}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#334155', margin: '3px 0 0', lineHeight: 1.5 }}>
                      {proj.description}
                    </p>
                    {proj.link && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Link: {proj.link}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Certifications & Achievements */}
            {(resume.certifications?.length > 0 || resume.achievements?.length > 0) && (
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                  Certifications & Achievements
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                  {(resume.certifications || []).map((c: any, i: number) => (
                    <li key={`c-${i}`}>
                      <strong>{c.title}</strong> — {c.issuer} ({c.issue_date})
                    </li>
                  ))}
                  {(resume.achievements || []).map((a: string, i: number) => (
                    <li key={`a-${i}`}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESUME ANALYZER & IMPROVEMENT RECOMMENDATIONS */}
      {activeTab === 'ANALYZER' && analysis && (
        <div className="non-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Score Banner */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', padding: '24px 28px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                MITCORER Resume Completeness & Keyword Rubric ({analysis.target_domain})
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px' }}>
                Resume Completeness Score: {analysis.completeness_score} / 100
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {analysis.score_note}
              </p>
            </div>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              border: `8px solid ${analysis.completeness_score >= 80 ? '#059669' : analysis.completeness_score >= 55 ? '#d97706' : '#dc2626'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{analysis.completeness_score}%</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            {/* Section Completeness Checklist */}
            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Section-by-Section Completeness Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(analysis.checklist || []).map((item: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.completed ? <CheckCircle2 size={16} color="#059669" /> : <AlertTriangle size={16} color="#d97706" />}
                        {item.section}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: item.completed ? '#059669' : '#d97706' }}>
                        {item.points} / {item.maxPoints} pts
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>{item.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Improvement Suggestions with "Why" Explanations */}
            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Actionable Improvement Recommendations
              </h3>
              {(analysis.suggestions || []).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#059669' }}>
                  <CheckCircle2 size={36} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700 }}>All core resume sections meet MITCORER T&P criteria!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analysis.suggestions.map((sug: any, idx: number) => (
                    <div key={idx} style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e' }}>{sug.title}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>{sug.priority} PRIORITY</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#1e293b', margin: '4px 0 6px' }}>
                        <strong>What to do:</strong> {sug.recommendation}
                      </p>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                        <strong>Why this matters:</strong> {sug.why}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Domain Keyword & Action Verb Guidance */}
          {analysis.domain_guidance && (
            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Domain Keyword & Action Verb Guide — {analysis.domain_guidance.domain}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: '#059669' }}>Matched Domain Keywords ({analysis.domain_guidance.matched_keywords.length}):</strong>
                  <p style={{ color: '#334155', marginTop: '4px' }}>
                    {analysis.domain_guidance.matched_keywords.join(', ') || 'None matched yet'}
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#d97706' }}>Recommended Keywords to Consider:</strong>
                  <p style={{ color: '#334155', marginTop: '4px' }}>
                    {analysis.domain_guidance.recommended_keywords.join(', ') || 'All domain keywords covered'}
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#2563eb' }}>Strong Engineering Action Verbs:</strong>
                  <p style={{ color: '#334155', marginTop: '4px' }}>
                    {analysis.domain_guidance.recommended_action_verbs.join(' • ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERSONALIZED INTERNSHIP & SKILL GAP RECOMMENDATIONS */}
      {activeTab === 'RECOMMENDATIONS' && (
        <div className="non-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '18px 22px', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e3a8a', marginBottom: '4px' }}>
              Transparent Compatibility & Skill Gap Matching Engine
            </div>
            <div style={{ fontSize: '13px', color: '#1e40af' }}>
              {methodologyNote || 'Compatibility scores are estimated from your recorded skills, branch, CGPA, and preferred domain against active published opportunities.'}
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <Briefcase size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>No Open Published Opportunities Found</h3>
              <p style={{ fontSize: '13.5px' }}>When new opportunities are published by the T&P Cell, personalized compatibility matches will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recommendations.map((rec: any) => (
                <div key={rec.opportunity_id} className="card" style={{ padding: '22px', borderLeft: `4px solid ${rec.compatibility_score >= 75 ? '#059669' : rec.compatibility_score >= 55 ? '#2563eb' : '#d97706'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {rec.title}
                        </h3>
                        <span className="badge badge-published">{rec.domain}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                        {rec.organization} • {rec.location} ({rec.mode})
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                        Duration: <strong>{rec.duration}</strong> • Stipend: <strong>{rec.stipend}</strong> • Apply Before: <strong>{rec.deadline}</strong> • Min CGPA: <strong>{rec.min_cgpa || 'N/A'}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: rec.compatibility_score >= 75 ? '#059669' : '#2563eb' }}>
                        {rec.compatibility_score}% Match
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                        {rec.compatibility_label} (Estimated)
                      </div>
                    </div>
                  </div>

                  {/* Skill Gap Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#065f46', marginBottom: '4px' }}>
                        ✓ Matched Skills ({rec.matched_skills.length}):
                      </div>
                      <div style={{ color: '#334155' }}>
                        {rec.matched_skills.length > 0 ? rec.matched_skills.join(', ') : 'No direct skill keywords matched yet'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                        ▲ Skill Gap / Missing Skills ({rec.missing_skills.length}):
                      </div>
                      <div style={{ color: '#334155' }}>
                        {rec.missing_skills.length > 0 ? rec.missing_skills.join(', ') : 'All required skills present on your resume!'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                        Recommended Learning & Assessments:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: '#334155', fontSize: '12.5px' }}>
                        {(rec.recommended_learning_topics || []).map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {rec.eligibility_notes?.length > 0 && (
                    <div style={{ fontSize: '12.5px', color: '#b45309', marginBottom: '12px' }}>
                      <strong>Eligibility Note:</strong> {rec.eligibility_notes.join(' | ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <Link to="/student/skills" style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600 }}>
                      View Skill Assessments &rarr;
                    </Link>
                    <Link
                      to={`/student/opportunities?id=${rec.opportunity_id}`}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      View Opportunity & Apply <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Print Stylesheet so One-Click PDF Download outputs clean A4 Resume only */}
      <style>{`
        @media print {
          .sidebar, .topbar, .non-print {
            display: none !important;
          }
          .main-content, .page-body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .resume-workspace-grid {
            display: block !important;
          }
          .a4-resume-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
