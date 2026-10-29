import React, { useEffect, useState } from 'react';
import {
  FileText, CheckCircle, ExternalLink, Save, Trash2, RefreshCw, Building2, Plus
} from 'lucide-react';
import { ProgressReport, Internship } from '../../types';
import { api } from '../../services/api';

export const WeeklyReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedInternshipId, setSelectedInternshipId] = useState<number | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);

  // Quick internship setup if student doesn't have an active internship yet
  const [newInternOrg, setNewInternOrg] = useState('');
  const [newInternRole, setNewInternRole] = useState('');

  const [formData, setFormData] = useState({
    week_number: 1,
    tasks_completed: '',
    technical_skills: '',
    learning_outcomes: '',
    challenges_faced: '',
    solutions_implemented: '',
    project_progress: '',
    github_link: '',
    demo_link: '',
    next_week_plan: '',
    student_reflection: '',
    hours_worked: 40,
    proof_links: [] as string[],
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReportsAndInternships = async () => {
    setLoading(true);
    try {
      const [repRes, intRes] = await Promise.all([
        api.get<any>('/reports/'),
        api.get<any>('/internships/')
      ]);
      const repList = Array.isArray(repRes) ? repRes : repRes?.results || [];
      const intList = Array.isArray(intRes) ? intRes : intRes?.results || [];
      setReports(repList);
      setInternships(intList);
      if (intList.length > 0 && !selectedInternshipId) {
        const active = intList.find((i: any) => i.status === 'ACTIVE') || intList[0];
        setSelectedInternshipId(active.id);
      }
      if (repList.length > 0 && !editingReportId) {
        const maxWeek = Math.max(...repList.map((r: any) => Number(r.week_number) || 0));
        setFormData(prev => ({ ...prev, week_number: Math.min(8, maxWeek + 1) }));
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndInternships();
  }, []);

  const activeInternship: any = internships.find((i: any) => i.id === selectedInternshipId) || internships[0] || null;

  const handleRegisterInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternOrg.trim() || !newInternRole.trim()) return;
    try {
      const created = await api.post<any>('/internships/', {
        organization_name: newInternOrg.trim(),
        role_title: newInternRole.trim(),
        status: 'ACTIVE'
      });
      setNewInternOrg('');
      setNewInternRole('');
      setSelectedInternshipId(created.id);
      setMessage({ type: 'success', text: `Active internship at ${created.organization_name} registered!` });
      fetchReportsAndInternships();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to register internship.' });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProofLink = () => {
    if (formData.proof_links.length < 3) {
      setFormData(prev => ({ ...prev, proof_links: [...prev.proof_links, ''] }));
    }
  };

  const handleRemoveProofLink = (index: number) => {
    setFormData(prev => ({ ...prev, proof_links: prev.proof_links.filter((_, i) => i !== index) }));
  };

  const handleProofLinkChange = (index: number, value: string) => {
    setFormData(prev => {
      const links = [...prev.proof_links];
      links[index] = value;
      return { ...prev, proof_links: links };
    });
  };

  const handleSubmitReport = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (!formData.tasks_completed.trim()) {
      setMessage({ type: 'error', text: 'Tasks Completed is required.' });
      return;
    }
    if (!formData.technical_skills.trim()) {
      setMessage({ type: 'error', text: 'Technical Skills are required.' });
      return;
    }
    if (!formData.learning_outcomes.trim()) {
      setMessage({ type: 'error', text: 'Learning Outcomes are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        internship: activeInternship?.id,
        organization_name: activeInternship?.organization_name || activeInternship?.company || newInternOrg || 'MITCORER Partner Organization',
        role_title: activeInternship?.role_title || activeInternship?.role || newInternRole || 'Engineering Intern',
        week_number: Number(formData.week_number) || 1,
        tasks_completed: formData.tasks_completed,
        technical_skills: formData.technical_skills,
        learning_outcomes: formData.learning_outcomes,
        challenges_faced: formData.challenges_faced,
        solutions_implemented: formData.solutions_implemented,
        project_progress: formData.project_progress,
        github_link: formData.github_link,
        demo_link: formData.demo_link,
        next_week_plan: formData.next_week_plan,
        student_reflection: formData.student_reflection,
        hours_worked: Number(formData.hours_worked) || 40,
        proof_links: formData.proof_links.filter(l => l.trim()),
        status,
      };

      if (editingReportId) {
        await api.patch(`/reports/${editingReportId}/`, payload);
        setMessage({ type: 'success', text: `Week ${formData.week_number} report updated and ${status === 'SUBMITTED' ? 'resubmitted for review' : 'saved as draft'}.` });
        setEditingReportId(null);
      } else {
        await api.post('/reports/', payload);
        setMessage({ type: 'success', text: `Week ${formData.week_number} report ${status === 'SUBMITTED' ? 'submitted to Coordinator for review!' : 'saved as draft.'}` });
      }

      setFormData({
        week_number: Math.min(8, Number(formData.week_number) + 1),
        tasks_completed: '',
        technical_skills: '',
        learning_outcomes: '',
        challenges_faced: '',
        solutions_implemented: '',
        project_progress: '',
        github_link: '',
        demo_link: '',
        next_week_plan: '',
        student_reflection: '',
        hours_worked: 40,
        proof_links: [],
      });
      fetchReportsAndInternships();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save weekly report.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadForEdit = (r: any) => {
    setEditingReportId(r.id);
    setFormData({
      week_number: r.week_number || 1,
      tasks_completed: r.tasks_completed || '',
      technical_skills: r.technical_skills || '',
      learning_outcomes: r.learning_outcomes || '',
      challenges_faced: r.challenges_faced || '',
      solutions_implemented: r.solutions_implemented || '',
      project_progress: r.project_progress || '',
      github_link: r.github_link || '',
      demo_link: r.demo_link || '',
      next_week_plan: r.next_week_plan || '',
      student_reflection: r.student_reflection || '',
      hours_worked: r.hours_worked || 40,
      proof_links: Array.isArray(r.proof_links) ? r.proof_links : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReport = async (id: number) => {
    try {
      await api.delete('/reports/' + id + '/');
      setMessage({ type: 'success', text: 'Report deleted.' });
      fetchReportsAndInternships();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete report' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="badge badge-success">Approved</span>;
      case 'NEEDS_IMPROVEMENT': return <span className="badge badge-warning">Needs Improvement</span>;
      case 'SUBMITTED': return <span className="badge badge-published">Submitted for Review</span>;
      case 'DRAFT': return <span className="badge">Draft</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const progressPct = Math.min(100, Math.round((reports.filter(r => r.status !== 'DRAFT').length / 8) * 100));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Weekly Progress Reports & Milestone Tracker</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Submit weekly tasks, skills practiced, learning outcomes, and supporting evidence links for Coordinator evaluation.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '6px 12px', borderRadius: '8px' }}>
            8-Week Progress: {progressPct}% ({reports.filter(r => r.status !== 'DRAFT').length}/8 Weeks)
          </div>
          <button onClick={fetchReportsAndInternships} className="btn btn-outline" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '1rem',
          backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: message.type === 'success' ? '#059669' : '#dc2626',
          fontSize: '14px',
          fontWeight: 500,
          border: '1px solid #d1d5db'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem', alignItems: 'start' }}>
        {/* Left Card: Active Internship + Submitted Reports History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#2563eb" /> Active Internship Details
            </h3>
            {activeInternship ? (
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{activeInternship.role_title || activeInternship.role}</strong>
                  <span className="badge badge-published">{activeInternship.status}</span>
                </div>
                <div style={{ fontSize: '13.5px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                  {activeInternship.organization_name || activeInternship.company}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Duration: {activeInternship.start_date} to {activeInternship.end_date}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterInternship} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '10px' }}>
                  Register your current internship organization to link your weekly progress reports:
                </p>
                <div className="form-group">
                  <label className="form-label">Host Organization / Company *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Tech Mahindra / Persistent Systems"
                    value={newInternOrg}
                    onChange={(e) => setNewInternOrg(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Internship Role Title *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Full Stack Developer Intern"
                    value={newInternRole}
                    onChange={(e) => setNewInternRole(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Activate Internship
                </button>
              </form>
            )}
          </div>

          {/* Submitted Reports History & Coordinator Feedback */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#2563eb" /> My Submitted Weekly Reports ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b', fontSize: '13px' }}>
                No weekly reports submitted yet. Use the form on the right to submit Week 1.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reports.map((r) => (
                  <div key={r.id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        Week #{r.week_number} — {r.company || r.organization_name}
                      </strong>
                      {getStatusBadge(r.status)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      Submitted: {r.submitted_at || (r.created_at ? r.created_at.split('T')[0] : 'Recent')} • Hours: {r.hours_worked || 40} hrs
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 6px' }}>
                      <strong>Tasks:</strong> {r.tasks_completed}
                    </p>
                    {r.technical_skills && (
                      <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '6px' }}>
                        <strong>Skills Practiced:</strong> {r.technical_skills}
                      </div>
                    )}
                    {(r.coordinator_comments || r.coordinator_comment) && (
                      <div style={{ padding: '8px 12px', backgroundColor: r.status === 'APPROVED' ? '#ecfdf5' : '#fffbeb', borderRadius: '6px', fontSize: '12.5px', color: r.status === 'APPROVED' ? '#065f46' : '#92400e', marginTop: '6px' }}>
                        <strong>Coordinator Feedback (Score: {r.score || (r.coordinator_score ? r.coordinator_score * 10 : 85)}/100):</strong> "{r.coordinator_comments || r.coordinator_comment}"
                        {r.reviewed_by_name && <div style={{ fontSize: '11px', marginTop: '2px' }}>Reviewed by {r.reviewed_by_name}</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {(r.status === 'DRAFT' || r.status === 'NEEDS_IMPROVEMENT') && (
                        <button type="button" onClick={() => handleLoadForEdit(r)} className="btn btn-outline btn-sm" style={{ fontSize: '12px', padding: '3px 10px' }}>
                          Edit &amp; Resubmit
                        </button>
                      )}
                      {r.status === 'DRAFT' && (
                        <button type="button" onClick={() => handleDeleteReport(r.id)} className="btn btn-outline btn-sm" style={{ fontSize: '12px', padding: '3px 10px', color: '#dc2626' }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Submit / Edit Weekly Report Form */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
            {editingReportId ? `Update & Resubmit Week #${formData.week_number} Report` : `Submit Weekly Progress Report (Week #${formData.week_number})`}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Week Number (1–12)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="form-control"
                  value={formData.week_number}
                  onChange={(e) => handleInputChange('week_number', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Hours Worked (0–80)</label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  className="form-control"
                  value={formData.hours_worked}
                  onChange={(e) => handleInputChange('hours_worked', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Tasks Completed *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="What specific engineering tasks did you complete this week?"
                value={formData.tasks_completed}
                onChange={(e) => handleInputChange('tasks_completed', e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Technical Skills Practiced * (Auto-synced to Resume)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Python, React, REST API, SQL, AutoCAD"
                value={formData.technical_skills}
                onChange={(e) => handleInputChange('technical_skills', e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Learning Outcomes *</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Key technical concepts and practical methodologies gained"
                value={formData.learning_outcomes}
                onChange={(e) => handleInputChange('learning_outcomes', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Challenges Faced</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Obstacles encountered"
                  value={formData.challenges_faced}
                  onChange={(e) => handleInputChange('challenges_faced', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Solutions Implemented</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="How you resolved them"
                  value={formData.solutions_implemented}
                  onChange={(e) => handleInputChange('solutions_implemented', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Project Progress & Deliverable Summary</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Status update on current module or project deliverable"
                value={formData.project_progress}
                onChange={(e) => handleInputChange('project_progress', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>GitHub / Code Repository Link</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://github.com/..."
                  value={formData.github_link}
                  onChange={(e) => handleInputChange('github_link', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Live Demo / Evidence URL</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://..."
                  value={formData.demo_link}
                  onChange={(e) => handleInputChange('demo_link', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '4px' }}>Next Week Plan</label>
              <input
                type="text"
                className="form-control"
                placeholder="Planned milestones for upcoming week"
                value={formData.next_week_plan}
                onChange={(e) => handleInputChange('next_week_plan', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button onClick={() => handleSubmitReport('DRAFT')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> Save Draft
            </button>
            <button onClick={() => handleSubmitReport('SUBMITTED')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} disabled={saving}>
              <CheckCircle size={16} /> {saving ? 'Submitting...' : editingReportId ? 'Resubmit for Review' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
