import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Mic, Send, RefreshCw, CheckCircle2, AlertTriangle, Lightbulb, Briefcase, Award, ArrowRight, Bot, Info } from 'lucide-react';
import { api } from '../../services/api';

interface Opportunity {
  id: number;
  title: string;
  organization: string;
  required_skills?: string;
  eligibility_requirements?: string;
  description?: string;
  domain?: string;
}

interface LocalInterviewQuestion {
  category: string;
  question: string;
  expectedKeywords: string[];
  modelAnswer: string;
}

function buildRoleQuestionBank(roleTitle: string, company: string, reqSkillsStr: string): LocalInterviewQuestion[] {
  const skills = reqSkillsStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const lowerContext = `${roleTitle} ${reqSkillsStr}`.toLowerCase();

  const primarySkill = skills[0] || 'Core Engineering';
  const secondarySkill = skills[1] || 'System Design';
  const tertiarySkill = skills[2] || 'Debugging & Testing';

  const bank: LocalInterviewQuestion[] = [];

  if (lowerContext.includes('embedded') || lowerContext.includes('iot') || lowerContext.includes('rtos') || lowerContext.includes('microcontroller') || lowerContext.includes('plc') || lowerContext.includes('scada')) {
    bank.push(
      {
        category: 'Embedded Firmware & RTOS',
        question: `For the ${roleTitle} role at ${company}, how would you design a deterministic interrupt service routine (ISR) and task communication pipeline in ${primarySkill} to read high-frequency sensor telemetry without blocking critical control loops?`,
        expectedKeywords: ['interrupt', 'isr', 'volatile', 'queue', 'rtos', 'latency', 'buffer', 'priority', 'mutex', 'semaphore', 'non-blocking'],
        modelAnswer: 'Keep the ISR minimal by capturing raw register data into a lock-free ring buffer or posting to an RTOS queue using FromISR APIs, marking shared flags as volatile, and deferring heavy parsing/filtering to a high-priority worker task.'
      },
      {
        category: 'Hardware-Software Interfacing',
        question: `When interfacing microcontrollers with external sensors at ${company} using serial protocols (${secondarySkill}, I2C, SPI, or CAN), how do you diagnose and recover from bus lockups, noise corruption, or slave timeout faults?`,
        expectedKeywords: ['timeout', 'watchdog', 'crc', 'checksum', 'clock', 'pull-up', 'retry', 'ack', 'bus', 'reset', 'error'],
        modelAnswer: 'Implement hardware/software timeouts on every bus transaction, validate payload integrity using CRC/checksums, toggle SCL clock pulses to release stuck I2C lines, and configure a watchdog timer with graceful peripheral re-initialization.'
      },
      {
        category: 'Low-Power & Memory Safety',
        question: `In resource-constrained embedded systems requiring ${reqSkillsStr}, what strategies do you use to prevent stack overflow, heap fragmentation, and race conditions during long-running field deployments?`,
        expectedKeywords: ['static', 'stack', 'memory', 'allocation', 'critical section', 'atomic', 'watchdog', 'bounds', 'overflow'],
        modelAnswer: 'Prefer static or pool-based memory allocation over dynamic malloc/free, analyze worst-case stack depth, guard shared state with critical sections or atomic operations, and enable hardware memory protection units (MPU) where available.'
      }
    );
  }

  if (lowerContext.includes('cad') || lowerContext.includes('solidworks') || lowerContext.includes('ansys') || lowerContext.includes('mechanical') || lowerContext.includes('fea')) {
    bank.push(
      {
        category: 'CAD/CAM & FEA Simulation',
        question: `As a ${roleTitle} candidate at ${company}, walk through how you validate a 3D mechanical assembly using ${primarySkill} and ${secondarySkill}—specifically choosing mesh density, boundary conditions, and factor of safety criteria.`,
        expectedKeywords: ['mesh', 'convergence', 'boundary', 'stress', 'von mises', 'safety', 'tolerance', 'load', 'material', 'constraint'],
        modelAnswer: 'Simplify non-structural fillets before meshing, apply realistic load and fixture boundary conditions, perform mesh convergence studies around stress risers, evaluate Von Mises stress against yield strength, and verify GD&T stack-up tolerances.'
      },
      {
        category: 'Design for Manufacturability (DFM)',
        question: `How do you apply Geometric Dimensioning and Tolerancing (GD&T) when transitioning a prototype component at ${company} from 3D CAD modeling to CNC machining or sheet-metal fabrication?`,
        expectedKeywords: ['datum', 'tolerance', 'gd&t', 'cnc', 'machining', 'fit', 'clearance', 'inspection', 'surface', 'cost'],
        modelAnswer: 'Select functional primary/secondary/tertiary datums based on assembly mating surfaces, apply positional and profile tolerances only where critical to function, and avoid over-tightening non-critical dimensions to reduce machining cost.'
      }
    );
  }

  if (lowerContext.includes('staad') || lowerContext.includes('civil') || lowerContext.includes('structural') || lowerContext.includes('railway') || lowerContext.includes('concrete') || lowerContext.includes('bim')) {
    bank.push(
      {
        category: 'Structural Analysis & IS Code Compliance',
        question: `For the ${roleTitle} position at ${company}, explain how you model dead load, live load, and dynamic/seismic load combinations in ${primarySkill} while ensuring compliance with Indian Standard (IS) design codes.`,
        expectedKeywords: ['load', 'dead', 'live', 'seismic', 'bending', 'shear', 'deflection', 'is 456', 'foundation', 'reinforcement', 'factor'],
        modelAnswer: 'Define accurate section and material properties, apply limit-state load combinations per IS 456 / IS 1893, check bending moment and shear envelopes, verify serviceability deflection limits, and detail reinforcement anchorage.'
      },
      {
        category: 'Site Execution & Quantity Surveying',
        question: `How would you reconcile discrepancies between structural drawings (${secondarySkill}), Bill of Quantities (BOQ), and actual site soil/foundation conditions during an infrastructure project at ${company}?`,
        expectedKeywords: ['boq', 'quantity', 'drawing', 'site', 'quality', 'cube test', 'slump', 'bar bending', 'inspection', 'survey'],
        modelAnswer: 'Cross-verify bar bending schedules (BBS) and structural drawings against site survey benchmarks, document variation orders with quantity take-offs, and enforce cube compressive strength and slump quality checks.'
      }
    );
  }

  if (lowerContext.includes('ai') || lowerContext.includes('ml') || lowerContext.includes('machine learning') || lowerContext.includes('data') || lowerContext.includes('pandas') || lowerContext.includes('scikit')) {
    bank.push(
      {
        category: 'Machine Learning & Model Evaluation',
        question: `In the ${roleTitle} role at ${company}, suppose your classification model built with ${primarySkill} and ${secondarySkill} achieves 96% training accuracy but performs poorly on minority-class production data. How would you diagnose and fix this?`,
        expectedKeywords: ['overfitting', 'imbalance', 'precision', 'recall', 'f1', 'cross-validation', 'regularization', 'smote', 'feature', 'leakage'],
        modelAnswer: 'Check for class imbalance and data leakage first; switch evaluation from raw accuracy to Precision-Recall AUC and F1-score, use stratified k-fold cross-validation, apply class weights or resampling, and regularize model complexity.'
      },
      {
        category: 'Data Pipelines & Feature Engineering',
        question: `How do you design a reproducible data preprocessing and feature engineering pipeline using ${primarySkill} and ${tertiarySkill} to handle missing values, outliers, and schema drift?`,
        expectedKeywords: ['pipeline', 'imputation', 'outlier', 'scaling', 'normalization', 'schema', 'validation', 'sql', 'pandas', 'train-test'],
        modelAnswer: 'Fit scalers and imputers strictly on the training split to prevent data leakage, encapsulate transformations in a Pipeline object, validate incoming data schemas, and log feature distributions.'
      }
    );
  }

  // Always include versatile software / full-stack / engineering problem-solving questions tailored to the selected role & skills
  bank.push(
    {
      category: 'System Architecture & API Engineering',
      question: `For the ${roleTitle} position at ${company}, how would you design a secure, fault-tolerant application workflow using ${primarySkill} and ${secondarySkill}, including input validation, authentication, and error recovery?`,
      expectedKeywords: ['validation', 'authentication', 'jwt', 'error', 'status', 'database', 'transaction', 'logging', 'security', 'api', 'test'],
      modelAnswer: `Validate all inputs at the boundary, enforce token-based authentication and role authorization, wrap multi-step persistence in atomic transactions, handle failures with structured error responses, and write automated unit/integration tests for ${primarySkill}.`
    },
    {
      category: 'Performance Optimization & Debugging',
      question: `Imagine a core module at ${company} built with ${primarySkill} and ${tertiarySkill} experiences slow response times under concurrent load. Walk through your step-by-step profiling and optimization approach.`,
      expectedKeywords: ['profile', 'bottleneck', 'index', 'cache', 'query', 'complexity', 'async', 'pagination', 'memory', 'latency', 'benchmark'],
      modelAnswer: 'Measure baseline latency before changing code, identify whether the bottleneck is CPU, memory, or database I/O, add missing database indexes or pagination, eliminate N+1 queries, cache frequently read data, and verify improvements with benchmarks.'
    },
    {
      category: 'Engineering Scenario & Problem Solving',
      question: `During your internship as ${roleTitle} at ${company}, you are asked to integrate a new feature using ${reqSkillsStr} into an existing codebase with tight deadlines. How do you ensure code quality, backward compatibility, and timely delivery?`,
      expectedKeywords: ['requirements', 'modular', 'git', 'branch', 'test', 'edge case', 'review', 'documentation', 'incremental', 'milestone'],
      modelAnswer: 'Break the feature into small vertical milestones, clarify edge cases early with the mentor, work on a dedicated Git feature branch, write regression tests for existing behavior, and document assumptions clearly for code review.'
    }
  );

  return bank;
}

function evaluateAnswerLocally(
  question: string,
  answer: string,
  roleTitle: string,
  company: string,
  reqSkillsStr: string,
  expectedKeywords: string[],
  modelAnswer: string
) {
  const cleanAnswer = answer.trim();
  const lowerAnswer = cleanAnswer.toLowerCase();
  const words = cleanAnswer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const roleSkillTokens = reqSkillsStr
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const allTargetKeywords = Array.from(new Set([...expectedKeywords.map(k => k.toLowerCase()), ...roleSkillTokens]));
  const matchedKeywords = allTargetKeywords.filter(kw => lowerAnswer.includes(kw));
  const missingKeywords = allTargetKeywords.filter(kw => !lowerAnswer.includes(kw));

  const hasStructure = /(\n|1\.|2\.|first|second|step|because|therefore|for example|e\.g\.|finally)/i.test(cleanAnswer);
  const hasTechnicalDepth = wordCount >= 45;
  const hasModerateLength = wordCount >= 20;

  let score = 35;
  // Keyword coverage up to 35 pts
  if (allTargetKeywords.length > 0) {
    score += Math.min(35, Math.round((matchedKeywords.length / Math.min(6, allTargetKeywords.length)) * 35));
  }
  // Length and depth up to 20 pts
  if (wordCount >= 70) score += 20;
  else if (hasTechnicalDepth) score += 15;
  else if (hasModerateLength) score += 8;
  // Structured explanation bonus up to 10 pts
  if (hasStructure) score += 10;

  score = Math.min(96, Math.max(25, score));

  const strengths: string[] = [];
  if (matchedKeywords.length > 0) {
    strengths.push(`Referenced relevant technical concepts: ${matchedKeywords.slice(0, 6).join(', ')}.`);
  }
  if (hasTechnicalDepth) {
    strengths.push(`Provided a detailed explanation (${wordCount} words) with clear technical context for ${roleTitle}.`);
  } else if (hasModerateLength) {
    strengths.push(`Addressed the core prompt concisely (${wordCount} words).`);
  }
  if (hasStructure) {
    strengths.push('Used logical sequencing / structured cause-and-effect reasoning.');
  }
  if (strengths.length === 0) {
    strengths.push('Submitted an initial response attempt to the technical scenario.');
  }

  const missingPoints: string[] = [];
  if (missingKeywords.length > 0) {
    missingPoints.push(`Consider incorporating key domain terms where applicable: ${missingKeywords.slice(0, 6).join(', ')}.`);
  }
  if (!hasTechnicalDepth) {
    missingPoints.push('Response is relatively brief; expand on concrete implementation steps, edge cases, and failure handling.');
  }
  if (!hasStructure) {
    missingPoints.push('Break your answer into clear steps (1. Architecture/Setup, 2. Core Implementation, 3. Edge Cases & Verification).');
  }

  const rawText = `Score: ${score}/100 (Rule-Based Local Evaluation)

Key Strengths:
${strengths.map(s => `• ${s}`).join('\n')}

Missing Points & Concepts to Add:
${missingPoints.map(m => `• ${m}`).join('\n')}

Constructive Feedback for ${roleTitle} (${company}):
• Structure your answer using the STAR / System Engineering pattern: state the problem constraint, explain why you chose specific tools (${reqSkillsStr}), and describe how you verify correctness under edge cases.

Model Answer Summary:
${modelAnswer}`;

  return {
    rawText,
    score,
    provider: 'Local Practice Mode (Rule-Based Evaluator)',
    model: 'Built-in Engineering Rubric',
    isLocalFallback: true
  };
}

export const AIMockInterviewSection: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('custom');
  const [customRoleTitle, setCustomRoleTitle] = useState<string>('Full Stack Software Development Intern');
  const [targetCompany, setTargetCompany] = useState<string>('Tech Mahindra');

  const [question, setQuestion] = useState<string>('');
  const [questionCategory, setQuestionCategory] = useState<string>('Technical Fundamentals');
  const [questionSource, setQuestionSource] = useState<'AI' | 'LOCAL'>('LOCAL');
  const [currentLocalMeta, setCurrentLocalMeta] = useState<LocalInterviewQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);

  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [evaluation, setEvaluation] = useState<any>(null);

  const [generatingQuestion, setGeneratingQuestion] = useState<boolean>(false);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const questionCounterRef = useRef<number>(0);

  // Load available internship opportunities
  useEffect(() => {
    api.get<Opportunity[]>('/opportunities/')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setOpportunities(res);
          setSelectedOppId(String(res[0].id));
        }
      })
      .catch(err => console.error('Failed to load opportunities:', err));
  }, []);

  const getSelectedOpp = useCallback((): Opportunity | null => {
    if (selectedOppId === 'custom') return null;
    return opportunities.find(o => String(o.id) === selectedOppId) || null;
  }, [selectedOppId, opportunities]);

  const handleGenerateQuestion = useCallback(async (advanceIndex = true) => {
    const opp = getSelectedOpp();
    const roleTitle = (opp ? opp.title : customRoleTitle).trim();
    const company = (opp ? opp.organization : targetCompany).trim();

    if (!roleTitle) {
      setError('Please enter a target role title before generating a question.');
      return;
    }

    setGeneratingQuestion(true);
    setError(null);
    setStatusNotice(null);
    setEvaluation(null);
    setStudentAnswer('');

    const reqSkills = opp
      ? (opp.required_skills || 'Core Engineering, Problem Solving')
      : 'Python, React, TypeScript, SQL, REST APIs, Algorithms';
    const reqDesc = opp ? (opp.description || opp.eligibility_requirements || '') : '';

    const localBank = buildRoleQuestionBank(roleTitle, company || 'Target Organization', reqSkills);
    const nextIdx = advanceIndex ? questionCounterRef.current : Math.max(0, questionCounterRef.current - 1);
    questionCounterRef.current = nextIdx + 1;
    setQuestionIndex(nextIdx);
    const fallbackItem = localBank[nextIdx % localBank.length];
    setCurrentLocalMeta(fallbackItem);

    const variationTopics = [
      'System Architecture & Implementation',
      'Debugging, Edge Cases & Fault Tolerance',
      'Performance Optimization & Scalability',
      'Data Integrity, Security & Testing',
      'Real-World Engineering Scenario'
    ];
    const focusAngle = variationTopics[nextIdx % variationTopics.length];

    const prompt = `Generate 1 realistic, challenging, role-specific technical interview question (Question #${nextIdx + 1}, Focus Angle: ${focusAngle}) for an engineering student applying for:
Role: ${roleTitle}
Organization: ${company || 'Industry Partner'}
Required Technical Skills: ${reqSkills}
Job Context/Requirements: ${reqDesc}

Make the question specific, practical, and scenario-based (different from basic textbook definitions). Output format:
Category: [Category Name]
Question: [The Interview Question]
Key Points Candidate Should Cover: [Short 2-3 bullet outline for internal evaluator]`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider?: string; model?: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are a Senior Technical Interviewer for MAEER’s MITCORER Barshi Placement Cell. Ask precise, realistic, role-specific engineering interview questions.',
        featureName: 'MOCK_INTERVIEW'
      });

      const text = (res.text || '').trim();
      if (!text) throw new Error('Empty question returned.');

      if (text.includes('Category:')) {
        const catMatch = text.match(/Category:\s*(.+)/i);
        if (catMatch) setQuestionCategory(catMatch[1].trim());
      } else {
        setQuestionCategory(focusAngle);
      }

      const qMatch = text.match(/Question:\s*([\s\S]+?)(?:Key Points Candidate Should Cover:|$)/i);
      if (qMatch && qMatch[1].trim()) {
        setQuestion(qMatch[1].trim());
      } else {
        setQuestion(text);
      }
      setQuestionSource('AI');
    } catch {
      // Graceful fallback to role-specific local practice mode
      setQuestionCategory(fallbackItem.category);
      setQuestion(fallbackItem.question);
      setQuestionSource('LOCAL');
      setStatusNotice('Live AI service is unavailable — running in Local Practice Mode with role-specific engineering questions and rule-based evaluation.');
    } finally {
      setGeneratingQuestion(false);
    }
  }, [getSelectedOpp, customRoleTitle, targetCompany]);

  // Generate question when role/opportunity changes
  useEffect(() => {
    handleGenerateQuestion(true);
  }, [selectedOppId, opportunities.length]);

  const handleEvaluateAnswer = async () => {
    if (!question) {
      setError('Please generate a question first.');
      return;
    }
    if (!studentAnswer.trim()) {
      setError('Please enter your technical response before clicking Evaluate My Response.');
      return;
    }
    if (studentAnswer.trim().length < 10) {
      setError('Please provide a more complete technical explanation (at least a full sentence) for meaningful evaluation.');
      return;
    }

    setEvaluatingAnswer(true);
    setError(null);

    const opp = getSelectedOpp();
    const roleTitle = (opp ? opp.title : customRoleTitle).trim() || 'Engineering Intern';
    const company = (opp ? opp.organization : targetCompany).trim() || 'Target Organization';
    const reqSkills = opp
      ? (opp.required_skills || 'Core Engineering, Problem Solving')
      : 'Python, React, TypeScript, SQL, REST APIs, Algorithms';

    const localBank = buildRoleQuestionBank(roleTitle, company, reqSkills);
    const activeMeta = currentLocalMeta || localBank[questionIndex % localBank.length];

    const prompt = `Evaluate the student's text response to the technical interview question below for the role of "${roleTitle}" at "${company}".

INTERVIEW QUESTION:
"${question}"

STUDENT'S RESPONSE:
"${studentAnswer.trim()}"

Provide a structured evaluation formatted with:
Score: [Rating out of 100]
Key Strengths: [What the student explained well]
Missing Points: [Technical concepts or edge cases missed]
Constructive Feedback: [Actionable improvement advice]
Model Answer Summary: [Ideal concise technical answer]`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are an Expert Technical Interview Assessor for MITCORER Internship Hub. Evaluate responses constructively with clear scores (0-100) and actionable engineering feedback.',
        featureName: 'MOCK_INTERVIEW'
      });

      const text = (res.text || '').trim();
      if (!text) throw new Error('Empty evaluation received.');

      const scoreMatch = text.match(/Score:\s*(\d{1,3})/i);
      const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 78;

      setEvaluation({
        rawText: text,
        score: Math.min(100, Math.max(0, extractedScore)),
        provider: res.provider || 'Google Gemini',
        model: res.model || 'gemini-2.0-flash',
        isLocalFallback: false
      });
    } catch {
      const localEval = evaluateAnswerLocally(
        question,
        studentAnswer,
        roleTitle,
        company,
        reqSkills,
        activeMeta.expectedKeywords,
        activeMeta.modelAnswer
      );
      setEvaluation(localEval);
      setStatusNotice('Live AI provider was unavailable — your response was evaluated using the Local Rule-Based Technical Rubric.');
    } finally {
      setEvaluatingAnswer(false);
    }
  };

  const currentOpp = getSelectedOpp();

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={16} /> Interactive AI Mock Interviewer
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Role-Specific Interview Practice &amp; Response Evaluator
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            Practice questions tailored to real MITCORER published internship opportunities with instant technical feedback.
          </p>
        </div>

        <button
          onClick={() => handleGenerateQuestion(true)}
          disabled={generatingQuestion}
          className="btn btn-outline"
          style={{ borderColor: '#7c3aed', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={generatingQuestion ? 'animate-spin' : ''} />
          {generatingQuestion ? 'Generating Question...' : 'Next Question'}
        </button>
      </div>

      {/* Practice Mode / Status Banner */}
      {statusNotice && (
        <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '12.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Select Internship Opportunity Context */}
      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
          Select Target Internship Application / Role:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <select
            className="form-control"
            value={selectedOppId}
            onChange={(e) => {
              setSelectedOppId(e.target.value);
              setEvaluation(null);
              setError(null);
            }}
          >
            {opportunities.map(o => (
              <option key={o.id} value={String(o.id)}>
                {o.title} — {o.organization}
              </option>
            ))}
            <option value="custom">+ Custom Target Role &amp; Company</option>
          </select>

          {selectedOppId === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Target Role (e.g. AI Engineer)"
                value={customRoleTitle}
                onChange={(e) => setCustomRoleTitle(e.target.value)}
                style={{ flex: '1 1 180px' }}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Company Name"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                style={{ flex: '1 1 140px' }}
              />
              <button
                type="button"
                onClick={() => handleGenerateQuestion(true)}
                disabled={generatingQuestion}
                className="btn btn-secondary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                Update Role Question
              </button>
            </div>
          )}
        </div>

        {currentOpp ? (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span><strong>Company:</strong> {currentOpp.organization}</span>
            <span><strong>Required Skills:</strong> {currentOpp.required_skills || 'Core Fundamentals'}</span>
          </div>
        ) : (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span><strong>Custom Target Role:</strong> {customRoleTitle || 'Not specified'}</span>
            <span><strong>Target Company:</strong> {targetCompany || 'General Industry'}</span>
          </div>
        )}
      </div>

      {/* Active Interview Question Box */}
      <div style={{ backgroundColor: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>
              {questionCategory}
            </span>
            <span className="badge" style={{
              backgroundColor: questionSource === 'AI' ? '#ecfdf5' : '#eff6ff',
              color: questionSource === 'AI' ? '#047857' : '#1e40af',
              border: `1px solid ${questionSource === 'AI' ? '#a7f3d0' : '#bfdbfe'}`,
              fontSize: '10.5px',
              fontWeight: 700
            }}>
              {questionSource === 'AI' ? 'Generated by Live AI' : 'Local Practice Question Bank'}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 600 }}>
            Role: {currentOpp ? currentOpp.title : customRoleTitle}
          </span>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#3b0764', lineHeight: 1.5, margin: '8px 0 0' }}>
          {question || 'Click "Next Question" to generate a technical interview question.'}
        </h3>
      </div>

      {/* Student Answer Input Box */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>
          Your Answer (Text-Based Response):
        </label>
        <textarea
          rows={5}
          className="form-control"
          placeholder="Type your technical response clearly, explaining key concepts, architectures, or step-by-step logic..."
          value={studentAnswer}
          onChange={(e) => {
            setStudentAnswer(e.target.value);
            if (error) setError(null);
          }}
          style={{ fontSize: '13.5px', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Tip: Be specific with engineering terminology and include structural steps or edge-case handling where applicable.
          </span>

          <button
            onClick={handleEvaluateAnswer}
            disabled={evaluatingAnswer || !question}
            className="btn btn-primary"
            style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed', minWidth: '180px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {evaluatingAnswer ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Evaluating...
              </>
            ) : (
              <>
                <Send size={16} /> Evaluate My Response
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation / Error Alert */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Evaluation Output Panel */}
      {evaluation && (
        <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '20px', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={22} color="#7c3aed" />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {evaluation.isLocalFallback
                    ? 'Local Practice Mode — Rule-Based Interview Evaluation'
                    : 'AI Interview Performance Evaluation'}
                </h4>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {evaluation.isLocalFallback
                    ? 'Evaluated locally using role-specific keyword & structure rubric (No external AI model used)'
                    : `Evaluated via ${evaluation.provider} (${evaluation.model})`}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: evaluation.score >= 80 ? '#ecfdf5' : evaluation.score >= 60 ? '#fffbeb' : '#fef2f2',
              color: evaluation.score >= 80 ? '#047857' : evaluation.score >= 60 ? '#b45309' : '#dc2626',
              fontWeight: 800,
              fontSize: '16px',
              border: `1px solid ${evaluation.score >= 80 ? '#a7f3d0' : evaluation.score >= 60 ? '#fde68a' : '#fecaca'}`
            }}>
              Score: {evaluation.score} / 100
            </div>
          </div>

          <div style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {evaluation.rawText}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setStudentAnswer('');
                setEvaluation(null);
                handleGenerateQuestion(true);
              }}
              className="btn btn-primary"
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
            >
              Try Next Question &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
