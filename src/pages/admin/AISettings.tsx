import React, { useEffect, useState } from 'react';
import { 
  Bot, Cpu, CheckCircle2, AlertCircle, Eye, EyeOff, Save, RefreshCw, 
  Sparkles, Zap, ShieldCheck, Play, Key
} from 'lucide-react';
import { api } from '../../services/api';

interface ModelOption {
  id: string;
  name: string;
}

interface ProviderState {
  provider_name: string;
  api_key_masked: string;
  has_key: boolean;
  selected_model: string;
  is_connected: boolean;
  last_tested_at: string | null;
  error_message: string;
  supported_models: ModelOption[];
}

interface AIConfigResponse {
  active_provider: 'GEMINI' | 'CLAUDE' | 'NONE';
  fallback_enabled: boolean;
  gemini: ProviderState;
  claude: ProviderState;
}

export const AISettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [activeProvider, setActiveProvider] = useState<'GEMINI' | 'CLAUDE'>('GEMINI');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);

  // Gemini state
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [testingGemini, setTestingGemini] = useState(false);

  // Claude state
  const [claudeKeyInput, setClaudeKeyInput] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [claudeModel, setClaudeModel] = useState('claude-3-5-sonnet-20241022');
  const [testingClaude, setTestingClaude] = useState(false);

  // Sandbox / Test prompt state
  const [sandboxPrompt, setSandboxPrompt] = useState('Summarize the benefits of completing an accredited engineering internship in 2 sentences.');
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [sandboxMeta, setSandboxMeta] = useState<{ provider: string; model: string } | null>(null);
  const [runningSandbox, setRunningSandbox] = useState(false);

  const fetchAIConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get<AIConfigResponse>('/admin/ai-config/');
      setConfig(data);
      setActiveProvider(data.active_provider === 'CLAUDE' ? 'CLAUDE' : 'GEMINI');
      setFallbackEnabled(data.fallback_enabled);

      setGeminiModel(data.gemini.selected_model || 'gemini-3.8-flash');
      if (data.gemini.api_key_masked) {
        setGeminiKeyInput(data.gemini.api_key_masked);
      }

      setClaudeModel(data.claude.selected_model || 'claude-3-5-sonnet-20241022');
      if (data.claude.api_key_masked) {
        setClaudeKeyInput(data.claude.api_key_masked);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load AI configuration.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIConfig();
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        active_provider: activeProvider,
        fallback_enabled: fallbackEnabled,
        gemini_model: geminiModel,
        claude_model: claudeModel
      };

      if (geminiKeyInput && !geminiKeyInput.includes('••••')) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }
      if (claudeKeyInput && !claudeKeyInput.includes('••••')) {
        payload.claude_api_key = claudeKeyInput.trim();
      }

      await api.post('/admin/ai-config/', payload);
      showNotice('success', 'AI Configuration and API settings saved successfully!');
      await fetchAIConfig();
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to update AI settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider: 'GEMINI' | 'CLAUDE') => {
    if (provider === 'GEMINI') setTestingGemini(true);
    else setTestingClaude(true);

    try {
      const keyToTest = provider === 'GEMINI' ? geminiKeyInput : claudeKeyInput;
      const modelToTest = provider === 'GEMINI' ? geminiModel : claudeModel;

      const res = await api.post<{ success: boolean; message: string; model: string; response_sample: string }>(
        '/admin/ai-config/test-connection/',
        {
          provider,
          api_key: keyToTest,
          model: modelToTest
        }
      );

      showNotice('success', res.message);
      await fetchAIConfig();
    } catch (err: any) {
      showNotice('error', err?.message || `Failed connection test for ${provider}.`);
    } finally {
      if (provider === 'GEMINI') setTestingGemini(false);
      else setTestingClaude(false);
    }
  };

  const handleRunSandbox = async () => {
    if (!sandboxPrompt.trim()) return;
    setRunningSandbox(true);
    setSandboxResponse(null);
    setSandboxMeta(null);
    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt: sandboxPrompt.trim(),
        systemInstruction: 'You are an AI advisor for MAEER’s MIT College of Railway Engineering & Research (MITCORER) Internship Hub.',
        featureName: 'ADMIN_SANDBOX'
      });
      setSandboxResponse(res.text);
      setSandboxMeta({ provider: res.provider, model: res.model });
    } catch (err: any) {
      showNotice('error', err?.message || 'AI sandbox test call failed.');
    } finally {
      setRunningSandbox(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
        <div>Loading AI Provider Settings...</div>
      </div>
    );
  }

  const activeGemini = activeProvider === 'GEMINI';
  const activeClaude = activeProvider === 'CLAUDE';

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={20} />
            </div>
            <h1 className="page-title">AI Provider &amp; Model Integration Settings</h1>
          </div>
          <p className="page-subtitle">
            Configure Google Gemini and Anthropic Claude API keys for automated resume analysis, report feedback, skill assessments, and student career guidance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchAIConfig}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{message.text}</span>
        </div>
      )}

      {/* Active System Status Summary Banner */}
      <div className="card" style={{ marginBottom: '28px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(37, 99, 235, 0.08))', borderColor: 'var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active AI Engine
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeProvider === 'GEMINI' ? 'Google Gemini API' : 'Anthropic Claude API'}
                <span className={`badge ${((activeGemini && config?.gemini.is_connected) || (activeClaude && config?.claude.is_connected)) ? 'badge-success' : 'badge-warning'}`}>
                  {((activeGemini && config?.gemini.is_connected) || (activeClaude && config?.claude.is_connected)) ? 'Connected & Active' : 'Requires API Key Setup'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: config?.gemini.is_connected ? 'var(--success)' : 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config?.gemini.is_connected ? '#059669' : '#94a3b8' }} />
              Google Gemini: <strong>{config?.gemini.is_connected ? 'Ready' : 'Not Tested'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: config?.claude.is_connected ? 'var(--success)' : 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config?.claude.is_connected ? '#059669' : '#94a3b8' }} />
              Anthropic Claude: <strong>{config?.claude.is_connected ? 'Ready' : 'Not Tested'}</strong>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveConfig}>
        {/* Active Provider & Fallback Control */}
        <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--primary)" /> Active AI Provider Selection
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <label
              style={{
                border: `2px solid ${activeProvider === 'GEMINI' ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: activeProvider === 'GEMINI' ? 'var(--primary-light)' : 'var(--bg-card)',
                borderRadius: '12px',
                padding: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="activeProvider"
                value="GEMINI"
                checked={activeProvider === 'GEMINI'}
                onChange={() => setActiveProvider('GEMINI')}
                style={{ marginTop: '4px' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  Google Gemini API
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  Fast inference with Gemini 3.8 Flash &amp; Gemini 4 Argon. Recommended for full-stack analysis and high-throughput student queries.
                </div>
              </div>
            </label>

            <label
              style={{
                border: `2px solid ${activeProvider === 'CLAUDE' ? '#7c3aed' : 'var(--border)'}`,
                backgroundColor: activeProvider === 'CLAUDE' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-card)',
                borderRadius: '12px',
                padding: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="activeProvider"
                value="CLAUDE"
                checked={activeProvider === 'CLAUDE'}
                onChange={() => setActiveProvider('CLAUDE')}
                style={{ marginTop: '4px' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  Anthropic Claude API
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  In-depth reasoning with Claude 3.5 Sonnet &amp; Claude 3.7. Excellent for nuanced report feedback and career passport evaluations.
                </div>
              </div>
            </label>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fallbackEnabled}
                onChange={(e) => setFallbackEnabled(e.target.checked)}
              />
              Enable Automatic Fallback (Switches provider automatically if primary encounters quota or network error)
            </label>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-md"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </div>
        </div>

        {/* Individual Provider Configuration Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* 1. GOOGLE GEMINI CARD */}
          <div className="card" style={{ padding: '24px', borderTop: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="#2563eb" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Google Gemini
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${testingGemini ? 'badge-warning' : config?.gemini.is_connected ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '12px' }}>
                  {testingGemini ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Handshake Testing...
                    </>
                  ) : config?.gemini.is_connected ? (
                    <>
                      <CheckCircle2 size={12} /> API Status: Connected
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> API Status: Disconnected
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gemini API Key</span>
                {config?.gemini.has_key && <span style={{ color: 'var(--success)', fontSize: '12px' }}>Key Saved on Backend</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '42px', fontFamily: 'monospace' }}
                  placeholder="Enter AI Studio Gemini API Key (AIzaSy...)"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Gemini Model</label>
              <select
                className="form-control"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                {(config?.gemini.supported_models || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {config?.gemini.error_message && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '14px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                {config.gemini.error_message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {config?.gemini.last_tested_at ? `Verified: ${new Date(config.gemini.last_tested_at).toLocaleString()}` : 'Never tested'}
              </span>

              <button
                type="button"
                onClick={() => handleTestConnection('GEMINI')}
                disabled={testingGemini}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {testingGemini ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Test Connection
              </button>
            </div>
          </div>

          {/* 2. ANTHROPIC CLAUDE CARD */}
          <div className="card" style={{ padding: '24px', borderTop: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Anthropic Claude
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${testingClaude ? 'badge-warning' : config?.claude.is_connected ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '12px' }}>
                  {testingClaude ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Handshake Testing...
                    </>
                  ) : config?.claude.is_connected ? (
                    <>
                      <CheckCircle2 size={12} /> API Status: Connected
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> API Status: Disconnected
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Claude API Key</span>
                {config?.claude.has_key && <span style={{ color: 'var(--success)', fontSize: '12px' }}>Key Saved on Backend</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '42px', fontFamily: 'monospace' }}
                  placeholder="Enter Anthropic API Key (sk-ant-api03...)"
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title={showClaudeKey ? 'Hide key' : 'Show key'}
                >
                  {showClaudeKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Claude Model</label>
              <select
                className="form-control"
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
              >
                {(config?.claude.supported_models || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {config?.claude.error_message && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '14px', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                {config.claude.error_message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {config?.claude.last_tested_at ? `Verified: ${new Date(config.claude.last_tested_at).toLocaleString()}` : 'Never tested'}
              </span>

              <button
                type="button"
                onClick={() => handleTestConnection('CLAUDE')}
                disabled={testingClaude}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {testingClaude ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Live Test Sandbox Console */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={18} color="var(--primary)" /> Live AI Inference Sandbox
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Test real-time AI inference against your active provider ({activeProvider === 'GEMINI' ? 'Google Gemini' : 'Anthropic Claude'}).
        </p>

        <div style={{ marginBottom: '14px' }}>
          <textarea
            rows={3}
            className="form-control"
            value={sandboxPrompt}
            onChange={(e) => setSandboxPrompt(e.target.value)}
            placeholder="Type a test prompt to send to the active AI model..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={handleRunSandbox}
            disabled={runningSandbox || !sandboxPrompt.trim()}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {runningSandbox ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {runningSandbox ? 'Inferring Response...' : 'Execute Test Inference'}
          </button>

          {sandboxMeta && (
            <span style={{ fontSize: '12.5px', color: 'var(--success)', fontWeight: 600 }}>
              Generated via {sandboxMeta.provider} ({sandboxMeta.model})
            </span>
          )}
        </div>

        {sandboxResponse && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            <strong>Response Output:</strong>
            <div style={{ marginTop: '6px', color: 'var(--text-primary)' }}>{sandboxResponse}</div>
          </div>
        )}
      </div>
    </div>
  );
};
