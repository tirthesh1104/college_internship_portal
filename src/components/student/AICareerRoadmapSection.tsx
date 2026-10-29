import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, CheckCircle2, RefreshCw, Award, ArrowRight, Bot, Compass, Target, Clock, ShieldCheck, Info } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface PhaseCardData {
  timeframe: string;
  title: string;
  focus: string;
  targetSkills: string[];
  milestones: string[];
  completionCriteria: string;
}

interface RoadmapResult {
  rawText: string;
  phases: [PhaseCardData, PhaseCardData, PhaseCardData];
  provider: string;
  model: string;
  isLocalFallback: boolean;
  assumptionsAndMissingFields: string[];
  generatedAt: string;
}

const DOMAIN_SKILL_MAP: { [domain: string]: { p1Skills: string[]; p2Skills: string[]; p3Skills: string[]; project: string } } = {
  'Full Stack Web Development': {
    p1Skills: ['TypeScript', 'React Component Architecture', 'RESTful API Design', 'SQL Schema Modeling'],
    p2Skills: ['Node.js / Express Middleware', 'JWT Authentication & RBAC', 'Database Indexing & Query Optimization', 'Automated Integration Testing'],
    p3Skills: ['System Design & Caching', 'CI/CD Deployment Pipelines', 'Performance Profiling', 'Technical Interview Problem Solving'],
    project: 'End-to-End Multi-Role Web Platform with REST API & Persistent Database'
  },
  'AI, Machine Learning & Data Science': {
    p1Skills: ['Python Data Pipelines (NumPy/Pandas)', 'Exploratory Data Analysis', 'Statistical Modeling', 'SQL for Analytics'],
    p2Skills: ['Supervised & Unsupervised ML (Scikit-Learn)', 'Feature Engineering & Cross-Validation', 'Model Serialization & FastAPI Serving', 'Experiment Tracking'],
    p3Skills: ['Deep Learning / LLM Integration', 'Model Drift Monitoring & Evaluation', 'End-to-End ML Capstone Deployment', 'ML Case Study Interviews'],
    project: 'Production-Ready Predictive Analytics Service with Live Evaluation Dashboard'
  },
  'Embedded Systems, IoT & VLSI': {
    p1Skills: ['Embedded C & Pointer Safety', 'Microcontroller Peripherals (UART/SPI/I2C)', 'Schematic Reading & Logic Analyzers', 'Digital Logic Design'],
    p2Skills: ['FreeRTOS Task Scheduling & Semaphores', 'Interrupt Latency Optimization', 'MQTT / BLE IoT Telemetry', 'Low-Power Firmware Modes'],
    p3Skills: ['Hardware-in-the-Loop (HIL) Verification', 'PCB Layout Review & EMI/EMC Basics', 'Firmware Watchdog & Fault Recovery', 'Core Embedded Technical Interviews'],
    project: 'Real-Time Multi-Sensor IoT Edge Node with RTOS Task Management'
  },
  'CAD / CAM, Thermal & Mechanical Design': {
    p1Skills: ['3D Parametric Part & Assembly Modeling (SolidWorks/CATIA)', 'GD&T (ASME Y14.5) Tolerancing', 'Engineering Materials Selection', 'Engineering Drawing Standards'],
    p2Skills: ['Finite Element Analysis (ANSYS Structural/Thermal)', 'Mesh Convergence & Boundary Validation', 'DFM / DFA Cost & Manufacturability Review', 'CNC Toolpath Simulation'],
    p3Skills: ['Multi-Body Dynamic Simulation', 'Bill of Materials (BOM) & PLM Documentation', 'Prototype Stress Testing Report', 'Core Mechanical Design Interviews'],
    project: 'Validated 3D Mechanical Sub-Assembly with FEA Stress & Thermal Safety Factor Report'
  },
  'Structural, BIM & Civil Infrastructure': {
    p1Skills: ['AutoCAD 2D/3D Drafting Standards', 'Limit State RCC Design (IS 456)', 'Geotechnical Soil Bearing Analysis', 'Quantity Surveying & Estimation'],
    p2Skills: ['STAAD.Pro / ETABS Structural Modeling', 'Seismic & Wind Load Combinations (IS 1893)', 'BIM Coordination (Revit)', 'Construction Project Scheduling'],
    p3Skills: ['Foundation & Retaining Wall Detailing', 'Bar Bending Schedule (BBS) & BOQ Verification', 'Site Quality Assurance Compliance', 'Civil & Structural Placement Prep'],
    project: 'Multi-Storey RCC Frame Structural Analysis, Load Combination & Detailing Package'
  }
};

export const AICareerRoadmapSection: React.FC = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [targetDomain, setTargetDomain] = useState<string>('Full Stack Web Development');
  const [departmentCode, setDepartmentCode] = useState<string>('CSE');
  const [departmentName, setDepartmentName] = useState<string>('Computer Science & Engineering');
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [regenerationCount, setRegenerationCount] = useState<number>(0);

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [roadmapData, setRoadmapData] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load authenticated student's actual profile, skills, branch, and internship history
  useEffect(() => {
    setLoadingData(true);
    Promise.allSettled([
      api.get<any>('/resumes/me/'),
      api.get<any[]>('/internships/me/')
    ]).then(([resOutcome, internOutcome]) => {
      const resData = resOutcome.status === 'fulfilled' ? resOutcome.value : null;
      const internData = internOutcome.status === 'fulfilled' ? internOutcome.value : [];

      const r = resData?.resume || {};
      const deptCode = r.department_code || user?.student_profile?.department_code || 'CSE';
      const deptName = r.department_name || user?.student_profile?.department_name || 'Engineering';
      setDepartmentCode(deptCode);
      setDepartmentName(deptName);

      const savedSkills: string[] = Array.isArray(r.skills)
        ? r.skills.filter(Boolean)
        : typeof r.skills === 'string' && r.skills.trim()
          ? r.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
      setSkills(savedSkills);

      // Determine default domain based on saved career goal or department
      if (r.target_domain && r.target_domain.trim()) {
        setTargetDomain(r.target_domain.trim());
      } else if (deptCode === 'ENTC') {
        setTargetDomain('Embedded Systems, IoT & VLSI');
      } else if (deptCode === 'MECH') {
        setTargetDomain('CAD / CAM, Thermal & Mechanical Design');
      } else if (deptCode === 'CIVIL') {
        setTargetDomain('Structural, BIM & Civil Infrastructure');
      } else {
        setTargetDomain('Full Stack Web Development');
      }

      const validInternships = Array.isArray(internData) ? internData : [];
      setInternships(validInternships);

      const missing: string[] = [];
      if (savedSkills.length === 0) {
        missing.push('Saved technical skills (none recorded in Resume Builder yet)');
      }
      if (!r.target_domain) {
        missing.push(`Target career domain (inferred "${deptCode}" branch default until saved in profile)`);
      }
      if (validInternships.length === 0) {
        missing.push('Prior internship records (0 internships recorded; plan assumes foundational entry-level starting point)');
      }
      setMissingProfileFields(missing);
    }).finally(() => setLoadingData(false));
  }, [user]);

  const buildStructuredPhases = (domain: string, currentSkills: string[], internList: any[], cycle: number): [PhaseCardData, PhaseCardData, PhaseCardData] => {
    const matchedDomainKey = Object.keys(DOMAIN_SKILL_MAP).find(k =>
      domain.toLowerCase().includes(k.split(' ')[0].toLowerCase())
    ) || (departmentCode === 'ENTC'
      ? 'Embedded Systems, IoT & VLSI'
      : departmentCode === 'MECH'
        ? 'CAD / CAM, Thermal & Mechanical Design'
        : departmentCode === 'CIVIL'
          ? 'Structural, BIM & Civil Infrastructure'
          : 'Full Stack Web Development');

    const template = DOMAIN_SKILL_MAP[matchedDomainKey];
    const existingSkillsNote = currentSkills.length > 0
      ? `Leverage existing skills (${currentSkills.slice(0, 3).join(', ')}) while closing foundation gaps`
      : `Establish core technical foundation for ${domain} from scratch`;

    const hasInternship = internList.length > 0;
    const focusVariant = cycle % 2 === 1 ? ' (Accelerated Industry Track)' : '';

    return [
      {
        timeframe: 'Days 1 – 30',
        title: `1. Foundation & Core Skill Mastery${focusVariant}`,
        focus: `${existingSkillsNote} and build daily problem-solving consistency.`,
        targetSkills: template.p1Skills,
        milestones: [
          `Complete structured hands-on labs covering ${template.p1Skills.slice(0, 2).join(' and ')}`,
          `Solve 20+ domain-specific technical exercises with documented solutions`,
          `Build a clean, modular starter prototype demonstrating ${template.p1Skills[2] || domain}`
        ],
        completionCriteria: `Deliverable: Verified repository or lab workbook demonstrating ${template.p1Skills[0]} proficiency.`
      },
      {
        timeframe: 'Days 31 – 60',
        title: `2. Applied System Integration & Project Build${focusVariant}`,
        focus: `Transition from isolated concepts to building and testing an end-to-end engineering deliverable for ${domain}.`,
        targetSkills: template.p2Skills,
        milestones: [
          `Architect and implement: ${template.project}`,
          `Integrate ${template.p2Skills.slice(0, 2).join(' + ')} with proper validation & error handling`,
          hasInternship
            ? `Align project deliverables with learnings from your recorded internship (${internList[0].role_title || internList[0].organization_name})`
            : `Document system architecture, test cases, and benchmark metrics for coordinator review`
        ],
        completionCriteria: `Deliverable: Functional capstone project with README, architecture diagram, and test results.`
      },
      {
        timeframe: 'Days 61 – 90',
        title: `3. Placement Readiness & Interview Mastery${focusVariant}`,
        focus: `Polish ATS resume alignment, complete mock technical interviews, and prepare for campus/industrial drives.`,
        targetSkills: template.p3Skills,
        milestones: [
          `Update MITCORER Resume Builder with quantified metrics from your 60-day capstone project`,
          `Complete 3+ role-specific practice sessions in the AI Mock Interviewer & Technical Quiz tabs`,
          `Submit applications to matching MITCORER published internship opportunities`
        ],
        completionCriteria: `Deliverable: >=80% ATS Resume Match Score and verified mock interview readiness.`
      }
    ];
  };

  const buildLocalFallbackRoadmap = (
    domain: string,
    currentSkills: string[],
    internList: any[],
    missingFields: string[],
    cycle: number
  ): RoadmapResult => {
    const phases = buildStructuredPhases(domain, currentSkills, internList, cycle);
    const skillsSummary = currentSkills.length > 0
      ? currentSkills.join(', ')
      : 'None recorded in profile yet (using branch-standard foundational skill baseline)';
    const internSummary = internList.length > 0
      ? internList.map(i => `${i.role_title || i.role || 'Intern'} at ${i.organization_name || i.company || 'Organization'} (${i.status || 'Recorded'})`).join('; ')
      : 'None recorded in profile (roadmap calibrated for first-time internship candidate)';

    const rawText = `[LOCAL RULE-BASED 30-60-90 DAY ROADMAP — GENERATED FROM SAVED STUDENT PROFILE]
Student Branch: ${departmentName} (${departmentCode})
Target Career Domain: ${domain}
Saved Profile Skills Used: ${skillsSummary}
Recorded Internship History: ${internSummary}
${missingFields.length > 0 ? `Assumptions / Missing Profile Fields:\n- ${missingFields.join('\n- ')}\n` : ''}
PHASE 1 — DAYS 1 TO 30: ${phases[0].title}
• Primary Focus: ${phases[0].focus}
• Target Skills to Acquire: ${phases[0].targetSkills.join(', ')}
• Actionable Milestones:
  1. ${phases[0].milestones[0]}
  2. ${phases[0].milestones[1]}
  3. ${phases[0].milestones[2]}
• Phase 1 Completion Criteria: ${phases[0].completionCriteria}

PHASE 2 — DAYS 31 TO 60: ${phases[1].title}
• Primary Focus: ${phases[1].focus}
• Target Skills to Acquire: ${phases[1].targetSkills.join(', ')}
• Actionable Milestones:
  1. ${phases[1].milestones[0]}
  2. ${phases[1].milestones[1]}
  3. ${phases[1].milestones[2]}
• Phase 2 Completion Criteria: ${phases[1].completionCriteria}

PHASE 3 — DAYS 61 TO 90: ${phases[2].title}
• Primary Focus: ${phases[2].focus}
• Target Skills to Acquire: ${phases[2].targetSkills.join(', ')}
• Actionable Milestones:
  1. ${phases[2].milestones[0]}
  2. ${phases[2].milestones[1]}
  3. ${phases[2].milestones[2]}
• Phase 3 Completion Criteria: ${phases[2].completionCriteria}`;

    return {
      rawText,
      phases,
      provider: 'Local Rule-Based Roadmap Engine',
      model: 'MITCORER Competency Matrix v2',
      isLocalFallback: true,
      assumptionsAndMissingFields: missingFields,
      generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const handleGenerateRoadmap = async (customDomainOverride?: string) => {
    const activeDomain = (customDomainOverride ?? targetDomain).trim() || 'Full Stack Web Development';
    const nextCycle = regenerationCount + 1;
    setRegenerationCount(nextCycle);
    setGenerating(true);
    setError(null);

    const phases = buildStructuredPhases(activeDomain, skills, internships, nextCycle);
    const skillsStr = skills.length > 0
      ? skills.join(', ')
      : 'No saved skills in profile yet (assume foundational branch coursework only; do not invent prior skills)';
    const internStr = internships.length > 0
      ? internships.map(i => `${i.role_title || i.role} at ${i.organization_name || i.company} (${i.status})`).join('; ')
      : 'No prior formal industrial internship recorded yet (do not invent prior internships).';

    const prompt = `Generate a personalized 30-60-90 day skill-building career roadmap for an engineering student at MAEER’s MITCORER Barshi (Iteration #${nextCycle}).

STUDENT PROFILE CONTEXT (STRICTLY USE ONLY THESE FACTS):
Department: ${departmentName} (${departmentCode})
Target Career Domain: ${activeDomain}
Current Saved Profile Skills: ${skillsStr}
Recorded Internship History: ${internStr}
Missing Profile Fields / Assumptions: ${missingProfileFields.length > 0 ? missingProfileFields.join('; ') : 'All core profile fields present'}

Format the response clearly into 3 phases:
1. 30 Days (Days 1–30): Foundation & Core Skill Mastery
   - Primary Focus & Target Skills
   - 3-4 Actionable Weekly Tasks & Learning Milestones
   - 30-Day Completion Criteria & Practical Deliverable
2. 60 Days (Days 31–60): Applied System Integration & Industry Deliverables
   - Primary Focus & Target Skills
   - 3-4 Actionable System Engineering Milestones
   - 60-Day Completion Criteria & Capstone Component
3. 90 Days (Days 61–90): Placement Readiness, Mock Drills & Portfolio Finalization
   - Primary Focus & Target Skills
   - 3-4 Placement & Interview Readiness Milestones
   - 90-Day Completion Criteria`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are an Executive Career & Technical Pathway Advisor for MITCORER Barshi. Produce structured, realistic 30-60-90 day engineering skill-building plans strictly grounded in the student profile without inventing unrecorded internships or skills.',
        featureName: 'CAREER_ROADMAP'
      });

      const text = (res.text || '').trim();
      if (!text) throw new Error('Empty roadmap response');

      setRoadmapData({
        rawText: text,
        phases,
        provider: res.provider || 'Google Gemini',
        model: res.model || 'gemini-2.0-flash',
        isLocalFallback: false,
        assumptionsAndMissingFields: missingProfileFields,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    } catch (_err: any) {
      // Clean fallback to deterministic rule-based roadmap generator
      const fallback = buildLocalFallbackRoadmap(activeDomain, skills, internships, missingProfileFields, nextCycle);
      setRoadmapData(fallback);
    } finally {
      setGenerating(false);
    }
  };

  // Initial trigger once profile data finishes loading
  useEffect(() => {
    if (!loadingData && !roadmapData && !generating) {
      handleGenerateRoadmap();
    }
  }, [loadingData]);

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={16} /> Personalized Career Pathway
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            30-60-90 Day Actionable Skill-Building Roadmap
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            Built from your saved profile: <strong>{departmentCode}</strong> • Saved Skills: <strong>{skills.length > 0 ? skills.slice(0, 5).join(', ') : 'None recorded yet'}</strong> • Recorded Internships: <strong>{internships.length}</strong>
          </p>
        </div>

        <button
          onClick={() => handleGenerateRoadmap()}
          disabled={generating || loadingData}
          className="btn btn-outline"
          style={{ borderColor: '#2563eb', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Updating Plan...' : 'Regenerate 30-60-90 Plan'}
        </button>
      </div>

      {/* Target Career Domain Selector */}
      <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
          <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
            Target Career Domain:
          </label>
          <select
            className="form-control"
            value={targetDomain}
            onChange={(e) => {
              const nextDomain = e.target.value;
              setTargetDomain(nextDomain);
              handleGenerateRoadmap(nextDomain);
            }}
            style={{ maxWidth: '360px', fontSize: '13px', fontWeight: 600 }}
          >
            {Object.keys(DOMAIN_SKILL_MAP).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {roadmapData && (
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Last generated at <strong>{roadmapData.generatedAt}</strong>
          </div>
        )}
      </div>

      {/* Assumptions & Missing Profile Fields Notice */}
      {missingProfileFields.length > 0 && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e', fontSize: '12.5px', marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
          <div>
            <strong>Profile Completeness & Roadmap Assumptions:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              {missingProfileFields.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {(generating || loadingData) && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
          <p style={{ fontSize: '13.5px' }}>Analyzing your saved skills & internship history to synthesize a 30-60-90 day plan...</p>
        </div>
      )}

      {/* Structured Visual Timeline Display */}
      {roadmapData && !generating && !loadingData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Provider Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={16} color={roadmapData.isLocalFallback ? '#d97706' : '#2563eb'} /> Tailored Plan for {departmentCode} • {targetDomain}
            </span>
            <span
              className="badge"
              style={{
                fontSize: '11px',
                backgroundColor: roadmapData.isLocalFallback ? '#fef3c7' : '#eff6ff',
                color: roadmapData.isLocalFallback ? '#92400e' : '#1e40af',
                border: `1px solid ${roadmapData.isLocalFallback ? '#fde68a' : '#bfdbfe'}`
              }}
            >
              {roadmapData.isLocalFallback
                ? 'Local Rule-Based Roadmap Generator'
                : `Live AI Plan (${roadmapData.provider} • ${roadmapData.model})`}
            </span>
          </div>

          {/* Timeline Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Phase 1: 30 Days */}
            <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge" style={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '11.5px' }}>
                    {roadmapData.phases[0].timeframe}
                  </span>
                  <Clock size={16} color="#2563eb" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>
                  {roadmapData.phases[0].title}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#1e40af', lineHeight: 1.5, marginBottom: '10px', fontWeight: 500 }}>
                  {roadmapData.phases[0].focus}
                </p>
                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {roadmapData.phases[0].targetSkills.map(s => (
                    <span key={s} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1e3a8a' }}>
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <strong>Actionable Milestones:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '16px', lineHeight: 1.5 }}>
                    {roadmapData.phases[0].milestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#dbeafe', padding: '8px 10px', borderRadius: '6px' }}>
                ✓ {roadmapData.phases[0].completionCriteria}
              </div>
            </div>

            {/* Phase 2: 60 Days */}
            <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 800, fontSize: '11.5px' }}>
                    {roadmapData.phases[1].timeframe}
                  </span>
                  <Target size={16} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#14532d', marginBottom: '8px' }}>
                  {roadmapData.phases[1].title}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#15803d', lineHeight: 1.5, marginBottom: '10px', fontWeight: 500 }}>
                  {roadmapData.phases[1].focus}
                </p>
                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {roadmapData.phases[1].targetSkills.map(s => (
                    <span key={s} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#14532d' }}>
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <strong>Actionable Milestones:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '16px', lineHeight: 1.5 }}>
                    {roadmapData.phases[1].milestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#14532d', backgroundColor: '#dcfce7', padding: '8px 10px', borderRadius: '6px' }}>
                ✓ {roadmapData.phases[1].completionCriteria}
              </div>
            </div>

            {/* Phase 3: 90 Days */}
            <div style={{ padding: '20px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1.5px solid #e9d5ff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: 800, fontSize: '11.5px' }}>
                    {roadmapData.phases[2].timeframe}
                  </span>
                  <Award size={16} color="#7c3aed" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#581c87', marginBottom: '8px' }}>
                  {roadmapData.phases[2].title}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#7e22ce', lineHeight: 1.5, marginBottom: '10px', fontWeight: 500 }}>
                  {roadmapData.phases[2].focus}
                </p>
                <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {roadmapData.phases[2].targetSkills.map(s => (
                    <span key={s} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#f3e8ff', color: '#581c87' }}>
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                  <strong>Actionable Milestones:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '16px', lineHeight: 1.5 }}>
                    {roadmapData.phases[2].milestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#581c87', backgroundColor: '#f3e8ff', padding: '8px 10px', borderRadius: '6px' }}>
                ✓ {roadmapData.phases[2].completionCriteria}
              </div>
            </div>
          </div>

          {/* Detailed Step-by-Step Roadmap Text Output */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '13.5px',
            lineHeight: 1.7,
            color: '#1e293b',
            whiteSpace: 'pre-wrap'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              Detailed Step-by-Step {roadmapData.isLocalFallback ? 'Rule-Based' : 'AI'} Guidance:
            </h4>
            {roadmapData.rawText}
          </div>
        </div>
      )}
    </div>
  );
};
