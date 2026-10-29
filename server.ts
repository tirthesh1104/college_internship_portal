import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const SEED_DATA_FILE = path.join(__dirname, 'data', 'db_store.json');
const DATA_DIR = IS_VERCEL ? os.tmpdir() : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db_store.json');

// Server-side Security PINs (Never exposed in frontend code)
const COORDINATOR_SECURITY_PIN = process.env.COORDINATOR_SECURITY_PIN || '77';
const TOKEN_SIGNING_SECRET = process.env.TOKEN_SIGNING_SECRET || 'ipts_mitcorer_hmac_secret_2026';

// Note: A 1-4 digit numeric PIN has low entropy (max 10,000 combinations).
// Strong brute-force protection (per-IP rate limiting and audit logging) is enforced.
const ADMIN_SECURITY_PIN = (() => {
  const envPin = (process.env.ADMIN_SECURITY_PIN || '').trim();
  if (envPin) {
    if (/^\d{1,4}$/.test(envPin)) {
      return envPin;
    }
    console.warn(`[SECURITY] Configured ADMIN_SECURITY_PIN "${envPin}" does not match 1-4 digits limit! Defaulting to "1234".`);
  }
  return '1234';
})();

function isValidAdminPinFormat(pin: string): boolean {
  if (!pin || typeof pin !== 'string') return false;
  return /^\d{1,4}$/.test(pin.trim());
}

function verifyAdminSecurityPin(providedPin: string): { valid: boolean; reason?: string } {
  if (!providedPin || typeof providedPin !== 'string') {
    return { valid: false, reason: 'Admin Security PIN is required.' };
  }
  const clean = providedPin.trim();
  if (!/^\d+$/.test(clean)) {
    return { valid: false, reason: 'Admin Security PIN must contain digits only.' };
  }
  if (clean.length < 1 || clean.length > 4) {
    return { valid: false, reason: 'Admin Security PIN must be strictly 1 to 4 digits.' };
  }

  // Single authoritative check against configured ADMIN_SECURITY_PIN (preserving leading zeros)
  return { valid: clean === ADMIN_SECURITY_PIN };
}

function verifyCoordinatorSecurityPin(providedPin: string): boolean {
  if (!providedPin) return false;
  const clean = providedPin.trim();
  return clean === COORDINATOR_SECURITY_PIN;
}

// In-memory rate limiting for authentication attempts (per IP address)
const authAttemptMap = new Map<string, { count: number; firstAttempt: number }>();
function checkAuthRateLimit(ip: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = authAttemptMap.get(ip);
  if (!entry || (now - entry.firstAttempt) > windowMs) {
    authAttemptMap.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.firstAttempt + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

function resetAuthRateLimit(ip: string) {
  authAttemptMap.delete(ip);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[DB] Could not create DATA_DIR:', err);
  }
}

if (IS_VERCEL && !fs.existsSync(DATA_FILE) && fs.existsSync(SEED_DATA_FILE)) {
  try {
    fs.copyFileSync(SEED_DATA_FILE, DATA_FILE);
  } catch (err) {
    console.warn('[DB] Could not copy seed store to /tmp:', err);
  }
}

// ============================================================================
// DURABLE PERSISTENCE ADAPTER (Vercel KV / Upstash Redis / Remote REST DB)
// ============================================================================
const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
const HAS_DURABLE_STORAGE = Boolean(KV_URL && KV_TOKEN);
let durableStoreLoaded = false;

async function syncFromRemoteStorage(): Promise<boolean> {
  if (!HAS_DURABLE_STORAGE) return false;
  try {
    const res = await fetch(`${KV_URL}/get/ipts_db_store`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.result) {
        const remoteData = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
        if (remoteData && Array.isArray(remoteData.users)) {
          memoryStore = remoteData;
          durableStoreLoaded = true;
          try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(remoteData, null, 2), 'utf-8');
          } catch (_) {}
          return true;
        }
      } else {
        // If remote store is empty on first deployment, seed from baseline store
        const baseline = memoryStore || (fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) : getInitialStore());
        await syncToRemoteStorage(baseline);
        durableStoreLoaded = true;
        return true;
      }
    }
  } catch (err) {
    console.warn('[STORAGE] Failed to sync from remote KV store:', err);
  }
  return false;
}

async function syncToRemoteStorage(store: any): Promise<void> {
  if (!HAS_DURABLE_STORAGE) return;
  try {
    await fetch(`${KV_URL}/set/ipts_db_store`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(store)
    });
  } catch (err) {
    console.warn('[STORAGE] Failed to write to remote KV store:', err);
  }
}

// Middleware to ensure remote store is synchronized on cold start
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (HAS_DURABLE_STORAGE && !durableStoreLoaded) {
    await syncFromRemoteStorage();
  }
  next();
});

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'COORDINATOR' | 'ADMIN';
  passwordHash: string;
  is_active: boolean;
  created_at: string;
  student_profile?: any;
  coordinator_profile?: any;
}

interface AcademicConfig {
  current_academic_year: string;
  available_academic_years: string[];
  departments: Array<{ id: number; code: string; name: string }>;
  last_updated_at?: string;
}

interface AIProviderSettings {
  api_key: string;
  selected_model: string;
  is_connected: boolean;
  last_tested_at?: string;
  error_message?: string;
}

interface AIConfigData {
  active_provider: 'GEMINI' | 'CLAUDE' | 'NONE';
  gemini: AIProviderSettings;
  claude: AIProviderSettings;
  fallback_enabled: boolean;
}

interface DataStore {
  users: UserRecord[];
  posts: any[];
  teams: any[];
  internships: any[];
  opportunities: any[];
  applications: any[];
  reports: any[];
  tasks: any[];
  documents: any[];
  resumes: any[];
  notifications: any[];
  audit_logs: any[];
  assessments: any[];
  feedback: any[];
  academic_config?: AcademicConfig;
  ai_config?: AIConfigData;
}

function getDefaultAcademicConfig(): AcademicConfig {
  return {
    current_academic_year: '2026-2027',
    available_academic_years: [
      '2026-2027',
      '2027-2028',
      '2028-2029',
      '2029-2030',
      '2025-2026',
      '2024-2025'
    ],
    departments: [
      { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
      { id: 2, code: 'E&TC', name: 'Electronics & Telecommunication' },
      { id: 3, code: 'MECH', name: 'Mechanical Engineering' },
      { id: 4, code: 'CIVIL', name: 'Civil Engineering' }
    ],
    last_updated_at: new Date().toISOString()
  };
}

function isLegacyInvalidKey(key?: string): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed || trimmed.length < 15) return true;
  if (trimmed.includes('YOUR_KEY') || trimmed.includes('dummy') || trimmed.includes('placeholder')) return true;
  return false;
}

function getDefaultAIConfig(): AIConfigData {
  const defaultGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const defaultClaudeKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  return {
    active_provider: 'GEMINI',
    gemini: {
      api_key: defaultGeminiKey,
      selected_model: 'gemini-3.1-flash-lite',
      is_connected: Boolean(defaultGeminiKey)
    },
    claude: {
      api_key: defaultClaudeKey,
      selected_model: 'claude-3-5-sonnet-20241022',
      is_connected: Boolean(defaultClaudeKey)
    },
    fallback_enabled: true
  };
}

function maskApiKey(key?: string): string {
  if (!key || key.trim().length === 0) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

function formatFriendlyProviderError(providerName: string, err: any): string {
  const raw = String(err?.message || err || '').trim();
  const status = err?.status || err?.statusCode;
  if (status === 401 || raw.includes('401') || /invalid.*key|authentication_error|API_KEY_INVALID/i.test(raw)) {
    return `${providerName} authentication failed (HTTP 401): The configured API key is invalid or expired.`;
  }
  if (status === 403 || raw.includes('403') || /permission_denied|forbidden/i.test(raw)) {
    return `${providerName} access denied (HTTP 403): The API key does not have permission for the requested model.`;
  }
  if (status === 404 || raw.includes('404') || /not_found|model.*not found/i.test(raw)) {
    return `${providerName} model or endpoint not found (HTTP 404): Please verify the selected model.`;
  }
  if (status === 429 || raw.includes('429') || /rate_limit|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return `${providerName} rate limit reached (HTTP 429): Please wait a moment and try again.`;
  }
  if (status === 503 || raw.includes('503') || /UNAVAILABLE|high demand|overloaded/i.test(raw)) {
    return `${providerName} is experiencing temporary high demand (HTTP 503). Please retry shortly.`;
  }
  // Never leak raw JSON payloads, stack traces, or URLs
  if (raw.includes('{') || raw.includes('http') || raw.length > 160) {
    return `${providerName} encountered a temporary service error. Please try again shortly.`;
  }
  return raw || `${providerName} request failed.`;
}

function classifyStudentSafeAIError(err: any): { httpStatus: number; errorCode: string; studentMessage: string; logMessage: string } {
  const raw = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 0);
  if (status === 429 || raw.includes('429') || /rate_limit|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return {
      httpStatus: 429,
      errorCode: 'AI_RATE_LIMIT',
      studentMessage: 'The AI assistant has reached a temporary rate limit. Please wait a few seconds and try again.',
      logMessage: raw
    };
  }
  if (status === 503 || raw.includes('503') || /UNAVAILABLE|high demand|overloaded/i.test(raw)) {
    return {
      httpStatus: 503,
      errorCode: 'AI_MODEL_BUSY',
      studentMessage: 'The AI model is experiencing high demand right now. Please try again in a moment.',
      logMessage: raw
    };
  }
  if (status === 401 || status === 403 || raw.includes('401') || raw.includes('403') || /authentication|invalid.*key|permission_denied|not configured/i.test(raw)) {
    return {
      httpStatus: 503,
      errorCode: 'AI_AUTH_CONFIG',
      studentMessage: 'Live AI generation is temporarily unavailable while service credentials are being refreshed.',
      logMessage: raw
    };
  }
  if (status === 404 || raw.includes('404') || /not_found|model.*not found/i.test(raw)) {
    return {
      httpStatus: 502,
      errorCode: 'AI_MODEL_UNAVAILABLE',
      studentMessage: 'The selected AI model is temporarily unavailable. Please try again shortly.',
      logMessage: raw
    };
  }
  return {
    httpStatus: 502,
    errorCode: 'AI_SERVICE_ERROR',
    studentMessage: 'The AI assistant encountered a temporary issue processing your request. Please try again.',
    logMessage: raw
  };
}

async function testGeminiConnection(apiKey: string, modelName: string) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const requestedModel = modelName || 'gemini-3.1-flash-lite';
  const candidateModels = Array.from(new Set([requestedModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']));
  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: 'Connection verification check. Respond with "CONNECTED".'
      });
      if (response && response.text) {
        return {
          success: true,
          message: `Google Gemini API (${model}) verified successfully!`,
          response_sample: response.text.trim()
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(formatFriendlyProviderError('Google Gemini', lastError));
}

async function testClaudeConnection(apiKey: string, modelName: string) {
  try {
    const anthropic = new Anthropic({ apiKey });
    const model = modelName || 'claude-3-5-sonnet-20241022';
    const message = await anthropic.messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Connection verification check. Respond with "CONNECTED".' }]
    });
    const textContent = message.content.find(c => c.type === 'text');
    if (textContent && textContent.text) {
      return {
        success: true,
        message: `Anthropic Claude API (${model}) verified successfully!`,
        response_sample: textContent.text.trim()
      };
    }
    throw new Error('No output returned from Anthropic Claude API.');
  } catch (err: any) {
    throw new Error(formatFriendlyProviderError('Anthropic Claude', err));
  }
}

async function generateAIResponse(
  store: DataStore,
  options: {
    prompt: string;
    systemInstruction?: string;
    featureName?: string;
    responseFormat?: 'json' | 'text';
  }
): Promise<{ text: string; provider: string; model: string }> {
  const aiConfig = store.ai_config || getDefaultAIConfig();
  const primaryProvider = aiConfig.active_provider;

  const runGeminiWithKey = async (key: string, model: string): Promise<{ text: string; provider: string; model: string }> => {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction: options.systemInstruction || 'You are an expert AI advisor for MAEER’s MIT College of Railway Engineering & Research (MITCORER) Internship Hub.',
        temperature: 0.7,
        ...(options.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {})
      }
    });

    if (!response || !response.text) {
      throw new Error('Empty response received from Google Gemini API.');
    }
    return { text: response.text, provider: 'Google Gemini', model };
  };

  const tryGemini = async (): Promise<{ text: string; provider: string; model: string }> => {
    const envKey = (process.env.GEMINI_API_KEY || '').trim();
    const storedKey = !isLegacyInvalidKey(aiConfig.gemini.api_key) ? (aiConfig.gemini.api_key || '').trim() : '';
    const candidateKeys = Array.from(new Set([envKey, storedKey].filter(Boolean)));
    if (candidateKeys.length === 0) {
      throw new Error('Google Gemini API credentials are not configured.');
    }
    const primaryModel = aiConfig.gemini.selected_model || 'gemini-3.1-flash-lite';
    const candidateModels = Array.from(new Set([primaryModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro']));
    let lastError: any = null;
    for (const candidateKey of candidateKeys) {
      for (const candidateModel of candidateModels) {
        try {
          return await runGeminiWithKey(candidateKey, candidateModel);
        } catch (err: any) {
          lastError = err;
        }
      }
    }
    throw new Error(formatFriendlyProviderError('Google Gemini', lastError));
  };

  const tryClaude = async (): Promise<{ text: string; provider: string; model: string }> => {
    const storedKey = !isLegacyInvalidKey(aiConfig.claude.api_key) ? (aiConfig.claude.api_key || '').trim() : '';
    const envKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    const key = storedKey || envKey;
    if (!key) throw new Error('Anthropic Claude API credentials are not configured.');
    const model = aiConfig.claude.selected_model || 'claude-3-5-sonnet-20241022';
    const anthropic = new Anthropic({ apiKey: key });

    try {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: options.systemInstruction || 'You are an expert AI advisor for MAEER’s MIT College of Railway Engineering & Research (MITCORER) Internship Hub.',
        messages: [{ role: 'user', content: options.prompt }]
      });

      const textPart = message.content.find(c => c.type === 'text');
      if (!textPart || !textPart.text) {
        throw new Error('Empty response received from Anthropic Claude API.');
      }
      return { text: textPart.text, provider: 'Anthropic Claude', model };
    } catch (err: any) {
      throw new Error(formatFriendlyProviderError('Anthropic Claude', err));
    }
  };

  const hasValidClaudeKey = Boolean(
    (!isLegacyInvalidKey(aiConfig.claude?.api_key) && aiConfig.claude?.api_key?.trim()) ||
    (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim())
  );
  const hasValidGeminiKey = Boolean(
    (!isLegacyInvalidKey(aiConfig.gemini?.api_key) && aiConfig.gemini?.api_key?.trim()) ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
  );

  if (primaryProvider === 'CLAUDE' && hasValidClaudeKey) {
    try {
      return await tryClaude();
    } catch (claudeErr: any) {
      if (aiConfig.fallback_enabled && hasValidGeminiKey) {
        console.warn('[AI] Anthropic Claude failed, falling back to Google Gemini:', claudeErr?.message);
        return await tryGemini();
      }
      throw new Error(claudeErr?.message || 'External AI provider authentication failed or service is temporarily unavailable.');
    }
  } else {
    try {
      return await tryGemini();
    } catch (geminiErr: any) {
      if (aiConfig.fallback_enabled && hasValidClaudeKey) {
        console.warn('[AI] Google Gemini failed, falling back to Anthropic Claude:', geminiErr?.message);
        return await tryClaude();
      }
      throw new Error(geminiErr?.message || 'External AI provider is currently unavailable.');
    }
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, originalHash] = parts;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(originalHash, 'hex'));
  }
  return storedHash === password;
}

function getDefaultOpportunities(): any[] {
  return [
    {
      id: 101,
      title: 'Full Stack Web Development Intern (Python & React)',
      organization: 'Tech Mahindra Digital Solutions',
      opportunity_type: 'INTERNSHIP',
      mode: 'HYBRID',
      location: 'Pune, Maharashtra',
      country: 'India',
      duration: '8 Weeks',
      stipend_type: 'PAID',
      stipend_amount: '₹15,000 / month',
      stipend: '₹15,000 / month',
      deadline: '2027-06-15',
      available_seats: 12,
      min_cgpa: 7.0,
      eligibility_requirements: 'B.Tech CSE / E&TC with minimum 7.0 CGPA and strong fundamentals in web development.',
      eligible_branches: ['CSE', 'E&TC'],
      domain: 'Web Development',
      required_skills: 'Python, React, TypeScript, REST API, SQL, Git',
      description: 'Build and optimize enterprise web dashboards, REST APIs, and responsive React interfaces under senior engineering mentorship.',
      learning_outcomes: 'Production full-stack architecture, API security, automated testing, and agile sprint delivery.',
      application_type: 'INTERNAL',
      application_url: 'https://careers.techmahindra.com',
      status: 'PUBLISHED',
      created_by: 1,
      created_by_name: 'Prof. Meghraj Chougoule',
      created_by_role: 'ADMIN',
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      title: 'AI/ML & Data Science Engineering Intern',
      organization: 'Persistent Systems AI Lab',
      opportunity_type: 'INTERNSHIP',
      mode: 'REMOTE',
      location: 'Pune / Remote',
      country: 'India',
      duration: '8 Weeks',
      stipend_type: 'PAID',
      stipend_amount: '₹18,000 / month',
      stipend: '₹18,000 / month',
      deadline: '2027-06-20',
      available_seats: 8,
      min_cgpa: 7.5,
      eligibility_requirements: 'B.Tech CSE / E&TC students with 7.5+ CGPA and proficiency in Python & Machine Learning.',
      eligible_branches: ['CSE', 'E&TC'],
      domain: 'AI/ML',
      required_skills: 'Python, Machine Learning, Pandas, Scikit-Learn, SQL, Data Visualization',
      description: 'Develop predictive analytics pipelines, train classification models, and evaluate model accuracy on real industrial telemetry datasets.',
      learning_outcomes: 'Feature engineering, model evaluation metrics, data preprocessing, and MLOps deployment basics.',
      application_type: 'INTERNAL',
      application_url: 'https://www.persistent.com/careers',
      status: 'PUBLISHED',
      created_by: 1,
      created_by_name: 'Prof. Meghraj Chougoule',
      created_by_role: 'ADMIN',
      created_at: new Date().toISOString()
    },
    {
      id: 103,
      title: 'Embedded Systems & IoT Firmware Intern',
      organization: 'KPIT Technologies',
      opportunity_type: 'INTERNSHIP',
      mode: 'ONSITE',
      location: 'Pune, Maharashtra',
      country: 'India',
      duration: '8 Weeks',
      stipend_type: 'PAID',
      stipend_amount: '₹14,000 / month',
      stipend: '₹14,000 / month',
      deadline: '2027-06-10',
      available_seats: 10,
      min_cgpa: 6.8,
      eligibility_requirements: 'B.Tech E&TC / CSE / MECH with hands-on microcontroller and Embedded C experience.',
      eligible_branches: ['E&TC', 'CSE', 'MECH'],
      domain: 'VLSI/Embedded Systems',
      required_skills: 'Embedded C, Microcontrollers, RTOS, IoTProtocols, PCB Design, Verilog',
      description: 'Work on automotive embedded microcontroller firmware, CAN bus diagnostics, and real-time sensor integration.',
      learning_outcomes: 'Hardware-software co-design, RTOS task scheduling, and automotive grade embedded debugging.',
      application_type: 'INTERNAL',
      application_url: 'https://www.kpit.com/careers',
      status: 'PUBLISHED',
      created_by: 2,
      created_by_name: 'Tirthesh Gutte',
      created_by_role: 'COORDINATOR',
      created_at: new Date().toISOString()
    },
    {
      id: 104,
      title: 'CAD/CAM & Industrial Automation Intern',
      organization: 'Tata Motors Engineering Research Centre',
      opportunity_type: 'INTERNSHIP',
      mode: 'ONSITE',
      location: 'Pimpri-Chinchwad, Maharashtra',
      country: 'India',
      duration: '8 Weeks',
      stipend_type: 'PAID',
      stipend_amount: '₹12,000 / month',
      stipend: '₹12,000 / month',
      deadline: '2027-06-18',
      available_seats: 15,
      min_cgpa: 6.5,
      eligibility_requirements: 'B.Tech Mechanical / Civil Engineering students with CAD/CAM modeling proficiency.',
      eligible_branches: ['MECH', 'CIVIL'],
      domain: 'CAD/CAM',
      required_skills: 'AutoCAD, SolidWorks, ANSYS, Finite Element Analysis, CNC Machining, GD&T',
      description: 'Design 3D mechanical assemblies, perform structural/thermal simulations in ANSYS, and assist in prototype validation.',
      learning_outcomes: '3D parametric modeling, tolerance analysis, FEA stress verification, and manufacturing documentation.',
      application_type: 'INTERNAL',
      application_url: 'https://www.tatamotors.com/careers',
      status: 'PUBLISHED',
      created_by: 1,
      created_by_name: 'Prof. Meghraj Chougoule',
      created_by_role: 'ADMIN',
      created_at: new Date().toISOString()
    },
    {
      id: 105,
      title: 'Structural Engineering & Railway Infrastructure Intern',
      organization: 'L&T Construction (Heavy Civil Infrastructure)',
      opportunity_type: 'INTERNSHIP',
      mode: 'ONSITE',
      location: 'Solapur / Mumbai, Maharashtra',
      country: 'India',
      duration: '8 Weeks',
      stipend_type: 'PAID',
      stipend_amount: '₹12,500 / month',
      stipend: '₹12,500 / month',
      deadline: '2027-06-25',
      available_seats: 10,
      min_cgpa: 6.5,
      eligibility_requirements: 'B.Tech Civil / Mechanical Engineering students interested in railway & bridge infrastructure.',
      eligible_branches: ['CIVIL', 'MECH'],
      domain: 'Structural Engineering',
      required_skills: 'AutoCAD Civil 3D, STAAD.Pro, Structural Analysis, Quantity Surveying, Concrete Technology, BIM',
      description: 'Participate in railway bridge structural modeling, quantity estimation, and site quality verification under senior civil engineers.',
      learning_outcomes: 'STAAD.Pro structural design, IS code compliance, site execution workflows, and BOQ preparation.',
      application_type: 'INTERNAL',
      application_url: 'https://www.lntecc.com/careers',
      status: 'PUBLISHED',
      created_by: 1,
      created_by_name: 'Prof. Meghraj Chougoule',
      created_by_role: 'ADMIN',
      created_at: new Date().toISOString()
    },
    {
      id: 201,
      title: 'Full-Stack Cloud & DevOps Industrial Certification Bootcamp',
      organization: 'MITCORER T&P Cell & AWS Academy Partner',
      opportunity_type: 'TRAINING',
      mode: 'HYBRID',
      location: 'MITCORER Central Computing Lab, Barshi',
      country: 'India',
      duration: '4 Weeks',
      stipend_type: 'UNPAID',
      stipend_amount: 'Free Institutional Certification',
      stipend: 'Free Institutional Certification',
      deadline: '2027-05-30',
      available_seats: 60,
      min_cgpa: 0,
      eligibility_requirements: 'Open to all registered MITCORER students (CSE, E&TC, MECH, CIVIL).',
      eligible_branches: ['CSE', 'E&TC', 'MECH', 'CIVIL'],
      domain: 'Web Development',
      required_skills: 'Linux, Git, Docker, REST APIs, React, Cloud Deployment',
      description: 'Hands-on training program covering containerization, CI/CD pipelines, REST API architecture, and cloud deployment with faculty-supervised capstone assessment.',
      learning_outcomes: 'Deploy production microservices and earn a verifiable MITCORER + AWS Academy completion badge.',
      application_type: 'INTERNAL',
      application_url: 'https://aws.amazon.com/training/awsacademy/',
      status: 'PUBLISHED',
      created_by: 2,
      created_by_name: 'Tirthesh Gutte',
      created_by_role: 'COORDINATOR',
      created_at: new Date().toISOString()
    },
    {
      id: 202,
      title: 'Railway Signaling, Embedded IoT & Industrial Automation Workshop',
      organization: 'MITCORER Railway Engineering Research Centre',
      opportunity_type: 'WORKSHOP',
      mode: 'ONSITE',
      location: 'MITCORER Barshi Campus',
      country: 'India',
      duration: '2 Weeks',
      stipend_type: 'UNPAID',
      stipend_amount: 'Accredited Workshop Certificate',
      stipend: 'Accredited Workshop Certificate',
      deadline: '2027-06-05',
      available_seats: 45,
      min_cgpa: 0,
      eligibility_requirements: 'Open to E&TC, Mechanical, Civil, and CSE engineering students.',
      eligible_branches: ['E&TC', 'MECH', 'CIVIL', 'CSE'],
      domain: 'VLSI/Embedded Systems',
      required_skills: 'Embedded C, Sensors, SCADA, Railway Signaling, PLC Basics',
      description: 'Specialized practical training on modern railway signaling interlocks, IoT telemetry nodes, and predictive maintenance diagnostics.',
      learning_outcomes: 'Interface industrial sensors and design fail-safe railway telemetry prototypes.',
      application_type: 'INTERNAL',
      application_url: 'https://mitcorer.edu.in',
      status: 'PUBLISHED',
      created_by: 1,
      created_by_name: 'Prof. Meghraj Chougoule',
      created_by_role: 'ADMIN',
      created_at: new Date().toISOString()
    }
  ];
}

function getDefaultCommunityPosts(): any[] {
  return [
    {
      id: 501,
      author: 2,
      author_name: 'Tirthesh Gutte',
      author_role: 'COORDINATOR',
      department_code: 'CSE',
      title: 'Welcome to the Official MITCORER Internship & Placement Community Forum!',
      content: 'Use this community space to ask technical questions, share interview experiences, discuss weekly report deliverables, and connect with fellow MITCORER students across departments. Faculty coordinators and administrators actively monitor and answer queries here.',
      category: 'General Discussion',
      tags: 'Announcement, T&P Cell, Guidelines',
      is_pinned: true,
      is_reported: false,
      replies: [
        {
          id: 5011,
          author: 1,
          author_name: 'Prof. Meghraj Chougoule',
          author_role: 'ADMIN',
          content: 'Best wishes to all students preparing for upcoming industrial internships. Keep your weekly progress reports and Smart Resume updated for campus shortlisting!',
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString()
    }
  ];
}

function getDefaultFeedback(): any[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  return [
    {
      id: 'fb_1001',
      feedback_code: 'FB-2026-1001',
      user_id: 3,
      user_name: 'Student One',
      user_email: 'student1@mitcorer.edu.in',
      user_role: 'STUDENT',
      department: 'Computer Science & Engineering',
      department_code: 'CSE',
      category: 'BUG',
      overall_rating: 4,
      usability_rating: 3,
      performance_rating: 4,
      design_rating: 5,
      affected_page: 'Certificates & Documents',
      subject: 'PDF Certificate Download Issue on Mobile',
      description: 'When attempting to view or download verified internship completion certificates on a mobile browser, the PDF preview modal gets cropped at the bottom edge.',
      attachment_url: '',
      status: 'UNDER_REVIEW',
      assigned_coordinator_id: 2,
      assigned_coordinator_name: 'Tirthesh Gutte',
      responses: [
        {
          id: 'res_1001_1',
          user_id: 2,
          user_name: 'Tirthesh Gutte',
          user_role: 'COORDINATOR',
          message: 'Thank you for bringing this up! Our team is verifying viewport css for mobile PDF modals.',
          created_at: yesterday.toISOString()
        }
      ],
      linked_feedback_ids: [],
      created_at: lastWeek.toISOString(),
      updated_at: yesterday.toISOString()
    },
    {
      id: 'fb_1002',
      feedback_code: 'FB-2026-1002',
      user_id: 2,
      user_name: 'Tirthesh Gutte',
      user_email: 'coordinator.cse@mitcorer.edu.in',
      user_role: 'COORDINATOR',
      department: 'Computer Science & Engineering',
      department_code: 'CSE',
      category: 'FEATURE_REQUEST',
      overall_rating: 5,
      usability_rating: 5,
      performance_rating: 4,
      design_rating: 5,
      affected_page: 'Weekly Progress Reports',
      subject: 'Automated Weekly Report Submission Reminders',
      description: 'It would be great to enable automated weekly email and system notifications every Friday to remind active interns to submit their weekly progress log before Sunday midnight.',
      attachment_url: '',
      status: 'IN_PROGRESS',
      assigned_coordinator_id: 1,
      assigned_coordinator_name: 'Prof. Meghraj Chougoule',
      responses: [
        {
          id: 'res_1002_1',
          user_id: 1,
          user_name: 'Prof. Meghraj Chougoule',
          user_role: 'ADMIN',
          message: 'Approved for implementation in the next release cycle.',
          created_at: yesterday.toISOString()
        }
      ],
      linked_feedback_ids: [],
      created_at: yesterday.toISOString(),
      updated_at: yesterday.toISOString()
    },
    {
      id: 'fb_1003',
      feedback_code: 'FB-2026-1003',
      user_id: 4,
      user_name: 'Student Two',
      user_email: 'student2@mitcorer.edu.in',
      user_role: 'STUDENT',
      department: 'Electronics & Telecommunication',
      department_code: 'E&TC',
      category: 'UX',
      overall_rating: 5,
      usability_rating: 5,
      performance_rating: 5,
      design_rating: 5,
      affected_page: 'AI Career Assistant & Mentor Connect',
      subject: 'Excellent AI Resume Analyzer & Mock Interview Experience!',
      description: 'The AI Resume analyzer and role-specific mock interview questions have been extremely helpful in preparing for Persistent Systems and Tech Mahindra campus drives.',
      attachment_url: '',
      status: 'RESOLVED',
      assigned_coordinator_id: 2,
      assigned_coordinator_name: 'Tirthesh Gutte',
      responses: [
        {
          id: 'res_1003_1',
          user_id: 2,
          user_name: 'Tirthesh Gutte',
          user_role: 'COORDINATOR',
          message: 'Glad to hear that! Keep leveraging the AI Assistant for campus placements.',
          created_at: now.toISOString()
        }
      ],
      linked_feedback_ids: [],
      created_at: lastWeek.toISOString(),
      updated_at: now.toISOString(),
      resolved_at: now.toISOString()
    }
  ];
}

function getInitialStore(): DataStore {
  return {
    users: [
      {
        id: 1,
        name: 'Prof. Meghraj Chougoule',
        email: 'admin@mitcorer.edu.in',
        role: 'ADMIN',
        passwordHash: hashPassword('Admin@123'),
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Tirthesh Gutte',
        email: 'coordinator.cse@mitcorer.edu.in',
        role: 'COORDINATOR',
        passwordHash: hashPassword('Coord@123'),
        is_active: true,
        created_at: new Date().toISOString(),
        coordinator_profile: {
          id: 1,
          employee_id: 'MIT-COORD-01',
          department_id: 1,
          department_code: 'CSE',
          department_name: 'Computer Science & Engineering',
          designation: 'Assistant Professor & T&P Coordinator',
          phone: '+91 9876543210',
          can_publish_directly: true
        }
      },
      {
        id: 3,
        name: 'Student One',
        email: 'student1@mitcorer.edu.in',
        role: 'STUDENT',
        passwordHash: hashPassword('Student@123'),
        is_active: true,
        created_at: new Date().toISOString(),
        student_profile: {
          id: 3,
          roll_number: 'MIT-2023-CS-042',
          prn: 'PRN2023001',
          department_id: 1,
          department_code: 'CSE',
          department_name: 'Computer Science & Engineering',
          year: 'TE',
          cgpa: 8.85
        }
      },
      {
        id: 4,
        name: 'Student Two',
        email: 'student2@mitcorer.edu.in',
        role: 'STUDENT',
        passwordHash: hashPassword('Student@123'),
        is_active: true,
        created_at: new Date().toISOString(),
        student_profile: {
          id: 4,
          roll_number: 'MIT-2023-ETC-018',
          prn: 'PRN2023002',
          department_id: 2,
          department_code: 'E&TC',
          department_name: 'Electronics & Telecommunication',
          year: 'BE',
          cgpa: 9.12
        }
      }
    ],
    posts: getDefaultCommunityPosts(),
    teams: [],
    internships: [],
    opportunities: getDefaultOpportunities(),
    applications: [],
    reports: [],
    tasks: [],
    documents: [],
    resumes: [],
    notifications: [],
    audit_logs: [
      {
        id: 1,
        actor: { id: 1, name: 'Prof. Meghraj Chougoule', role: 'ADMIN' },
        actor_name: 'Prof. Meghraj Chougoule',
        actor_role: 'ADMIN',
        action: 'SYSTEM_INITIALIZED',
        entity_type: 'System',
        entity_id: 'IPTS-Core',
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
        status: 'SUCCESS'
      }
    ],
    assessments: [],
    feedback: getDefaultFeedback(),
    academic_config: getDefaultAcademicConfig()
  };
}

function normalizeDepartmentInfo(deptInput: any, deptCodeInput?: any): { id: number; code: string; name: string } {
  const deptMap: Record<number, { id: number; code: string; name: string }> = {
    1: { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    2: { id: 2, code: 'E&TC', name: 'Electronics & Telecommunication' },
    3: { id: 3, code: 'MECH', name: 'Mechanical Engineering' },
    4: { id: 4, code: 'CIVIL', name: 'Civil Engineering' }
  };
  const codeMap: Record<string, { id: number; code: string; name: string }> = {
    'CSE': deptMap[1],
    'COMPUTER SCIENCE & ENGINEERING': deptMap[1],
    'E&TC': deptMap[2],
    'ENTC': deptMap[2],
    'ELECTRONICS & TELECOMMUNICATION': deptMap[2],
    'MECH': deptMap[3],
    'MECHANICAL': deptMap[3],
    'MECHANICAL ENGINEERING': deptMap[3],
    'CIVIL': deptMap[4],
    'CIVIL ENGINEERING': deptMap[4]
  };
  if (deptCodeInput && typeof deptCodeInput === 'string') {
    const byCode = codeMap[deptCodeInput.trim().toUpperCase()];
    if (byCode) return byCode;
  }
  if (typeof deptInput === 'string' && isNaN(Number(deptInput))) {
    const byStr = codeMap[deptInput.trim().toUpperCase()];
    if (byStr) return byStr;
  }
  const num = Number(deptInput);
  if (!isNaN(num) && deptMap[num]) {
    return deptMap[num];
  }
  return deptMap[1];
}

function normalizeAcademicYearValue(rawYear: any, fallbackYear = '2026-2027'): string {
  if (!rawYear || typeof rawYear !== 'string') return fallbackYear;
  const trimmed = rawYear.trim();
  if (!trimmed) return fallbackYear;
  if (trimmed.includes('2026-27') || trimmed.includes('2026-2027')) return '2026-2027';
  if (trimmed.includes('2025-26') || trimmed.includes('2025-2026')) return '2025-2026';
  if (trimmed.includes('2024-25') || trimmed.includes('2024-2025')) return '2024-2025';
  if (trimmed.includes('2023-24') || trimmed.includes('2023-2024')) return '2023-2024';
  if (trimmed.includes('2027-28') || trimmed.includes('2027-2028')) return '2027-2028';
  return trimmed;
}

function isCoordinatorAuthorizedForStudent(coordUser: UserRecord, studentUser: UserRecord, store: DataStore): boolean {
  if (!coordUser || !studentUser || studentUser.role !== 'STUDENT') return false;
  if (coordUser.role === 'ADMIN') return true;
  if (coordUser.role !== 'COORDINATOR') return false;

  const profile = studentUser.student_profile || {};
  if (profile.assigned_coordinator_id && Number(profile.assigned_coordinator_id) === Number(coordUser.id)) {
    return true;
  }

  const coordDept = normalizeDepartmentInfo(
    coordUser.coordinator_profile?.department_id,
    coordUser.coordinator_profile?.department_code
  );
  const studentDept = normalizeDepartmentInfo(profile.department_id, profile.department_code);

  if (coordDept.code === studentDept.code) {
    if (!profile.assigned_coordinator_id) return true;
    const assignedCoord = store.users.find(
      u => u.id === Number(profile.assigned_coordinator_id) && u.role === 'COORDINATOR'
    );
    if (!assignedCoord) return true;
    const assignedCoordDept = normalizeDepartmentInfo(
      assignedCoord.coordinator_profile?.department_id,
      assignedCoord.coordinator_profile?.department_code
    );
    return assignedCoordDept.code === coordDept.code;
  }

  return false;
}

function isRecordVisibleToStaff(user: UserRecord, record: any, store: DataStore): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'COORDINATOR') return false;
  const sid = Number(record.student || record.student_id || record.user || 0);
  if (sid) {
    const studentUser = store.users.find(u => u.id === sid && u.role === 'STUDENT');
    if (studentUser) {
      return isCoordinatorAuthorizedForStudent(user, studentUser, store);
    }
  }
  const coordDept = normalizeDepartmentInfo(
    user.coordinator_profile?.department_id,
    user.coordinator_profile?.department_code
  );
  const recDept = normalizeDepartmentInfo(record.department_id || record.department, record.department_code);
  return coordDept.code === recDept.code;
}

let memoryStore: DataStore | null = null;

function loadStore(): DataStore {
  if (memoryStore) {
    return memoryStore;
  }
  const fileToLoad = fs.existsSync(DATA_FILE) ? DATA_FILE : (fs.existsSync(SEED_DATA_FILE) ? SEED_DATA_FILE : null);
  if (fileToLoad) {
    try {
      const parsed = JSON.parse(fs.readFileSync(fileToLoad, 'utf-8'));
      let modified = false;
      if (!Array.isArray(parsed.users)) { parsed.users = []; modified = true; }
      if (!parsed.users.some((u: any) => u.email === 'student1@mitcorer.edu.in')) {
        parsed.users.push({
          id: 3,
          name: 'Student One',
          email: 'student1@mitcorer.edu.in',
          role: 'STUDENT',
          passwordHash: hashPassword('Student@123'),
          is_active: true,
          created_at: new Date().toISOString(),
          student_profile: {
            id: 3,
            roll_number: 'MIT-2023-CS-042',
            prn: 'PRN2023001',
            department_id: 1,
            department_code: 'CSE',
            department_name: 'Computer Science & Engineering',
            year: 'TE',
            cgpa: 8.85
          }
        });
        modified = true;
      }
      if (!Array.isArray(parsed.applications)) { parsed.applications = []; modified = true; }
      if (!Array.isArray(parsed.tasks)) { parsed.tasks = []; modified = true; }
      if (!Array.isArray(parsed.resumes)) { parsed.resumes = []; modified = true; }
      if (!Array.isArray(parsed.notifications)) { parsed.notifications = []; modified = true; }
      if (!Array.isArray(parsed.feedback)) {
        parsed.feedback = getDefaultFeedback();
        modified = true;
      }
      if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
        parsed.posts = getDefaultCommunityPosts();
        modified = true;
      } else {
        parsed.posts.forEach((p: any) => {
          if (!Array.isArray(p.replies)) { p.replies = []; modified = true; }
        });
      }
      if (!Array.isArray(parsed.opportunities) || parsed.opportunities.length === 0) {
        parsed.opportunities = getDefaultOpportunities();
        modified = true;
      } else {
        const hasTraining = parsed.opportunities.some((o: any) => o.opportunity_type === 'TRAINING' || o.opportunity_type === 'WORKSHOP');
        if (!hasTraining) {
          const defaultTrainings = getDefaultOpportunities().filter(o => o.opportunity_type === 'TRAINING' || o.opportunity_type === 'WORKSHOP');
          parsed.opportunities.push(...defaultTrainings);
          modified = true;
        }
      }
      if (!parsed.academic_config) {
        parsed.academic_config = getDefaultAcademicConfig();
        modified = true;
      }
      if (!parsed.ai_config) {
        parsed.ai_config = getDefaultAIConfig();
        modified = true;
      } else {
        if (
          isLegacyInvalidKey(parsed.ai_config.gemini?.api_key) ||
          (process.env.GEMINI_API_KEY && parsed.ai_config.gemini?.api_key !== process.env.GEMINI_API_KEY)
        ) {
          parsed.ai_config.gemini = {
            ...(parsed.ai_config.gemini || {}),
            api_key: (process.env.GEMINI_API_KEY || '').trim(),
            selected_model: parsed.ai_config.gemini?.selected_model || 'gemini-3.1-flash-lite',
            is_connected: Boolean(process.env.GEMINI_API_KEY)
          };
          modified = true;
        }
        if (isLegacyInvalidKey(parsed.ai_config.claude?.api_key)) {
          parsed.ai_config.claude = {
            ...(parsed.ai_config.claude || {}),
            api_key: (process.env.ANTHROPIC_API_KEY || '').trim(),
            selected_model: parsed.ai_config.claude?.selected_model || 'claude-3-5-sonnet-20241022',
            is_connected: Boolean(process.env.ANTHROPIC_API_KEY),
            error_message: ''
          };
          modified = true;
        }
      }

      parsed.users.forEach((u: any) => {
        const normRole = String(u.role || 'STUDENT').trim().toUpperCase();
        if (u.role !== normRole) {
          u.role = normRole;
          modified = true;
        }
        if (u.is_active === undefined) {
          u.is_active = true;
          modified = true;
        }
        if (u.role === 'COORDINATOR') {
          if (!u.coordinator_profile) {
            u.coordinator_profile = {
              id: u.id + 1,
              employee_id: `MIT-COORD-${u.id}`,
              department_id: 1,
              department_code: 'CSE',
              department_name: 'Computer Science & Engineering',
              designation: 'Assistant Professor & T&P Coordinator',
              can_publish_directly: false
            };
            modified = true;
          } else {
            const dept = normalizeDepartmentInfo(u.coordinator_profile.department_id, u.coordinator_profile.department_code);
            if (u.coordinator_profile.department_code !== dept.code || u.coordinator_profile.department_id !== dept.id) {
              u.coordinator_profile.department_id = dept.id;
              u.coordinator_profile.department_code = dept.code;
              u.coordinator_profile.department_name = dept.name;
              modified = true;
            }
          }
        }
        if (u.role === 'STUDENT') {
          if (!u.student_profile) {
            u.student_profile = {};
            modified = true;
          }
          const dept = normalizeDepartmentInfo(
            u.student_profile.department_id || u.student_profile.department,
            u.student_profile.department_code
          );
          if (
            u.student_profile.department_id !== dept.id ||
            u.student_profile.department_code !== dept.code ||
            u.student_profile.department_name !== dept.name
          ) {
            u.student_profile.department_id = dept.id;
            u.student_profile.department_code = dept.code;
            u.student_profile.department_name = dept.name;
            modified = true;
          }
          const normYear = normalizeAcademicYearValue(
            u.student_profile.academic_year,
            parsed.academic_config?.current_academic_year || '2026-2027'
          );
          if (u.student_profile.academic_year !== normYear) {
            u.student_profile.academic_year = normYear;
            modified = true;
          }
          if (!u.student_profile.roll_number) {
            u.student_profile.roll_number = `26${dept.code}${String(u.id).slice(-4)}`;
            modified = true;
          }
          if (!u.student_profile.division) {
            u.student_profile.division = 'A';
            modified = true;
          }
          if (u.student_profile.is_verified === undefined) {
            u.student_profile.is_verified = true;
            modified = true;
          }
          const existingCoord = u.student_profile.assigned_coordinator_id
            ? parsed.users.find((c: any) => c.id === Number(u.student_profile.assigned_coordinator_id) && c.role === 'COORDINATOR')
            : null;
          if (!existingCoord) {
            const deptCoords = parsed.users.filter(
              (c: any) => c.role === 'COORDINATOR' && c.is_active !== false &&
                normalizeDepartmentInfo(c.coordinator_profile?.department_id, c.coordinator_profile?.department_code).code === dept.code
            );
            const matchedCoord = deptCoords[deptCoords.length - 1] || null;
            const newCoordId = matchedCoord ? matchedCoord.id : null;
            const newCoordName = matchedCoord ? matchedCoord.name : null;
            if (u.student_profile.assigned_coordinator_id !== newCoordId) {
              u.student_profile.assigned_coordinator_id = newCoordId;
              u.student_profile.assigned_coordinator_name = newCoordName;
              modified = true;
            }
          }
        }
      });

      if (modified) {
        saveStore(parsed);
      }
      memoryStore = parsed;
      return parsed;
    } catch {
      const init = getInitialStore();
      memoryStore = init;
      saveStore(init);
      return init;
    }
  }
  const init = getInitialStore();
  memoryStore = init;
  saveStore(init);
  return init;
}

function saveStore(store: DataStore) {
  memoryStore = store;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Non-fatal: write to disk skipped in serverless environment:', err);
  }
  if (HAS_DURABLE_STORAGE) {
    syncToRemoteStorage(store).catch((err) => {
      console.warn('[STORAGE] Async remote persistence failed:', err);
    });
  }
}

function addNotification(store: DataStore, userId: number, title: string, message: string, category = 'SYSTEM', link = '') {
  store.notifications.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    user: userId,
    title,
    message,
    category,
    notification_type: category,
    link,
    is_read: false,
    created_at: new Date().toISOString()
  });
}

function notifyCoordinators(store: DataStore, student: UserRecord | undefined, title: string, message: string, category = 'SYSTEM', link = '') {
  const assignedCoordId = student?.student_profile?.assigned_coordinator_id;
  if (assignedCoordId) {
    addNotification(store, Number(assignedCoordId), title, message, category, link);
  } else {
    const deptCode = student?.student_profile?.department_code;
    const coords = store.users.filter(u => u.role === 'COORDINATOR' && (!deptCode || u.coordinator_profile?.department_code === deptCode));
    const targets = coords.length > 0 ? coords : store.users.filter(u => u.role === 'COORDINATOR');
    targets.forEach(c => addNotification(store, c.id, title, message, category, link));
  }
}

function addAuditLog(
  store: DataStore,
  actor: { id: number; name: string; role: string } | UserRecord | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details = '',
  ip = '127.0.0.1',
  status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
) {
  const safeActor = actor || { id: 0, name: 'Unauthenticated Client', role: 'GUEST' };
  store.audit_logs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    actor: { id: safeActor.id, name: safeActor.name, role: safeActor.role },
    actor_name: safeActor.name,
    actor_role: safeActor.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    ip_address: ip,
    created_at: new Date().toISOString(),
    status
  });
}

function createToken(user: UserRecord): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    user_id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 86400
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function getAuthUser(req: Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(`${header}.${payloadB64}`)
    .digest('base64url');

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const store = loadStore();
    const found = store.users.find(u => u.id === payload.user_id && u.is_active);
    return found || null;
  } catch {
    return null;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Domain keyword dictionary for Resume Analyzer & Skill Recommendations
const DOMAIN_KEYWORDS: Record<string, { keywords: string[]; tools: string[]; actionVerbs: string[]; trainingTopics: string[] }> = {
  'Web Development': {
    keywords: ['React', 'TypeScript', 'JavaScript', 'Python', 'Django', 'Node.js', 'REST API', 'SQL', 'HTML5', 'CSS3', 'Git'],
    tools: ['VS Code', 'Git & GitHub', 'Postman', 'Docker', 'PostgreSQL/MySQL'],
    actionVerbs: ['Engineered', 'Architected', 'Optimized', 'Deployed', 'Integrated', 'Refactored'],
    trainingTopics: ['Full-Stack REST API Design & Authentication', 'Responsive React & TypeScript State Management', 'Database Indexing & Query Optimization']
  },
  'AI/ML': {
    keywords: ['Python', 'Machine Learning', 'Deep Learning', 'Scikit-Learn', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'NLP', 'Computer Vision'],
    tools: ['Jupyter Notebook', 'Google Colab', 'Git', 'MLflow', 'SQL'],
    actionVerbs: ['Trained', 'Evaluated', 'Preprocessed', 'Fine-tuned', 'Benchmarked', 'Automated'],
    trainingTopics: ['Supervised & Unsupervised Model Evaluation', 'Feature Engineering with Pandas & NumPy', 'Deploying ML Models via REST APIs']
  },
  'Data Science': {
    keywords: ['Python', 'SQL', 'Pandas', 'Data Visualization', 'Power BI', 'Tableau', 'Statistics', 'EDA', 'Excel', 'Machine Learning'],
    tools: ['Power BI', 'Jupyter', 'PostgreSQL', 'Tableau', 'Python'],
    actionVerbs: ['Analyzed', 'Visualized', 'Modeled', 'Forecasted', 'Synthesized', 'Extracted'],
    trainingTopics: ['Advanced SQL Analytical Queries', 'Exploratory Data Analysis & Statistical Testing', 'Interactive Executive Dashboards']
  },
  'VLSI/Embedded Systems': {
    keywords: ['Embedded C', 'C++', 'Microcontrollers', 'ARM Cortex', 'RTOS', 'Verilog', 'VHDL', 'FPGA', 'IoT', 'PCB Design', 'UART/SPI/I2C'],
    tools: ['Keil uVision', 'Xilinx Vivado', 'Proteus', 'Altium Designer', 'Oscilloscope/Logic Analyzer'],
    actionVerbs: ['Programmed', 'Simulated', 'Synthesized', 'Interfaced', 'Calibrated', 'Validated'],
    trainingTopics: ['Real-Time Operating Systems (RTOS) Scheduling', 'FPGA RTL Design & Timing Closure in Verilog', 'Embedded Communication Protocols (CAN, SPI, I2C)']
  },
  'CAD/CAM': {
    keywords: ['AutoCAD', 'SolidWorks', 'CATIA', 'ANSYS', 'Finite Element Analysis', 'CNC Machining', 'GD&T', 'Thermodynamics', '3D Modeling'],
    tools: ['SolidWorks', 'ANSYS Workbench', 'AutoCAD Mechanical', 'Mastercam', 'PTC Creo'],
    actionVerbs: ['Modeled', 'Simulated', 'Fabricated', 'Analyzed', 'Redesigned', 'Standardized'],
    trainingTopics: ['3D Parametric Assembly & GD&T Standards', 'Structural & Thermal FEA Simulation in ANSYS', 'CNC Toolpath Generation & Smart Manufacturing']
  },
  'Structural Engineering': {
    keywords: ['AutoCAD Civil 3D', 'STAAD.Pro', 'ETABS', 'Structural Analysis', 'RCC Design', 'Quantity Surveying', 'Concrete Technology', 'BIM', 'Revit'],
    tools: ['STAAD.Pro', 'AutoCAD Civil 3D', 'Autodesk Revit', 'MS Project', 'ETABS'],
    actionVerbs: ['Designed', 'Estimated', 'Inspected', 'Reinforced', 'Surveyed', 'Calculated'],
    trainingTopics: ['IS-Code Compliant RCC & Steel Design in STAAD.Pro', 'Building Information Modeling (BIM) & Quantity Estimation', 'Railway & Highway Alignment Surveying']
  }
};

function getOrBuildStudentResume(user: UserRecord, store: DataStore): any {
  const existing = store.resumes.find(r => r.student_id === user.id);
  const profile = user.student_profile || {};
  const studentInternships = store.internships.filter(i => i.student === user.id || i.student_id === user.id);
  const studentReports = store.reports.filter(r => r.student === user.id || r.student_id === user.id);
  const studentAssessments = store.assessments.filter(a => a.student === user.id || a.student_id === user.id);
  const studentDocs = store.documents.filter(d => (d.user === user.id || d.student === user.id) && d.status === 'VERIFIED');

  // Collect skills from profile, assessments, and weekly reports
  const skillSet = new Set<string>();
  if (Array.isArray(profile.skills)) {
    profile.skills.forEach((s: string) => { if (s && s.trim()) skillSet.add(s.trim()); });
  } else if (typeof profile.skills === 'string' && profile.skills.trim()) {
    profile.skills.split(',').forEach((s: string) => { if (s.trim()) skillSet.add(s.trim()); });
  }
  studentAssessments.forEach(a => {
    if (a.skill_name) skillSet.add(a.skill_name);
  });
  studentReports.forEach(r => {
    if (r.technical_skills) {
      String(r.technical_skills).split(',').forEach(s => {
        const clean = s.trim();
        if (clean && clean.length <= 32) skillSet.add(clean);
      });
    }
  });

  const deptCode = profile.department_code || 'CSE';
  const defaultDomain =
    deptCode === 'E&TC' ? 'VLSI/Embedded Systems' :
    deptCode === 'MECH' ? 'CAD/CAM' :
    deptCode === 'CIVIL' ? 'Structural Engineering' :
    'Web Development';

  const autoEducation = [
    {
      degree: `B.Tech in ${profile.department_name || 'Computer Science & Engineering'}`,
      institution: "MAEER's MIT College of Railway Engineering & Research (MITCORER), Barshi",
      year: profile.academic_year || '2026-2027',
      cgpa: profile.cgpa && profile.cgpa !== '0.00' ? String(profile.cgpa) : ''
    }
  ];

  const autoInternships = studentInternships.map(i => ({
    id: i.id,
    role_title: i.role_title || i.role || 'Engineering Intern',
    organization_name: i.organization_name || i.company || i.organization || 'Host Organization',
    start_date: i.start_date || '2026-06-01',
    end_date: i.end_date || '2026-08-01',
    status: i.status || 'ACTIVE',
    description: i.description || `Completed ${studentReports.filter(r => r.internship === i.id).length} weekly progress reports with hands-on technical deliverables.`
  }));

  const autoProjects = Array.isArray(profile.projects) && profile.projects.length > 0
    ? profile.projects
    : studentReports
        .filter(r => r.project_progress || r.tasks_completed)
        .slice(0, 3)
        .map((r, idx) => ({
          title: `Week ${r.week_number || idx + 1} Engineering Deliverable`,
          technologies: r.technical_skills || Array.from(skillSet).slice(0, 4).join(', '),
          description: r.project_progress || r.tasks_completed,
          link: r.github_link || r.demo_link || ''
        }));

  const autoCertifications = studentDocs.map(d => ({
    title: d.title,
    issuer: d.issuing_organization || 'Verified Credential',
    issue_date: d.created_at ? d.created_at.split('T')[0] : '2026',
    reference: d.verification_reference || d.verification_key || ''
  }));

  if (existing) {
    return {
      ...existing,
      student_id: user.id,
      student_name: user.name,
      email: user.email,
      roll_number: profile.roll_number || 'N/A',
      prn_number: profile.prn_number || '',
      department_code: deptCode,
      department_name: profile.department_name || 'Computer Science & Engineering',
      academic_year: profile.academic_year || '2026-2027',
      division: profile.division || 'A',
      cgpa: existing.cgpa || (profile.cgpa && profile.cgpa !== '0.00' ? String(profile.cgpa) : ''),
      phone: existing.phone ?? profile.phone ?? '',
      github_url: existing.github_url ?? profile.github_url ?? '',
      linkedin_url: existing.linkedin_url ?? profile.linkedin_url ?? '',
      portfolio_url: existing.portfolio_url ?? profile.portfolio_url ?? '',
      verified_assessments: studentAssessments,
      internships: existing.internships?.length ? existing.internships : autoInternships,
      education: existing.education?.length ? existing.education : autoEducation
    };
  }

  return {
    id: null,
    student_id: user.id,
    student_name: user.name,
    email: user.email,
    roll_number: profile.roll_number || 'N/A',
    prn_number: profile.prn_number || '',
    department_code: deptCode,
    department_name: profile.department_name || 'Computer Science & Engineering',
    academic_year: profile.academic_year || '2026-2027',
    division: profile.division || 'A',
    cgpa: profile.cgpa && profile.cgpa !== '0.00' ? String(profile.cgpa) : '',
    phone: profile.phone || '',
    summary: profile.bio || '',
    target_domain: profile.target_domain || defaultDomain,
    template: 'MITCORER_STANDARD',
    github_url: profile.github_url || '',
    linkedin_url: profile.linkedin_url || '',
    portfolio_url: profile.portfolio_url || '',
    skills: Array.from(skillSet),
    education: autoEducation,
    projects: autoProjects,
    internships: autoInternships,
    certifications: autoCertifications,
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    verified_assessments: studentAssessments,
    verification_status: 'NOT_SUBMITTED',
    review_feedback: '',
    reviewed_by_name: '',
    reviewed_at: null,
    review_history: [],
    updated_at: null
  };
}

function analyzeResume(resume: any): any {
  const domain = resume.target_domain && DOMAIN_KEYWORDS[resume.target_domain]
    ? resume.target_domain
    : 'Web Development';
  const domainSpec = DOMAIN_KEYWORDS[domain];

  const checklist: Array<{ section: string; completed: boolean; points: number; maxPoints: number; reason: string }> = [];
  const suggestions: Array<{ category: string; title: string; recommendation: string; why: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> = [];

  // 1. Contact & Professional Links (15 pts)
  const hasPhone = Boolean(resume.phone && String(resume.phone).trim().length >= 8);
  const hasGithubOrPortfolio = Boolean((resume.github_url && String(resume.github_url).trim()) || (resume.portfolio_url && String(resume.portfolio_url).trim()));
  const hasLinkedin = Boolean(resume.linkedin_url && String(resume.linkedin_url).trim());
  const contactPts = (resume.email ? 5 : 0) + (hasPhone ? 4 : 0) + (hasGithubOrPortfolio ? 3 : 0) + (hasLinkedin ? 3 : 0);
  checklist.push({
    section: 'Contact & Professional Links',
    completed: contactPts >= 12,
    points: contactPts,
    maxPoints: 15,
    reason: contactPts >= 12
      ? 'Email, phone, and professional profile links are present.'
      : 'Missing phone number, GitHub/Portfolio link, or LinkedIn URL.'
  });
  if (!hasGithubOrPortfolio) {
    suggestions.push({
      category: 'Professional Links',
      title: 'Add GitHub or Project Portfolio URL',
      recommendation: 'Include your GitHub repository or portfolio link in the Contact section.',
      why: 'Technical recruiters and MITCORER faculty coordinators verify code repositories and CAD/project portfolios during shortlisting.',
      priority: 'HIGH'
    });
  }
  if (!hasLinkedin) {
    suggestions.push({
      category: 'Professional Links',
      title: 'Add LinkedIn Profile URL',
      recommendation: 'Include a complete LinkedIn URL (https://linkedin.com/in/...).',
      why: 'Enables recruiters to verify your institutional network and professional endorsements.',
      priority: 'MEDIUM'
    });
  }

  // 2. Professional Summary / Career Objective (15 pts)
  const summaryText = String(resume.summary || '').trim();
  const summaryWords = summaryText ? summaryText.split(/\s+/).length : 0;
  const summaryPts = summaryWords >= 20 ? 15 : summaryWords >= 8 ? 8 : 0;
  checklist.push({
    section: 'Professional Summary',
    completed: summaryPts === 15,
    points: summaryPts,
    maxPoints: 15,
    reason: summaryPts === 15
      ? `Clear summary (${summaryWords} words) aligned with ${domain}.`
      : 'Summary is missing or under 20 words.'
  });
  if (summaryPts < 15) {
    suggestions.push({
      category: 'Professional Summary',
      title: 'Strengthen Your Career Objective / Summary',
      recommendation: `Write a 25–45 word summary highlighting your branch (${resume.department_code || 'Engineering'}), core focus in ${domain}, and hands-on project or internship deliverables.`,
      why: 'A targeted summary immediately communicates your engineering specialization during the first 10 seconds of resume review.',
      priority: 'HIGH'
    });
  }

  // 3. Academic Details & CGPA (15 pts)
  const hasCgpa = Boolean(resume.cgpa && parseFloat(resume.cgpa) > 0);
  const eduPts = 10 + (hasCgpa ? 5 : 0);
  checklist.push({
    section: 'Academic & CGPA Record',
    completed: hasCgpa,
    points: eduPts,
    maxPoints: 15,
    reason: hasCgpa ? `MITCORER degree and CGPA (${resume.cgpa}) recorded.` : 'CGPA is not yet recorded on your resume.'
  });
  if (!hasCgpa) {
    suggestions.push({
      category: 'Academics',
      title: 'Include Your Current CGPA',
      recommendation: 'Add your verified cumulative GPA (e.g., 8.20) in your profile or resume education section.',
      why: 'Most campus internship drives filter candidates using a minimum CGPA eligibility threshold (typically 6.5–7.5).',
      priority: 'HIGH'
    });
  }

  // 4. Technical Skills & Domain Keywords (20 pts)
  const skillsList: string[] = Array.isArray(resume.skills)
    ? resume.skills.map((s: any) => String(s).trim()).filter(Boolean)
    : String(resume.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const lowerSkills = skillsList.map(s => s.toLowerCase());
  const matchedDomainKeywords = domainSpec.keywords.filter(kw =>
    lowerSkills.some(s => s.includes(kw.toLowerCase()) || kw.toLowerCase().includes(s))
  );
  const missingDomainKeywords = domainSpec.keywords.filter(kw => !matchedDomainKeywords.includes(kw));

  const skillsPts = Math.min(20, (skillsList.length >= 5 ? 12 : skillsList.length * 2) + Math.min(8, matchedDomainKeywords.length * 2));
  checklist.push({
    section: `Technical Skills (${domain})`,
    completed: skillsPts >= 16,
    points: skillsPts,
    maxPoints: 20,
    reason: `${skillsList.length} skills listed (${matchedDomainKeywords.length} matched for ${domain}).`
  });
  if (skillsList.length < 5 || matchedDomainKeywords.length < 3) {
    suggestions.push({
      category: 'Domain Skills',
      title: `Add Core ${domain} Keywords You Have Practiced`,
      recommendation: `If you have experience with them, consider adding domain keywords such as: ${missingDomainKeywords.slice(0, 5).join(', ')}.`,
      why: `Standardizes your skill terminology with ${domain} internship requirements so coordinator and company filters match your profile accurately.`,
      priority: 'HIGH'
    });
  }

  // 5. Projects & Measurable Action Verbs (20 pts)
  const projects = Array.isArray(resume.projects) ? resume.projects.filter((p: any) => p && p.title) : [];
  const hasActionVerbs = projects.some((p: any) =>
    domainSpec.actionVerbs.some(v => String(p.description || '').toLowerCase().includes(v.toLowerCase()))
  );
  const hasMetrics = projects.some((p: any) => /\d+(%|\+|x|ms|s|users|records|weeks|modules)/i.test(String(p.description || '')));
  const projectPts = projects.length === 0 ? 0 : Math.min(20, (projects.length >= 2 ? 12 : 7) + (hasActionVerbs ? 4 : 0) + (hasMetrics ? 4 : 0));

  checklist.push({
    section: 'Engineering Projects & Measurable Impact',
    completed: projectPts >= 16,
    points: projectPts,
    maxPoints: 20,
    reason: projects.length > 0
      ? `${projects.length} project(s) documented${hasMetrics ? ' with measurable outcomes' : ' (add measurable metrics)'}.`
      : 'No academic or technical projects added yet.'
  });
  if (projects.length < 2) {
    suggestions.push({
      category: 'Projects',
      title: 'Document At Least 2 Technical Projects',
      recommendation: 'Add your mini-project, capstone work, or weekly internship deliverables with tools used and outcomes achieved.',
      why: 'Projects provide concrete evidence of problem-solving ability, especially when applying for your first industrial internship.',
      priority: 'HIGH'
    });
  } else if (!hasActionVerbs || !hasMetrics) {
    suggestions.push({
      category: 'Project Descriptions',
      title: 'Use Strong Engineering Action Verbs & Quantifiable Metrics',
      recommendation: `Start project bullet points with action verbs (${domainSpec.actionVerbs.slice(0, 4).join(', ')}) and include measurable scope (e.g., "Reduced query latency by 35%" or "Designed 4-layer PCB assembly").`,
      why: 'Quantified engineering descriptions demonstrate tangible technical ownership rather than passive task listing.',
      priority: 'MEDIUM'
    });
  }

  // 6. Internships, Certifications & Achievements (15 pts)
  const internships = Array.isArray(resume.internships) ? resume.internships : [];
  const certs = Array.isArray(resume.certifications) ? resume.certifications : [];
  const achievements = Array.isArray(resume.achievements) ? resume.achievements : [];
  const expPts = Math.min(15, (internships.length > 0 ? 10 : 0) + (certs.length > 0 ? 5 : 0) + (achievements.length > 0 ? 5 : 0));
  checklist.push({
    section: 'Internships, Certifications & Achievements',
    completed: expPts >= 10,
    points: expPts,
    maxPoints: 15,
    reason: `${internships.length} internship(s), ${certs.length} certification(s), ${achievements.length} achievement(s).`
  });
  if (expPts < 10) {
    suggestions.push({
      category: 'Experience & Credentials',
      title: 'Include Verified Certifications, Training, or Achievements',
      recommendation: 'Add completed NPTEL/workshop certifications, hackathon participation, or active internship details.',
      why: 'Verified credentials differentiate candidates with similar academic CGPAs.',
      priority: 'MEDIUM'
    });
  }

  const totalScore = checklist.reduce((acc, item) => acc + item.points, 0);

  return {
    completeness_score: Math.min(100, totalScore),
    score_note: 'Heuristic Resume Completeness Score (0–100) based on MITCORER T&P rubric. This measures profile thoroughness and keyword alignment, not a guaranteed selection probability.',
    target_domain: domain,
    checklist,
    suggestions,
    domain_guidance: {
      domain,
      matched_keywords: matchedDomainKeywords,
      recommended_keywords: missingDomainKeywords,
      recommended_tools: domainSpec.tools,
      recommended_action_verbs: domainSpec.actionVerbs,
      recommended_training: domainSpec.trainingTopics
    }
  };
}

function computeInternshipRecommendations(user: UserRecord, store: DataStore): any[] {
  const resume = getOrBuildStudentResume(user, store);
  const profile = user.student_profile || {};
  const studentDept = (profile.department_code || 'CSE').toUpperCase();
  const studentCgpa = parseFloat(resume.cgpa || profile.cgpa || '0') || 0;
  const studentSkills: string[] = (Array.isArray(resume.skills) ? resume.skills : [])
    .map((s: any) => String(s).trim())
    .filter(Boolean);
  const lowerStudentSkills = studentSkills.map(s => s.toLowerCase());
  const targetDomain = (resume.target_domain || '').toLowerCase();

  const today = new Date().toISOString().split('T')[0];

  // Only recommend PUBLISHED, non-expired opportunities
  const openOpps = store.opportunities.filter(o => {
    if (o.status && o.status !== 'PUBLISHED') return false;
    if (o.deadline && o.deadline < today) return false;
    if (typeof o.available_seats === 'number' && o.available_seats <= 0) return false;
    return true;
  });

  return openOpps.map(opp => {
    const reqSkills = String(opp.required_skills || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    reqSkills.forEach(reqSkill => {
      const reqLower = reqSkill.toLowerCase();
      const isMatch = lowerStudentSkills.some(st => st.includes(reqLower) || reqLower.includes(st));
      if (isMatch) {
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });

    // Transparent compatibility formula:
    // - 60% weight: Required skills match ratio
    // - 20% weight: Department/branch eligibility
    // - 10% weight: CGPA eligibility
    // - 10% weight: Career domain alignment
    const skillScore = reqSkills.length > 0 ? Math.round((matchedSkills.length / reqSkills.length) * 60) : 40;

    const eligibleBranches: string[] = Array.isArray(opp.eligible_branches)
      ? opp.eligible_branches.map((b: string) => b.toUpperCase())
      : ['CSE', 'E&TC', 'MECH', 'CIVIL'];
    const branchEligible = eligibleBranches.includes(studentDept);
    const branchScore = branchEligible ? 20 : 5;

    const minCgpa = parseFloat(opp.min_cgpa || '0') || 0;
    const cgpaEligible = minCgpa === 0 || (studentCgpa > 0 && studentCgpa >= minCgpa);
    const cgpaScore = cgpaEligible ? 10 : studentCgpa === 0 ? 5 : 2;

    const oppDomain = String(opp.domain || opp.title || '').toLowerCase();
    const domainScore = targetDomain && oppDomain.includes(targetDomain.split('/')[0]) ? 10 : 5;

    const compatibilityScore = Math.min(100, skillScore + branchScore + cgpaScore + domainScore);

    const eligibilityNotes: string[] = [];
    if (!branchEligible) {
      eligibilityNotes.push(`Preferred branches: ${eligibleBranches.join(', ')} (Your branch: ${studentDept})`);
    }
    if (minCgpa > 0) {
      if (studentCgpa === 0) {
        eligibilityNotes.push(`Minimum CGPA ${minCgpa} required (Record your CGPA in Profile/Resume)`);
      } else if (studentCgpa < minCgpa) {
        eligibilityNotes.push(`Minimum CGPA ${minCgpa} required (Your recorded CGPA: ${studentCgpa})`);
      }
    }

    const domainKey = Object.keys(DOMAIN_KEYWORDS).find(k =>
      k.toLowerCase() === String(opp.domain || '').toLowerCase()
    ) || 'Web Development';

    const recommendedTraining = missingSkills.length > 0
      ? [
          `Practice & complete MITCORER Skill Assessment in: ${missingSkills.slice(0, 3).join(', ')}`,
          ...(DOMAIN_KEYWORDS[domainKey]?.trainingTopics.slice(0, 2) || [])
        ]
      : ['Eligible for immediate application — highlight your matched projects in your cover note.'];

    return {
      opportunity_id: opp.id,
      title: opp.title,
      organization: opp.organization,
      opportunity_type: opp.opportunity_type || 'INTERNSHIP',
      mode: opp.mode || 'ONSITE',
      location: opp.location || 'Maharashtra',
      duration: opp.duration || '8 Weeks',
      stipend: opp.stipend_amount || opp.stipend_type || 'Unpaid',
      deadline: opp.deadline || 'Open',
      domain: opp.domain || domainKey,
      min_cgpa: minCgpa,
      eligible_branches: eligibleBranches,
      compatibility_score: compatibilityScore,
      compatibility_label:
        compatibilityScore >= 80 ? 'Strong Match' :
        compatibilityScore >= 60 ? 'Good Match' :
        'Developing Match — Skill Gap Identified',
      scoring_breakdown: {
        skill_alignment_pts: skillScore,
        branch_eligibility_pts: branchScore,
        cgpa_eligibility_pts: cgpaScore,
        domain_interest_pts: domainScore
      },
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      eligibility_notes: eligibilityNotes,
      recommended_learning_topics: recommendedTraining,
      is_eligible: branchEligible && (minCgpa === 0 || studentCgpa === 0 || studentCgpa >= minCgpa)
    };
  }).sort((a, b) => b.compatibility_score - a.compatibility_score);
}

function buildStudentSummary(u: UserRecord, store: DataStore): any {
  const profile = u.student_profile || {};
  const studentInternships = store.internships.filter(i => i.student === u.id || i.student_id === u.id);
  const activeInternship = studentInternships.find(i => i.status === 'ACTIVE') || studentInternships[0] || null;
  const studentApps = store.applications.filter(a => a.student === u.id || a.student_id === u.id);
  const studentReports = store.reports.filter(r => r.student === u.id || r.student_id === u.id);
  const studentTasks = store.tasks.filter(t => t.student === u.id || t.student_id === u.id);
  const studentDocs = store.documents.filter(d => d.user === u.id || d.student === u.id);
  const studentAssessments = store.assessments.filter(a => a.student === u.id || a.student_id === u.id);
  const resume = getOrBuildStudentResume(u, store);
  const resumeAnalysis = analyzeResume(resume);

  const reportsSubmitted = studentReports.filter(r => r.status !== 'DRAFT').length;
  const reportsApproved = studentReports.filter(r => r.status === 'APPROVED').length;
  const reportsPending = studentReports.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;
  const reportsNeedsImprovement = studentReports.filter(r => r.status === 'NEEDS_IMPROVEMENT').length;

  const tasksCompleted = studentTasks.filter(t => t.status === 'COMPLETED').length;
  const tasksPending = studentTasks.filter(t => t.status !== 'COMPLETED').length;

  let profileFieldsFilled = 0;
  const totalProfileFields = 8;
  if (u.name) profileFieldsFilled++;
  if (u.email) profileFieldsFilled++;
  if (profile.roll_number) profileFieldsFilled++;
  if (profile.prn_number) profileFieldsFilled++;
  if (profile.department_code) profileFieldsFilled++;
  if (profile.cgpa && parseFloat(profile.cgpa) > 0) profileFieldsFilled++;
  if (resume.skills && resume.skills.length > 0) profileFieldsFilled++;
  if (profile.github_url || profile.linkedin_url || resume.github_url || resume.linkedin_url) profileFieldsFilled++;
  const profileCompletion = Math.round((profileFieldsFilled / totalProfileFields) * 100);

  const reportProgress = Math.min(100, Math.round((reportsSubmitted / 8) * 100));

  const sortedReports = [...studentReports].sort((a, b) =>
    new Date(b.submitted_at || b.created_at || 0).getTime() - new Date(a.submitted_at || a.created_at || 0).getTime()
  );
  const lastReportDate = sortedReports[0]?.submitted_at || sortedReports[0]?.created_at || null;
  const daysSinceLastReport = lastReportDate
    ? Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isInactive = activeInternship ? (daysSinceLastReport === null || daysSinceLastReport > 10) : false;

  const avgAssessmentScore = studentAssessments.length > 0
    ? Math.round(studentAssessments.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / studentAssessments.length)
    : 0;

  let cohortStatus: 'ACTIVE' | 'DELAYED' | 'COMPLETED' = 'ACTIVE';
  if (activeInternship?.status === 'COMPLETED') {
    cohortStatus = 'COMPLETED';
  } else if (reportsNeedsImprovement > 0 || isInactive) {
    cohortStatus = 'DELAYED';
  }

  // Coordinator assignment resolution (strictly scoped to student's assigned coordinator or same-department coordinator)
  const studentDept = normalizeDepartmentInfo(profile.department_id || profile.department, profile.department_code);
  const assignedCoordinatorId = profile.assigned_coordinator_id !== undefined ? profile.assigned_coordinator_id : null;
  const deptCoordinators = store.users.filter(
    c => c.role === 'COORDINATOR' && c.is_active !== false &&
      normalizeDepartmentInfo(c.coordinator_profile?.department_id, c.coordinator_profile?.department_code).code === studentDept.code
  );
  const assignedCoordUser = assignedCoordinatorId
    ? store.users.find(c => c.id === Number(assignedCoordinatorId) && c.role === 'COORDINATOR') || deptCoordinators[deptCoordinators.length - 1] || null
    : deptCoordinators[deptCoordinators.length - 1] || null;

  const verifiedDocsCount = studentDocs.filter(d => d.status === 'VERIFIED').length;
  const hasShortlistedApp = studentApps.some(a => a.status === 'SHORTLISTED');
  const hasSelectedApp = studentApps.some(a => a.status === 'SELECTED' || a.status === 'APPROVED');

  // Lifecycle stage: Applied -> Shortlisted -> Approved/Active -> Weekly Reports -> Evaluation -> Certificate Verified -> Completed
  let lifecycleStage = 'NOT_STARTED';
  let lifecycleStep = 0;
  if (activeInternship?.status === 'COMPLETED') {
    lifecycleStage = 'COMPLETED';
    lifecycleStep = 7;
  } else if (verifiedDocsCount > 0 && reportsApproved >= 1) {
    lifecycleStage = 'CERTIFICATE_VERIFIED';
    lifecycleStep = 6;
  } else if (studentAssessments.length > 0 || reportsApproved >= 2) {
    lifecycleStage = 'EVALUATION';
    lifecycleStep = 5;
  } else if (reportsSubmitted > 0) {
    lifecycleStage = 'WEEKLY_REPORTS';
    lifecycleStep = 4;
  } else if (activeInternship || hasSelectedApp) {
    lifecycleStage = 'APPROVED_ACTIVE';
    lifecycleStep = 3;
  } else if (hasShortlistedApp) {
    lifecycleStage = 'SHORTLISTED';
    lifecycleStep = 2;
  } else if (studentApps.length > 0) {
    lifecycleStage = 'APPLIED';
    lifecycleStep = 1;
  }

  return {
    id: u.id,
    user_id: u.id,
    name: u.name,
    student_name: u.name,
    email: u.email,
    student_email: u.email,
    roll_number: profile.roll_number || 'N/A',
    prn_number: profile.prn_number || '',
    department_id: studentDept.id,
    department: studentDept.name,
    department_name: studentDept.name,
    department_code: studentDept.code,
    academic_year: normalizeAcademicYearValue(profile.academic_year, store.academic_config?.current_academic_year || '2026-2027'),
    admission_year: profile.admission_year || '2024',
    graduation_year: profile.graduation_year || '2028',
    registration_date: profile.registration_date || (u.created_at ? u.created_at.split('T')[0] : '2026-10-27'),
    division: profile.division || 'A',
    semester: profile.semester || 6,
    cgpa: resume.cgpa || profile.cgpa || '0.00',
    phone: resume.phone || profile.phone || '',
    github_url: resume.github_url || profile.github_url || '',
    linkedin_url: resume.linkedin_url || profile.linkedin_url || '',
    portfolio_url: resume.portfolio_url || profile.portfolio_url || '',
    profile_completion: profileCompletion,
    assigned_coordinator_id: assignedCoordUser ? assignedCoordUser.id : null,
    assigned_coordinator_name: assignedCoordUser ? assignedCoordUser.name : 'Unassigned',
    company: activeInternship ? (activeInternship.organization_name || activeInternship.company) : 'Not Placed Yet',
    role: activeInternship ? (activeInternship.role_title || activeInternship.role) : 'Candidate',
    internship_id: activeInternship ? activeInternship.id : null,
    internship_status: activeInternship ? activeInternship.status : (studentApps.length > 0 ? 'APPLIED' : 'NOT_PLACED'),
    completion_status: activeInternship?.completion_status || (activeInternship?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'),
    lifecycle_stage: lifecycleStage,
    lifecycle_step: lifecycleStep,
    applications_count: studentApps.length,
    reports_submitted: reportsSubmitted,
    reports_approved: reportsApproved,
    reports_pending: reportsPending,
    reports_needs_improvement: reportsNeedsImprovement,
    tasks_completed: tasksCompleted,
    tasks_pending: tasksPending,
    completion_rate: reportProgress,
    progress_percentage: reportProgress,
    skills: resume.skills || [],
    target_domain: resume.target_domain || 'Web Development',
    assessments_count: studentAssessments.length,
    avg_assessment_score: avgAssessmentScore,
    projects_count: (resume.projects || []).length,
    achievements_count: (resume.achievements || []).length,
    documents_count: studentDocs.length,
    verified_documents_count: verifiedDocsCount,
    pending_documents_count: studentDocs.filter(d => d.status === 'SUBMITTED').length,
    resume_verification_status: resume.verification_status || 'NOT_SUBMITTED',
    resume_completeness_score: resumeAnalysis.completeness_score,
    resume_feedback: resume.review_feedback || '',
    last_report_date: lastReportDate ? String(lastReportDate).split('T')[0] : null,
    is_inactive: isInactive,
    status: cohortStatus,
    created_at: u.created_at
  };
}

// ============================================================================
// 1. AUTHENTICATION, REGISTRATION & ACADEMIC YEAR CONFIGURATION ROUTES
// ============================================================================

app.post('/api/auth/login/', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const rateLimit = checkAuthRateLimit(clientIp, 8, 60000);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfterSeconds);
    return res.status(429).json({
      error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`
    });
  }

  const { email, password, role, security_pin } = req.body;
  const store = loadStore();
  const normalizedRole = role ? String(role).trim().toUpperCase() : '';

  // 1A. Direct Coordinator PIN Login
  if (normalizedRole === 'COORDINATOR' && security_pin !== undefined) {
    const providedPin = String(security_pin).trim();
    if (!verifyCoordinatorSecurityPin(providedPin)) {
      addAuditLog(store, null, 'COORDINATOR_PIN_FAILED', 'Auth', 'COORDINATOR', 'Failed Coordinator Security PIN verification attempt', req.ip, 'FAILED');
      saveStore(store);
      return res.status(401).json({ error: 'Invalid Coordinator Security PIN.' });
    }
    const coordinators = store.users.filter(u => u.role === 'COORDINATOR' && u.is_active);
    const coord = coordinators[coordinators.length - 1] || store.users.find(u => u.role === 'COORDINATOR');
    if (!coord) {
      return res.status(404).json({ error: 'No Coordinator account found. Please register first.' });
    }
    resetAuthRateLimit(clientIp);
    addAuditLog(store, coord, 'USER_LOGIN', 'Auth', String(coord.id), `Coordinator ${coord.name} signed in via verified PIN`, req.ip, 'SUCCESS');
    saveStore(store);
    const token = createToken(coord);
    const refreshToken = `ref_${token}`;
    const { passwordHash, ...safeUser } = coord;
    return res.json({
      message: 'Coordinator access granted.',
      access: token,
      refresh: refreshToken,
      tokens: { access: token, refresh: refreshToken },
      user: safeUser
    });
  }

  // 1B. Direct Admin PIN Login
  if (normalizedRole === 'ADMIN' && security_pin !== undefined) {
    const providedPin = String(security_pin).trim();
    const pinCheck = verifyAdminSecurityPin(providedPin);
    if (!pinCheck.valid) {
      addAuditLog(store, null, 'ADMIN_PIN_FAILED', 'Auth', 'ADMIN', `Failed Admin Security PIN verification attempt: ${pinCheck.reason || 'Invalid PIN'}`, req.ip, 'FAILED');
      saveStore(store);
      return res.status(401).json({ error: pinCheck.reason || 'Invalid Admin Security PIN.' });
    }
    const admins = store.users.filter(u => u.role === 'ADMIN' && u.is_active);
    const admin = admins[admins.length - 1] || store.users.find(u => u.role === 'ADMIN');
    if (!admin) {
      return res.status(404).json({ error: 'No Admin account found. Please register first.' });
    }
    resetAuthRateLimit(clientIp);
    addAuditLog(store, admin, 'USER_LOGIN', 'Auth', String(admin.id), `Admin ${admin.name} signed in via verified PIN`, req.ip, 'SUCCESS');
    saveStore(store);
    const token = createToken(admin);
    const refreshToken = `ref_${token}`;
    const { passwordHash, ...safeUser } = admin;
    return res.json({
      message: 'Admin access granted.',
      access: token,
      refresh: refreshToken,
      tokens: { access: token, refresh: refreshToken },
      user: safeUser
    });
  }

  // 1C. Email & Password Login
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both email and password.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    addAuditLog(store, null, 'LOGIN_FAILED', 'Auth', cleanEmail, `Failed login attempt for email ${cleanEmail}`, req.ip, 'FAILED');
    saveStore(store);
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  if (!user.is_active) {
    addAuditLog(store, user, 'LOGIN_BLOCKED_INACTIVE', 'Auth', String(user.id), `Blocked login for inactive account ${user.email}`, req.ip, 'WARNING');
    saveStore(store);
    return res.status(403).json({ error: 'Your account is currently inactive. Please contact the administrator.' });
  }

  if (!user.passwordHash.startsWith('scrypt$')) {
    user.passwordHash = hashPassword(String(password));
  }

  resetAuthRateLimit(clientIp);
  addAuditLog(store, user, 'USER_LOGIN', 'Auth', String(user.id), `${user.role} ${user.name} signed in`, req.ip, 'SUCCESS');
  saveStore(store);

  const token = createToken(user);
  const refreshToken = `ref_${token}`;
  const { passwordHash, ...safeUser } = user;

  return res.json({
    message: 'Login successful.',
    access: token,
    refresh: refreshToken,
    tokens: { access: token, refresh: refreshToken },
    user: safeUser
  });
});

app.post('/api/auth/register/', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const rateLimit = checkAuthRateLimit(clientIp, 10, 60000);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfterSeconds);
    return res.status(429).json({
      error: `Too many registration requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`
    });
  }

  const {
    role: requestedRole,
    security_pin,
    name,
    email,
    password,
    roll_number,
    prn_number,
    department_id,
    department,
    academic_year,
    admission_year,
    graduation_year,
    registration_date,
    division,
    employee_id,
    designation,
    phone
  } = req.body;

  const store = loadStore();
  const selectedDept = normalizeDepartmentInfo(department_id || department, req.body.department_code);
  const deptIdNum = selectedDept.id;
  const normalizedRole = String(requestedRole || 'STUDENT').trim().toUpperCase();

  if (normalizedRole === 'COORDINATOR') {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Coordinator name is required.' });
    }
    const providedPin = String(security_pin ?? '').trim();
    if (!verifyCoordinatorSecurityPin(providedPin)) {
      addAuditLog(store, null, 'COORDINATOR_REGISTER_PIN_FAILED', 'Auth', String(name), 'Invalid Coordinator Security PIN during registration', req.ip, 'FAILED');
      saveStore(store);
      return res.status(403).json({
        error: 'Invalid Coordinator Security PIN. Coordinator registration requires the authorized security PIN.'
      });
    }

    const cleanEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `coordinator.${Date.now()}@mitcorer.edu.in`;

    if (email && store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const cleanEmpId = employee_id ? String(employee_id).trim().toUpperCase() : `COORD-${Date.now().toString().slice(-4)}`;
    const newCoordinator: UserRecord = {
      id: Date.now(),
      name: String(name).trim(),
      email: cleanEmail,
      role: 'COORDINATOR',
      passwordHash: hashPassword(password ? String(password) : `coord_pin_auth_${Date.now()}`),
      is_active: true,
      created_at: new Date().toISOString(),
      coordinator_profile: {
        id: Date.now() + 1,
        employee_id: cleanEmpId,
        department_id: deptIdNum,
        department_code: selectedDept.code,
        department_name: selectedDept.name,
        designation: designation ? String(designation).trim() : 'Department T&P Coordinator',
        phone: phone ? String(phone).trim() : '',
        can_publish_directly: false
      }
    };

    store.users.push(newCoordinator);

    store.users.forEach(u => {
      if (u.role === 'STUDENT' && u.student_profile) {
        const stuDept = normalizeDepartmentInfo(u.student_profile.department_id, u.student_profile.department_code);
        if (stuDept.code === selectedDept.code && !u.student_profile.assigned_coordinator_id) {
          u.student_profile.assigned_coordinator_id = newCoordinator.id;
          u.student_profile.assigned_coordinator_name = newCoordinator.name;
        }
      }
    });

    addAuditLog(store, newCoordinator, 'COORDINATOR_REGISTER', 'User', String(newCoordinator.id), `Registered Coordinator (${selectedDept.code}) via verified PIN`, req.ip, 'SUCCESS');
    saveStore(store);

    resetAuthRateLimit(clientIp);
    const token = createToken(newCoordinator);
    const { passwordHash, ...safeUser } = newCoordinator;
    return res.status(201).json({
      message: 'Coordinator registration verified and completed successfully.',
      access: token,
      refresh: `ref_${token}`,
      tokens: { access: token, refresh: `ref_${token}` },
      user: safeUser
    });
  }

  if (normalizedRole === 'ADMIN') {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Admin name is required.' });
    }
    const providedPin = String(security_pin ?? '').trim();
    const pinCheck = verifyAdminSecurityPin(providedPin);
    if (!pinCheck.valid) {
      addAuditLog(store, null, 'ADMIN_REGISTER_PIN_FAILED', 'Auth', String(name), `Invalid Admin Security PIN during registration: ${pinCheck.reason || 'Invalid PIN'}`, req.ip, 'FAILED');
      saveStore(store);
      return res.status(403).json({
        error: pinCheck.reason || 'Invalid Admin Security PIN. Admin registration requires the authorized security PIN.'
      });
    }

    const cleanEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `admin.${Date.now()}@mitcorer.edu.in`;

    if (email && store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const newAdmin: UserRecord = {
      id: Date.now(),
      name: String(name).trim(),
      email: cleanEmail,
      role: 'ADMIN',
      passwordHash: hashPassword(password ? String(password) : `admin_pin_auth_${Date.now()}`),
      is_active: true,
      created_at: new Date().toISOString()
    };

    store.users.push(newAdmin);
    addAuditLog(store, newAdmin, 'ADMIN_REGISTER', 'User', String(newAdmin.id), 'Registered via verified PIN', req.ip, 'SUCCESS');
    saveStore(store);

    resetAuthRateLimit(clientIp);
    const token = createToken(newAdmin);
    const { passwordHash, ...safeUser } = newAdmin;
    return res.status(201).json({
      message: 'Admin registration verified and completed successfully.',
      access: token,
      refresh: `ref_${token}`,
      tokens: { access: token, refresh: `ref_${token}` },
      user: safeUser
    });
  }

  // Case C: STUDENT Self-Registration
  if (!name || !email || !password || !roll_number) {
    return res.status(400).json({ error: 'Name, email, password, and roll number are mandatory for student registration.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const cleanRoll = String(roll_number).trim().toUpperCase();
  if (store.users.some(u => u.student_profile?.roll_number?.toUpperCase() === cleanRoll)) {
    return res.status(400).json({ error: 'A student with this Roll Number is already registered.' });
  }

  const cleanPrn = prn_number ? String(prn_number).trim().toUpperCase() : '';
  if (cleanPrn && store.users.some(u => u.student_profile?.prn_number?.toUpperCase() === cleanPrn)) {
    return res.status(400).json({ error: 'A student with this PRN Number is already registered.' });
  }

  const selectedAcadYear = normalizeAcademicYearValue(
    academic_year,
    store.academic_config?.current_academic_year || '2026-2027'
  );
  if (store.academic_config && !store.academic_config.available_academic_years.includes(selectedAcadYear)) {
    store.academic_config.available_academic_years.push(selectedAcadYear);
  }

  const deptCoordinators = store.users.filter(
    u => u.role === 'COORDINATOR' && u.is_active !== false &&
      normalizeDepartmentInfo(u.coordinator_profile?.department_id, u.coordinator_profile?.department_code).code === selectedDept.code
  );
  const defaultCoord = deptCoordinators[deptCoordinators.length - 1] || null;

  const newUser: UserRecord = {
    id: Date.now(),
    name: String(name).trim(),
    email: cleanEmail,
    role: 'STUDENT',
    passwordHash: hashPassword(String(password)),
    is_active: true,
    created_at: new Date().toISOString(),
    student_profile: {
      id: Date.now() + 1,
      roll_number: cleanRoll,
      prn_number: cleanPrn,
      department_id: deptIdNum,
      department_code: selectedDept.code,
      department_name: selectedDept.name,
      academic_year: selectedAcadYear,
      admission_year: admission_year || selectedAcadYear.split('-')[0] || '2026',
      graduation_year: graduation_year || String((parseInt(selectedAcadYear.split('-')[0] || '2026', 10) + 4)),
      registration_date: registration_date || new Date().toISOString().split('T')[0],
      division: division ? String(division).trim().toUpperCase() : 'A',
      semester: 6,
      cgpa: '0.00',
      skills: [],
      assigned_coordinator_id: defaultCoord ? defaultCoord.id : null,
      assigned_coordinator_name: defaultCoord ? defaultCoord.name : null,
      is_verified: true
    }
  };

  store.users.push(newUser);

  notifyCoordinators(
    store,
    newUser,
    `New Student Registered: ${newUser.name}`,
    `${newUser.name} (${cleanRoll} • ${selectedDept.code} • ${selectedAcadYear}) registered on MITCORER IPTS.`,
    'STUDENT_REGISTRATION',
    `/coordinator/students/${newUser.id}`
  );
  store.users.filter(u => u.role === 'ADMIN').forEach(adm => {
    addNotification(
      store,
      adm.id,
      `New Student Registered: ${newUser.name}`,
      `${newUser.name} (${cleanRoll} • ${selectedDept.code} • ${selectedAcadYear}) registered and is now listed in Student Management.`,
      'STUDENT_REGISTRATION',
      `/admin/students/${newUser.id}`
    );
  });

  addAuditLog(store, newUser, 'STUDENT_SELF_REGISTER', 'User', String(newUser.id), `Student ${newUser.name} (${cleanRoll}, ${selectedDept.code}, ${selectedAcadYear}) registered`, req.ip, 'SUCCESS');
  saveStore(store);

  resetAuthRateLimit(clientIp);
  const token = createToken(newUser);
  const { passwordHash, ...safeUser } = newUser;

  return res.status(201).json({
    message: 'Registration successful! Welcome to MITCORER Internship Hub.',
    access: token,
    refresh: `ref_${token}`,
    tokens: { access: token, refresh: `ref_${token}` },
    user: safeUser
  });
});

// Academic Year Configuration Endpoints
app.get('/api/academic-config/', (_req: Request, res: Response) => {
  const store = loadStore();
  return res.json(store.academic_config || getDefaultAcademicConfig());
});

app.post('/api/academic-config/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Only Administrators and Coordinators can update academic year configuration.' });
  }

  const store = loadStore();
  if (!store.academic_config) store.academic_config = getDefaultAcademicConfig();

  const { current_academic_year, add_academic_year, promote_cohort_from, promote_cohort_to } = req.body;

  if (add_academic_year && String(add_academic_year).trim()) {
    const cleanYear = String(add_academic_year).trim();
    if (!store.academic_config.available_academic_years.includes(cleanYear)) {
      store.academic_config.available_academic_years.push(cleanYear);
      store.academic_config.available_academic_years.sort();
    }
  }

  if (current_academic_year && String(current_academic_year).trim()) {
    const cleanCurr = String(current_academic_year).trim();
    store.academic_config.current_academic_year = cleanCurr;
    if (!store.academic_config.available_academic_years.includes(cleanCurr)) {
      store.academic_config.available_academic_years.push(cleanCurr);
      store.academic_config.available_academic_years.sort();
    }
  }

  let promotedCount = 0;
  if (promote_cohort_from && promote_cohort_to && promote_cohort_from !== promote_cohort_to) {
    store.users.forEach(u => {
      if (u.role === 'STUDENT' && u.student_profile && u.student_profile.academic_year === promote_cohort_from) {
        if (!Array.isArray(u.student_profile.academic_year_history)) {
          u.student_profile.academic_year_history = [];
        }
        u.student_profile.academic_year_history.push({
          academic_year: u.student_profile.academic_year,
          updated_at: new Date().toISOString(),
          updated_by: user.name
        });
        u.student_profile.academic_year = String(promote_cohort_to).trim();
        promotedCount++;
      }
    });
  }

  addAuditLog(
    store,
    user,
    'ACADEMIC_CONFIG_UPDATED',
    'AcademicConfig',
    store.academic_config.current_academic_year,
    `Updated academic config${promotedCount > 0 ? ` and progressed ${promotedCount} students from ${promote_cohort_from} to ${promote_cohort_to}` : ''}`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);

  return res.json({
    message: promotedCount > 0
      ? `Academic configuration updated and ${promotedCount} student(s) progressed to ${promote_cohort_to}.`
      : 'Academic configuration updated successfully.',
    academic_config: store.academic_config,
    promoted_count: promotedCount
  });
});

const handleGetProfile = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication credentials were not provided or are invalid.' });
  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
};

const handlePatchProfile = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const target = store.users.find(u => u.id === user.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (req.body.name && String(req.body.name).trim()) {
    target.name = String(req.body.name).trim();
  }

  // Allow Student, Coordinator, and Admin to update their email address (accepting any valid personal or college email)
  if (req.body.email && String(req.body.email).trim()) {
    const newEmail = String(req.body.email).trim().toLowerCase();
    if (!isValidEmail(newEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address (personal or college email).' });
    }
    const duplicate = store.users.find(u => u.id !== target.id && u.email.toLowerCase() === newEmail);
    if (duplicate) {
      return res.status(400).json({ error: 'Another account is already using this email address.' });
    }
    const oldEmail = target.email;
    target.email = newEmail;
    if (oldEmail !== newEmail) {
      addAuditLog(store, target, 'EMAIL_UPDATED', 'User', String(target.id), `Updated email from ${oldEmail} to ${newEmail}`, req.ip, 'SUCCESS');
    }
  }

  if (target.role === 'STUDENT') {
    if (!target.student_profile) target.student_profile = {};
    for (const field of ['phone', 'personal_email', 'bio', 'github_url', 'linkedin_url', 'portfolio_url', 'cgpa', 'skills', 'target_domain', 'academic_year', 'division', 'semester', 'graduation_year', 'notification_preferences']) {
      if (field in req.body) {
        target.student_profile[field] = req.body[field];
      }
    }
    const existingResume = store.resumes.find(r => r.student_id === target.id);
    if (existingResume) {
      existingResume.student_name = target.name;
      existingResume.email = target.email;
      for (const field of ['phone', 'github_url', 'linkedin_url', 'portfolio_url', 'cgpa', 'skills', 'target_domain']) {
        if (field in req.body) {
          existingResume[field] = req.body[field];
        }
      }
      existingResume.updated_at = new Date().toISOString();
    }
  } else if (target.role === 'COORDINATOR') {
    if (!target.coordinator_profile) target.coordinator_profile = {};
    const deptLookup: Record<string, { id: number; code: string; name: string }> = {
      'CSE': { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
      'E&TC': { id: 2, code: 'E&TC', name: 'Electronics & Telecommunication' },
      'MECH': { id: 3, code: 'MECH', name: 'Mechanical Engineering' },
      'CIVIL': { id: 4, code: 'CIVIL', name: 'Civil Engineering' }
    };
    for (const field of ['phone', 'designation', 'employee_id', 'department_code', 'department_name', 'department_id', 'notification_preferences']) {
      if (field in req.body) {
        target.coordinator_profile[field] = req.body[field];
      }
    }
    if (req.body.department_code && deptLookup[String(req.body.department_code).toUpperCase()]) {
      const d = deptLookup[String(req.body.department_code).toUpperCase()];
      target.coordinator_profile.department_id = d.id;
      target.coordinator_profile.department_code = d.code;
      target.coordinator_profile.department_name = d.name;
    }
  } else if (target.role === 'ADMIN') {
    if ('notification_preferences' in req.body) {
      (target as any).notification_preferences = req.body.notification_preferences;
    }
  }

  addAuditLog(store, target, 'PROFILE_UPDATED', 'User', String(target.id), `${target.role} ${target.name} updated profile settings`, req.ip, 'SUCCESS');
  saveStore(store);
  const { passwordHash, ...safeUser } = target;
  return res.json(safeUser);
};

app.get('/api/auth/me/', handleGetProfile);
app.get('/api/auth/profile/', handleGetProfile);
app.patch('/api/auth/me/', handlePatchProfile);
app.patch('/api/auth/profile/', handlePatchProfile);

app.post('/api/auth/change-password/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { current_password, new_password } = req.body;
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const store = loadStore();
  const target = store.users.find(u => u.id === user.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  // For students (or when current_password is provided), verify current password if not a PIN-only staff account
  if (user.role === 'STUDENT' && current_password !== undefined && String(current_password).trim() !== '') {
    if (!verifyPassword(String(current_password), target.passwordHash)) {
      addAuditLog(store, target, 'PASSWORD_CHANGE_FAILED', 'User', String(target.id), 'Incorrect current password provided', req.ip, 'FAILED');
      saveStore(store);
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
  }

  target.passwordHash = hashPassword(String(new_password));
  addAuditLog(store, target, 'PASSWORD_CHANGED', 'User', String(target.id), `${target.role} ${target.name} updated account password`, req.ip, 'SUCCESS');
  saveStore(store);

  return res.json({ message: 'Password updated successfully.' });
});

app.post('/api/auth/token/refresh/', (req: Request, res: Response) => {
  const { refresh } = req.body;
  if (!refresh || typeof refresh !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }
  const rawToken = refresh.replace(/^ref_/, '');
  return res.json({ access: rawToken });
});

// ============================================================================
// 2. STUDENT DIRECTORY, FILTERING, SHORTLISTING & 8-TAB DETAIL VIEW
// ============================================================================

function filterStudentList(req: Request, students: any[]): any[] {
  const {
    search,
    department,
    branch,
    academic_year,
    internship_status,
    report_status,
    resume_status,
    coordinator_id,
    skill,
    min_cgpa,
    min_progress,
    inactive_only
  } = req.query;

  return students.filter(s => {
    if (search) {
      const q = String(search).toLowerCase();
      const matchSearch =
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q) ||
        String(s.roll_number || '').toLowerCase().includes(q) ||
        String(s.prn_number || '').toLowerCase().includes(q) ||
        String(s.company || '').toLowerCase().includes(q) ||
        String(s.assigned_coordinator_name || '').toLowerCase().includes(q) ||
        (Array.isArray(s.skills) && s.skills.some((sk: string) => sk.toLowerCase().includes(q)));
      if (!matchSearch) return false;
    }
    if (department && department !== 'ALL') {
      const d = String(department).toLowerCase();
      if (!String(s.department).toLowerCase().includes(d) && String(s.department_code).toLowerCase() !== d) return false;
    }
    if (branch && branch !== 'ALL') {
      if (String(s.department_code).toUpperCase() !== String(branch).toUpperCase()) return false;
    }
    if (academic_year && academic_year !== 'ALL') {
      if (s.academic_year !== academic_year) return false;
    }
    if (coordinator_id && coordinator_id !== 'ALL') {
      if (coordinator_id === 'UNASSIGNED') {
        if (s.assigned_coordinator_id !== null) return false;
      } else if (String(s.assigned_coordinator_id) !== String(coordinator_id)) {
        return false;
      }
    }
    if (internship_status && internship_status !== 'ALL') {
      if (s.internship_status !== internship_status && s.status !== internship_status && s.lifecycle_stage !== internship_status) return false;
    }
    if (report_status && report_status !== 'ALL') {
      if (report_status === 'PENDING_REVIEW' && s.reports_pending === 0) return false;
      if (report_status === 'NEEDS_IMPROVEMENT' && s.reports_needs_improvement === 0) return false;
      if (report_status === 'APPROVED' && s.reports_approved === 0) return false;
      if (report_status === 'NO_REPORTS' && s.reports_submitted > 0) return false;
    }
    if (resume_status && resume_status !== 'ALL') {
      if (s.resume_verification_status !== resume_status) return false;
    }
    if (skill) {
      const skQuery = String(skill).toLowerCase().trim();
      const hasSkill =
        (Array.isArray(s.skills) && s.skills.some((sk: string) => sk.toLowerCase().includes(skQuery))) ||
        String(s.target_domain || '').toLowerCase().includes(skQuery);
      if (!hasSkill) return false;
    }
    if (min_cgpa) {
      const minVal = parseFloat(String(min_cgpa));
      if (!isNaN(minVal) && (parseFloat(s.cgpa || '0') || 0) < minVal) return false;
    }
    if (min_progress) {
      const minProg = parseInt(String(min_progress), 10);
      if (!isNaN(minProg) && (s.progress_percentage || 0) < minProg) return false;
    }
    if (inactive_only === 'true' && !s.is_inactive) {
      return false;
    }
    return true;
  });
}

// Staff Student Directory Endpoints (used across Admin, Coordinator, and Export pages)
const handleStaffStudentsList = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Students are not permitted to access the staff student cohort directory.' });
  }

  const store = loadStore();
  const visibleStudents = store.users.filter(u => {
    if (u.role !== 'STUDENT') return false;
    if (user.role === 'ADMIN') return true;
    return isCoordinatorAuthorizedForStudent(user, u, store);
  });

  const summaries = visibleStudents.map(u => buildStudentSummary(u, store));
  return res.json(filterStudentList(req, summaries));
};

app.get('/api/students/', handleStaffStudentsList);
app.get('/api/students/profiles/', handleStaffStudentsList);
app.get('/api/reports/staff-students-list/', handleStaffStudentsList);

// Career Passport Endpoint (Student's own passport)
app.get('/api/students/career-passport/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const targetUser = user.role === 'STUDENT'
    ? user
    : store.users.find(u => u.id === Number(req.query.student_id)) || user;

  if (user.role === 'STUDENT' && targetUser.id !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot access another student passport.' });
  }

  const resume = getOrBuildStudentResume(targetUser, store);
  const summary = buildStudentSummary(targetUser, store);
  const verifiedDocs = store.documents.filter(d => (d.user === targetUser.id || d.student === targetUser.id) && d.status === 'VERIFIED');
  const studentInternships = store.internships.filter(i => i.student === targetUser.id || i.student_id === targetUser.id);
  const studentAssessments = store.assessments.filter(a => a.student === targetUser.id || a.student_id === targetUser.id);

  return res.json({
    student_id: targetUser.id,
    student_name: targetUser.name,
    email: targetUser.email,
    roll_number: summary.roll_number,
    prn_number: summary.prn_number,
    department: summary.department,
    department_code: summary.department_code,
    academic_year: summary.academic_year,
    division: summary.division,
    semester: summary.semester,
    cgpa: summary.cgpa,
    phone: summary.phone,
    bio: resume.summary,
    github_url: summary.github_url,
    linkedin_url: summary.linkedin_url,
    portfolio_url: summary.portfolio_url,
    education_history: resume.education,
    verified_skills: studentAssessments.length > 0
      ? studentAssessments.map(a => ({
          skill_name: a.skill_name,
          current_level: a.current_level || 'INTERMEDIATE',
          score: a.score || 85,
          assessed_by: a.assessed_by_name || 'T&P Coordinator'
        }))
      : (resume.skills || []).map((sk: string) => ({
          skill_name: sk,
          current_level: 'VERIFIED',
          score: 85,
          assessed_by: 'Profile Skill'
        })),
    internships: studentInternships.map(i => ({
      id: i.id,
      role: i.role_title || i.role,
      role_title: i.role_title || i.role,
      organization: i.organization_name || i.company,
      organization_name: i.organization_name || i.company,
      start_date: i.start_date,
      end_date: i.end_date,
      status: i.status,
      final_score: i.final_score || 90
    })),
    certifications: resume.certifications || [],
    verified_credentials: verifiedDocs.map(d => ({
      id: d.id,
      title: d.title,
      verification_reference: d.verification_reference || d.verification_key,
      qr_code_key: d.verification_key
    }))
  });
});

// Detailed Student View (8-Tab Complete Journey for Admin/Coordinator, or Student's own profile)
const handleGetStudentDetail = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const requestedId = parseInt(req.params.id, 10);
  if (user.role === 'STUDENT' && user.id !== requestedId) {
    return res.status(403).json({ error: 'Forbidden: Students cannot view another student\'s private profile or records.' });
  }

  const store = loadStore();
  const target = store.users.find(u => u.id === requestedId && u.role === 'STUDENT');
  if (!target) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  if (user.role === 'COORDINATOR' && !isCoordinatorAuthorizedForStudent(user, target, store)) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to access students outside your assigned department.' });
  }

  const summary = buildStudentSummary(target, store);
  const resume = getOrBuildStudentResume(target, store);
  const resumeAnalysis = analyzeResume(resume);
  const internships = store.internships.filter(i => i.student === target.id || i.student_id === target.id);
  const applications = store.applications.filter(a => a.student === target.id || a.student_id === target.id);
  const reports = store.reports.filter(r => r.student === target.id || r.student_id === target.id);
  const tasks = store.tasks.filter(t => t.student === target.id || t.student_id === target.id);
  const documents = store.documents.filter(d => d.user === target.id || d.student === target.id);
  const assessments = store.assessments.filter(a => a.student === target.id || a.student_id === target.id);
  const activityLogs = store.audit_logs.filter(l =>
    l.actor?.id === target.id ||
    l.entity_id === String(target.id) ||
    (l.details && String(l.details).includes(target.name))
  );

  return res.json({
    ...summary,
    student: summary,
    bio: resume.summary,
    education_history: resume.education || [],
    verified_skills: assessments.map(a => ({
      id: a.id,
      skill_name: a.skill_name,
      skill_category: a.skill_category || 'Technical',
      initial_level: a.initial_level || 'BEGINNER',
      current_level: a.current_level || 'INTERMEDIATE',
      score: a.score || 85,
      practical_evidence: a.practical_evidence || '',
      coordinator_feedback: a.coordinator_feedback || '',
      assessed_by_name: a.assessed_by_name || 'Coordinator',
      assessment_date: a.assessment_date || (a.created_at ? a.created_at.split('T')[0] : '')
    })),
    projects: resume.projects || [],
    certifications: resume.certifications || [],
    achievements: resume.achievements || [],
    internships,
    applications,
    reports,
    tasks,
    documents,
    assessments,
    resume: {
      ...resume,
      analysis: resumeAnalysis
    },
    activity_history: activityLogs
  });
};

app.get('/api/students/:id/', handleGetStudentDetail);
app.get('/api/reports/staff-student-detail/:id/', handleGetStudentDetail);

const handleDeleteStudent = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    const store = loadStore();
    addAuditLog(
      store,
      user,
      'UNAUTHORIZED_STUDENT_DELETE_ATTEMPT',
      'Student',
      String(req.params.id),
      `Forbidden attempt by ${user.role} (${user.email}) to delete student ID ${req.params.id}`,
      req.ip,
      'FAILED'
    );
    saveStore(store);
    return res.status(403).json({ error: 'Forbidden: Only Administrators and authorized Coordinators can delete student records.' });
  }

  const requestedId = parseInt(req.params.id, 10);
  if (isNaN(requestedId)) {
    return res.status(400).json({ error: 'Invalid student identifier.' });
  }

  const store = loadStore();
  const target = store.users.find(
    u => u.role === 'STUDENT' && (u.id === requestedId || u.student_profile?.id === requestedId)
  );
  if (!target) {
    return res.status(404).json({ error: 'Student account not found or has already been deleted.' });
  }

  if (user.role === 'COORDINATOR' && !isCoordinatorAuthorizedForStudent(user, target, store)) {
    addAuditLog(
      store,
      user,
      'STUDENT_DELETE_OUT_OF_SCOPE',
      'Student',
      String(target.id),
      `Coordinator ${user.name} (${user.coordinator_profile?.department_code || 'CSE'}) attempted to delete out-of-scope student ${target.name} (${target.student_profile?.department_code || 'N/A'})`,
      req.ip,
      'FAILED'
    );
    saveStore(store);
    return res.status(403).json({
      error: 'Forbidden: You are only authorized to delete students within your assigned department or coordinator scope.'
    });
  }

  const sid = target.id;
  const studentName = target.name;
  const studentEmail = target.email;
  const rollNumber = target.student_profile?.roll_number || 'N/A';
  const deptInfo = normalizeDepartmentInfo(target.student_profile?.department_id, target.student_profile?.department_code);
  const academicYear = target.student_profile?.academic_year || '2026-2027';
  const assignedCoordId = target.student_profile?.assigned_coordinator_id || null;

  const removedInternships = store.internships.filter(i => i.student === sid || i.student_id === sid).length;
  const removedApplications = store.applications.filter(a => a.student === sid || a.student_id === sid).length;
  const removedReports = store.reports.filter(r => r.student === sid || r.student_id === sid).length;
  const removedDocuments = store.documents.filter(d => d.user === sid || d.student === sid).length;
  const removedResumes = store.resumes.filter(r => r.student_id === sid).length;
  const removedTasks = store.tasks.filter(t => t.student === sid || t.student_id === sid).length;
  const removedAssessments = store.assessments.filter(a => a.student === sid || a.student_id === sid).length;

  // Remove student user and associated records so no orphan references remain
  store.users = store.users.filter(u => u.id !== sid);
  store.internships = store.internships.filter(i => i.student !== sid && i.student_id !== sid);
  store.applications = store.applications.filter(a => a.student !== sid && a.student_id !== sid);
  store.reports = store.reports.filter(r => r.student !== sid && r.student_id !== sid);
  store.documents = store.documents.filter(d => d.user !== sid && d.student !== sid);
  store.resumes = store.resumes.filter(r => r.student_id !== sid);
  store.tasks = store.tasks.filter(t => t.student !== sid && t.student_id !== sid);
  store.assessments = store.assessments.filter(a => a.student !== sid && a.student_id !== sid);
  store.notifications = store.notifications.filter(n => n.user_id !== sid && n.recipient !== sid);

  const summaryDetails = `Deleted student ${studentName} (${rollNumber} • ${studentEmail} • ${deptInfo.code} • ${academicYear}) by ${user.role} ${user.name}. Associated records removed: ${removedInternships} internship(s), ${removedApplications} application(s), ${removedReports} report(s), ${removedDocuments} document(s), ${removedResumes} resume(s).`;

  addAuditLog(
    store,
    user,
    'STUDENT_DELETED',
    'Student',
    `${rollNumber} (ID:${sid})`,
    summaryDetails,
    req.ip,
    'SUCCESS'
  );

  // Notify Admins and relevant Coordinator
  store.users
    .filter(u => u.role === 'ADMIN' && u.id !== user.id)
    .forEach(adm => {
      addNotification(
        store,
        adm.id,
        `Student Record Deleted: ${studentName} (${rollNumber})`,
        `${user.name} (${user.role}) deleted student ${studentName} (${rollNumber}, ${deptInfo.code}).`,
        'STUDENT_DELETED',
        '/admin/students'
      );
    });

  if (assignedCoordId && assignedCoordId !== user.id) {
    addNotification(
      store,
      Number(assignedCoordId),
      `Assigned Student Deleted: ${studentName} (${rollNumber})`,
      `${user.name} (${user.role}) removed student ${studentName} (${rollNumber}, ${deptInfo.code}) from the system.`,
      'STUDENT_DELETED',
      '/coordinator/students'
    );
  }

  saveStore(store);

  return res.json({
    message: `Student account for ${studentName} (${rollNumber}) and associated records were deleted successfully.`,
    deleted_student_id: sid,
    deleted_student_name: studentName,
    roll_number: rollNumber,
    department_code: deptInfo.code,
    associated_records_removed: {
      internships: removedInternships,
      applications: removedApplications,
      reports: removedReports,
      documents: removedDocuments,
      resumes: removedResumes,
      tasks: removedTasks,
      assessments: removedAssessments
    }
  });
};

app.delete('/api/students/:id/', handleDeleteStudent);
app.delete('/api/students/profiles/:id/', handleDeleteStudent);
app.delete('/api/reports/staff-students-list/:id/', handleDeleteStudent);

// ============================================================================
// 3. SMART RESUME BUILDER, RESUME ANALYZER & COORDINATOR RESUME REVIEW
// ============================================================================

app.get('/api/resumes/me/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students have personal resumes.' });
  }

  const store = loadStore();
  const resume = getOrBuildStudentResume(user, store);
  const analysis = analyzeResume(resume);
  return res.json({ resume, analysis });
});

app.post('/api/resumes/me/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students can save their personal resume.' });
  }

  const store = loadStore();
  const current = getOrBuildStudentResume(user, store);
  const {
    summary,
    target_domain,
    template,
    phone,
    cgpa,
    github_url,
    linkedin_url,
    portfolio_url,
    skills,
    education,
    projects,
    internships,
    certifications,
    achievements,
    submit_for_review
  } = req.body;

  const cleanSkills = Array.isArray(skills)
    ? skills.map((s: any) => String(s).trim()).filter(Boolean)
    : typeof skills === 'string'
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : current.skills;

  const updatedResume = {
    ...current,
    id: current.id || Date.now(),
    student_id: user.id,
    student_name: user.name,
    email: user.email,
    summary: summary !== undefined ? String(summary) : current.summary,
    target_domain: target_domain || current.target_domain || 'Web Development',
    template: ['MITCORER_STANDARD', 'MODERN_TECH', 'CORE_ENGINEERING'].includes(template)
      ? template
      : (current.template || 'MITCORER_STANDARD'),
    phone: phone !== undefined ? String(phone) : current.phone,
    cgpa: cgpa !== undefined ? String(cgpa) : current.cgpa,
    github_url: github_url !== undefined ? String(github_url) : current.github_url,
    linkedin_url: linkedin_url !== undefined ? String(linkedin_url) : current.linkedin_url,
    portfolio_url: portfolio_url !== undefined ? String(portfolio_url) : current.portfolio_url,
    skills: cleanSkills,
    education: Array.isArray(education) ? education : current.education,
    projects: Array.isArray(projects) ? projects : current.projects,
    internships: Array.isArray(internships) ? internships : current.internships,
    certifications: Array.isArray(certifications) ? certifications : current.certifications,
    achievements: Array.isArray(achievements) ? achievements : current.achievements,
    verification_status: submit_for_review
      ? 'PENDING'
      : (current.verification_status === 'NOT_SUBMITTED' ? 'PENDING' : current.verification_status),
    updated_at: new Date().toISOString()
  };

  // Also sync non-destructive contact/skill fields to student_profile
  const targetUser = store.users.find(u => u.id === user.id);
  if (targetUser && targetUser.student_profile) {
    if (phone !== undefined) targetUser.student_profile.phone = String(phone);
    if (cgpa !== undefined && String(cgpa).trim()) targetUser.student_profile.cgpa = String(cgpa);
    if (github_url !== undefined) targetUser.student_profile.github_url = String(github_url);
    if (linkedin_url !== undefined) targetUser.student_profile.linkedin_url = String(linkedin_url);
    if (portfolio_url !== undefined) targetUser.student_profile.portfolio_url = String(portfolio_url);
    if (summary !== undefined) targetUser.student_profile.bio = String(summary);
    targetUser.student_profile.skills = cleanSkills;
    targetUser.student_profile.target_domain = updatedResume.target_domain;
    targetUser.student_profile.projects = updatedResume.projects;
    targetUser.student_profile.achievements = updatedResume.achievements;
  }

  const idx = store.resumes.findIndex(r => r.student_id === user.id);
  if (idx >= 0) {
    store.resumes[idx] = updatedResume;
  } else {
    store.resumes.push(updatedResume);
  }

  addAuditLog(store, user, 'STUDENT_RESUME_SAVED', 'Resume', String(updatedResume.id), `Saved resume (${updatedResume.template})`, req.ip);
  saveStore(store);

  const analysis = analyzeResume(updatedResume);
  return res.json({
    message: submit_for_review
      ? 'Resume saved and submitted for Coordinator verification!'
      : 'Resume saved successfully.',
    resume: updatedResume,
    analysis
  });
});

app.post('/api/resumes/analyze/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const baseResume = user.role === 'STUDENT' ? getOrBuildStudentResume(user, store) : {};
  const merged = { ...baseResume, ...req.body };
  return res.json(analyzeResume(merged));
});

// Staff Resume Directory & Coordinator/Admin Resume Review
app.get('/api/resumes/student/:studentId/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const studentId = parseInt(req.params.studentId, 10);
  if (user.role === 'STUDENT' && user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden: Students cannot view another student\'s resume.' });
  }

  const store = loadStore();
  const target = store.users.find(u => u.id === studentId && u.role === 'STUDENT');
  if (!target) return res.status(404).json({ error: 'Student not found.' });

  const resume = getOrBuildStudentResume(target, store);
  const analysis = analyzeResume(resume);
  return res.json({ resume, analysis });
});

app.post('/api/resumes/:studentId/review/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinators and Administrators can review student resumes.' });
  }

  const studentId = parseInt(req.params.studentId, 10);
  const { status, feedback } = req.body;
  const normalizedStatus = String(status || 'APPROVED').toUpperCase();
  if (!['PENDING', 'APPROVED', 'NEEDS_IMPROVEMENT'].includes(normalizedStatus)) {
    return res.status(400).json({ error: 'Invalid review status. Must be PENDING, APPROVED, or NEEDS_IMPROVEMENT.' });
  }

  const store = loadStore();
  const target = store.users.find(u => u.id === studentId && u.role === 'STUDENT');
  if (!target) return res.status(404).json({ error: 'Student not found.' });

  const resume = getOrBuildStudentResume(target, store);
  const reviewEntry = {
    id: Date.now(),
    status: normalizedStatus,
    feedback: String(feedback || '').trim(),
    reviewer_id: user.id,
    reviewer_name: user.name,
    reviewer_role: user.role,
    reviewed_at: new Date().toISOString()
  };

  resume.verification_status = normalizedStatus;
  resume.review_feedback = reviewEntry.feedback;
  resume.reviewed_by_name = user.name;
  resume.reviewed_at = reviewEntry.reviewed_at;
  resume.review_history = [reviewEntry, ...(Array.isArray(resume.review_history) ? resume.review_history : [])];

  const idx = store.resumes.findIndex(r => r.student_id === studentId);
  if (idx >= 0) {
    store.resumes[idx] = resume;
  } else {
    resume.id = Date.now();
    store.resumes.push(resume);
  }

  addNotification(
    store,
    studentId,
    `Resume Review Update: ${normalizedStatus.replace('_', ' ')}`,
    `${user.name} (${user.role}) marked your resume as ${normalizedStatus}${reviewEntry.feedback ? `: "${reviewEntry.feedback}"` : '.'}`,
    'RESUME_REVIEW'
  );
  addAuditLog(
    store,
    user,
    'RESUME_REVIEWED',
    'Resume',
    String(studentId),
    `Marked resume for ${target.name} as ${normalizedStatus}`,
    req.ip
  );
  saveStore(store);

  return res.json({
    message: `Resume for ${target.name} marked as ${normalizedStatus}.`,
    resume
  });
});

// ============================================================================
// 4. PERSONALIZED INTERNSHIP RECOMMENDATIONS & SKILL GAP ANALYSIS
// ============================================================================

app.get('/api/recommendations/internships/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const targetUser = user.role === 'STUDENT'
    ? user
    : store.users.find(u => u.id === Number(req.query.student_id)) || user;

  if (user.role === 'STUDENT' && targetUser.id !== user.id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const recommendations = computeInternshipRecommendations(targetUser, store);
  return res.json({
    student_id: targetUser.id,
    student_name: targetUser.name,
    methodology_note: 'Compatibility scores are estimated using: Required Skills Match (60%), Branch Eligibility (20%), CGPA Threshold (10%), and Target Domain Alignment (10%).',
    recommendations
  });
});

// ============================================================================
// 5. INTERNSHIPS, APPLICATIONS, WEEKLY REPORTS, TASKS & DOCUMENTS
// ============================================================================

app.get(['/api/internships/', '/api/internships/me/'], (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();

  let list = user.role === 'STUDENT'
    ? store.internships.filter(i => i.student === user.id || i.student_id === user.id)
    : store.internships.filter(i => isRecordVisibleToStaff(user, i, store));

  if (req.query.status) {
    const st = String(req.query.status).toUpperCase();
    list = list.filter(i => String(i.status).toUpperCase() === st);
  }

  const enriched = list.map(i => {
    const sid = i.student || i.student_id;
    const studentReports = store.reports.filter(r => r.student === sid || r.student_id === sid);
    const approvedReports = studentReports.filter(r => r.status === 'APPROVED');
    const studentDocs = store.documents.filter(d => d.user === sid || d.student === sid);
    const certDoc = studentDocs.find(d => d.status === 'VERIFIED' && (d.document_type === 'COMPLETION_CERTIFICATE' || d.document_type === 'TRAINING_CERTIFICATE'))
      || studentDocs.find(d => d.status === 'VERIFIED')
      || studentDocs.find(d => d.document_type === 'COMPLETION_CERTIFICATE' || d.document_type === 'TRAINING_CERTIFICATE')
      || studentDocs[0]
      || null;
    const certVerified = studentDocs.some(d => d.status === 'VERIFIED');
    const avgScore = approvedReports.length > 0
      ? Math.round(approvedReports.reduce((sum, r) => sum + (Number(r.score) || 85), 0) / approvedReports.length)
      : (i.final_score || 85);

    const compStatus = i.completion_status || (i.status === 'COMPLETED' ? 'COMPLETED' : (approvedReports.length >= 1 ? 'PENDING_APPROVAL' : 'IN_PROGRESS'));

    return {
      ...i,
      company: i.organization_name || i.company,
      organization_name: i.organization_name || i.company,
      role: i.role_title || i.role,
      role_title: i.role_title || i.role,
      duration: i.duration || '8 Weeks',
      total_reports_submitted: studentReports.filter(r => r.status !== 'DRAFT').length,
      total_reports_approved: approvedReports.length,
      avg_score: avgScore,
      certificate_verified: certVerified,
      certificate_document: certDoc,
      reports_list: studentReports.map(r => ({
        id: r.id,
        week_number: r.week_number,
        tasks_completed: r.tasks_completed,
        hours_worked: r.hours_worked,
        status: r.status,
        score: r.score,
        submitted_at: r.submitted_at,
        coordinator_comments: r.coordinator_comments || r.coordinator_comment || ''
      })),
      completion_status: compStatus
    };
  });

  if (req.query.completion_status) {
    const cs = String(req.query.completion_status).toUpperCase();
    return res.json(enriched.filter(i => String(i.completion_status).toUpperCase() === cs || (cs === 'PENDING_APPROVAL' && i.status === 'ACTIVE')));
  }

  return res.json(enriched);
});

app.post('/api/internships/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const targetStudentId = user.role === 'STUDENT' ? user.id : Number(req.body.student_id || req.body.student || user.id);
  const studentUser = store.users.find(u => u.id === targetStudentId);

  const newInternship = {
    id: Date.now(),
    student: targetStudentId,
    student_id: targetStudentId,
    student_name: studentUser?.name || user.name,
    roll_number: studentUser?.student_profile?.roll_number || 'N/A',
    department_code: studentUser?.student_profile?.department_code || 'CSE',
    organization_name: req.body.organization_name || req.body.company || 'Host Organization',
    company: req.body.organization_name || req.body.company || 'Host Organization',
    role_title: req.body.role_title || req.body.role || 'Software Engineering Intern',
    role: req.body.role_title || req.body.role || 'Software Engineering Intern',
    domain: req.body.domain || 'Web Development',
    mentor_name: req.body.mentor_name || 'Industry Supervisor',
    mentor_email: req.body.mentor_email || '',
    start_date: req.body.start_date || new Date().toISOString().split('T')[0],
    end_date: req.body.end_date || '2026-12-31',
    duration: req.body.duration || '8 Weeks',
    mode: req.body.mode || 'ONSITE',
    status: req.body.status || 'ACTIVE',
    completion_status: 'IN_PROGRESS',
    final_score: req.body.final_score || 0,
    created_at: new Date().toISOString()
  };

  store.internships.unshift(newInternship);
  notifyCoordinators(
    store,
    studentUser,
    `New Internship Registered: ${newInternship.student_name}`,
    `${newInternship.student_name} (${newInternship.roll_number}) registered an internship at ${newInternship.organization_name}.`,
    'INTERNSHIP_UPDATE',
    `/coordinator/students/${targetStudentId}`
  );
  addAuditLog(store, user, 'INTERNSHIP_REGISTERED', 'Internship', String(newInternship.id), `${newInternship.role_title} at ${newInternship.organization_name}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newInternship);
});

app.patch('/api/internships/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const internId = parseInt(req.params.id, 10);
  const store = loadStore();
  const intern = store.internships.find(i => i.id === internId);
  if (!intern) return res.status(404).json({ error: 'Internship record not found.' });

  if (user.role === 'STUDENT' && intern.student !== user.id && intern.student_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const allowed = ['organization_name', 'company', 'role_title', 'role', 'domain', 'mentor_name', 'mentor_email', 'start_date', 'end_date', 'duration', 'mode', 'status', 'completion_status', 'final_score', 'completion_remarks'];
  allowed.forEach(f => {
    if (f in req.body) intern[f] = req.body[f];
  });
  saveStore(store);
  return res.json(intern);
});

app.post('/api/internships/:id/approve-completion/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can approve internship completion.' });
  }

  const internId = parseInt(req.params.id, 10);
  const store = loadStore();
  const intern = store.internships.find(i => i.id === internId);
  if (!intern) return res.status(404).json({ error: 'Internship record not found.' });

  const sid = intern.student || intern.student_id;
  const approvedReports = store.reports.filter(r => (r.student === sid || r.student_id === sid) && r.status === 'APPROVED');
  const verifiedDocs = store.documents.filter(d => (d.user === sid || d.student === sid) && d.status === 'VERIFIED');

  if (approvedReports.length === 0) {
    return res.status(400).json({
      error: 'Completion requirement not met: Student must have at least 1 APPROVED weekly progress report before final completion sign-off.'
    });
  }

  if (verifiedDocs.length === 0) {
    return res.status(400).json({
      error: 'Completion requirement not met: Student must have a VERIFIED certificate or official document before final completion sign-off.'
    });
  }

  intern.status = 'COMPLETED';
  intern.completion_status = 'COMPLETED';
  intern.completed_at = new Date().toISOString();
  intern.completed_by = user.id;
  intern.completed_by_name = user.name;
  intern.completion_remarks = String(req.body.remarks || 'All weekly reports and completion credentials verified.').trim();
  if (req.body.final_score) intern.final_score = Number(req.body.final_score);

  addNotification(
    store,
    sid,
    `Internship Completion Approved: ${intern.organization_name || intern.company}`,
    `${user.name} signed off on your internship completion at ${intern.organization_name || intern.company}.`,
    'INTERNSHIP_COMPLETION',
    '/student/internships'
  );
  addAuditLog(
    store,
    user,
    'INTERNSHIP_COMPLETION_APPROVED',
    'Internship',
    String(intern.id),
    `Approved completion for ${intern.student_name} at ${intern.organization_name || intern.company}`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);
  return res.json(intern);
});

app.post('/api/internships/:id/reject-completion/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can review internship completion.' });
  }

  const internId = parseInt(req.params.id, 10);
  const store = loadStore();
  const intern = store.internships.find(i => i.id === internId);
  if (!intern) return res.status(404).json({ error: 'Internship record not found.' });

  const reason = String(req.body.reason || req.body.remarks || 'Additional weekly report or certificate verification required before completion sign-off.').trim();
  const action = String(req.body.action || 'REQUEST_CORRECTION').toUpperCase();

  intern.completion_status = action === 'REJECT' ? 'REJECTED' : 'NEEDS_CORRECTION';
  intern.completion_remarks = reason;
  intern.reviewed_by = user.id;
  intern.reviewed_by_name = user.name;
  intern.reviewed_at = new Date().toISOString();

  const sid = intern.student || intern.student_id;
  addNotification(
    store,
    sid,
    `Internship Completion ${action === 'REJECT' ? 'Rejected' : 'Correction Requested'}: ${intern.organization_name || intern.company}`,
    `${user.name} reviewed your internship completion request: "${reason}"`,
    'INTERNSHIP_COMPLETION',
    '/student/internships'
  );
  addAuditLog(
    store,
    user,
    'INTERNSHIP_COMPLETION_RETURNED',
    'Internship',
    String(intern.id),
    `Returned completion for ${intern.student_name}: ${reason}`,
    req.ip,
    'WARNING'
  );
  saveStore(store);
  return res.json(intern);
});

app.get('/api/applications/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  let list = user.role === 'STUDENT'
    ? store.applications.filter(a => a.student === user.id || a.student_id === user.id)
    : store.applications.filter(a => isRecordVisibleToStaff(user, a, store));

  if (req.query.status && req.query.status !== 'ALL') {
    const st = String(req.query.status).toUpperCase();
    list = list.filter(a => String(a.status).toUpperCase() === st);
  }
  if (req.query.opportunity_id) {
    const oid = Number(req.query.opportunity_id);
    list = list.filter(a => Number(a.opportunity) === oid);
  }

  const enriched = list.map(app => {
    const opp = store.opportunities.find(o => o.id === Number(app.opportunity)) || null;
    const sid = app.student || app.student_id;
    const studentUser = store.users.find(u => u.id === sid);
    const resume = studentUser ? getOrBuildStudentResume(studentUser, store) : null;

    return {
      ...app,
      opportunity_title: app.opportunity_title || opp?.title || 'Internship Opportunity',
      organization: app.organization || opp?.organization || 'Host Organization',
      mode: app.mode || opp?.mode || 'ONSITE',
      opportunity_details: opp ? {
        id: opp.id,
        title: opp.title,
        organization: opp.organization,
        mode: opp.mode || 'ONSITE',
        location: opp.location || 'Maharashtra',
        duration: opp.duration || '8 Weeks',
        stipend: opp.stipend_amount || opp.stipend_type || 'Unpaid',
        deadline: opp.deadline || '',
        application_url: opp.application_url || ''
      } : {
        id: app.opportunity,
        title: app.opportunity_title || 'Internship Opportunity',
        organization: app.organization || 'Host Organization',
        mode: app.mode || 'ONSITE',
        location: 'Maharashtra',
        duration: '8 Weeks'
      },
      student_details: studentUser ? {
        id: studentUser.id,
        name: studentUser.name,
        email: studentUser.email,
        roll_number: studentUser.student_profile?.roll_number || app.roll_number || 'N/A',
        department_code: studentUser.student_profile?.department_code || app.department_code || 'CSE',
        academic_year: studentUser.student_profile?.academic_year || '2026-2027',
        cgpa: resume?.cgpa || studentUser.student_profile?.cgpa || '0.00',
        skills: resume?.skills || studentUser.student_profile?.skills || [],
        resume_verification_status: resume?.verification_status || 'NOT_SUBMITTED'
      } : null
    };
  });

  return res.json(enriched);
});

app.post('/api/applications/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students can submit internship applications.' });
  }

  const store = loadStore();
  const oppId = Number(req.body.opportunity || req.body.opportunity_id);
  const opp = store.opportunities.find(o => o.id === oppId);
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  if (opp.status && opp.status !== 'PUBLISHED') {
    return res.status(400).json({ error: 'This opportunity is not currently open for applications.' });
  }

  if (store.applications.some(a => (a.student === user.id || a.student_id === user.id) && a.opportunity === oppId && a.status !== 'WITHDRAWN')) {
    return res.status(400).json({ error: 'You have already applied for this opportunity.' });
  }

  const newApp = {
    id: Date.now(),
    opportunity: opp.id,
    opportunity_title: opp.title,
    organization: opp.organization,
    mode: opp.mode || 'ONSITE',
    student: user.id,
    student_id: user.id,
    student_name: user.name,
    roll_number: user.student_profile?.roll_number || 'N/A',
    department_code: user.student_profile?.department_code || 'CSE',
    cover_letter: req.body.cover_letter || '',
    resume_url: req.body.resume_url || '',
    external_application_proof: req.body.external_application_proof || '',
    status: 'APPLIED',
    applied_at: new Date().toISOString()
  };

  store.applications.unshift(newApp);
  addAuditLog(store, user, 'OPPORTUNITY_APPLIED', 'Application', String(newApp.id), `Applied to ${opp.title} at ${opp.organization}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newApp);
});

// Coordinator / Admin Update Application Status (Shortlist, Approve/Select, Reject, Request Changes)
const handleUpdateApplicationStatus = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinators and Administrators can review internship applications.' });
  }

  const appId = parseInt(req.params.id, 10);
  const { status, feedback, reviewer_feedback } = req.body;
  const rawStatus = String(status || '').toUpperCase();
  const allowedStatuses = ['APPLIED', 'SHORTLISTED', 'SELECTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'];
  if (!allowedStatuses.includes(rawStatus)) {
    return res.status(400).json({ error: `Invalid application status. Allowed: ${allowedStatuses.join(', ')}` });
  }

  const normalizedStatus = rawStatus === 'APPROVED' ? 'SELECTED' : rawStatus;

  const store = loadStore();
  const appRecord = store.applications.find(a => a.id === appId);
  if (!appRecord) return res.status(404).json({ error: 'Application not found.' });

  const feedbackNote = String(feedback || reviewer_feedback || '').trim();
  appRecord.status = normalizedStatus;
  appRecord.reviewer_feedback = feedbackNote;
  appRecord.reviewed_by = user.id;
  appRecord.reviewed_by_name = user.name;
  appRecord.reviewed_at = new Date().toISOString();

  const sid = appRecord.student || appRecord.student_id;
  const opp = store.opportunities.find(o => o.id === Number(appRecord.opportunity));

  // If SELECTED/APPROVED, automatically enroll student in store.internships if not already enrolled for this org/role
  if (normalizedStatus === 'SELECTED') {
    const studentUser = store.users.find(u => u.id === sid);
    const orgName = appRecord.organization || opp?.organization || 'Host Organization';
    const roleTitle = appRecord.opportunity_title || opp?.title || 'Engineering Intern';

    const existingIntern = store.internships.find(i =>
      (i.student === sid || i.student_id === sid) &&
      String(i.organization_name || i.company).toLowerCase() === String(orgName).toLowerCase()
    );

    if (!existingIntern) {
      store.internships.unshift({
        id: Date.now() + 2,
        student: sid,
        student_id: sid,
        student_name: studentUser?.name || appRecord.student_name,
        roll_number: studentUser?.student_profile?.roll_number || appRecord.roll_number || 'N/A',
        department_code: studentUser?.student_profile?.department_code || appRecord.department_code || 'CSE',
        organization_name: orgName,
        company: orgName,
        role_title: roleTitle,
        role: roleTitle,
        domain: opp?.domain || 'Engineering',
        mentor_name: 'Assigned Industry Supervisor',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        duration: opp?.duration || '8 Weeks',
        mode: appRecord.mode || opp?.mode || 'ONSITE',
        status: 'ACTIVE',
        completion_status: 'IN_PROGRESS',
        final_score: 0,
        created_at: new Date().toISOString()
      });
    } else if (existingIntern.status !== 'COMPLETED') {
      existingIntern.status = 'ACTIVE';
    }
  }

  addNotification(
    store,
    sid,
    `Application Status Updated: ${normalizedStatus.replace('_', ' ')}`,
    `Your application for "${appRecord.opportunity_title}" at ${appRecord.organization} has been marked as ${normalizedStatus} by ${user.name}${feedbackNote ? `: "${feedbackNote}"` : '.'}`,
    'APPLICATION_STATUS'
  );

  addAuditLog(
    store,
    user,
    `APPLICATION_${normalizedStatus}`,
    'Application',
    String(appRecord.id),
    `Marked application by ${appRecord.student_name} for ${appRecord.opportunity_title} as ${normalizedStatus}`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);
  return res.json(appRecord);
};

app.patch('/api/applications/:id/', handleUpdateApplicationStatus);
app.post('/api/applications/:id/status/', handleUpdateApplicationStatus);

// Student Withdraw / Cancel Application
const handleWithdrawApplication = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const appId = parseInt(req.params.id, 10);
  const store = loadStore();
  const appRecord = store.applications.find(a => a.id === appId);
  if (!appRecord) return res.status(404).json({ error: 'Application not found.' });

  if (user.role === 'STUDENT' && appRecord.student !== user.id && appRecord.student_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot withdraw another student\'s application.' });
  }

  if (appRecord.status === 'SELECTED' && user.role === 'STUDENT') {
    return res.status(400).json({ error: 'Cannot withdraw an already selected/enrolled application without Coordinator approval.' });
  }

  store.applications = store.applications.filter(a => a.id !== appId);
  addAuditLog(store, user, 'APPLICATION_WITHDRAWN', 'Application', String(appId), `Withdrew application for ${appRecord.opportunity_title}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json({ message: 'Application withdrawn successfully.' });
};

app.post('/api/applications/:id/withdraw/', handleWithdrawApplication);
app.delete('/api/applications/:id/', handleWithdrawApplication);

// Weekly Progress Reports
app.get('/api/reports/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  let list = user.role === 'STUDENT'
    ? store.reports.filter(r => r.student === user.id || r.student_id === user.id)
    : store.reports.filter(r => isRecordVisibleToStaff(user, r, store));

  if (req.query.status && req.query.status !== 'ALL') {
    const st = String(req.query.status).toUpperCase();
    list = list.filter(r => String(r.status).toUpperCase() === st);
  }
  if (req.query.student_id && user.role !== 'STUDENT') {
    const sid = Number(req.query.student_id);
    list = list.filter(r => r.student === sid || r.student_id === sid);
  }
  return res.json(list);
});

app.post('/api/reports/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students can submit weekly progress reports.' });
  }

  const {
    internship,
    week_number,
    tasks_completed,
    technical_skills,
    learning_outcomes,
    challenges_faced,
    solutions_implemented,
    project_progress,
    github_link,
    demo_link,
    next_week_plan,
    student_reflection,
    hours_worked,
    proof_links,
    evidence_url,
    evidence_file_name,
    evidence_data_url,
    organization_name,
    role_title,
    status
  } = req.body;

  if (!tasks_completed || !String(tasks_completed).trim()) {
    return res.status(400).json({ error: 'Tasks completed is required.' });
  }

  const store = loadStore();

  let internRecord = store.internships.find(i =>
    (i.id === Number(internship)) && (i.student === user.id || i.student_id === user.id)
  ) || store.internships.find(i => i.student === user.id || i.student_id === user.id);

  if (!internRecord) {
    internRecord = {
      id: Date.now() - 10,
      student: user.id,
      student_id: user.id,
      student_name: user.name,
      roll_number: user.student_profile?.roll_number || 'N/A',
      department_code: user.student_profile?.department_code || 'CSE',
      organization_name: organization_name || 'MITCORER Industry Partner',
      company: organization_name || 'MITCORER Industry Partner',
      role_title: role_title || 'Engineering Intern',
      role: role_title || 'Engineering Intern',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '2026-12-31',
      status: 'ACTIVE',
      completion_status: 'IN_PROGRESS',
      final_score: 0,
      created_at: new Date().toISOString()
    };
    store.internships.unshift(internRecord);
  }

  const cleanLinks = Array.isArray(proof_links) ? proof_links.filter(Boolean) : [];
  const primaryEvidence = evidence_url || github_link || demo_link || cleanLinks[0] || '';

  const newReport = {
    id: Date.now(),
    internship: internRecord.id,
    student: user.id,
    student_id: user.id,
    student_name: user.name,
    roll_number: user.student_profile?.roll_number || 'N/A',
    department: user.student_profile?.department_name || 'Computer Science & Engineering',
    department_code: user.student_profile?.department_code || 'CSE',
    company: internRecord.organization_name || internRecord.company,
    organization_name: internRecord.organization_name || internRecord.company,
    role_title: internRecord.role_title || internRecord.role,
    week_number: Number(week_number) || 1,
    tasks_completed: String(tasks_completed).trim(),
    technical_skills: String(technical_skills || '').trim(),
    learning_outcomes: String(learning_outcomes || '').trim(),
    challenges_faced: String(challenges_faced || '').trim(),
    solutions_implemented: String(solutions_implemented || '').trim(),
    project_progress: String(project_progress || '').trim(),
    github_link: String(github_link || '').trim(),
    demo_link: String(demo_link || '').trim(),
    next_week_plan: String(next_week_plan || '').trim(),
    student_reflection: String(student_reflection || '').trim(),
    hours_worked: Number(hours_worked) || 40,
    proof_links: cleanLinks,
    evidence_url: primaryEvidence,
    evidence_file_name: evidence_file_name ? String(evidence_file_name).trim() : '',
    evidence_data_url: evidence_data_url || '',
    status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
    submitted_at: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    review_history: []
  };

  store.reports.unshift(newReport);
  if (newReport.status === 'SUBMITTED') {
    notifyCoordinators(
      store,
      user,
      `New Weekly Report: Week ${newReport.week_number} (${user.name})`,
      `${user.name} (${newReport.roll_number}) submitted Week ${newReport.week_number} progress report for ${newReport.company}.`,
      'REPORT_SUBMISSION',
      '/coordinator/reports'
    );
  }
  addAuditLog(
    store,
    user,
    'WEEKLY_REPORT_SUBMITTED',
    'Report',
    String(newReport.id),
    `Submitted Week ${newReport.week_number} report (${newReport.status})`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);

  return res.status(201).json(newReport);
});

app.patch('/api/reports/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const reportId = parseInt(req.params.id, 10);
  const store = loadStore();
  const report = store.reports.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  if (user.role === 'STUDENT' && report.student !== user.id && report.student_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot modify another student\'s report.' });
  }

  // Prevent students from modifying already APPROVED reports unless Coordinator/Admin unlocks it
  if (user.role === 'STUDENT' && report.status === 'APPROVED') {
    return res.status(403).json({ error: 'Approved weekly reports are locked and cannot be modified without Coordinator authorization.' });
  }

  const editableFields = [
    'tasks_completed', 'technical_skills', 'learning_outcomes',
    'challenges_faced', 'solutions_implemented', 'project_progress',
    'github_link', 'demo_link', 'next_week_plan', 'student_reflection',
    'hours_worked', 'proof_links', 'evidence_url', 'evidence_file_name', 'evidence_data_url', 'status'
  ];
  editableFields.forEach(f => {
    if (f in req.body) {
      report[f] = req.body[f];
    }
  });
  if (user.role === 'STUDENT' && report.status === 'NEEDS_IMPROVEMENT' && req.body.status !== 'DRAFT') {
    report.status = 'SUBMITTED';
  }
  report.updated_at = new Date().toISOString();
  addAuditLog(store, user, 'WEEKLY_REPORT_UPDATED', 'Report', String(report.id), `Updated Week ${report.week_number} report`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(report);
});

app.delete('/api/reports/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const reportId = parseInt(req.params.id, 10);
  const store = loadStore();
  const report = store.reports.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  if (user.role === 'STUDENT' && report.student !== user.id && report.student_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot delete another student\'s report.' });
  }

  if (user.role === 'STUDENT' && report.status === 'APPROVED') {
    return res.status(403).json({ error: 'Approved weekly reports are locked and cannot be deleted.' });
  }

  store.reports = store.reports.filter(r => r.id !== reportId);
  addAuditLog(store, user, 'WEEKLY_REPORT_DELETED', 'Report', String(reportId), `Deleted Week ${report.week_number} report`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json({ message: 'Report deleted.' });
});

// Coordinator / Admin Report Review & Feedback
app.post('/api/reports/:id/feedback/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinators and Administrators can review weekly reports.' });
  }

  const reportId = parseInt(req.params.id, 10);
  const { score, comments, coordinator_feedback, evidence_feedback, required_corrections, decision, status, task_title } = req.body;
  const store = loadStore();
  const report = store.reports.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  const rawDecision = String(decision || status || 'APPROVED').toUpperCase();
  const normalizedDecision =
    rawDecision === 'APPROVE' || rawDecision === 'APPROVED' ? 'APPROVED' :
    rawDecision === 'REJECT' || rawDecision === 'REJECTED' ? 'REJECTED' :
    'NEEDS_IMPROVEMENT';

  const numericScore = Number(score) || 80;
  const displayScore10 = numericScore > 10 ? Math.round(numericScore / 10) : numericScore;
  const feedbackText = String(comments || coordinator_feedback || '').trim();
  const evidenceNotes = String(evidence_feedback || '').trim();
  const correctionsText = String(required_corrections || '').trim();

  if (!feedbackText && (normalizedDecision === 'NEEDS_IMPROVEMENT' || normalizedDecision === 'REJECTED')) {
    return res.status(400).json({ error: 'Coordinator review remarks are required when requesting improvements or rejecting a report.' });
  }

  report.status = normalizedDecision;
  report.coordinator_score = displayScore10;
  report.score = numericScore > 10 ? numericScore : numericScore * 10;
  report.coordinator_comments = feedbackText;
  report.coordinator_comment = feedbackText;
  report.evidence_feedback = evidenceNotes;
  report.required_corrections = correctionsText;
  report.reviewed_by = user.id;
  report.reviewed_by_name = user.name;
  report.reviewed_at = new Date().toISOString();

  if (!Array.isArray(report.review_history)) report.review_history = [];
  report.review_history.unshift({
    id: Date.now(),
    decision: normalizedDecision,
    score: report.score,
    comments: report.coordinator_comments,
    evidence_feedback: evidenceNotes,
    required_corrections: correctionsText,
    reviewer_name: user.name,
    reviewer_role: user.role,
    reviewed_at: report.reviewed_at
  });

  if (task_title || normalizedDecision === 'NEEDS_IMPROVEMENT') {
    store.tasks.unshift({
      id: Date.now() + 1,
      student: report.student || report.student_id,
      student_id: report.student || report.student_id,
      student_name: report.student_name,
      report_id: report.id,
      title: task_title ? String(task_title).trim() : `Revise Week ${report.week_number} Report Deliverables`,
      description: correctionsText || report.coordinator_comments || 'Address coordinator review remarks and resubmit report.',
      assigned_by: user.id,
      assigned_by_name: user.name,
      organization_name: report.company || report.organization_name || 'Host Organization',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
  }

  addNotification(
    store,
    report.student || report.student_id,
    `Week ${report.week_number} Report ${normalizedDecision.replace('_', ' ')}`,
    `${user.name} reviewed your Week ${report.week_number} report (Score: ${report.score}/100): "${report.coordinator_comments}"`,
    'REPORT_REVIEW',
    '/student/reports'
  );

  addAuditLog(
    store,
    user,
    'REPORT_REVIEWED',
    'Report',
    String(report.id),
    `Marked Week ${report.week_number} report for ${report.student_name} as ${normalizedDecision}`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);
  return res.json(report);
});

app.get('/api/reports/:id/download/', (req: Request, res: Response) => {
  const store = loadStore();
  const report = store.reports.find(r => r.id === parseInt(req.params.id, 10));
  if (!report) return res.status(404).send('Weekly Report not found.');

  res.setHeader('Content-Type', 'text/html');
  return res.send(`<!DOCTYPE html>
<html>
<head><title>Week ${report.week_number} Progress Report — ${report.student_name}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 780px; margin: 32px auto; padding: 32px; border: 2px solid #1e40af; border-radius: 12px; color: #0f172a;">
  <div style="font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase;">MAEER's MIT College of Railway Engineering & Research, Barshi</div>
  <h1 style="margin: 6px 0 16px;">Weekly Internship Progress Report — Week ${report.week_number}</h1>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 18px; font-size: 13px;">
    <div><strong>Student Name:</strong> ${report.student_name}</div>
    <div><strong>Roll Number:</strong> ${report.roll_number || 'N/A'}</div>
    <div><strong>Department:</strong> ${report.department || report.department_code || 'CSE'}</div>
    <div><strong>Host Organization:</strong> ${report.company || report.organization_name || 'N/A'}</div>
    <div><strong>Hours Logged:</strong> ${report.hours_worked || 40} hrs</div>
    <div><strong>Submitted On:</strong> ${report.submitted_at || 'N/A'}</div>
    <div><strong>Review Status:</strong> ${report.status}</div>
    <div><strong>Evaluation Score:</strong> ${report.score ? `${report.score}/100` : 'Pending Review'}</div>
  </div>
  <h3 style="margin-bottom: 4px; color: #1e3a8a;">1. Tasks Completed</h3>
  <p style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; white-space: pre-wrap;">${report.tasks_completed || 'N/A'}</p>
  <h3 style="margin-bottom: 4px; color: #1e3a8a;">2. Technical Skills & Learning Outcomes</h3>
  <p style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Skills:</strong> ${report.technical_skills || 'N/A'}<br/><br/><strong>Learning Outcomes:</strong> ${report.learning_outcomes || 'N/A'}</p>
  <h3 style="margin-bottom: 4px; color: #1e3a8a;">3. Challenges Faced & Solutions Implemented</h3>
  <p style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Challenges:</strong> ${report.challenges_faced || 'None reported'}<br/><br/><strong>Solutions:</strong> ${report.solutions_implemented || 'N/A'}</p>
  <h3 style="margin-bottom: 4px; color: #1e3a8a;">4. Evidence & Proof Links</h3>
  <p style="font-size: 13px;">${report.evidence_url || report.github_link || report.demo_link || 'No external link attached'} ${report.evidence_file_name ? `(Attached File: ${report.evidence_file_name})` : ''}</p>
  ${report.coordinator_comments ? `
  <div style="margin-top: 18px; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px;">
    <strong>Faculty Coordinator Remarks (${report.reviewed_by_name || 'Coordinator'}):</strong><br/>
    ${report.coordinator_comments}
    ${report.evidence_feedback ? `<br/><strong>Evidence Feedback:</strong> ${report.evidence_feedback}` : ''}
    ${report.required_corrections ? `<br/><strong>Required Corrections:</strong> ${report.required_corrections}` : ''}
  </div>` : ''}
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
  </div>
</body>
</html>`);
});

app.get('/api/reports/summary/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const store = loadStore();
  const reports = user?.role === 'STUDENT'
    ? store.reports.filter(r => r.student === user.id || r.student_id === user.id)
    : store.reports;
  return res.json({
    total_submitted: reports.length,
    approved_count: reports.filter(r => r.status === 'APPROVED').length,
    pending_count: reports.filter(r => r.status === 'SUBMITTED').length,
    needs_improvement_count: reports.filter(r => r.status === 'NEEDS_IMPROVEMENT').length,
    current_streak: reports.filter(r => r.status === 'APPROVED').length
  });
});

// Tasks Endpoints
app.get('/api/tasks/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  if (user.role === 'STUDENT') {
    return res.json(store.tasks.filter(t => t.student === user.id || t.student_id === user.id));
  }
  return res.json(store.tasks.filter(t => isRecordVisibleToStaff(user, t, store)));
});

app.post('/api/tasks/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const targetStudentId = user.role === 'STUDENT' ? user.id : Number(req.body.student_id || req.body.student || user.id);
  const studentUser = store.users.find(u => u.id === targetStudentId);

  const newTask = {
    id: Date.now(),
    student: targetStudentId,
    student_id: targetStudentId,
    student_name: studentUser?.name || user.name,
    title: String(req.body.title || 'Project Milestone Task').trim(),
    description: String(req.body.description || '').trim(),
    assigned_by: user.id,
    assigned_by_name: user.name,
    organization_name: req.body.organization_name || 'Internship Project',
    due_date: req.body.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  store.tasks.unshift(newTask);
  saveStore(store);
  return res.status(201).json(newTask);
});

app.post('/api/tasks/:id/mark_completed/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const taskId = parseInt(req.params.id, 10);
  const store = loadStore();
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  if (user.role === 'STUDENT' && task.student !== user.id && task.student_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot update another student\'s task.' });
  }

  task.status = 'COMPLETED';
  task.student_notes = String(req.body.student_notes || 'Completed').trim();
  task.completed_at = new Date().toISOString();
  saveStore(store);
  return res.json(task);
});

// Documents & Certificates Endpoints
app.get('/api/documents/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  let docs = user.role === 'STUDENT'
    ? store.documents.filter(d => d.user === user.id || d.student === user.id)
    : store.documents.filter(d => isRecordVisibleToStaff(user, d, store));

  if (req.query.status && req.query.status !== 'ALL') {
    const st = String(req.query.status).toUpperCase();
    docs = docs.filter(d => String(d.status).toUpperCase() === st);
  }
  return res.json(docs);
});

app.post('/api/documents/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const body = req.body || {};
  const title = String(body.title || 'Official Internship Document').trim();
  const docType = String(body.document_type || 'OFFER_LETTER').toUpperCase();
  const issuingOrg = String(body.issuing_organization || 'Host Organization').trim();
  const verRef = String(body.verification_reference || `REF-${Date.now().toString().slice(-6)}`).trim();
  const fileName = String(body.file_name || `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`).trim();
  const fileSize = Number(body.file_size) || 245760;

  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
  const lowerFileName = fileName.toLowerCase();
  if (!allowedExtensions.some(ext => lowerFileName.endsWith(ext))) {
    return res.status(400).json({ error: 'Invalid file format. Only .pdf, .png, .jpg, .jpeg, and .docx files are permitted.' });
  }
  if (fileSize > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size exceeds the 10MB security limit.' });
  }

  const store = loadStore();

  const newDoc = {
    id: Date.now(),
    user: user.id,
    student: user.id,
    student_name: user.name,
    roll_number: user.student_profile?.roll_number || 'N/A',
    department: user.student_profile?.department_name || 'Computer Science & Engineering',
    department_code: user.student_profile?.department_code || 'CSE',
    company: issuingOrg,
    title,
    document_type: docType,
    issuing_organization: issuingOrg,
    internship_id: body.internship_id || body.internship || null,
    training_program: body.training_program || '',
    verification_reference: verRef,
    verification_key: '',
    qr_code_key: '',
    file_name: fileName,
    file_size: fileSize,
    file_data_url: body.file_data_url || '',
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  store.documents.unshift(newDoc);
  notifyCoordinators(
    store,
    user,
    `Document Submitted for Verification: ${title}`,
    `${user.name} (${newDoc.roll_number}) uploaded ${docType.replace(/_/g, ' ')} from ${issuingOrg}.`,
    'DOCUMENT_VERIFICATION',
    '/coordinator/documents'
  );
  addAuditLog(store, user, 'DOCUMENT_UPLOADED', 'Document', String(newDoc.id), `Uploaded ${docType}: ${title}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newDoc);
});

app.post('/api/documents/:id/verify/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can verify documents.' });
  }

  const docId = parseInt(req.params.id, 10);
  const store = loadStore();
  const doc = store.documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const generatedQrKey = doc.verification_key && String(doc.verification_key).startsWith('MIT-QR-')
    ? doc.verification_key
    : `MIT-QR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  doc.status = 'VERIFIED';
  doc.verification_key = generatedQrKey;
  doc.qr_code_key = generatedQrKey;
  doc.verification_notes = String(req.body?.notes || 'Verified by Faculty Coordinator').trim();
  doc.verified_by = user.id;
  doc.verified_by_name = user.name;
  doc.verified_at = new Date().toISOString();
  doc.rejection_reason = '';

  addNotification(
    store,
    doc.student || doc.user,
    `Document Verified: ${doc.title}`,
    `${user.name} verified your ${doc.document_type} (${doc.title}). QR Verification Key: ${doc.verification_key}`,
    'DOCUMENT_VERIFICATION',
    '/student/documents'
  );
  addAuditLog(store, user, 'DOCUMENT_VERIFIED', 'Document', String(doc.id), `Verified ${doc.title} for ${doc.student_name}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(doc);
});

app.post('/api/documents/:id/reject/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can reject documents.' });
  }

  const docId = parseInt(req.params.id, 10);
  const store = loadStore();
  const doc = store.documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const requestedStatus = String(req.body.status || req.body.action || 'REJECTED').toUpperCase();
  const isCorrection = requestedStatus === 'CORRECTION_REQUESTED' || requestedStatus === 'REQUEST_CORRECTION';

  doc.status = isCorrection ? 'CORRECTION_REQUESTED' : 'REJECTED';
  doc.verification_key = '';
  doc.qr_code_key = '';
  doc.rejection_reason = String(req.body.reason || 'Requires clearer scan or official signatory').trim();
  doc.reviewed_by_name = user.name;
  doc.reviewed_at = new Date().toISOString();

  addNotification(
    store,
    doc.student || doc.user,
    `Document ${isCorrection ? 'Correction Requested' : 'Rejected'}: ${doc.title}`,
    `${user.name} reviewed your document "${doc.title}". Reason: ${doc.rejection_reason}`,
    'DOCUMENT_VERIFICATION',
    '/student/documents'
  );
  addAuditLog(store, user, isCorrection ? 'DOCUMENT_CORRECTION_REQUESTED' : 'DOCUMENT_REJECTED', 'Document', String(doc.id), `${doc.status} ${doc.title} for ${doc.student_name}: ${doc.rejection_reason}`, req.ip, 'WARNING');
  saveStore(store);
  return res.json(doc);
});

app.delete('/api/documents/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const docId = parseInt(req.params.id, 10);
  const store = loadStore();
  const doc = store.documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  if (user.role === 'STUDENT' && doc.user !== user.id && doc.student !== user.id) {
    return res.status(403).json({ error: 'Forbidden: Cannot delete another student\'s document.' });
  }

  store.documents = store.documents.filter(d => d.id !== docId);
  addAuditLog(store, user, 'DOCUMENT_DELETED', 'Document', String(docId), `Deleted document ${doc.title}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json({ message: 'Document deleted successfully.' });
});

// Public Cryptographic QR Verification Endpoint
app.get('/api/documents/verify-qr/:qrKey/', (req: Request, res: Response) => {
  const qrKey = String(req.params.qrKey || '').trim().toUpperCase();
  if (!qrKey) {
    return res.status(400).json({ error: 'Verification key is required.' });
  }
  const store = loadStore();
  const doc = store.documents.find(d =>
    d.status === 'VERIFIED' && (
      (d.verification_key && String(d.verification_key).toUpperCase() === qrKey) ||
      (d.qr_code_key && String(d.qr_code_key).toUpperCase() === qrKey) ||
      (d.verification_reference && String(d.verification_reference).toUpperCase() === qrKey)
    )
  );

  if (!doc) {
    return res.status(404).json({ error: 'No verified credential found matching this cryptographic QR key. Document may still be pending verification.' });
  }

  return res.json({
    id: doc.id,
    title: doc.title,
    document_type: doc.document_type,
    student_name: doc.student_name,
    roll_number: doc.roll_number,
    department: doc.department,
    issuing_organization: doc.issuing_organization || doc.company,
    verification_reference: doc.verification_reference,
    verification_key: doc.verification_key,
    status: doc.status,
    verified_by_name: doc.verified_by_name || 'MITCORER T&P Cell',
    verified_at: doc.verified_at || doc.submitted_at,
    submitted_at: doc.submitted_at
  });
});

app.get('/api/documents/:id/download/', (req: Request, res: Response) => {
  const store = loadStore();
  const doc = store.documents.find(d => d.id === parseInt(req.params.id, 10));
  if (!doc) return res.status(404).send('Document not found.');

  // If an actual data URL was uploaded and raw download is requested
  if (doc.file_data_url && req.query.raw === 'true') {
    return res.redirect(doc.file_data_url);
  }

  res.setHeader('Content-Type', 'text/html');
  return res.send(`<!DOCTYPE html>
<html>
<head><title>${doc.title} — Official MITCORER Record</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 32px; border: 2px solid #1e40af; border-radius: 12px;">
  <div style="font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase;">MAEER's MIT College of Railway Engineering & Research, Barshi</div>
  <h1 style="margin: 8px 0 16px; color: #0f172a;">${doc.title}</h1>
  <p><strong>Student:</strong> ${doc.student_name} (${doc.roll_number})</p>
  <p><strong>Department:</strong> ${doc.department || 'Computer Science & Engineering'}</p>
  <p><strong>Document Type:</strong> ${doc.document_type}</p>
  <p><strong>Issuing Organization:</strong> ${doc.issuing_organization || doc.company}</p>
  <p><strong>Reference ID:</strong> ${doc.verification_reference}</p>
  <p><strong>Verification Status:</strong> <span style="font-weight:700; color:${doc.status === 'VERIFIED' ? '#059669' : '#d97706'}">${doc.status}</span></p>
  <p><strong>Cryptographic QR Key:</strong> <code>${doc.verification_key}</code></p>
  <p><strong>Submitted Date:</strong> ${doc.submitted_at}</p>
  ${doc.verified_by_name ? `<p><strong>Verified By:</strong> ${doc.verified_by_name} (${doc.verified_at ? doc.verified_at.split('T')[0] : ''})</p>` : ''}
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display:flex; gap:12px;">
    <button onclick="window.print()" style="padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Print / Save as PDF</button>
  </div>
</body>
</html>`);
});

// ============================================================================
// 6. SKILL ASSESSMENTS, NOTIFICATIONS, COMMUNITY & ANALYTICS
// ============================================================================

app.get('/api/assessments/records/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const store = loadStore();
  if (user?.role === 'STUDENT') {
    return res.json(store.assessments.filter(a => a.student === user.id || a.student_id === user.id));
  }
  if (user?.role === 'COORDINATOR') {
    return res.json(store.assessments.filter(a => isRecordVisibleToStaff(user, a, store)));
  }
  return res.json(store.assessments);
});

app.post('/api/assessments/records/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Coordinators and Admins can record skill assessments.' });
  }

  const store = loadStore();
  const studentId = Number(req.body.student_id || req.body.student);
  const rollInput = String(req.body.roll_number || '').trim().toLowerCase();
  const nameInput = String(req.body.student_name || '').trim().toLowerCase();

  const studentUser = store.users.find(u =>
    u.role === 'STUDENT' && (
      (studentId && u.id === studentId) ||
      (rollInput && String(u.student_profile?.roll_number || '').toLowerCase() === rollInput) ||
      (nameInput && u.name.toLowerCase() === nameInput)
    )
  );

  const resolvedStudentId = studentUser ? studentUser.id : (studentId || 0);
  const resolvedName = studentUser ? studentUser.name : String(req.body.student_name || 'MITCORER Student').trim();
  const resolvedRoll = studentUser?.student_profile?.roll_number || String(req.body.roll_number || 'N/A').trim();
  const resolvedDept = studentUser?.student_profile?.department_code || String(req.body.department || 'CSE').trim();
  const levelVal = req.body.assessed_level || req.body.current_level || 'INTERMEDIATE';
  const notesVal = String(req.body.notes || req.body.coordinator_feedback || '').trim();

  const newAssessment = {
    id: Date.now(),
    student: resolvedStudentId,
    student_id: resolvedStudentId,
    student_name: resolvedName,
    roll_number: resolvedRoll,
    department: resolvedDept,
    skill_name: String(req.body.skill_name || 'Python').trim(),
    skill_category: String(req.body.skill_category || 'Core Engineering').trim(),
    initial_level: req.body.initial_level || 'BEGINNER',
    current_level: levelVal,
    assessed_level: levelVal,
    score: Number(req.body.score) || 85,
    practical_evidence: String(req.body.practical_evidence || '').trim(),
    coordinator_feedback: notesVal,
    notes: notesVal,
    assessed_by: user.id,
    assessed_by_name: user.name,
    assessment_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  store.assessments.unshift(newAssessment);
  if (resolvedStudentId) {
    addNotification(
      store,
      resolvedStudentId,
      `New Skill Assessment: ${newAssessment.skill_name} (${newAssessment.score}/100)`,
      `${user.name} evaluated your competency in ${newAssessment.skill_name} at ${newAssessment.current_level} level.`,
      'SKILL_ASSESSMENT',
      '/student/skills'
    );
  }
  addAuditLog(store, user, 'SKILL_ASSESSMENT_RECORDED', 'Assessment', String(newAssessment.id), `Assessed ${resolvedName} in ${newAssessment.skill_name} (${newAssessment.score}/100)`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newAssessment);
});

app.patch('/api/assessments/records/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Coordinators and Admins can update skill assessments.' });
  }

  const recordId = Number(req.params.id);
  const store = loadStore();
  const record = store.assessments.find(a => a.id === recordId);
  if (!record) return res.status(404).json({ error: 'Assessment record not found.' });

  const fields = ['student_name', 'roll_number', 'department', 'skill_name', 'skill_category', 'initial_level', 'current_level', 'assessed_level', 'score', 'practical_evidence', 'coordinator_feedback', 'notes'];
  fields.forEach(f => {
    if (f in req.body) {
      record[f] = f === 'score' ? Number(req.body[f]) : req.body[f];
    }
  });
  if (req.body.assessed_level) record.current_level = req.body.assessed_level;
  if (req.body.current_level) record.assessed_level = req.body.current_level;
  if (req.body.notes !== undefined) record.coordinator_feedback = req.body.notes;
  if (req.body.coordinator_feedback !== undefined) record.notes = req.body.coordinator_feedback;
  record.updated_at = new Date().toISOString();

  addAuditLog(store, user, 'SKILL_ASSESSMENT_UPDATED', 'Assessment', String(record.id), `Updated assessment for ${record.student_name} in ${record.skill_name} (${record.score}/100)`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(record);
});

app.get('/api/notifications/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  let userNotifs = store.notifications.filter(n => n.user === user.id);

  // If staff user has no notifications yet, generate real actionable notifications from current DB state
  if (userNotifs.length === 0 && (user.role === 'COORDINATOR' || user.role === 'ADMIN')) {
    const basePath = user.role === 'ADMIN' ? '/admin' : '/coordinator';
    const pendingReps = store.reports.filter(r => r.status === 'SUBMITTED');
    const pendingDocs = store.documents.filter(d => d.status === 'SUBMITTED');
    const pendingOpps = store.opportunities.filter(o => o.status === 'PENDING_APPROVAL' || o.status === 'DRAFT');

    if (pendingReps.length > 0) {
      addNotification(
        store,
        user.id,
        `${pendingReps.length} Weekly Progress Report(s) Awaiting Evaluation`,
        `Students have submitted ${pendingReps.length} weekly progress report(s) ready for faculty review and scoring.`,
        'REPORT_SUBMISSION',
        `${basePath}/reports`
      );
    }
    if (pendingDocs.length > 0) {
      addNotification(
        store,
        user.id,
        `${pendingDocs.length} Document(s) Pending Cryptographic Verification`,
        `There are ${pendingDocs.length} uploaded internship certificate(s)/offer letter(s) awaiting verification.`,
        'DOCUMENT_VERIFICATION',
        `${basePath}/documents`
      );
    }
    if (pendingOpps.length > 0) {
      addNotification(
        store,
        user.id,
        `${pendingOpps.length} Opportunity Listing(s) in Draft / Pending Approval`,
        `Review or submit ${pendingOpps.length} internship/training opportunity listing(s) in the catalog.`,
        'OPPORTUNITY_REVIEW',
        `${basePath}/opportunities`
      );
    }
    saveStore(store);
    userNotifs = store.notifications.filter(n => n.user === user.id);
  }

  return res.json(userNotifs.map(n => ({
    ...n,
    notification_type: n.notification_type || n.category || 'SYSTEM'
  })));
});

app.post('/api/notifications/:id/read/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  const notif = store.notifications.find(n => n.id === Number(req.params.id) && n.user === user.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });
  notif.is_read = true;
  saveStore(store);
  return res.json(notif);
});

app.post('/api/notifications/mark-read/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const store = loadStore();
  store.notifications.forEach(n => {
    if (n.user === user.id) n.is_read = true;
  });
  saveStore(store);
  return res.json({ message: 'Notifications marked as read.' });
});

app.delete('/api/notifications/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const notifId = Number(req.params.id);
  const store = loadStore();
  store.notifications = store.notifications.filter(n => !(n.id === notifId && n.user === user.id));
  saveStore(store);
  return res.json({ message: 'Notification removed.' });
});

// Admin User Management
app.get('/api/accounts/admin/users/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Only Administrators can access user management.' });

  const store = loadStore();
  return res.json(store.users.map(({ passwordHash, ...u }) => u));
});

app.post('/api/accounts/admin/users/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Only Administrators can create or promote user accounts.' });

  const { name, email, password, role, roll_number, employee_id, department_id, academic_year } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const store = loadStore();
  if (store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const deptNames: Record<number, { code: string; name: string }> = {
    1: { code: 'CSE', name: 'Computer Science & Engineering' },
    2: { code: 'E&TC', name: 'Electronics & Telecommunication' },
    3: { code: 'MECH', name: 'Mechanical Engineering' },
    4: { code: 'CIVIL', name: 'Civil Engineering' }
  };
  const deptIdNum = Number(department_id) || 1;
  const selectedDept = deptNames[deptIdNum] || deptNames[1];

  const assignedRole: 'STUDENT' | 'COORDINATOR' | 'ADMIN' =
    role === 'ADMIN' || role === 'COORDINATOR' ? role : 'STUDENT';

  const newUser: UserRecord = {
    id: Date.now(),
    name: String(name).trim(),
    email: cleanEmail,
    role: assignedRole,
    passwordHash: hashPassword(String(password)),
    is_active: true,
    created_at: new Date().toISOString()
  };

  if (assignedRole === 'COORDINATOR') {
    newUser.coordinator_profile = {
      id: Date.now() + 1,
      employee_id: employee_id || `EMP-${Date.now().toString().slice(-4)}`,
      department_id: deptIdNum,
      department_code: selectedDept.code,
      department_name: selectedDept.name,
      designation: 'T&P Coordinator'
    };
  } else if (assignedRole === 'STUDENT') {
    const normYear = normalizeAcademicYearValue(
      academic_year,
      store.academic_config?.current_academic_year || '2026-2027'
    );
    const deptCoords = store.users.filter(
      c => c.role === 'COORDINATOR' && c.is_active !== false &&
        normalizeDepartmentInfo(c.coordinator_profile?.department_id, c.coordinator_profile?.department_code).code === selectedDept.code
    );
    const defaultCoord = deptCoords[deptCoords.length - 1] || null;
    newUser.student_profile = {
      id: Date.now() + 1,
      roll_number: roll_number ? String(roll_number).trim().toUpperCase() : `${selectedDept.code}-${Date.now().toString().slice(-4)}`,
      prn_number: req.body.prn_number ? String(req.body.prn_number).trim().toUpperCase() : '',
      department_id: deptIdNum,
      department_code: selectedDept.code,
      department_name: selectedDept.name,
      academic_year: normYear,
      registration_date: req.body.registration_date || new Date().toISOString().split('T')[0],
      division: req.body.division ? String(req.body.division).trim().toUpperCase() : 'A',
      semester: 6,
      cgpa: '0.00',
      skills: [],
      assigned_coordinator_id: defaultCoord ? defaultCoord.id : null,
      assigned_coordinator_name: defaultCoord ? defaultCoord.name : null,
      is_verified: true
    };
  }

  store.users.push(newUser);
  addAuditLog(store, user, 'ADMIN_USER_CREATED', 'User', String(newUser.id), `Created ${assignedRole} account for ${newUser.name}`, req.ip, 'SUCCESS');
  saveStore(store);
  const { passwordHash, ...safeUser } = newUser;
  return res.status(201).json(safeUser);
});

app.delete(['/api/accounts/admin/users/:id/', '/api/accounts/admin/users/:id'], (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const targetId = parseInt(req.params.id, 10);
  const store = loadStore();
  const target = store.users.find(u => u.id === targetId);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (target.role === 'STUDENT') {
    return handleDeleteStudent(req, res);
  }

  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Only Administrators can remove staff user accounts.' });

  if (target.role === 'COORDINATOR') {
    store.users.forEach(u => {
      if (u.role === 'STUDENT' && u.student_profile && (u.student_profile.assigned_coordinator_id === targetId || String(u.student_profile.assigned_coordinator_id) === String(targetId))) {
        u.student_profile.assigned_coordinator_id = null;
        u.student_profile.assigned_coordinator_name = null;
      }
    });
  }

  store.users = store.users.filter(u => u.id !== targetId);
  addAuditLog(
    store,
    user,
    'USER_ACCOUNT_DELETED',
    'User',
    String(targetId),
    `Deleted ${target.role} account ${target.name} (${target.email})`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);
  return res.json({ message: 'User account and associated records removed.', deleted_id: targetId });
});

// ============================================================================
// COMMUNITY DIRECTORY (PUBLIC-SAFE) & COMMUNITY DISCUSSION / REPLIES / MODERATION
// ============================================================================

// Public-safe Registered Student Community Directory (NEVER exposes phone, email, roll/PRN, or private docs)
app.get('/api/community/students/', (req: Request, res: Response) => {
  const store = loadStore();
  const { search, department, academic_year } = req.query;

  let students = store.users
    .filter(u => u.role === 'STUDENT' && u.is_active)
    .map(u => {
      const profile = u.student_profile || {};
      const resume = store.resumes.find(r => r.student_id === u.id);
      const skills: string[] = Array.isArray(resume?.skills) && resume.skills.length > 0
        ? resume.skills
        : (Array.isArray(profile.skills) ? profile.skills : []);
      const verifiedDocs = store.documents.filter(d => (d.user === u.id || d.student === u.id) && d.status === 'VERIFIED').length;
      const activeIntern = store.internships.find(i => (i.student === u.id || i.student_id === u.id) && (i.status === 'ACTIVE' || i.status === 'COMPLETED'));

      return {
        id: u.id,
        name: u.name,
        department_code: profile.department_code || 'CSE',
        department_name: profile.department_name || 'Computer Science & Engineering',
        academic_year: profile.academic_year || store.academic_config?.current_academic_year || '2026-2027',
        target_domain: resume?.target_domain || profile.target_domain || 'Engineering & Technology',
        skills: skills.slice(0, 8),
        internship_organization: activeIntern ? (activeIntern.organization_name || activeIntern.company) : null,
        internship_status: activeIntern ? activeIntern.status : 'OPEN_TO_OPPORTUNITIES',
        verified_credentials_count: verifiedDocs
      };
    });

  if (search) {
    const q = String(search).toLowerCase().trim();
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.department_code.toLowerCase().includes(q) ||
      s.department_name.toLowerCase().includes(q) ||
      s.academic_year.toLowerCase().includes(q) ||
      s.target_domain.toLowerCase().includes(q) ||
      s.skills.some(sk => sk.toLowerCase().includes(q))
    );
  }
  if (department && department !== 'ALL') {
    const d = String(department).toUpperCase();
    students = students.filter(s => s.department_code.toUpperCase() === d);
  }
  if (academic_year && academic_year !== 'ALL') {
    students = students.filter(s => s.academic_year === academic_year);
  }

  return res.json(students);
});

app.get('/api/community/posts/', (_req: Request, res: Response) => {
  const store = loadStore();
  const sorted = [...store.posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  return res.json(sorted);
});

app.post('/api/community/posts/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to post in community.' });
  const { title, content, category, tags } = req.body;
  if (!title || !String(title).trim() || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'Title and message content are required.' });
  }

  const store = loadStore();
  const newPost = {
    id: Date.now(),
    author: user.id,
    author_name: user.name,
    author_role: user.role,
    author_department: user.student_profile?.department_code || user.coordinator_profile?.department_code || 'T&P Cell',
    author_academic_year: user.student_profile?.academic_year || '',
    title: String(title).trim(),
    content: String(content).trim(),
    category: category || 'General Discussion',
    tags: tags || category || '',
    is_pinned: Boolean(req.body.is_pinned && (user.role === 'ADMIN' || user.role === 'COORDINATOR')),
    is_reported: false,
    report_reason: '',
    replies: [],
    created_at: new Date().toISOString()
  };

  store.posts.unshift(newPost);

  // If Coordinator or Admin posts an announcement, notify students
  if ((user.role === 'COORDINATOR' || user.role === 'ADMIN') && (category === 'Official Announcement' || newPost.is_pinned)) {
    store.users.filter(u => u.role === 'STUDENT').forEach(stu => {
      addNotification(
        store,
        stu.id,
        `Community Announcement: ${newPost.title}`,
        `${user.name} (${user.role}) posted in MITCORER Community: "${newPost.title}"`,
        'COMMUNITY_ANNOUNCEMENT'
      );
    });
  }

  addAuditLog(store, user, 'COMMUNITY_POST_CREATED', 'CommunityPost', String(newPost.id), `Posted "${newPost.title}" in ${newPost.category}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newPost);
});

app.patch('/api/community/posts/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const postId = parseInt(req.params.id, 10);
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (user.id !== post.author && user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: You can only edit your own messages.' });
  }

  if (req.body.title && String(req.body.title).trim()) post.title = String(req.body.title).trim();
  if (req.body.content && String(req.body.content).trim()) post.content = String(req.body.content).trim();
  if (req.body.category) post.category = String(req.body.category).trim();
  post.updated_at = new Date().toISOString();

  saveStore(store);
  return res.json(post);
});

app.delete('/api/community/posts/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const postId = parseInt(req.params.id, 10);
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (user.id !== post.author && user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  store.posts = store.posts.filter(p => p.id !== postId);
  addAuditLog(store, user, 'COMMUNITY_POST_DELETED', 'CommunityPost', String(postId), `Removed community post "${post.title}"`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json({ message: 'Post deleted successfully.' });
});

// Threaded Replies on Community Posts
app.post('/api/community/posts/:id/replies/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to reply.' });

  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Reply content cannot be empty.' });
  }

  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Discussion post not found.' });

  if (!Array.isArray(post.replies)) post.replies = [];
  const newReply = {
    id: Date.now(),
    author: user.id,
    author_name: user.name,
    author_role: user.role,
    author_department: user.student_profile?.department_code || user.coordinator_profile?.department_code || 'T&P Cell',
    content: String(content).trim(),
    created_at: new Date().toISOString()
  };

  post.replies.push(newReply);

  // Notify original post author if someone else replied
  if (post.author && post.author !== user.id) {
    addNotification(
      store,
      post.author,
      `New Reply on "${post.title}"`,
      `${user.name} (${user.role}) replied to your community discussion: "${newReply.content.slice(0, 80)}"`,
      'COMMUNITY_REPLY'
    );
  }

  saveStore(store);
  return res.status(201).json(newReply);
});

app.delete('/api/community/posts/:postId/replies/:replyId/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const postId = parseInt(req.params.postId, 10);
  const replyId = parseInt(req.params.replyId, 10);
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post || !Array.isArray(post.replies)) return res.status(404).json({ error: 'Post or reply not found.' });

  const reply = post.replies.find((r: any) => r.id === replyId);
  if (!reply) return res.status(404).json({ error: 'Reply not found.' });

  if (reply.author !== user.id && user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Cannot delete another user\'s reply.' });
  }

  post.replies = post.replies.filter((r: any) => r.id !== replyId);
  saveStore(store);
  return res.json({ message: 'Reply removed.' });
});

// Report / Moderate / Pin Community Posts
app.post('/api/community/posts/:id/report/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to report content.' });

  const postId = parseInt(req.params.id, 10);
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  post.is_reported = true;
  post.report_reason = String(req.body.reason || 'Flagged for Coordinator/Admin moderation').trim();
  post.reported_by = user.id;
  post.reported_by_name = user.name;

  addAuditLog(store, user, 'COMMUNITY_POST_REPORTED', 'CommunityPost', String(post.id), `Reported post "${post.title}": ${post.report_reason}`, req.ip, 'WARNING');
  saveStore(store);
  return res.json({ message: 'Post flagged for Coordinator/Admin moderation.', post });
});

app.post('/api/community/posts/:id/pin/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Only Coordinators and Admins can pin community discussions.' });
  }

  const postId = parseInt(req.params.id, 10);
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  post.is_pinned = !post.is_pinned;
  saveStore(store);
  return res.json(post);
});

app.post('/api/community/posts/:id/moderate/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Only Coordinators and Admins can moderate community posts.' });
  }

  const postId = parseInt(req.params.id, 10);
  const { action } = req.body; // 'DISMISS_REPORT' | 'REMOVE'
  const store = loadStore();
  const post = store.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (action === 'REMOVE') {
    store.posts = store.posts.filter(p => p.id !== postId);
    if (post.author) {
      addNotification(store, post.author, 'Community Post Removed by Moderator', `Your post "${post.title}" was removed by ${user.name} (${user.role}).`, 'MODERATION');
    }
    addAuditLog(store, user, 'COMMUNITY_POST_MODERATED_REMOVED', 'CommunityPost', String(postId), `Removed reported post "${post.title}"`, req.ip, 'SUCCESS');
    saveStore(store);
    return res.json({ message: 'Post removed by moderator.' });
  }

  post.is_reported = false;
  post.report_reason = '';
  saveStore(store);
  return res.json({ message: 'Report dismissed.', post });
});

app.get('/api/community/teams/', (_req: Request, res: Response) => {
  const store = loadStore();
  return res.json(store.teams);
});

app.post('/api/community/teams/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const { title, description, required_skills, max_members } = req.body;
  const store = loadStore();

  const newTeam = {
    id: Date.now(),
    title,
    description,
    required_skills,
    max_members: max_members || 4,
    created_by: user.id,
    lead_name: user.name,
    status: 'OPEN',
    members_count: 1,
    members: [{ id: 1, student: user.id, student_name: user.name, role: 'Project Lead', joined_at: new Date().toISOString() }],
    created_at: new Date().toISOString()
  };

  store.teams.unshift(newTeam);
  saveStore(store);
  return res.status(201).json(newTeam);
});

// Audit Logs (Strictly ADMIN-only with search, pagination & soft deletion)
app.get('/api/audit-logs/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Administrators can view security audit logs.' });
  }
  const store = loadStore();
  let list = (store.audit_logs || []).filter((l: any) => !l.is_deleted);

  const { search, actor, action, ip_address, entity_id, outcome, status, page, limit } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter((l: any) =>
      String(l.actor_name || (l.actor?.name) || '').toLowerCase().includes(q) ||
      String(l.actor_role || (l.actor?.role) || '').toLowerCase().includes(q) ||
      String(l.action || '').toLowerCase().includes(q) ||
      String(l.entity_type || '').toLowerCase().includes(q) ||
      String(l.entity_id || '').toLowerCase().includes(q) ||
      String(l.ip_address || '').toLowerCase().includes(q) ||
      String(l.details || '').toLowerCase().includes(q) ||
      String(l.status || '').toLowerCase().includes(q)
    );
  }

  if (actor) {
    const act = String(actor).toLowerCase();
    list = list.filter((l: any) => String(l.actor_name || l.actor?.name || '').toLowerCase().includes(act));
  }

  if (action) {
    const act = String(action).toLowerCase();
    list = list.filter((l: any) => String(l.action || '').toLowerCase().includes(act));
  }

  if (ip_address) {
    const ip = String(ip_address).toLowerCase();
    list = list.filter((l: any) => String(l.ip_address || '').toLowerCase().includes(ip));
  }

  if (entity_id) {
    const eid = String(entity_id).toLowerCase();
    list = list.filter((l: any) => String(l.entity_id || '').toLowerCase().includes(eid));
  }

  const outcomeVal = outcome || status;
  if (outcomeVal && outcomeVal !== 'ALL') {
    const outStr = String(outcomeVal).toUpperCase();
    list = list.filter((l: any) => String(l.status || 'SUCCESS').toUpperCase() === outStr);
  }

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(String(limit || '100'), 10) || 100));
  const total = list.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    results: paginated,
    total,
    page: pageNum,
    total_pages: totalPages,
    limit: limitNum
  });
});

app.delete('/api/audit-logs/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only authorized Administrators can delete or archive audit logs.' });
  }

  const logId = Number(req.params.id);
  const store = loadStore();
  const targetLog = store.audit_logs.find((l: any) => l.id === logId);

  if (!targetLog) {
    return res.status(404).json({ error: 'Audit log record not found.' });
  }

  // Soft delete / mark as archived to preserve immutability while removing from standard views
  targetLog.is_deleted = true;
  targetLog.deleted_at = new Date().toISOString();
  targetLog.deleted_by = user.id;
  targetLog.deleted_by_name = user.name;

  // Record deletion event in a separate protected audit entry so the deletion remains fully traceable
  addAuditLog(
    store,
    user,
    'AUDIT_LOG_SOFT_DELETED',
    'AuditLog',
    String(logId),
    `Admin ${user.name} soft-deleted audit record #${logId} (Action: ${targetLog.action}, Actor: ${targetLog.actor_name}, Timestamp: ${targetLog.created_at})`,
    req.ip,
    'WARNING'
  );

  saveStore(store);
  return res.json({
    message: `Audit log record #${logId} soft-deleted successfully. Traceable deletion record appended.`,
    id: logId
  });
});

app.post('/api/audit-logs/bulk-delete/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only authorized Administrators can delete audit logs.' });
  }

  const { ids, log_ids } = req.body;
  const targetIds: number[] = Array.isArray(ids) ? ids : Array.isArray(log_ids) ? log_ids : [];
  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of log IDs to bulk delete.' });
  }

  const store = loadStore();
  let deletedCount = 0;

  for (const id of targetIds) {
    const numId = Number(id);
    const log = store.audit_logs.find((l: any) => l.id === numId && !l.is_deleted);
    if (log) {
      log.is_deleted = true;
      log.deleted_at = new Date().toISOString();
      log.deleted_by = user.id;
      log.deleted_by_name = user.name;
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    addAuditLog(
      store,
      user,
      'AUDIT_LOGS_BULK_SOFT_DELETED',
      'AuditLog',
      `${deletedCount}_records`,
      `Admin ${user.name} bulk soft-deleted ${deletedCount} audit log records (IDs: ${targetIds.slice(0, 10).join(', ')}${targetIds.length > 10 ? '...' : ''})`,
      req.ip,
      'WARNING'
    );
    saveStore(store);
  }

  return res.json({
    message: `Successfully soft-deleted ${deletedCount} audit log record(s). Traceable bulk deletion audit event recorded.`,
    deleted_count: deletedCount
  });
});


// Coordinators Directory, Creation & Student Assignment
app.get('/api/coordinators/profiles/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Staff access required.' });
  }
  const store = loadStore();
  const students = store.users.filter(s => s.role === 'STUDENT').map(s => buildStudentSummary(s, store));

  const coords = store.users
    .filter(u => u.role === 'COORDINATOR')
    .map(u => {
      const assignedCount = students.filter(s => s.assigned_coordinator_id === u.id).length;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        employee_id: u.coordinator_profile?.employee_id || 'N/A',
        department: u.coordinator_profile?.department_name || 'Computer Science & Engineering',
        department_code: u.coordinator_profile?.department_code || 'CSE',
        designation: u.coordinator_profile?.designation || 'Assistant Professor & T&P Coordinator',
        phone: u.coordinator_profile?.phone || '',
        can_publish_directly: Boolean(u.coordinator_profile?.can_publish_directly),
        assigned_students_count: assignedCount
      };
    });
  return res.json(coords);
});

app.post('/api/coordinators/profiles/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Administrators can create Coordinator accounts.' });
  }

  const { name, email, password, employee_id, department_id, designation, phone, can_publish_directly } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Coordinator name and email are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const store = loadStore();
  if (store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const deptNames: Record<number, { code: string; name: string }> = {
    1: { code: 'CSE', name: 'Computer Science & Engineering' },
    2: { code: 'E&TC', name: 'Electronics & Telecommunication' },
    3: { code: 'MECH', name: 'Mechanical Engineering' },
    4: { code: 'CIVIL', name: 'Civil Engineering' }
  };
  const deptIdNum = Number(department_id) || 1;
  const selectedDept = deptNames[deptIdNum] || deptNames[1];

  const newCoord: UserRecord = {
    id: Date.now(),
    name: String(name).trim(),
    email: cleanEmail,
    role: 'COORDINATOR',
    passwordHash: hashPassword(password ? String(password) : 'coord123'),
    is_active: true,
    created_at: new Date().toISOString(),
    coordinator_profile: {
      id: Date.now() + 1,
      employee_id: employee_id ? String(employee_id).trim().toUpperCase() : `COORD-${Date.now().toString().slice(-4)}`,
      department_id: deptIdNum,
      department_code: selectedDept.code,
      department_name: selectedDept.name,
      designation: designation ? String(designation).trim() : 'Department T&P Coordinator',
      phone: phone ? String(phone).trim() : '',
      can_publish_directly: Boolean(can_publish_directly)
    }
  };

  store.users.push(newCoord);
  addAuditLog(store, user, 'COORDINATOR_CREATED_BY_ADMIN', 'User', String(newCoord.id), `Admin created Coordinator ${newCoord.name} (${selectedDept.code})`, req.ip, 'SUCCESS');
  saveStore(store);

  return res.status(201).json({
    id: newCoord.id,
    name: newCoord.name,
    email: newCoord.email,
    employee_id: newCoord.coordinator_profile.employee_id,
    department: newCoord.coordinator_profile.department_name,
    department_code: newCoord.coordinator_profile.department_code,
    designation: newCoord.coordinator_profile.designation,
    assigned_students_count: 0
  });
});

app.delete(['/api/coordinators/profiles/:id/', '/api/coordinators/profiles/:id'], (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Administrators can remove coordinator accounts.' });
  }

  const targetId = Number(req.params.id);
  const store = loadStore();
  const targetIndex = store.users.findIndex(u => (u.id === targetId || String(u.id) === String(req.params.id)) && u.role === 'COORDINATOR');

  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Coordinator account not found.' });
  }

  const target = store.users[targetIndex];
  if (target.id === user.id) {
    return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
  }

  // Unassign any students assigned to this coordinator
  store.users.forEach(u => {
    if (u.role === 'STUDENT' && u.student_profile && (u.student_profile.assigned_coordinator_id === target.id || String(u.student_profile.assigned_coordinator_id) === String(target.id))) {
      u.student_profile.assigned_coordinator_id = null;
      u.student_profile.assigned_coordinator_name = null;
    }
  });

  store.users.splice(targetIndex, 1);
  addAuditLog(
    store,
    user,
    'COORDINATOR_DELETED_BY_ADMIN',
    'User',
    String(target.id),
    `Admin permanently deleted Coordinator / Faculty ${target.name} (${target.email})`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);

  return res.json({
    message: `Coordinator ${target.name} permanently removed.`,
    deleted_id: target.id
  });
});

// Assign / Reassign / Remove Student-Coordinator Assignment (Supports single student_id or bulk student_ids)
app.post('/api/coordinators/assign-student/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can manage student assignments.' });
  }

  const { student_id, student_ids, coordinator_id, academic_year } = req.body;
  const targetIds: number[] = Array.isArray(student_ids)
    ? student_ids.map((id: any) => Number(id)).filter(Boolean)
    : student_id
      ? [Number(student_id)]
      : [];

  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'Please specify student_id or student_ids to assign.' });
  }

  const store = loadStore();
  const updatedSummaries: any[] = [];

  for (const sid of targetIds) {
    const student = store.users.find(u => u.id === sid && u.role === 'STUDENT');
    if (!student) continue;

    if (!student.student_profile) student.student_profile = {};

    if (academic_year && String(academic_year).trim()) {
      student.student_profile.academic_year = String(academic_year).trim();
    }

    if (coordinator_id === null || coordinator_id === 'UNASSIGN' || coordinator_id === '') {
      student.student_profile.assigned_coordinator_id = null;
      student.student_profile.assigned_coordinator_name = 'Unassigned';
      addAuditLog(store, user, 'STUDENT_COORDINATOR_UNASSIGNED', 'User', String(student.id), `Removed Coordinator assignment for ${student.name}`, req.ip, 'SUCCESS');
    } else {
      const cid = Number(coordinator_id || user.id);
      const coord = store.users.find(u => u.id === cid && (u.role === 'COORDINATOR' || u.role === 'ADMIN'));
      if (!coord) return res.status(404).json({ error: 'Selected Coordinator not found.' });

      student.student_profile.assigned_coordinator_id = coord.id;
      student.student_profile.assigned_coordinator_name = coord.name;

      addNotification(
        store,
        student.id,
        `Faculty Coordinator Assigned: ${coord.name}`,
        `${coord.name} (${coord.coordinator_profile?.department_code || 'T&P'}) is now your assigned Internship Faculty Coordinator.`,
        'COORDINATOR_ASSIGNED',
        '/student/dashboard'
      );
      addAuditLog(store, user, 'STUDENT_COORDINATOR_ASSIGNED', 'User', String(student.id), `Assigned ${student.name} to Coordinator ${coord.name}`, req.ip, 'SUCCESS');
    }

    updatedSummaries.push(buildStudentSummary(student, store));
  }

  if (updatedSummaries.length === 0) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  saveStore(store);
  return res.json(Array.isArray(student_ids) ? { updated_count: updatedSummaries.length, students: updatedSummaries } : updatedSummaries[0]);
});

// Analytics Overview (Supports STUDENT, COORDINATOR, and ADMIN)
app.get('/api/analytics/overview/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();

  if (user.role === 'STUDENT') {
    const myApps = store.applications.filter(a => a.student === user.id || a.student_id === user.id);
    const myInternships = store.internships.filter(i => i.student === user.id || i.student_id === user.id);
    const myReports = store.reports.filter(r => r.student === user.id || r.student_id === user.id);
    const myTasks = store.tasks.filter(t => t.student === user.id || t.student_id === user.id);
    const myDocs = store.documents.filter(d => d.user === user.id || d.student === user.id);
    const completedTasks = myTasks.filter(t => t.status === 'COMPLETED').length;
    const taskRate = myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 100;
    const recentFeedback = myReports
      .filter(r => r.coordinator_comments || r.coordinator_comment)
      .slice(0, 4)
      .map(r => ({
        id: r.id,
        week_number: r.week_number,
        score: r.score || (r.coordinator_score ? r.coordinator_score * 10 : 85),
        comments: r.coordinator_comments || r.coordinator_comment,
        reviewer_name: r.reviewed_by_name || 'T&P Coordinator',
        date: r.reviewed_at ? r.reviewed_at.split('T')[0] : r.submitted_at
      }));

    return res.json({
      role: 'STUDENT',
      metrics: {
        total_applications: myApps.length,
        active_internships: myInternships.filter(i => i.status === 'ACTIVE').length,
        task_completion_rate: taskRate,
        verified_documents: myDocs.filter(d => d.status === 'VERIFIED').length,
        pending_reports: myReports.filter(r => r.status === 'NEEDS_IMPROVEMENT' || r.status === 'DRAFT').length,
        reports_submitted: myReports.filter(r => r.status !== 'DRAFT').length,
        reports_approved: myReports.filter(r => r.status === 'APPROVED').length
      },
      recent_feedback: recentFeedback,
      upcoming_deadlines: store.opportunities.filter(o => o.status === 'PUBLISHED').slice(0, 4)
    });
  }

  const studentUsers = store.users.filter(u => u.role === 'STUDENT');
  const totalStudents = studentUsers.length;
  const totalCoordinators = store.users.filter(u => u.role === 'COORDINATOR').length;
  const activeInternships = store.internships.filter(i => i.status === 'ACTIVE').length;
  const completedInternships = store.internships.filter(i => i.status === 'COMPLETED').length;
  const pendingReports = store.reports.filter(r => r.status === 'SUBMITTED').length;

  if (user.role === 'COORDINATOR') {
    const authorizedStudents = studentUsers.filter(s => isCoordinatorAuthorizedForStudent(user, s, store));
    const authorizedIds = new Set(authorizedStudents.map(s => s.id));
    const summaries = authorizedStudents.map(s => buildStudentSummary(s, store));

    const coordReports = store.reports.filter(r => authorizedIds.has(Number(r.student || r.student_id)));
    const coordInternships = store.internships.filter(i => authorizedIds.has(Number(i.student || i.student_id)));
    const coordApps = store.applications.filter(a => authorizedIds.has(Number(a.student || a.student_id)));
    const coordDocs = store.documents.filter(d => authorizedIds.has(Number(d.user || d.student)));

    const assignedCount = summaries.length;
    const overdueReportsCount = coordReports.filter(r => r.status === 'NEEDS_IMPROVEMENT' || r.status === 'REJECTED').length +
      summaries.filter(s => s.internship_status === 'ACTIVE' && s.reports_submitted === 0).length;
    const draftsAwaitingApproval = store.opportunities.filter(o => o.status === 'PENDING_APPROVAL' || o.status === 'DRAFT').length;

    return res.json({
      role: 'COORDINATOR',
      metrics: {
        total_students: summaries.length,
        assigned_students_count: assignedCount,
        unassigned_students_count: summaries.filter(s => !s.assigned_coordinator_id).length,
        pending_reports: coordReports.filter(r => r.status === 'SUBMITTED').length,
        reports_needing_improvement: coordReports.filter(r => r.status === 'NEEDS_IMPROVEMENT').length,
        overdue_reports: overdueReportsCount,
        opportunity_drafts_awaiting_approval: draftsAwaitingApproval,
        pending_applications: coordApps.filter(a => a.status === 'APPLIED' || a.status === 'SHORTLISTED').length,
        pending_document_verifications: coordDocs.filter(d => d.status === 'SUBMITTED' || d.status === 'CORRECTION_REQUESTED').length,
        active_internships: coordInternships.filter(i => i.status === 'ACTIVE').length,
        completed_internships: coordInternships.filter(i => i.status === 'COMPLETED').length,
        verified_documents: coordDocs.filter(d => d.status === 'VERIFIED').length,
        completion_approvals_pending: coordInternships.filter(i => i.status === 'ACTIVE').length
      },
      submission_trends: [
        { week_number: 1, count: coordReports.filter(r => r.week_number === 1).length },
        { week_number: 2, count: coordReports.filter(r => r.week_number === 2).length },
        { week_number: 3, count: coordReports.filter(r => r.week_number === 3).length },
        { week_number: 4, count: coordReports.filter(r => r.week_number === 4).length }
      ]
    });
  }

  const allDepts = [
    { id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
    { id: 2, code: 'E&TC', name: 'Electronics & Telecommunication' },
    { id: 3, code: 'MECH', name: 'Mechanical Engineering' },
    { id: 4, code: 'CIVIL', name: 'Civil Engineering' }
  ];
  const deptDist = allDepts.map(d => {
    const deptStudents = studentUsers.filter(
      u => normalizeDepartmentInfo(u.student_profile?.department_id, u.student_profile?.department_code).code === d.code
    );
    const deptCoords = store.users.filter(
      u => u.role === 'COORDINATOR' && u.is_active !== false &&
        normalizeDepartmentInfo(u.coordinator_profile?.department_id, u.coordinator_profile?.department_code).code === d.code
    );
    const activeCoord = deptCoords[deptCoords.length - 1];
    const deptStudentIds = new Set(deptStudents.map(s => s.id));
    const deptActiveInternships = store.internships.filter(
      i => i.status === 'ACTIVE' && deptStudentIds.has(Number(i.student || i.student_id))
    ).length;

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      student_count: deptStudents.length,
      active_internships: deptActiveInternships,
      coordinator_name: activeCoord ? activeCoord.name : 'Unassigned',
      has_coordinator: Boolean(activeCoord)
    };
  });

  const yearCountsMap: Record<string, number> = {};
  studentUsers.forEach(u => {
    const yr = normalizeAcademicYearValue(
      u.student_profile?.academic_year,
      store.academic_config?.current_academic_year || '2026-2027'
    );
    yearCountsMap[yr] = (yearCountsMap[yr] || 0) + 1;
  });
  const studentsByYear = Object.entries(yearCountsMap).map(([year, count]) => ({ year, count }));

  const appStatuses = ['APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'CHANGES_REQUESTED'];
  const appDist = appStatuses.map(st => ({
    status: st,
    count: store.applications.filter(a => a.status === st).length
  })).filter(a => a.count > 0);

  const scoredReports = store.reports.filter(r => r.score);
  const avgScore = scoredReports.length > 0
    ? Math.round(scoredReports.reduce((acc, r) => acc + Number(r.score), 0) / scoredReports.length)
    : 88;

  return res.json({
    role: 'ADMIN',
    metrics: {
      total_students: totalStudents,
      total_coordinators: totalCoordinators,
      total_opportunities: store.opportunities.length,
      published_opportunities: store.opportunities.filter(o => o.status === 'PUBLISHED').length,
      pending_opportunity_approvals: store.opportunities.filter(o => o.status === 'PENDING_APPROVAL').length,
      total_applications: store.applications.length,
      active_internships: activeInternships,
      completed_internships: completedInternships,
      pending_reports: pendingReports,
      verified_documents: store.documents.filter(d => d.status === 'VERIFIED').length,
      pending_documents: store.documents.filter(d => d.status === 'SUBMITTED').length,
      average_student_score: avgScore
    },
    department_distribution: deptDist,
    students_by_year: studentsByYear,
    application_status_distribution: appDist
  });
});

// Export Data (CSV & Printable PDF/HTML - Staff-only, supports filters & summary totals)
app.get('/api/analytics/export/:type/:format/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Staff permissions required to export data.' });
  }

  const { type, format } = req.params;
  const exportFormat = String(format || 'csv').toLowerCase();
  const store = loadStore();
  const dateStamp = new Date().toISOString().split('T')[0];
  const deptFilter = req.query.department && req.query.department !== 'ALL' ? String(req.query.department).toUpperCase() : null;
  const yearFilter = req.query.academic_year && req.query.academic_year !== 'ALL' ? String(req.query.academic_year) : null;
  const statusFilter = req.query.status && req.query.status !== 'ALL' ? String(req.query.status).toUpperCase() : null;

  let headers: string[] = [];
  let rows: string[][] = [];
  let summaryNote = '';
  let reportTitle = 'MITCORER IPTS Official Report';

  if (type === 'students') {
    reportTitle = 'Student Cohort & Internship Progress Directory';
    const baseStudents = store.users.filter(u => {
      if (u.role !== 'STUDENT') return false;
      if (user.role === 'ADMIN') return true;
      return isCoordinatorAuthorizedForStudent(user, u, store);
    });
    const summaries = filterStudentList(
      req,
      baseStudents.map(u => buildStudentSummary(u, store))
    );
    headers = ['Roll Number', 'PRN Number', 'Student Name', 'Email', 'Department', 'Academic Year', 'Assigned Coordinator', 'CGPA', 'Skills', 'Internship Host', 'Lifecycle Stage', 'Reports Submitted', 'Reports Approved', 'Progress %', 'Resume Status', 'Status'];
    rows = summaries.map(s => [
      s.roll_number, s.prn_number, s.name, s.email, s.department_code, s.academic_year,
      s.assigned_coordinator_name || 'Unassigned', s.cgpa, (s.skills || []).join('; '),
      s.company, s.lifecycle_stage, String(s.reports_submitted), String(s.reports_approved),
      `${s.progress_percentage}%`, s.resume_verification_status, s.status
    ]);
    const activeCount = summaries.filter(s => s.internship_status === 'ACTIVE').length;
    const completedCount = summaries.filter(s => s.internship_status === 'COMPLETED').length;
    summaryNote = `Total Students: ${summaries.length} | Active Internships: ${activeCount} | Completed: ${completedCount}`;
  } else if (type === 'internships') {
    reportTitle = 'Enrolled Student Internships & Completion Ledger';
    let list = [...store.internships];
    if (deptFilter) {
      list = list.filter(i => String(i.department_code || 'CSE').toUpperCase() === deptFilter);
    }
    if (statusFilter) {
      list = list.filter(i => String(i.status).toUpperCase() === statusFilter);
    }
    headers = ['Internship ID', 'Roll Number', 'Student Name', 'Department', 'Organization', 'Role Title', 'Mode', 'Start Date', 'End Date', 'Status', 'Final Score'];
    rows = list.map(i => [
      String(i.id), i.roll_number || 'N/A', i.student_name || '', i.department_code || 'CSE',
      i.organization_name || i.company || '', i.role_title || i.role || '', i.mode || 'ONSITE',
      i.start_date ? String(i.start_date).split('T')[0] : '', i.end_date ? String(i.end_date).split('T')[0] : '', i.status || 'ACTIVE', String(i.final_score || 85)
    ]);
    summaryNote = `Total Internships: ${list.length} | Active: ${list.filter(i => i.status === 'ACTIVE').length} | Completed: ${list.filter(i => i.status === 'COMPLETED').length}`;
  } else if (type === 'reports') {
    reportTitle = 'Weekly Progress Reports & Evaluation Audit';
    let list = [...store.reports];
    if (deptFilter) {
      list = list.filter(r => String(r.department_code || 'CSE').toUpperCase() === deptFilter);
    }
    if (statusFilter) {
      list = list.filter(r => String(r.status).toUpperCase() === statusFilter);
    }
    headers = ['Report ID', 'Week', 'Roll Number', 'Student Name', 'Department', 'Organization', 'Tasks Completed', 'Hours Worked', 'Status', 'Score', 'Coordinator Feedback', 'Submitted Date'];
    rows = list.map(r => [
      String(r.id), `Week ${r.week_number}`, r.roll_number || 'N/A', r.student_name || '',
      r.department_code || 'CSE', r.company || r.organization_name || '', r.tasks_completed || '',
      String(r.hours_worked || 40), r.status || 'SUBMITTED', String(r.score || 'Pending'),
      r.coordinator_comments || r.coordinator_comment || '', r.submitted_at ? String(r.submitted_at).split('T')[0] : ''
    ]);
    summaryNote = `Total Reports: ${list.length} | Approved: ${list.filter(r => r.status === 'APPROVED').length} | Pending Review: ${list.filter(r => r.status === 'SUBMITTED').length} | Needs Improvement: ${list.filter(r => r.status === 'NEEDS_IMPROVEMENT').length}`;
  } else if (type === 'opportunities') {
    reportTitle = 'Internship & Training Opportunities Catalog';
    let list = [...store.opportunities];
    if (deptFilter) {
      list = list.filter(o => !Array.isArray(o.eligible_branches) || o.eligible_branches.includes(deptFilter));
    }
    if (statusFilter) {
      list = list.filter(o => String(o.status || 'PUBLISHED').toUpperCase() === statusFilter);
    }
    headers = ['ID', 'Title', 'Organization', 'Type', 'Mode', 'Location', 'Duration', 'Stipend', 'Deadline', 'Application URL', 'Status'];
    rows = list.map(o => [
      String(o.id), o.title || '', o.organization || '', o.opportunity_type || 'INTERNSHIP',
      o.mode || 'ONSITE', o.location || '', o.duration || '', o.stipend_amount || o.stipend || o.stipend_type || 'Unpaid',
      (o.deadline || o.application_deadline || '').split('T')[0], o.application_url || '', o.status || 'PUBLISHED'
    ]);
    summaryNote = `Total Listings: ${list.length} | Published: ${list.filter(o => o.status === 'PUBLISHED').length} | Pending Approval: ${list.filter(o => o.status === 'PENDING_APPROVAL').length}`;
  } else if (type === 'applications') {
    reportTitle = 'Student Internship Applications Register';
    let list = [...store.applications];
    if (deptFilter) {
      list = list.filter(a => String(a.department_code || 'CSE').toUpperCase() === deptFilter);
    }
    if (statusFilter) {
      list = list.filter(a => String(a.status || 'APPLIED').toUpperCase() === statusFilter);
    }
    headers = ['Application ID', 'Roll Number', 'Student Name', 'Department', 'Opportunity Title', 'Organization', 'Status', 'Reviewer Feedback', 'Applied Date'];
    rows = list.map(a => [
      String(a.id), a.roll_number || 'N/A', a.student_name || '', a.department_code || 'CSE',
      a.opportunity_title || '', a.organization || '', a.status || 'APPLIED',
      a.reviewer_feedback || '', a.applied_at ? String(a.applied_at).split('T')[0] : ''
    ]);
    summaryNote = `Total Applications: ${list.length} | Selected: ${list.filter(a => a.status === 'SELECTED').length} | Shortlisted: ${list.filter(a => a.status === 'SHORTLISTED').length}`;
  } else if (type === 'certificates' || type === 'documents') {
    reportTitle = 'Student Certificates & Credential Verification Ledger';
    let list = [...store.documents];
    if (deptFilter) {
      list = list.filter(d => String(d.department_code || 'CSE').toUpperCase() === deptFilter);
    }
    if (statusFilter) {
      list = list.filter(d => String(d.status || 'SUBMITTED').toUpperCase() === statusFilter);
    }
    headers = ['Doc ID', 'Roll Number', 'Student Name', 'Department', 'Title', 'Document Type', 'Issuing Organization', 'Reference ID', 'QR Key', 'Status', 'Submitted Date'];
    rows = list.map(d => [
      String(d.id), d.roll_number || 'N/A', d.student_name || '', d.department_code || 'CSE', d.title || '',
      d.document_type || '', d.issuing_organization || d.company || '', d.verification_reference || '',
      d.status === 'VERIFIED' ? (d.verification_key || '') : 'Pending Verification', d.status || 'SUBMITTED', d.submitted_at ? String(d.submitted_at).split('T')[0] : ''
    ]);
    summaryNote = `Total Documents: ${list.length} | Verified: ${list.filter(d => d.status === 'VERIFIED').length} | Pending: ${list.filter(d => d.status === 'SUBMITTED').length}`;
  } else {
    headers = ['Record Type', 'Generated Date', 'Summary'];
    rows = [[type, dateStamp, 'Export completed']];
    summaryNote = `Generated on ${dateStamp}`;
  }
  if (yearFilter && type !== 'students') {
    summaryNote += ` | Academic Year Filter: ${yearFilter}`;
  }

  addAuditLog(store, user, 'REPORT_EXPORTED', 'Export', `${type}.${exportFormat}`, `Exported ${type} (${rows.length} records) as ${exportFormat.toUpperCase()}`, req.ip, 'SUCCESS');
  saveStore(store);

  if (exportFormat === 'pdf' || exportFormat === 'html' || exportFormat === 'print') {
    res.setHeader('Content-Type', 'text/html');
    const tableHeaders = headers.map(h => `<th style="border:1px solid #cbd5e1;padding:8px 10px;background:#f1f5f9;text-align:left;font-size:11px;">${h}</th>`).join('');
    const tableRows = rows.map(r => `<tr>${r.map(cell => `<td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:11px;">${String(cell ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle} — MITCORER Barshi</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 24px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;background:#eff6ff;padding:12px 16px;border-radius:8px;border:1px solid #bfdbfe;">
    <span style="font-size:13px;font-weight:600;color:#1e40af;">Official MITCORER IPTS Printable Report (${rows.length} records)</span>
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <div style="border-bottom:2px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px;">
    <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;">MAEER's MIT College of Railway Engineering & Research, Barshi (DTE Code: 06901)</div>
    <h1 style="margin:4px 0;font-size:20px;">${reportTitle}</h1>
    <div style="font-size:12px;color:#475569;">Generated by: ${user.name} (${user.role}) on ${dateStamp} | <strong>${summaryNote}</strong></div>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="mitcorer_${type}_${dateStamp}.csv"`);
  const csvEscape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  let csv = headers.map(csvEscape).join(',') + '\n';
  rows.forEach(r => {
    csv += r.map(csvEscape).join(',') + '\n';
  });
  csv += `\n"SUMMARY TOTALS","${summaryNote.replace(/"/g, '""')}"\n`;
  return res.send(csv);
});

// ============================================================================
// 7. OPPORTUNITIES & TRAINING PROGRAMS CRUD + APPROVAL WORKFLOW
// ============================================================================

function validateExternalUrl(url: any): boolean {
  if (!url || String(url).trim() === '') return true;
  const clean = String(url).trim();
  return clean.startsWith('http://') || clean.startsWith('https://');
}

app.get('/api/opportunities/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const store = loadStore();
  let list = [...store.opportunities];
  const { search, type, mode, country, status, include_all } = req.query;

  const isStaff = user && (user.role === 'ADMIN' || user.role === 'COORDINATOR');
  const today = new Date().toISOString().split('T')[0];

  // Public visitors and students only see PUBLISHED and non-expired listings unless staff requests all
  if (!isStaff || (!include_all && !status && req.path === '/api/opportunities/' && req.query.public_only === 'true')) {
    if (!isStaff) {
      list = list.filter(o => {
        if (o.status && o.status !== 'PUBLISHED') return false;
        if (o.deadline && String(o.deadline) < today) return false;
        return true;
      });
    }
  }

  if (status && status !== 'ALL') {
    list = list.filter(o => String(o.status || 'PUBLISHED').toUpperCase() === String(status).toUpperCase());
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(o =>
      String(o.title || '').toLowerCase().includes(q) ||
      String(o.organization || '').toLowerCase().includes(q) ||
      String(o.required_skills || '').toLowerCase().includes(q) ||
      String(o.location || '').toLowerCase().includes(q)
    );
  }
  if (type && type !== 'ALL') list = list.filter(o => o.opportunity_type === type);
  if (mode && mode !== 'ALL') list = list.filter(o => o.mode === mode);
  if (country && country !== 'ALL') list = list.filter(o => o.country === country);

  return res.json(list.map(o => ({
    ...o,
    deadline: o.deadline || o.application_deadline || '2026-12-15',
    application_deadline: o.application_deadline || o.deadline || '2026-12-15',
    stipend: o.stipend || o.stipend_amount || '₹10,000 / month',
    stipend_amount: o.stipend_amount || o.stipend || '₹10,000 / month',
    eligibility: o.eligibility || o.eligibility_requirements || 'Open to eligible engineering students',
    eligibility_requirements: o.eligibility_requirements || o.eligibility || 'Open to eligible engineering students'
  })));
});

app.post('/api/opportunities/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can create opportunities.' });
  }

  const { title, organization, application_url } = req.body;
  if (!title || !String(title).trim() || !organization || !String(organization).trim()) {
    return res.status(400).json({ error: 'Title and Organization/Company Name are required.' });
  }

  if (!validateExternalUrl(application_url)) {
    return res.status(400).json({ error: 'External application link must start with http:// or https://' });
  }

  const store = loadStore();
  const requestedStatus = req.body.status ? String(req.body.status).toUpperCase() : null;
  const canPublishDirectly = user.role === 'ADMIN' || Boolean(user.coordinator_profile?.can_publish_directly);

  let defaultStatus = 'PENDING_APPROVAL';
  if (requestedStatus === 'DRAFT') {
    defaultStatus = 'DRAFT';
  } else if (canPublishDirectly && (!requestedStatus || requestedStatus === 'PUBLISHED')) {
    defaultStatus = 'PUBLISHED';
  } else {
    defaultStatus = 'PENDING_APPROVAL';
  }

  const deadlineVal = req.body.deadline || req.body.application_deadline || '2026-12-15';
  const stipendVal = req.body.stipend_amount || req.body.stipend || '₹10,000 / month';
  const eligibilityVal = req.body.eligibility_requirements || req.body.eligibility || 'Open to eligible engineering students';

  const newOpp = {
    id: Date.now(),
    title: String(title).trim(),
    organization: String(organization).trim(),
    opportunity_type: req.body.opportunity_type || 'INTERNSHIP',
    mode: req.body.mode || 'ONSITE',
    country: req.body.country || 'India',
    location: req.body.location || 'Maharashtra, India',
    duration: req.body.duration || '8 Weeks',
    stipend_type: req.body.stipend_type || 'PAID',
    stipend_amount: stipendVal,
    stipend: stipendVal,
    deadline: deadlineVal,
    application_deadline: deadlineVal,
    description: req.body.description || '',
    eligibility_requirements: eligibilityVal,
    eligibility: eligibilityVal,
    required_skills: req.body.required_skills || '',
    eligible_branches: Array.isArray(req.body.eligible_branches)
      ? req.body.eligible_branches
      : ['CSE', 'E&TC', 'MECH', 'CIVIL'],
    min_cgpa: Number(req.body.min_cgpa) || 6.0,
    available_seats: Number(req.body.available_seats) || 15,
    application_url: application_url ? String(application_url).trim() : '',
    domain: req.body.domain || 'Engineering & Technology',
    status: defaultStatus,
    created_by: user.id,
    created_by_name: user.name,
    created_at: new Date().toISOString()
  };

  store.opportunities.unshift(newOpp);
  addAuditLog(store, user, 'OPPORTUNITY_CREATED', 'Opportunity', String(newOpp.id), `Created ${newOpp.opportunity_type} "${newOpp.title}" at ${newOpp.organization} (${newOpp.status})`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.status(201).json(newOpp);
});

app.patch('/api/opportunities/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can edit opportunities.' });
  }

  if (req.body.application_url !== undefined && !validateExternalUrl(req.body.application_url)) {
    return res.status(400).json({ error: 'External application link must start with http:// or https://' });
  }

  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === Number(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  const editableFields = [
    'title', 'organization', 'opportunity_type', 'mode', 'country', 'location',
    'duration', 'stipend_type', 'stipend_amount', 'stipend', 'deadline', 'application_deadline',
    'description', 'eligibility_requirements', 'eligibility', 'required_skills', 'eligible_branches',
    'min_cgpa', 'available_seats', 'application_url', 'domain', 'status', 'rejection_reason'
  ];
  editableFields.forEach(f => {
    if (f in req.body) opp[f] = req.body[f];
  });
  if (req.body.application_deadline && !req.body.deadline) opp.deadline = req.body.application_deadline;
  if (req.body.deadline && !req.body.application_deadline) opp.application_deadline = req.body.deadline;
  if (req.body.stipend && !req.body.stipend_amount) opp.stipend_amount = req.body.stipend;
  if (req.body.stipend_amount && !req.body.stipend) opp.stipend = req.body.stipend_amount;
  if (req.body.eligibility && !req.body.eligibility_requirements) opp.eligibility_requirements = req.body.eligibility;
  if (req.body.eligibility_requirements && !req.body.eligibility) opp.eligibility = req.body.eligibility_requirements;

  // Enforce approval workflow if Coordinator without direct publish permission tries to set PUBLISHED
  const canPublishDirectly = user.role === 'ADMIN' || Boolean(user.coordinator_profile?.can_publish_directly);
  if (!canPublishDirectly && opp.status === 'PUBLISHED' && req.body.status === 'PUBLISHED') {
    opp.status = 'PENDING_APPROVAL';
  }

  opp.updated_at = new Date().toISOString();

  addAuditLog(store, user, 'OPPORTUNITY_UPDATED', 'Opportunity', String(opp.id), `Updated opportunity "${opp.title}" (${opp.status})`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(opp);
});

app.delete('/api/opportunities/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Only Coordinator or Admin can delete opportunities.' });
  }

  const oppId = Number(req.params.id);
  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === oppId);
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  store.opportunities = store.opportunities.filter(o => o.id !== oppId);
  addAuditLog(store, user, 'OPPORTUNITY_DELETED', 'Opportunity', String(oppId), `Deleted opportunity "${opp.title}" at ${opp.organization}`, req.ip, 'WARNING');
  saveStore(store);
  return res.json({ message: 'Opportunity deleted successfully.' });
});

app.post('/api/opportunities/:id/submit-review/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'COORDINATOR' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === Number(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  opp.status = 'PENDING_APPROVAL';
  opp.rejection_reason = '';
  const admins = store.users.filter(u => u.role === 'ADMIN');
  admins.forEach(a => {
    addNotification(
      store,
      a.id,
      `Opportunity Submitted for Approval: ${opp.title}`,
      `${user.name} submitted "${opp.title}" (${opp.organization}) for Admin publication approval.`,
      'OPPORTUNITY_REVIEW',
      '/admin/opportunities'
    );
  });
  addAuditLog(store, user, 'OPPORTUNITY_SUBMITTED_FOR_REVIEW', 'Opportunity', String(opp.id), `Submitted "${opp.title}" for Admin approval`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(opp);
});

const handlePublishOpportunity = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Staff permissions required to publish opportunities.' });
  }

  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === Number(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  const canPublishDirectly = user.role === 'ADMIN' || Boolean(user.coordinator_profile?.can_publish_directly);
  if (!canPublishDirectly) {
    opp.status = 'PENDING_APPROVAL';
    opp.rejection_reason = '';
    addAuditLog(store, user, 'OPPORTUNITY_SUBMITTED_FOR_REVIEW', 'Opportunity', String(opp.id), `Submitted "${opp.title}" for Admin approval`, req.ip, 'SUCCESS');
    saveStore(store);
    return res.json(opp);
  }

  opp.status = 'PUBLISHED';
  opp.approved_by = user.id;
  opp.approved_by_name = user.name;
  opp.approved_at = new Date().toISOString();
  opp.rejection_reason = '';

  addAuditLog(store, user, 'OPPORTUNITY_PUBLISHED', 'Opportunity', String(opp.id), `Approved and published "${opp.title}" at ${opp.organization}`, req.ip, 'SUCCESS');
  saveStore(store);
  return res.json(opp);
};

app.post('/api/opportunities/:id/approve/', handlePublishOpportunity);
app.post('/api/opportunities/:id/publish/', handlePublishOpportunity);

app.post('/api/opportunities/:id/unpublish/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Staff permissions required to unpublish opportunities.' });
  }

  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === Number(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  opp.status = 'DRAFT';
  addAuditLog(store, user, 'OPPORTUNITY_UNPUBLISHED', 'Opportunity', String(opp.id), `Unpublished "${opp.title}" to DRAFT`, req.ip, 'WARNING');
  saveStore(store);
  return res.json(opp);
});

app.post('/api/opportunities/:id/reject/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
    return res.status(403).json({ error: 'Forbidden: Staff permissions required.' });
  }

  const store = loadStore();
  const opp = store.opportunities.find(o => o.id === Number(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

  const actionType = req.body.action === 'REQUEST_CORRECTIONS' ? 'DRAFT' : 'REJECTED';
  opp.status = actionType;
  opp.rejection_reason = String(req.body.reason || 'Requires revision before publication').trim();

  if (opp.created_by) {
    addNotification(
      store,
      opp.created_by,
      `Opportunity ${actionType === 'DRAFT' ? 'Returned for Corrections' : 'Rejected'}: ${opp.title}`,
      `${user.name} reviewed "${opp.title}": "${opp.rejection_reason}"`,
      'OPPORTUNITY_REVIEW'
    );
  }

  addAuditLog(store, user, `OPPORTUNITY_${actionType}`, 'Opportunity', String(opp.id), `${actionType} "${opp.title}": ${opp.rejection_reason}`, req.ip, 'WARNING');
  saveStore(store);
  return res.json(opp);
});

// ============================================================================
// 8. AI INTEGRATION ENDPOINTS (GOOGLE GEMINI & ANTHROPIC CLAUDE)
// ============================================================================

// GET Admin AI Configuration (Masked Secret Keys)
app.get('/api/admin/ai-config/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Administrators can access AI settings.' });
  }

  const store = loadStore();
  if (!store.ai_config) {
    store.ai_config = getDefaultAIConfig();
    saveStore(store);
  }
  const config = store.ai_config;

  return res.json({
    active_provider: config.active_provider,
    fallback_enabled: Boolean(config.fallback_enabled),
    gemini: {
      provider_name: 'Google Gemini',
      api_key_masked: maskApiKey(config.gemini.api_key),
      has_key: Boolean(config.gemini.api_key),
      selected_model: config.gemini.selected_model || 'gemini-3.1-flash-lite',
      is_connected: Boolean(config.gemini.is_connected),
      last_tested_at: config.gemini.last_tested_at || null,
      error_message: config.gemini.error_message || '',
      supported_models: [
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Recommended Default)' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
      ]
    },
    claude: {
      provider_name: 'Anthropic Claude',
      api_key_masked: maskApiKey(config.claude.api_key),
      has_key: Boolean(config.claude.api_key),
      selected_model: config.claude.selected_model || 'claude-3-5-sonnet-20241022',
      is_connected: Boolean(config.claude.is_connected),
      last_tested_at: config.claude.last_tested_at || null,
      error_message: config.claude.error_message || '',
      supported_models: [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recommended)' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Lightweight)' }
      ]
    }
  });
});

// SAVE / UPDATE Admin AI Configuration
app.post('/api/admin/ai-config/', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Administrators can update AI configuration.' });
  }

  const {
    active_provider,
    fallback_enabled,
    gemini_api_key,
    gemini_model,
    claude_api_key,
    claude_model
  } = req.body;

  const store = loadStore();
  if (!store.ai_config) store.ai_config = getDefaultAIConfig();

  if (active_provider && ['GEMINI', 'CLAUDE', 'NONE'].includes(active_provider)) {
    store.ai_config.active_provider = active_provider;
  }
  if (fallback_enabled !== undefined) {
    store.ai_config.fallback_enabled = Boolean(fallback_enabled);
  }

  let validationErrors: string[] = [];
  let geminiValidated = false;
  let claudeValidated = false;

  // Update Gemini Model
  if (gemini_model) {
    store.ai_config.gemini.selected_model = String(gemini_model).trim();
  }

  // Update & Validate Gemini API Key if provided
  if (gemini_api_key !== undefined) {
    const cleanKey = String(gemini_api_key).trim();
    if (cleanKey && !cleanKey.includes('••••')) {
      try {
        await testGeminiConnection(cleanKey, store.ai_config.gemini.selected_model);
        store.ai_config.gemini.api_key = cleanKey;
        store.ai_config.gemini.is_connected = true;
        store.ai_config.gemini.last_tested_at = new Date().toISOString();
        store.ai_config.gemini.error_message = '';
        geminiValidated = true;
      } catch (err: any) {
        store.ai_config.gemini.api_key = cleanKey;
        store.ai_config.gemini.is_connected = false;
        store.ai_config.gemini.error_message = err?.message || 'Gemini handshake validation failed.';
        validationErrors.push(`Google Gemini validation failed: ${store.ai_config.gemini.error_message}`);
      }
    }
  }

  // Update Claude Model
  if (claude_model) {
    store.ai_config.claude.selected_model = String(claude_model).trim();
  }

  // Update & Validate Claude API Key if provided
  if (claude_api_key !== undefined) {
    const cleanKey = String(claude_api_key).trim();
    if (cleanKey && !cleanKey.includes('••••')) {
      try {
        await testClaudeConnection(cleanKey, store.ai_config.claude.selected_model);
        store.ai_config.claude.api_key = cleanKey;
        store.ai_config.claude.is_connected = true;
        store.ai_config.claude.last_tested_at = new Date().toISOString();
        store.ai_config.claude.error_message = '';
        claudeValidated = true;
      } catch (err: any) {
        store.ai_config.claude.api_key = cleanKey;
        store.ai_config.claude.is_connected = false;
        store.ai_config.claude.error_message = err?.message || 'Claude handshake validation failed.';
        validationErrors.push(`Anthropic Claude validation failed: ${store.ai_config.claude.error_message}`);
      }
    }
  }

  saveStore(store);

  addAuditLog(
    store,
    user,
    'AI_CONFIG_UPDATED',
    'AIConfig',
    store.ai_config.active_provider,
    `Admin updated AI provider settings (Active: ${store.ai_config.active_provider}, Fallback: ${store.ai_config.fallback_enabled}, Gemini Handshake: ${geminiValidated ? 'Passed' : 'N/A'}, Claude Handshake: ${claudeValidated ? 'Passed' : 'N/A'})`,
    req.ip,
    validationErrors.length > 0 ? 'WARNING' : 'SUCCESS'
  );

  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: validationErrors.join(' | '),
      message: 'One or more API key handshakes failed validation.',
      active_provider: store.ai_config.active_provider,
      fallback_enabled: store.ai_config.fallback_enabled,
      gemini: {
        has_key: Boolean(store.ai_config.gemini.api_key),
        api_key_masked: maskApiKey(store.ai_config.gemini.api_key),
        selected_model: store.ai_config.gemini.selected_model,
        is_connected: store.ai_config.gemini.is_connected,
        error_message: store.ai_config.gemini.error_message
      },
      claude: {
        has_key: Boolean(store.ai_config.claude.api_key),
        api_key_masked: maskApiKey(store.ai_config.claude.api_key),
        selected_model: store.ai_config.claude.selected_model,
        is_connected: store.ai_config.claude.is_connected,
        error_message: store.ai_config.claude.error_message
      }
    });
  }

  return res.json({
    message: 'AI Configuration and API keys saved & verified successfully.',
    active_provider: store.ai_config.active_provider,
    fallback_enabled: store.ai_config.fallback_enabled,
    gemini: {
      has_key: Boolean(store.ai_config.gemini.api_key),
      api_key_masked: maskApiKey(store.ai_config.gemini.api_key),
      selected_model: store.ai_config.gemini.selected_model,
      is_connected: store.ai_config.gemini.is_connected
    },
    claude: {
      has_key: Boolean(store.ai_config.claude.api_key),
      api_key_masked: maskApiKey(store.ai_config.claude.api_key),
      selected_model: store.ai_config.claude.selected_model,
      is_connected: store.ai_config.claude.is_connected
    }
  });
});

// TEST CONNECTION for Gemini or Claude
app.post('/api/admin/ai-config/test-connection/', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Administrators can test AI provider connections.' });
  }

  const { provider, api_key, model } = req.body;
  if (!provider || !['GEMINI', 'CLAUDE'].includes(String(provider).toUpperCase())) {
    return res.status(400).json({ error: 'Valid provider (GEMINI or CLAUDE) is required.' });
  }

  const store = loadStore();
  if (!store.ai_config) store.ai_config = getDefaultAIConfig();

  const targetProvider = String(provider).toUpperCase() as 'GEMINI' | 'CLAUDE';

  try {
    if (targetProvider === 'GEMINI') {
      const keyToUse = api_key && !api_key.includes('••••')
        ? String(api_key).trim()
        : store.ai_config.gemini.api_key || process.env.GEMINI_API_KEY || '';

      if (!keyToUse) {
        return res.status(400).json({ error: 'Please enter a Google Gemini API key before testing connection.' });
      }

      const modelToUse = model || store.ai_config.gemini.selected_model || 'gemini-3.1-flash-lite';
      const result = await testGeminiConnection(keyToUse, modelToUse);

      store.ai_config.gemini.api_key = keyToUse;
      store.ai_config.gemini.selected_model = modelToUse;
      store.ai_config.gemini.is_connected = true;
      store.ai_config.gemini.last_tested_at = new Date().toISOString();
      store.ai_config.gemini.error_message = '';

      addAuditLog(store, user, 'AI_CONNECTION_TEST_SUCCESS', 'AIProvider', 'GEMINI', `Verified Google Gemini connection (${modelToUse})`, req.ip, 'SUCCESS');
      saveStore(store);

      return res.json({
        success: true,
        provider: 'GEMINI',
        message: result.message,
        model: modelToUse,
        tested_at: store.ai_config.gemini.last_tested_at,
        response_sample: result.response_sample
      });
    } else {
      const keyToUse = api_key && !api_key.includes('••••')
        ? String(api_key).trim()
        : store.ai_config.claude.api_key || process.env.ANTHROPIC_API_KEY || '';

      if (!keyToUse) {
        return res.status(400).json({ error: 'Please enter an Anthropic Claude API key before testing connection.' });
      }

      const modelToUse = model || store.ai_config.claude.selected_model || 'claude-3-5-sonnet-20241022';
      const result = await testClaudeConnection(keyToUse, modelToUse);

      store.ai_config.claude.api_key = keyToUse;
      store.ai_config.claude.selected_model = modelToUse;
      store.ai_config.claude.is_connected = true;
      store.ai_config.claude.last_tested_at = new Date().toISOString();
      store.ai_config.claude.error_message = '';

      addAuditLog(store, user, 'AI_CONNECTION_TEST_SUCCESS', 'AIProvider', 'CLAUDE', `Verified Anthropic Claude connection (${modelToUse})`, req.ip, 'SUCCESS');
      saveStore(store);

      return res.json({
        success: true,
        provider: 'CLAUDE',
        message: result.message,
        model: modelToUse,
        tested_at: store.ai_config.claude.last_tested_at,
        response_sample: result.response_sample
      });
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Connection test failed.';
    if (targetProvider === 'GEMINI') {
      store.ai_config.gemini.is_connected = false;
      store.ai_config.gemini.error_message = errorMsg;
    } else {
      store.ai_config.claude.is_connected = false;
      store.ai_config.claude.error_message = errorMsg;
    }

    addAuditLog(store, user, 'AI_CONNECTION_TEST_FAILED', 'AIProvider', targetProvider, `Connection test failed: ${errorMsg}`, req.ip, 'FAILED');
    saveStore(store);

    return res.status(400).json({
      success: false,
      provider: targetProvider,
      error: `Failed to connect to ${targetProvider}: ${errorMsg}`
    });
  }
});

// CORE UNIFIED AI GENERATION ROUTE FOR ALL APP FEATURES
app.post('/api/ai/generate/', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required for AI features.' });

  const { prompt, systemInstruction, featureName, responseFormat } = req.body;
  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const store = loadStore();

  try {
    const result = await generateAIResponse(store, {
      prompt: String(prompt).trim(),
      systemInstruction: systemInstruction ? String(systemInstruction).trim() : undefined,
      featureName: featureName || 'GENERAL_ASSISTANT',
      responseFormat: responseFormat === 'json' ? 'json' : 'text'
    });

    addAuditLog(
      store,
      user,
      'AI_INFERENCE_EXECUTED',
      'AIFeature',
      featureName || 'GENERAL',
      `Executed AI request via ${result.provider} (${result.model}) for ${user.role} ${user.name}`,
      req.ip,
      'SUCCESS'
    );
    saveStore(store);

    return res.json({
      success: true,
      text: result.text,
      provider: result.provider,
      model: result.model
    });
  } catch (err: any) {
    const classified = classifyStudentSafeAIError(err);
    addAuditLog(
      store,
      user,
      'AI_INFERENCE_FAILED',
      'AIFeature',
      featureName || 'GENERAL',
      `AI generation error [${classified.errorCode}]: ${classified.logMessage}`,
      req.ip,
      'FAILED'
    );
    saveStore(store);

    return res.status(classified.httpStatus).json({
      error: classified.studentMessage,
      error_code: classified.errorCode,
      user_friendly: true
    });
  }
});

// PUBLIC GITHUB REPOSITORIES PROXY (Handles User-Agent and rate-limit / 404 responses cleanly)
app.get(['/api/github/repos/:username/', '/api/github/repos/:username'], async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const rawUsername = String(req.params.username || '').trim();
  if (!rawUsername || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(rawUsername)) {
    return res.status(400).json({ error: `Invalid GitHub username "${rawUsername}". Please enter a valid GitHub username or profile URL.` });
  }

  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(rawUsername)}/repos?sort=updated&per_page=12`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'MITCORER-IPTS-Portfolio-Sync'
      }
    });

    if (!ghRes.ok) {
      if (ghRes.status === 404) {
        return res.status(404).json({ error: `GitHub user "${rawUsername}" was not found. Please verify the username or profile URL.` });
      }
      if (ghRes.status === 403 || ghRes.status === 429) {
        return res.status(429).json({ error: 'GitHub API rate limit reached for unauthenticated requests. You can add your repositories manually below.' });
      }
      return res.status(502).json({ error: `GitHub API returned status ${ghRes.status}. You can add your repositories manually below.` });
    }

    const rawData = await ghRes.json();
    if (!Array.isArray(rawData)) {
      return res.status(502).json({ error: 'Unexpected response format from GitHub API.' });
    }

    const mappedRepos = rawData.map((r: any) => ({
      name: r.name,
      description: r.description || 'Public repository project',
      language: r.language || 'Other',
      stargazers_count: r.stargazers_count || 0,
      forks_count: r.forks_count || 0,
      html_url: r.html_url || `https://github.com/${rawUsername}/${r.name}`,
      updated_at: r.updated_at ? String(r.updated_at).split('T')[0] : ''
    }));

    return res.json({
      username: rawUsername,
      synced_at: new Date().toISOString(),
      total_repos: mappedRepos.length,
      repos: mappedRepos,
      repositories: mappedRepos
    });
  } catch (err: any) {
    return res.status(502).json({
      error: `Unable to reach GitHub API (${err?.message || 'network error'}). You can add your repositories manually below.`
    });
  }
});

// ==================== FEEDBACK & USER EXPERIENCE MANAGEMENT APIs ====================

const FEEDBACK_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'feedback');
if (!fs.existsSync(FEEDBACK_UPLOADS_DIR)) {
  fs.mkdirSync(FEEDBACK_UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp'
};
const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function saveBase64ScreenshotToDisk(dataUrlOrBase64: string, originalFilename?: string): { url: string; filename: string; size: number } {
  let mimeType = 'image/png';
  let base64Data = dataUrlOrBase64.trim();

  const dataUrlMatch = base64Data.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    base64Data = dataUrlMatch[2];
  } else if (originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase().replace('.', '');
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
  }

  const ext = ALLOWED_IMAGE_MIMES[mimeType];
  if (!ext) {
    throw new Error('Invalid file type. Only PNG, JPG, JPEG, and WEBP images are allowed.');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded image file is empty or corrupted.');
  }
  if (buffer.length > MAX_SCREENSHOT_SIZE_BYTES) {
    throw new Error('Image size exceeds the 5 MB maximum limit. Please choose a smaller screenshot.');
  }

  const uniqueName = `fb_screenshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = path.join(FEEDBACK_UPLOADS_DIR, uniqueName);
  fs.writeFileSync(filePath, buffer);

  const cleanOriginal = originalFilename
    ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_')
    : uniqueName;

  return {
    url: `/uploads/feedback/${uniqueName}`,
    filename: cleanOriginal,
    size: buffer.length
  };
}

// 0. Upload Feedback Screenshot / Image (All Authenticated Roles: Student, Coordinator, Admin)
app.post(['/api/feedback/upload/', '/api/feedback/upload'], (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to upload screenshots.' });

  const { data, filename } = req.body || {};
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Image file data is required.' });
  }

  try {
    const saved = saveBase64ScreenshotToDisk(data, filename);
    return res.status(201).json({
      message: 'Screenshot uploaded successfully.',
      url: saved.url,
      filename: saved.filename,
      size: saved.size
    });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Failed to process uploaded screenshot.' });
  }
});

// 1. Submit New Feedback
app.post('/api/feedback/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to submit feedback.' });

  const {
    category,
    overall_rating,
    usability_rating,
    performance_rating,
    design_rating,
    affected_page,
    subject,
    description,
    attachment_url,
    screenshot_url,
    screenshot_name
  } = req.body;

  if (!subject || !String(subject).trim()) {
    return res.status(400).json({ error: 'Subject is required.' });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  let finalAttachmentUrl = String(screenshot_url || attachment_url || '').trim();
  let finalScreenshotName = String(screenshot_name || '').trim();

  // Never store raw base64 strings in the database; convert to disk file if data URI is passed directly
  if (finalAttachmentUrl.startsWith('data:image/')) {
    try {
      const saved = saveBase64ScreenshotToDisk(finalAttachmentUrl, finalScreenshotName || 'screenshot.png');
      finalAttachmentUrl = saved.url;
      if (!finalScreenshotName) finalScreenshotName = saved.filename;
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Invalid screenshot attachment.' });
    }
  }

  const store = loadStore();
  if (!Array.isArray(store.feedback)) store.feedback = [];

  const dept = user.role === 'STUDENT'
    ? normalizeDepartmentInfo(user.student_profile?.department_id, user.student_profile?.department_code)
    : user.role === 'COORDINATOR'
    ? normalizeDepartmentInfo(user.coordinator_profile?.department_id, user.coordinator_profile?.department_code)
    : { name: 'Central Administration', code: 'ADMIN', id: 0 };

  const count = store.feedback.length + 1;
  const feedback_code = `FB-${new Date().getFullYear()}-${1000 + count}`;
  const nowStr = new Date().toISOString();

  let assignedCoordId: number | null = null;
  let assignedCoordName: string | null = null;
  if (user.role === 'STUDENT' && user.student_profile?.assigned_coordinator_id) {
    assignedCoordId = Number(user.student_profile.assigned_coordinator_id);
    assignedCoordName = user.student_profile.assigned_coordinator_name || null;
  } else {
    const coord = store.users.find(u => u.role === 'COORDINATOR' && u.is_active);
    if (coord) {
      assignedCoordId = coord.id;
      assignedCoordName = coord.name;
    }
  }

  const newFeedback = {
    id: `fb_${Date.now()}`,
    feedback_code,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
    department: dept.name,
    department_code: dept.code,
    category: category || 'GENERAL',
    overall_rating: Number(overall_rating) || 5,
    usability_rating: usability_rating ? Number(usability_rating) : undefined,
    performance_rating: performance_rating ? Number(performance_rating) : undefined,
    design_rating: design_rating ? Number(design_rating) : undefined,
    affected_page: affected_page || 'General Platform',
    subject: String(subject).trim(),
    description: String(description).trim(),
    attachment_url: finalAttachmentUrl,
    screenshot_name: finalScreenshotName || undefined,
    status: 'SUBMITTED',
    assigned_coordinator_id: assignedCoordId,
    assigned_coordinator_name: assignedCoordName,
    responses: [],
    linked_feedback_ids: [],
    created_at: nowStr,
    updated_at: nowStr
  };

  store.feedback.unshift(newFeedback);

  addAuditLog(
    store,
    user,
    'FEEDBACK_SUBMITTED',
    'FeedbackRecord',
    newFeedback.feedback_code,
    `Submitted ${newFeedback.category} feedback: "${newFeedback.subject}" (Rating: ${newFeedback.overall_rating}/5)`,
    req.ip,
    'SUCCESS'
  );

  notifyCoordinators(
    store,
    user,
    `New Feedback [${newFeedback.feedback_code}]`,
    `${user.name} submitted ${newFeedback.category} feedback: "${newFeedback.subject}"`,
    'FEEDBACK',
    '/coordinator/feedback'
  );

  saveStore(store);

  return res.status(201).json({
    message: 'Feedback submitted successfully.',
    feedback: newFeedback
  });
});

// 2. List Feedback Records
app.get('/api/feedback/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  let list = store.feedback || [];

  if (user.role === 'STUDENT') {
    list = list.filter(f => f.user_id === user.id);
  } else if (user.role === 'COORDINATOR') {
    const coordDept = normalizeDepartmentInfo(
      user.coordinator_profile?.department_id,
      user.coordinator_profile?.department_code
    );
    list = list.filter(f => f.department_code === coordDept.code || f.assigned_coordinator_id === user.id || f.user_role === 'COORDINATOR' || user.role === 'ADMIN');
  }

  const { search, category, status, department, role, rating } = req.query;

  if (search && String(search).trim()) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(f =>
      (f.feedback_code && f.feedback_code.toLowerCase().includes(q)) ||
      (f.subject && f.subject.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.user_name && f.user_name.toLowerCase().includes(q)) ||
      (f.affected_page && f.affected_page.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'ALL') {
    list = list.filter(f => String(f.category).toUpperCase() === String(category).toUpperCase());
  }

  if (status && status !== 'ALL') {
    list = list.filter(f => String(f.status).toUpperCase() === String(status).toUpperCase());
  }

  if (department && department !== 'ALL') {
    list = list.filter(f => String(f.department_code || f.department).toUpperCase() === String(department).toUpperCase());
  }

  if (role && role !== 'ALL') {
    list = list.filter(f => String(f.user_role).toUpperCase() === String(role).toUpperCase());
  }

  if (rating && !isNaN(Number(rating))) {
    list = list.filter(f => Number(f.overall_rating) === Number(rating));
  }

  return res.json(list);
});

// 3. Feedback Analytics (Scoped to current user role: Student sees their own feedback metrics; Coordinator/Admin sees their accessible scope)
app.get('/api/feedback/analytics/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  let allFeedback = [...(store.feedback || [])];
  const { category, status, scope } = req.query;

  if (user.role === 'STUDENT' || scope === 'me') {
    allFeedback = allFeedback.filter(f => f.user_id === user.id);
  } else if (user.role === 'COORDINATOR') {
    const coordDept = user.coordinator_profile?.department_code;
    if (coordDept) {
      allFeedback = allFeedback.filter(f =>
        !f.department_code ||
        f.department_code === coordDept ||
        f.assigned_coordinator_id === user.id ||
        f.user_id === user.id
      );
    }
  }

  // 1. All-Time Summary Metrics
  const totalCount = allFeedback.length;
  const avgOverall = totalCount > 0
    ? (allFeedback.reduce((acc, f) => acc + (Number(f.overall_rating) || 0), 0) / totalCount).toFixed(2)
    : '0.00';

  const usabilityRated = allFeedback.filter(f => f.usability_rating);
  const avgUsability = usabilityRated.length > 0
    ? (usabilityRated.reduce((acc, f) => acc + Number(f.usability_rating), 0) / usabilityRated.length).toFixed(2)
    : 'N/A';

  const perfRated = allFeedback.filter(f => f.performance_rating);
  const avgPerformance = perfRated.length > 0
    ? (perfRated.reduce((acc, f) => acc + Number(f.performance_rating), 0) / perfRated.length).toFixed(2)
    : 'N/A';

  const designRated = allFeedback.filter(f => f.design_rating);
  const avgDesign = designRated.length > 0
    ? (designRated.reduce((acc, f) => acc + Number(f.design_rating), 0) / designRated.length).toFixed(2)
    : 'N/A';

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allFeedback.forEach(f => {
    const r = Math.min(5, Math.max(1, Math.round(Number(f.overall_rating) || 5)));
    if (ratingDistribution[r as keyof typeof ratingDistribution] !== undefined) {
      ratingDistribution[r as keyof typeof ratingDistribution]++;
    }
  });

  const categoryCounts = {
    GENERAL: allFeedback.filter(f => f.category === 'GENERAL').length,
    BUG: allFeedback.filter(f => f.category === 'BUG').length,
    FEATURE_REQUEST: allFeedback.filter(f => f.category === 'FEATURE_REQUEST').length,
    IMPROVEMENT: allFeedback.filter(f => f.category === 'IMPROVEMENT').length,
    UX: allFeedback.filter(f => f.category === 'UX').length
  };

  const statusCounts = {
    SUBMITTED: allFeedback.filter(f => f.status === 'SUBMITTED').length,
    UNDER_REVIEW: allFeedback.filter(f => f.status === 'UNDER_REVIEW').length,
    IN_PROGRESS: allFeedback.filter(f => f.status === 'IN_PROGRESS').length,
    RESOLVED: allFeedback.filter(f => f.status === 'RESOLVED').length,
    CLOSED: allFeedback.filter(f => f.status === 'CLOSED').length
  };

  const roleCounts = {
    STUDENT: allFeedback.filter(f => f.user_role === 'STUDENT').length,
    COORDINATOR: allFeedback.filter(f => f.user_role === 'COORDINATOR').length,
    ADMIN: allFeedback.filter(f => f.user_role === 'ADMIN').length
  };

  const resolvedList = allFeedback.filter(f => f.resolved_at && f.created_at);
  let avgResolutionHours = '0';
  if (resolvedList.length > 0) {
    const totalMs = resolvedList.reduce((acc, f) => {
      const start = new Date(f.created_at).getTime();
      const end = new Date(f.resolved_at!).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    avgResolutionHours = (totalMs / (resolvedList.length * 3600000)).toFixed(1);
  }

  // 2. Active Filter Scope (Category and Status filters)
  let filteredFeedback = [...allFeedback];
  if (category && category !== 'ALL') {
    filteredFeedback = filteredFeedback.filter(f => String(f.category).toUpperCase() === String(category).toUpperCase());
  }
  if (status && status !== 'ALL') {
    filteredFeedback = filteredFeedback.filter(f => String(f.status).toUpperCase() === String(status).toUpperCase());
  }

  const filteredCount = filteredFeedback.length;
  const filteredAvgOverall = filteredCount > 0
    ? (filteredFeedback.reduce((acc, f) => acc + (Number(f.overall_rating) || 0), 0) / filteredCount).toFixed(2)
    : '0.00';

  const filteredCategoryCounts = {
    GENERAL: filteredFeedback.filter(f => f.category === 'GENERAL').length,
    BUG: filteredFeedback.filter(f => f.category === 'BUG').length,
    FEATURE_REQUEST: filteredFeedback.filter(f => f.category === 'FEATURE_REQUEST').length,
    IMPROVEMENT: filteredFeedback.filter(f => f.category === 'IMPROVEMENT').length,
    UX: filteredFeedback.filter(f => f.category === 'UX').length
  };

  const filteredStatusCounts = {
    SUBMITTED: filteredFeedback.filter(f => f.status === 'SUBMITTED').length,
    UNDER_REVIEW: filteredFeedback.filter(f => f.status === 'UNDER_REVIEW').length,
    IN_PROGRESS: filteredFeedback.filter(f => f.status === 'IN_PROGRESS').length,
    RESOLVED: filteredFeedback.filter(f => f.status === 'RESOLVED').length,
    CLOSED: filteredFeedback.filter(f => f.status === 'CLOSED').length
  };

  return res.json({
    // All-time metrics (always preserved for global baseline)
    totalCount,
    avgOverall: Number(avgOverall),
    avgUsability,
    avgPerformance,
    avgDesign,
    ratingDistribution,
    categoryCounts,
    statusCounts,
    roleCounts,
    avgResolutionHours: Number(avgResolutionHours),
    resolvedCount: resolvedList.length,

    // Filter-specific metrics
    activeFilter: {
      category: category || 'ALL',
      status: status || 'ALL',
      filteredCount,
      filteredAvgOverall: Number(filteredAvgOverall),
      filteredCategoryCounts,
      filteredStatusCounts
    }
  });
});

// 4. Single Feedback Detail
app.get('/api/feedback/:id/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  const feedback = (store.feedback || []).find(f => f.id === req.params.id || f.feedback_code === req.params.id);

  if (!feedback) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  if (user.role === 'STUDENT' && feedback.user_id !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  return res.json(feedback);
});

// 5. Add Response / Follow-up message
app.post('/api/feedback/:id/responses/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const store = loadStore();
  const feedback = (store.feedback || []).find(f => f.id === req.params.id || f.feedback_code === req.params.id);

  if (!feedback) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  if (user.role === 'STUDENT' && feedback.user_id !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const nowStr = new Date().toISOString();
  const newResponse = {
    id: `res_${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    message: String(message).trim(),
    created_at: nowStr
  };

  if (!Array.isArray(feedback.responses)) feedback.responses = [];
  feedback.responses.push(newResponse);
  feedback.updated_at = nowStr;

  if (user.role !== 'STUDENT' && feedback.status === 'SUBMITTED') {
    feedback.status = 'UNDER_REVIEW';
  }

  if (user.role !== 'STUDENT' && feedback.user_id !== user.id) {
    addNotification(
      store,
      feedback.user_id,
      `New Update on Feedback [${feedback.feedback_code}]`,
      `${user.name} responded to your feedback: "${feedback.subject}"`,
      'FEEDBACK',
      '/student/feedback'
    );
  }

  addAuditLog(
    store,
    user,
    'FEEDBACK_RESPONSE_ADDED',
    'FeedbackRecord',
    feedback.feedback_code,
    `Added response note on feedback ${feedback.feedback_code}`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);

  return res.json({
    message: 'Response posted successfully.',
    feedback
  });
});

// 6. Update Status, Assignee, Resolution
app.patch('/api/feedback/:id/status/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role === 'STUDENT') {
    return res.status(403).json({ error: 'Only Coordinators and Administrators can update feedback status.' });
  }

  const { status, assigned_coordinator_id, resolution_note } = req.body;
  const store = loadStore();
  const feedback = (store.feedback || []).find(f => f.id === req.params.id || f.feedback_code === req.params.id);

  if (!feedback) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  const nowStr = new Date().toISOString();

  if (status && ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(String(status).toUpperCase())) {
    const newStatus = String(status).toUpperCase();
    feedback.status = newStatus;
    if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
      feedback.resolved_at = nowStr;
    }
  }

  if (assigned_coordinator_id !== undefined) {
    if (assigned_coordinator_id === null) {
      feedback.assigned_coordinator_id = null;
      feedback.assigned_coordinator_name = null;
    } else {
      const coord = store.users.find(u => u.id === Number(assigned_coordinator_id) && (u.role === 'COORDINATOR' || u.role === 'ADMIN'));
      if (coord) {
        feedback.assigned_coordinator_id = coord.id;
        feedback.assigned_coordinator_name = coord.name;
      }
    }
  }

  if (resolution_note && String(resolution_note).trim()) {
    if (!Array.isArray(feedback.responses)) feedback.responses = [];
    feedback.responses.push({
      id: `res_resolution_${Date.now()}`,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      message: `[STATUS UPDATE - ${feedback.status}] ${String(resolution_note).trim()}`,
      created_at: nowStr
    });
  }

  feedback.updated_at = nowStr;

  addNotification(
    store,
    feedback.user_id,
    `Feedback Status Updated [${feedback.feedback_code}]`,
    `Status changed to ${feedback.status} for "${feedback.subject}"`,
    'FEEDBACK',
    '/student/feedback'
  );

  addAuditLog(
    store,
    user,
    'FEEDBACK_STATUS_UPDATED',
    'FeedbackRecord',
    feedback.feedback_code,
    `Updated status to ${feedback.status} for ${feedback.feedback_code}`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);

  return res.json({
    message: 'Feedback status updated successfully.',
    feedback
  });
});

// Delete Feedback Ticket
app.delete(['/api/feedback/:id/', '/api/feedback/:id'], (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  if (!Array.isArray(store.feedback)) {
    store.feedback = [];
  }

  const targetKey = String(req.params.id || '').trim();
  const feedbackIndex = store.feedback.findIndex(
    f => String(f.id).trim() === targetKey || String(f.feedback_code).trim().toUpperCase() === targetKey.toUpperCase()
  );

  if (feedbackIndex === -1) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  const feedback = store.feedback[feedbackIndex];
  // Coordinators and Admins can delete any feedback. Students can only delete their own feedback.
  if (user.role === 'STUDENT' && String(feedback.user_id) !== String(user.id)) {
    return res.status(403).json({ error: 'You do not have permission to delete this feedback ticket.' });
  }

  const deletedCode = feedback.feedback_code;
  const deletedSubject = feedback.subject;
  store.feedback.splice(feedbackIndex, 1);

  addAuditLog(
    store,
    user,
    'FEEDBACK_DELETED',
    'FeedbackRecord',
    deletedCode,
    `Permanently deleted feedback ticket ${deletedCode} ("${deletedSubject}")`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);

  return res.json({
    message: `Feedback ticket ${deletedCode} was permanently deleted.`,
    feedback_code: deletedCode
  });
});

// 7. Link Duplicate / Similar Issue
app.post('/api/feedback/:id/link-duplicate/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.role === 'STUDENT') {
    return res.status(403).json({ error: 'Only Coordinators and Administrators can link duplicates.' });
  }

  const { target_feedback_id } = req.body;
  if (!target_feedback_id) {
    return res.status(400).json({ error: 'Target feedback ID is required.' });
  }

  const store = loadStore();
  const mainFeedback = (store.feedback || []).find(f => f.id === req.params.id || f.feedback_code === req.params.id);
  const targetFeedback = (store.feedback || []).find(f => f.id === target_feedback_id || f.feedback_code === target_feedback_id);

  if (!mainFeedback || !targetFeedback) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  if (!Array.isArray(mainFeedback.linked_feedback_ids)) {
    mainFeedback.linked_feedback_ids = [];
  }

  if (!mainFeedback.linked_feedback_ids.includes(targetFeedback.id)) {
    mainFeedback.linked_feedback_ids.push(targetFeedback.id);
  }

  addAuditLog(
    store,
    user,
    'FEEDBACK_DUPLICATE_LINKED',
    'FeedbackRecord',
    mainFeedback.feedback_code,
    `Linked duplicate issue ${targetFeedback.feedback_code} to ${mainFeedback.feedback_code}`,
    req.ip,
    'SUCCESS'
  );

  saveStore(store);

  return res.json({
    message: `Linked ${targetFeedback.feedback_code} as duplicate issue.`,
    feedback: mainFeedback
  });
});

// 8. CSV Export
app.get('/api/feedback/export/csv/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  let list = store.feedback || [];

  if (user.role === 'STUDENT') {
    list = list.filter(f => f.user_id === user.id);
  }

  function sanitizeCsv(val: any): string {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  }

  const headers = [
    'Tracking ID',
    'Date Submitted',
    'User Name',
    'User Email',
    'Role',
    'Department',
    'Category',
    'Overall Rating',
    'Usability Rating',
    'Performance Rating',
    'Design Rating',
    'Affected Page',
    'Subject',
    'Description',
    'Status',
    'Assigned Coordinator',
    'Response Count',
    'Resolved Date'
  ];

  const rows = list.map(f => [
    sanitizeCsv(f.feedback_code),
    sanitizeCsv(new Date(f.created_at).toLocaleString('en-IN')),
    sanitizeCsv(f.user_name),
    sanitizeCsv(f.user_email),
    sanitizeCsv(f.user_role),
    sanitizeCsv(f.department),
    sanitizeCsv(f.category),
    sanitizeCsv(f.overall_rating),
    sanitizeCsv(f.usability_rating || 'N/A'),
    sanitizeCsv(f.performance_rating || 'N/A'),
    sanitizeCsv(f.design_rating || 'N/A'),
    sanitizeCsv(f.affected_page),
    sanitizeCsv(f.subject),
    sanitizeCsv(f.description),
    sanitizeCsv(f.status),
    sanitizeCsv(f.assigned_coordinator_name || 'Unassigned'),
    sanitizeCsv((f.responses || []).length),
    sanitizeCsv(f.resolved_at ? new Date(f.resolved_at).toLocaleString('en-IN') : 'Unresolved')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  addAuditLog(
    store,
    user,
    'FEEDBACK_EXPORT_CSV',
    'FeedbackRecord',
    'ALL',
    `Exported ${list.length} feedback records to CSV`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="MITCORER_Feedback_Report_${Date.now()}.csv"`);
  return res.status(200).send(csvContent);
});

// 9. PDF Export payload
app.get('/api/feedback/export/pdf/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const store = loadStore();
  let list = store.feedback || [];

  if (user.role === 'STUDENT') {
    list = list.filter(f => f.user_id === user.id);
  }

  addAuditLog(
    store,
    user,
    'FEEDBACK_EXPORT_PDF',
    'FeedbackRecord',
    'ALL',
    `Generated PDF report for ${list.length} feedback records`,
    req.ip,
    'SUCCESS'
  );
  saveStore(store);

  return res.json({
    generated_at: new Date().toISOString(),
    institution: 'MAEER’s MIT College of Railway Engineering & Research, Barshi',
    title: 'Comprehensive Feedback & User Experience Management Report',
    exported_by: `${user.name} (${user.role})`,
    total_records: list.length,
    records: list
  });
});


// Vite Middleware Integration for Dev / Static serving for Prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IPTS Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

// Export app for Vercel Serverless Functions (api/index.ts imports this)
export default app;

// Only auto-start the server when running locally (not on Vercel serverless)
// VERCEL env var is automatically set by Vercel's build/runtime environment
if (!IS_VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start IPTS server:', err);
  });
}
