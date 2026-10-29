import React, { useState, useEffect } from 'react';
import { Github, Code, Star, GitFork, Sparkles, RefreshCw, CheckCircle2, ExternalLink, Bot, Award, PlusCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface RepoInfo {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  updated_at: string;
  isManual?: boolean;
}

export const GitHubPortfolioSyncSection: React.FC = () => {
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [resolvedUsername, setResolvedUsername] = useState<string>('');
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [topLanguages, setTopLanguages] = useState<{ [lang: string]: number }>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<'LIVE_GITHUB' | 'MANUAL_ENTRY' | null>(null);

  const [fetchingAI, setFetchingAI] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarySource, setSummarySource] = useState<'AI' | 'LOCAL' | null>(null);
  const [savedToProfile, setSavedToProfile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Repository Entry Fallback State
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualRepoName, setManualRepoName] = useState<string>('');
  const [manualRepoLang, setManualRepoLang] = useState<string>('TypeScript');
  const [manualRepoUrl, setManualRepoUrl] = useState<string>('');
  const [manualRepoDesc, setManualRepoDesc] = useState<string>('');

  // Extract clean GitHub username from either raw username or full URL
  const parseGitHubUsername = (rawInput: string): string | null => {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    // Match full URL or github.com/username/repo
    const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/i);
    if (urlMatch && urlMatch[1]) {
      const candidate = urlMatch[1];
      if (['orgs', 'topics', 'trending', 'explore', 'settings', 'login', 'join'].includes(candidate.toLowerCase())) {
        return null;
      }
      return candidate;
    }

    // Match @username or plain username
    const cleanUser = trimmed.replace(/^@/, '').replace(/\/+$/, '');
    if (/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(cleanUser)) {
      return cleanUser;
    }
    return null;
  };

  // Auto-detect GitHub username from student profile/resume
  useEffect(() => {
    api.get<any>('/resumes/me/').then(res => {
      if (res?.resume?.github_url) {
        const parsed = parseGitHubUsername(res.resume.github_url);
        if (parsed) {
          setUsernameInput(parsed);
          setResolvedUsername(parsed);
        }
      }
    }).catch(() => {});
  }, []);

  const recomputeLanguageDistribution = (repoList: RepoInfo[]) => {
    const langCounts: { [lang: string]: number } = {};
    repoList.forEach(r => {
      if (r.language && r.language !== 'Other') {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
    });
    setTopLanguages(langCounts);
    return langCounts;
  };

  const handleSyncGitHub = async (targetInput?: string) => {
    const rawValue = targetInput !== undefined ? targetInput : usernameInput;
    const cleanUser = parseGitHubUsername(rawValue);

    if (!cleanUser) {
      setError('Invalid GitHub username or URL. Please enter a valid GitHub username (e.g. "octocat") or profile link (e.g. "https://github.com/octocat").');
      return;
    }

    setResolvedUsername(cleanUser);
    setLoadingRepos(true);
    setError(null);
    setAiSummary(null);
    setSummarySource(null);
    setSavedToProfile(false);

    try {
      let rawData: any[] = [];
      let syncedTimestamp = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      });

      try {
        // First try our backend proxy endpoint which sets proper User-Agent headers and handles rate limits cleanly
        const proxyRes = await api.get<{
          username: string;
          synced_at: string;
          total_repos?: number;
          repositories?: any[];
          repos?: any[];
        }>(`/github/repos/${encodeURIComponent(cleanUser)}/`);
        rawData = proxyRes.repositories || proxyRes.repos || [];
        if (proxyRes.synced_at) {
          syncedTimestamp = new Date(proxyRes.synced_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'medium'
          });
        }
      } catch (proxyErr: any) {
        // If proxy reported a specific 404 or rate limit error, rethrow with clear message
        if (proxyErr?.message && (proxyErr.message.includes('not found') || proxyErr.message.includes('rate limit'))) {
          throw proxyErr;
        }
        // Fallback to direct browser fetch if needed
        const response = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=12`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`GitHub profile "${cleanUser}" was not found. Check the spelling or use the Manual Repository Entry option below.`);
          }
          if (response.status === 403 || response.status === 429) {
            throw new Error('GitHub public API rate limit reached. You can add your repositories using the Manual Repository Entry fallback below.');
          }
          throw new Error(`GitHub API returned status ${response.status}. You can use Manual Repository Entry below while GitHub is unreachable.`);
        }
        rawData = await response.json();
      }

      if (!Array.isArray(rawData) || rawData.length === 0) {
        setShowManualForm(true);
        throw new Error(`GitHub user "${cleanUser}" has 0 public repositories available. Make your repositories public on GitHub or add your project repositories manually below.`);
      }

      const parsedRepos: RepoInfo[] = rawData.map((r: any) => ({
        name: r.name,
        description: r.description || 'Public engineering repository',
        language: r.language || 'Other',
        stargazers_count: r.stargazers_count || 0,
        forks_count: r.forks_count || 0,
        html_url: r.html_url || `https://github.com/${cleanUser}/${r.name}`,
        updated_at: String(r.updated_at || '').split('T')[0]
      }));

      setRepos(parsedRepos);
      setLastSyncedAt(syncedTimestamp);
      setDataSourceLabel('LIVE_GITHUB');

      const langCounts = recomputeLanguageDistribution(parsedRepos);
      await generateProficiencySummary(cleanUser, parsedRepos, langCounts);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to GitHub API. You can enter your repositories manually below.');
      setShowManualForm(true);
    } finally {
      setLoadingRepos(false);
    }
  };

  const buildLocalProficiencySummary = (userLabel: string, repoList: RepoInfo[], langCounts: { [lang: string]: number }) => {
    const langs = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${lang} (${count} ${count === 1 ? 'repo' : 'repos'})`);
    const topLangStr = langs.length > 0 ? langs.join(', ') : 'Software & Engineering Development';
    const topRepoNames = repoList.slice(0, 3).map(r => r.name).join(', ');

    return `[LOCAL RULE-BASED TECHNICAL PROFICIENCY SUMMARY]
Technical Proficiency Summary: Active engineering developer (${userLabel}) maintaining ${repoList.length} project ${repoList.length === 1 ? 'repository' : 'repositories'} with primary technical concentration in ${topLangStr}. Demonstrates practical implementation experience across ${topRepoNames}, with structured source control and modular project organization.

Key Highlights:
• Primary Stack Distribution: ${topLangStr}
• Key Project Repositories: ${repoList.slice(0, 4).map(r => `${r.name} [${r.language}]`).join(', ')}
• Engineering Practice: Maintains documented codebases ready for technical internship evaluation.`;
  };

  const generateProficiencySummary = async (userToFetch: string, repoList: RepoInfo[], langCounts: { [lang: string]: number }) => {
    setFetchingAI(true);

    const langSummaryStr = Object.entries(langCounts)
      .map(([lang, count]) => `${lang} (${count} repos)`)
      .join(', ') || 'General Programming';

    const repoDetailsStr = repoList.slice(0, 6).map(r => `- ${r.name} [${r.language}]: ${r.description}`).join('\n');

    const prompt = `Analyze this engineering student's GitHub portfolio and generate a concise 3-4 sentence "Technical Proficiency Summary" suitable for their student profile and resume.

GITHUB USER: ${userToFetch}
TOP LANGUAGES: ${langSummaryStr}
REPOSITORIES ANALYZED:
${repoDetailsStr}

Format:
Technical Proficiency Summary: [A compelling 3-sentence summary highlighting core programming languages, repository domain focus, and development discipline]
Key Highlights: [3 bullet points of notable technical strengths]`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are an Executive Technical Recruiter for MITCORER Internship Hub. Synthesize GitHub repository metadata into professional technical summaries grounded strictly in the listed repositories.',
        featureName: 'GITHUB_PORTFOLIO'
      });

      if (!res.text || !res.text.trim()) throw new Error('Empty AI summary');
      setAiSummary(res.text.trim());
      setSummarySource('AI');
    } catch (_err: any) {
      setAiSummary(buildLocalProficiencySummary(userToFetch, repoList, langCounts));
      setSummarySource('LOCAL');
    } finally {
      setFetchingAI(false);
    }
  };

  const handleAddManualRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRepoName.trim()) {
      setError('Please enter a repository or project name.');
      return;
    }

    const cleanUser = parseGitHubUsername(usernameInput) || resolvedUsername || 'student-portfolio';
    const newRepo: RepoInfo = {
      name: manualRepoName.trim(),
      description: manualRepoDesc.trim() || 'Student engineering project repository',
      language: manualRepoLang.trim() || 'TypeScript',
      stargazers_count: 0,
      forks_count: 0,
      html_url: manualRepoUrl.trim() || `https://github.com/${cleanUser}/${encodeURIComponent(manualRepoName.trim())}`,
      updated_at: new Date().toISOString().split('T')[0],
      isManual: true
    };

    const updatedRepos = [newRepo, ...repos];
    setRepos(updatedRepos);
    setResolvedUsername(cleanUser);
    setLastSyncedAt(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }));
    setDataSourceLabel('MANUAL_ENTRY');
    setManualRepoName('');
    setManualRepoDesc('');
    setManualRepoUrl('');
    setError(null);

    const langCounts = recomputeLanguageDistribution(updatedRepos);
    await generateProficiencySummary(cleanUser, updatedRepos, langCounts);
  };

  const handleRemoveRepo = (repoName: string) => {
    const updated = repos.filter(r => r.name !== repoName);
    setRepos(updated);
    const langCounts = recomputeLanguageDistribution(updated);
    if (updated.length > 0) {
      generateProficiencySummary(resolvedUsername || 'student', updated, langCounts);
    } else {
      setAiSummary(null);
      setSummarySource(null);
    }
  };

  const handleAddToProfile = async () => {
    if (!aiSummary) return;

    try {
      const detectedSkills = Object.keys(topLanguages);
      const res = await api.get<any>('/resumes/me/');
      const currentResume = res?.resume || {};

      const updatedSkills = Array.from(new Set([...(currentResume.skills || []), ...detectedSkills]));
      const cleanSummaryText = aiSummary.replace(/^\[LOCAL RULE-BASED TECHNICAL PROFICIENCY SUMMARY\]\s*/i, '');
      const updatedSummary = currentResume.summary
        ? `${currentResume.summary}\n\n[GitHub Portfolio Technical Profile]:\n${cleanSummaryText}`
        : cleanSummaryText;

      const userSlug = resolvedUsername || parseGitHubUsername(usernameInput) || '';

      await api.post('/resumes/me/', {
        ...currentResume,
        summary: updatedSummary,
        skills: updatedSkills,
        github_url: userSlug ? `https://github.com/${userSlug}` : currentResume.github_url
      });

      setSavedToProfile(true);
      setTimeout(() => setSavedToProfile(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile with GitHub summary.');
    }
  };

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Github size={16} color="#0f172a" /> Live GitHub Portfolio Integration
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Sync Public Repositories & Technical Proficiency Summary
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            Enter a GitHub username or full profile URL to fetch public repositories, language distribution, and generate a technical bio.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {savedToProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
              <CheckCircle2 size={16} /> Added to Profile & Resume!
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowManualForm(prev => !prev)}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <PlusCircle size={14} /> {showManualForm ? 'Hide Manual Repo Entry' : 'Manual Repo Entry Fallback'}
          </button>
        </div>
      </div>

      {/* Input Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px' }}>
          <Github size={16} color="#64748b" style={{ marginRight: '6px', flexShrink: 0 }} />
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter GitHub username (e.g. octocat) or URL (https://github.com/octocat)"
            style={{ border: 'none', outline: 'none', padding: '10px 4px', fontSize: '13.5px', width: '100%', color: '#0f172a', fontWeight: 600 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSyncGitHub(); }}
          />
        </div>

        <button
          onClick={() => handleSyncGitHub()}
          disabled={loadingRepos}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          {loadingRepos ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Fetching GitHub Repos...
            </>
          ) : (
            <>
              <Github size={16} /> Fetch & Sync Repositories
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div>{error}</div>
            {!showManualForm && (
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                style={{ marginTop: '6px', background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontWeight: 700, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Open Manual Repository Entry Fallback &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Repository Entry Fallback Form */}
      {showManualForm && (
        <form
          onSubmit={handleAddManualRepo}
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={15} /> Manual Repository Entry (Offline / Private / Rate-Limit Fallback)
            </div>
            <span style={{ fontSize: '11.5px', color: '#b45309' }}>
              Add your project repositories directly to generate a portfolio summary
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                Repository Name *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. railway-telemetry-iot"
                value={manualRepoName}
                onChange={(e) => setManualRepoName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                Primary Language *
              </label>
              <select
                className="form-control"
                value={manualRepoLang}
                onChange={(e) => setManualRepoLang(e.target.value)}
              >
                <option value="TypeScript">TypeScript</option>
                <option value="JavaScript">JavaScript</option>
                <option value="Python">Python</option>
                <option value="Java">Java</option>
                <option value="C++">C++</option>
                <option value="Embedded C">Embedded C</option>
                <option value="Verilog">Verilog / VHDL</option>
                <option value="MATLAB">MATLAB</option>
                <option value="SQL">SQL</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                Repository Link (Optional)
              </label>
              <input
                type="url"
                className="form-control"
                placeholder="https://github.com/username/repo"
                value={manualRepoUrl}
                onChange={(e) => setManualRepoUrl(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: '1 1 280px' }}
              placeholder="Short technical description (e.g. Full-stack internship tracking portal using React & Express)"
              value={manualRepoDesc}
              onChange={(e) => setManualRepoDesc(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
              + Add Repository to Portfolio
            </button>
          </div>
        </form>
      )}

      {/* Repos & Summary Output */}
      {repos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Languages & Repo Overview Banner with Last Synchronized Timestamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Detected Language Distribution ({resolvedUsername})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(topLanguages).map(([lang, count]) => (
                  <span key={lang} className="badge badge-approved" style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                    {lang}: {count} {count === 1 ? 'repo' : 'repos'}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', textAlign: 'right' }}>
              <div>
                <strong>{repos.length}</strong> {dataSourceLabel === 'MANUAL_ENTRY' ? 'portfolio repos listed' : 'public repos synced'}
              </div>
              {lastSyncedAt && (
                <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px' }}>
                  <Clock size={12} /> Last Synchronized: {lastSyncedAt}
                </div>
              )}
            </div>
          </div>

          {/* Technical Proficiency Summary Box */}
          {fetchingAI ? (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563eb' }} />
              <p style={{ fontSize: '13px', color: '#64748b' }}>Synthesizing technical proficiency summary from repository metadata...</p>
            </div>
          ) : aiSummary && (
            <div style={{ backgroundColor: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Sparkles size={20} color="#7c3aed" />
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#3b0764', margin: 0 }}>
                    Technical Proficiency Summary
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: summarySource === 'AI' ? '#ede9fe' : '#fef3c7',
                    color: summarySource === 'AI' ? '#5b21b6' : '#92400e',
                    border: `1px solid ${summarySource === 'AI' ? '#c4b5fd' : '#fde68a'}`
                  }}>
                    {summarySource === 'AI' ? 'Generated by Live AI' : 'Local Rule-Based Summary'}
                  </span>
                </div>

                <button
                  onClick={handleAddToProfile}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Award size={14} /> Add Summary to Profile & Resume
                </button>
              </div>

              <div style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {aiSummary}
              </div>
            </div>
          )}

          {/* Synced Repositories Grid */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              Repositories ({repos.length}):
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {repos.map(r => (
                <div
                  key={r.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <a
                        href={r.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, fontSize: '14px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <Code size={15} /> {r.name}
                      </a>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {r.isManual && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRepo(r.name)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Remove manual repository"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <a href={r.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} color="#94a3b8" />
                        </a>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.language}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {r.isManual ? (
                        <span style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 600 }}>Manual Entry</span>
                      ) : (
                        <>
                          <span>★ {r.stargazers_count}</span>
                          <span>⌥ {r.forks_count}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
