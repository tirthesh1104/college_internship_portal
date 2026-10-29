import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, CheckCircle2, AlertTriangle, Target, BookOpen, RefreshCw, Award, ArrowRight, Bot, Building2, Info } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  organization: string;
  required_skills?: string;
  eligibility_requirements?: string;
  description?: string;
  min_cgpa?: number;
}

interface StructuredAnalysisResult {
  rawText: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  provider: string;
  model: string;
  isLocalFallback: boolean;
  opportunityTitle: string;
  missingDataWarnings: string[];
}

export const AIResumeAnalyzerSection: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [customRequirements, setCustomRequirements] = useState<string>('');

  const [resumeText, setResumeText] = useState<string>('');
  const [savedProfileData, setSavedProfileData] = useState<any>(null);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<StructuredAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load authenticated student resume/profile and published opportunities
  useEffect(() => {
    Promise.allSettled([
      api.get<any>('/resumes/me/'),
      api.get<Opportunity[]>('/opportunities/')
    ]).then(([resOutcome, oppsOutcome]) => {
      const resData = resOutcome.status === 'fulfilled' ? resOutcome.value : null;
      const oppsData = oppsOutcome.status === 'fulfilled' ? oppsOutcome.value : [];

      const r = resData?.resume || {};
      setSavedProfileData(r);

      const studentName = r.student_name || user?.name || 'Authenticated Student';
      const deptName = r.department_name || user?.student_profile?.department_name || 'Engineering';
      const deptCode = r.department_code || user?.student_profile?.department_code || 'ENG';
      const cgpaVal = r.cgpa ?? user?.student_profile?.cgpa;
      const cgpaDisplay = cgpaVal !== undefined && cgpaVal !== null && String(cgpaVal).trim() !== '' && Number(cgpaVal) > 0
        ? String(cgpaVal)
        : 'Not recorded in profile';

      const skillsArr: string[] = Array.isArray(r.skills)
        ? r.skills.filter(Boolean)
        : typeof r.skills === 'string' && r.skills.trim()
          ? r.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

      const summaryStr = (r.summary || '').trim();
      const projectsArr = Array.isArray(r.projects) ? r.projects : [];
      const projectsStr = projectsArr.length > 0
        ? projectsArr.map((p: any) => `- ${p.title || 'Project'}: ${p.description || ''} ${p.technologies ? `[Tech: ${p.technologies}]` : ''}`).join('\n')
        : 'No projects listed in saved profile yet.';

      const missingFields: string[] = [];
      if (cgpaDisplay === 'Not recorded in profile') missingFields.push('CGPA');
      if (skillsArr.length === 0) missingFields.push('Verified Technical Skills');
      if (!summaryStr) missingFields.push('Career Summary / Objective');
      if (projectsArr.length === 0) missingFields.push('Academic / Personal Projects');
      setMissingProfileFields(missingFields);

      const autoText = `Name: ${studentName}
Department: ${deptName} (${deptCode})
CGPA: ${cgpaDisplay}
Summary: ${summaryStr || 'Not provided in saved resume profile.'}
Skills: ${skillsArr.length > 0 ? skillsArr.join(', ') : 'None listed in saved profile'}
Projects:
${projectsStr}`;
      setResumeText(autoText);

      if (Array.isArray(oppsData) && oppsData.length > 0) {
        setOpportunities(oppsData);
        setSelectedOppId(String(oppsData[0].id));
      }
    });
  }, [user]);

  const getSelectedOpp = (): Opportunity | null => {
    if (selectedOppId === 'custom' || !selectedOppId) return null;
    return opportunities.find(o => String(o.id) === selectedOppId) || null;
  };

  // Extract normalized skill tokens from requirements and resume
  const computeSkillGapComparison = (resumeStr: string, reqSkillsStr: string) => {
    const rawRequired = reqSkillsStr
      .split(/[,;/|\n]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && !/^(and|or|the|with|for|in|to|of|n\/a|core engineering)$/i.test(s));

    // If custom text is prose, extract known technical keywords as well
    const commonTechKeywords = [
      'Python', 'Java', 'C++', 'C', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express',
      'SQL', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Git', 'REST API', 'HTML', 'CSS',
      'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Embedded C', 'RTOS',
      'STM32', 'Arduino', 'IoT', 'MQTT', 'VLSI', 'Verilog', 'MATLAB', 'Simulink',
      'AutoCAD', 'SolidWorks', 'CATIA', 'ANSYS', 'FEA', 'CAD', 'CAM', 'GD&T',
      'STAAD.Pro', 'ETABS', 'Revit', 'BIM', 'Structural Analysis', 'Surveying', 'RCC'
    ];

    let targetSkills = rawRequired.length > 0 && rawRequired.length <= 18 ? rawRequired : [];
    if (targetSkills.length === 0) {
      targetSkills = commonTechKeywords.filter(kw =>
        new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(reqSkillsStr)
      );
    }
    if (targetSkills.length === 0 && rawRequired.length > 0) {
      targetSkills = rawRequired.slice(0, 8);
    }

    const resumeLower = resumeStr.toLowerCase();
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    targetSkills.forEach(skill => {
      const cleanSkill = skill.trim();
      if (!cleanSkill) return;
      const parts = cleanSkill.toLowerCase().split(/\s+/);
      const isMatched = resumeLower.includes(cleanSkill.toLowerCase()) ||
        (parts.length > 1 && parts.every(p => p.length > 2 && resumeLower.includes(p)));
      if (isMatched) {
        matchedSkills.push(cleanSkill);
      } else {
        missingSkills.push(cleanSkill);
      }
    });

    return { matchedSkills, missingSkills, targetSkills };
  };

  const buildLocalRuleBasedAnalysis = (
    resumeStr: string,
    opp: Opportunity | null,
    customReq: string
  ): StructuredAnalysisResult => {
    const oppTitle = opp ? `${opp.title} (${opp.organization})` : 'Custom Internship Requirement';
    const reqSource = opp
      ? `${opp.required_skills || ''} ${opp.eligibility_requirements || ''} ${opp.description || ''}`
      : customReq;

    const { matchedSkills, missingSkills, targetSkills } = computeSkillGapComparison(
      resumeStr,
      opp?.required_skills || reqSource
    );

    const warnings: string[] = [];
    if (/CGPA:\s*Not recorded/i.test(resumeStr)) {
      warnings.push('Your CGPA is not recorded in your profile. Add your current CGPA in Resume Builder to verify academic eligibility thresholds.');
    }
    if (/Skills:\s*None listed/i.test(resumeStr)) {
      warnings.push('No technical skills were found in your saved profile. Add your programming languages, tools, and domain skills.');
    }
    if (/No projects listed/i.test(resumeStr)) {
      warnings.push('No projects are listed in your resume. Include at least 2 hands-on academic or personal projects with measurable outcomes.');
    }

    const skillRatio = targetSkills.length > 0
      ? matchedSkills.length / targetSkills.length
      : 0.5;

    let computedScore = Math.round(skillRatio * 75);
    if (!/No projects listed/i.test(resumeStr) && /project/i.test(resumeStr)) computedScore += 15;
    if (!/Not provided in saved resume profile/i.test(resumeStr)) computedScore += 10;
    computedScore = Math.max(15, Math.min(96, computedScore));

    const recommendations: string[] = [];
    if (missingSkills.length > 0) {
      recommendations.push(`Add hands-on coursework or project evidence for missing requirement keywords: ${missingSkills.slice(0, 5).join(', ')}.`);
    } else {
      recommendations.push('Highlight your matched technical skills directly in the top summary and project bullet points.');
    }
    recommendations.push('Quantify your project bullet points using the Action Verb + Technical Stack + Measurable Impact formula (e.g., "Engineered module using X reducing latency by 25%").');
    if (opp?.eligibility_requirements) {
      recommendations.push(`Ensure your resume explicitly addresses the opportunity eligibility criteria: "${opp.eligibility_requirements}".`);
    } else {
      recommendations.push('Include links to your GitHub repositories or technical documentation to substantiate your listed skills.');
    }

    const primaryMissing = missingSkills[0] || targetSkills[0] || 'Core Domain Fundamentals';
    const secondaryMissing = missingSkills[1] || targetSkills[1] || 'Applied System Implementation';

    const rawText = `[LOCAL RULE-BASED ATS & SKILL GAP ANALYSIS — NO EXTERNAL AI USED]
Target Opportunity: ${oppTitle}

1. ATS Compatibility Match Score: ${computedScore}%
   - Matched Skills (${matchedSkills.length}): ${matchedSkills.length > 0 ? matchedSkills.join(', ') : 'None detected in current resume text'}
   - Missing Skills (${missingSkills.length}): ${missingSkills.length > 0 ? missingSkills.join(', ') : 'None — all primary keywords present'}

2. Actionable Resume & Bullet Point Recommendations:
${recommendations.map((r, i) => `   ${i + 1}. ${r}`).join('\n')}

3. Personalized 4-Week Learning Roadmap:
   - Week 1 (Foundation): Master core fundamentals of ${primaryMissing} through official documentation and hands-on lab exercises.
   - Week 2 (Mini-Project): Build a focused prototype demonstrating ${secondaryMissing} and push clean, documented code to GitHub.
   - Week 3 (Integration & Testing): Integrate ${matchedSkills.slice(0, 2).join(' & ') || 'your core stack'} with ${primaryMissing}, adding validation and unit tests.
   - Week 4 (ATS Alignment & Mock Prep): Update your MITCORER Resume Builder profile with the new project metrics and complete a practice Mock Interview for ${opp ? opp.title : 'this target role'}.`;

    return {
      rawText,
      score: computedScore,
      matchedSkills,
      missingSkills,
      recommendations,
      provider: 'Local Rule-Based Skill Matcher',
      model: 'Deterministic ATS Keyword & Eligibility Engine',
      isLocalFallback: true,
      opportunityTitle: oppTitle,
      missingDataWarnings: warnings
    };
  };

  const handleRunAnalysis = async () => {
    setError(null);

    if (!resumeText.trim() || resumeText.trim().length < 20) {
      setError('Resume information is missing or too short. Please enter your skills, academic details, and project descriptions in the Resume Data box before running analysis.');
      return;
    }

    const opp = getSelectedOpp();
    if (selectedOppId === 'custom' && (!customRequirements.trim() || customRequirements.trim().length < 10)) {
      setError('Target job requirements are missing. Please paste the job description or required skills for the custom opportunity, or select a published internship from the dropdown.');
      return;
    }

    if (!opp && selectedOppId !== 'custom') {
      setError('Please select a target internship opportunity or choose "+ Paste Custom Job Description / Requirements".');
      return;
    }

    setAnalyzing(true);

    const localBaseline = buildLocalRuleBasedAnalysis(resumeText, opp, customRequirements);

    const requirementsContext = opp
      ? `Role Title: ${opp.title}
Organization: ${opp.organization}
Required Skills: ${opp.required_skills || 'N/A'}
Minimum CGPA: ${opp.min_cgpa ?? 'Not specified'}
Eligibility & Requirements: ${opp.eligibility_requirements || 'N/A'}
Description: ${opp.description || 'N/A'}`
      : customRequirements.trim();

    const prompt = `Analyze the student's resume against the specified internship requirements.

STUDENT RESUME DATA:
"${resumeText.trim()}"

TARGET INTERNSHIP OPPORTUNITY REQUIREMENTS:
"${requirementsContext}"

PRE-COMPUTED KEYWORD MATCH BASELINE:
- Matched Skills: ${localBaseline.matchedSkills.join(', ') || 'None'}
- Missing Skills: ${localBaseline.missingSkills.join(', ') || 'None'}

Perform an accurate ATS & technical requirement comparison based strictly on the provided student resume data and target requirements (do not invent student skills that are not in the resume). Output a structured report with:
1. ATS Compatibility Match Score: [Score out of 100%]
2. Matched Technical Skills: [List matched skills]
3. Missing Technical Skills & Keywords: [List specific missing technical skills]
4. Formatting & Bullet Point Recommendations: [3 actionable suggestions]
5. Personalized 4-Week Learning Roadmap:
   - Week 1: [Milestone & learning tasks]
   - Week 2: [Milestone & mini-project]
   - Week 3: [Milestone & integration]
   - Week 4: [Capstone submission & interview readiness]`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are an Expert ATS Resume & Career Skill Assessor for MAEER’s MIT College of Railway Engineering & Research (MITCORER), Barshi. Provide accurate keyword gap analysis and structured 4-week roadmaps based strictly on the student resume and opportunity requirements.',
        featureName: 'RESUME_ANALYZER'
      });

      const text = (res.text || '').trim();
      if (!text) {
        throw new Error('Empty response from AI provider');
      }

      const scoreMatch = text.match(/Score:\s*(\d{1,3})/i) || text.match(/(\d{1,3})%/);
      const scoreVal = scoreMatch ? parseInt(scoreMatch[1], 10) : localBaseline.score;

      setResult({
        rawText: text,
        score: Math.min(100, Math.max(0, scoreVal)),
        matchedSkills: localBaseline.matchedSkills,
        missingSkills: localBaseline.missingSkills,
        recommendations: localBaseline.recommendations,
        provider: res.provider || 'Google Gemini',
        model: res.model || 'gemini-3.8-flash',
        isLocalFallback: false,
        opportunityTitle: opp ? `${opp.title} (${opp.organization})` : 'Custom Internship Requirement',
        missingDataWarnings: localBaseline.missingDataWarnings
      });
    } catch (_err: any) {
      // Fall back cleanly to deterministic rule-based skill matching & gap analysis
      setResult(localBaseline);
    } finally {
      setAnalyzing(false);
    }
  };

  const currentOpp = getSelectedOpp();

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} /> AI Resume & Opportunity Requirement Analyzer
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          ATS Match Scoring, Skill Gap Detection & 4-Week Personalized Roadmap
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
          Cross-reference your saved profile and resume against published internship requirements to uncover missing technical skills before applying.
        </p>
      </div>

      {/* Notice if profile fields are incomplete */}
      {missingProfileFields.length > 0 && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e', fontSize: '12.5px', marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
          <div>
            <strong>Profile Data Notice:</strong> Your saved profile is currently missing: <strong>{missingProfileFields.join(', ')}</strong>. You can type or paste additional details directly in the Resume Data editor below, or update your permanent profile in the Resume Builder tab.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Left Column: Target Opportunity Selection */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'block' }}>
            1. Select Target Internship Opportunity:
          </label>
          <select
            className="form-control"
            value={selectedOppId}
            onChange={(e) => {
              setSelectedOppId(e.target.value);
              setError(null);
            }}
            style={{ marginBottom: '12px' }}
          >
            {opportunities.map(o => (
              <option key={o.id} value={String(o.id)}>
                {o.title} — {o.organization}
              </option>
            ))}
            <option value="custom">+ Paste Custom Job Description / Requirements</option>
          </select>

          {selectedOppId === 'custom' ? (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Paste Job Description / Required Skills:
              </label>
              <textarea
                rows={4}
                className="form-control"
                placeholder="Paste key responsibilities, required technical skills (e.g. React, TypeScript, SQL, Docker), or job posting text here..."
                value={customRequirements}
                onChange={(e) => {
                  setCustomRequirements(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          ) : currentOpp && (
            <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} /> {currentOpp.organization}
              </div>
              <div style={{ marginBottom: '4px' }}><strong>Role:</strong> {currentOpp.title}</div>
              <div style={{ marginBottom: '4px' }}><strong>Required Skills:</strong> {currentOpp.required_skills || 'Core Engineering'}</div>
              <div><strong>Eligibility:</strong> {currentOpp.eligibility_requirements || (currentOpp.min_cgpa ? `Min CGPA ${currentOpp.min_cgpa}` : 'Standard departmental eligibility')}</div>
            </div>
          )}
        </div>

        {/* Right Column: Resume Content Preview / Editor */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              2. Your Resume Data (Loaded from Authenticated Profile):
            </label>
            {savedProfileData && (
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                Synced with Profile
              </span>
            )}
          </div>
          <textarea
            rows={7}
            className="form-control"
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Edit or paste your current resume text, skills, and project descriptions here..."
            style={{ fontSize: '12.5px', fontFamily: 'monospace', lineHeight: 1.5 }}
          />
        </div>
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="btn btn-primary"
          style={{ minWidth: '220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px' }}
        >
          {analyzing ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Analyzing Resume & Requirements...
            </>
          ) : (
            <>
              <Target size={16} /> Run ATS & Skill Gap Analysis
            </>
          )}
        </button>
      </div>

      {/* Validation / Missing Information Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Result */}
      {result && (
        <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '20px', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={22} color={result.isLocalFallback ? '#d97706' : '#2563eb'} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    ATS Match & Skill Gap Report
                  </h4>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: result.isLocalFallback ? '#fef3c7' : '#eff6ff',
                    color: result.isLocalFallback ? '#92400e' : '#1e40af',
                    border: `1px solid ${result.isLocalFallback ? '#fde68a' : '#bfdbfe'}`
                  }}>
                    {result.isLocalFallback ? 'Local Rule-Based Analysis Mode' : `Live AI Analysis (${result.provider})`}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Target: {result.opportunityTitle} • Engine: {result.provider} ({result.model})
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '20px',
              backgroundColor: result.score >= 75 ? '#ecfdf5' : result.score >= 55 ? '#fffbeb' : '#fef2f2',
              color: result.score >= 75 ? '#047857' : result.score >= 55 ? '#b45309' : '#dc2626',
              fontWeight: 800,
              fontSize: '16px',
              border: `1px solid ${result.score >= 75 ? '#a7f3d0' : result.score >= 55 ? '#fde68a' : '#fecaca'}`
            }}>
              ATS Match: {result.score}%
            </div>
          </div>

          {/* Structured Matched & Missing Skills Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1fae5' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#059669" /> Matching Skills ({result.matchedSkills.length})
              </div>
              {result.matchedSkills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.matchedSkills.map(skill => (
                    <span key={skill} style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  No direct keyword matches found in your resume text for this opportunity's required skills.
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} color="#dc2626" /> Missing Skills / Keywords ({result.missingSkills.length})
              </div>
              {result.missingSkills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.missingSkills.map(skill => (
                    <span key={skill} style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                      + {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                  All primary required skills for this opportunity are present in your resume!
                </div>
              )}
            </div>
          </div>

          {result.missingDataWarnings.length > 0 && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#92400e' }}>
              <strong>Missing Resume Details Detected:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {result.missingDataWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            {result.rawText}
          </div>
        </div>
      )}
    </div>
  );
};
