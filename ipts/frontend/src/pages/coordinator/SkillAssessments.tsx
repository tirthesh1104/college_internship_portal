import React, { useState, useEffect, useCallback } from 'react';
import { Award, Search, CheckCircle2, User, FileText, Plus, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface SkillEvaluation {
  id: number;
  student_name: string;
  roll_number: string;
  department: string;
  skill_name: string;
  initial_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  assessed_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  score: number;
  practical_evidence: string;
  assessed_at: string;
  notes: string;
}

export const CoordinatorSkillAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<SkillEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_name: '',
    roll_number: '',
    department: '',
    skill_name: '',
    initial_level: 'BEGINNER' as const,
    assessed_level: 'INTERMEDIATE' as const,
    score: 85,
    practical_evidence: '',
    notes: ''
  });

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SkillEvaluation[]>('/assessments/records/');
      const list = Array.isArray(data) ? data : [];
      setAssessments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skill_name || !formData.practical_evidence) return;

    try {
      await api.post('/assessments/records/', formData);
      setShowModal(false);
      setSuccess('Skill assessment recorded successfully.');
      loadAssessments();
      setFormData({
        student_name: '',
        roll_number: '',
        department: '',
        skill_name: '',
        initial_level: 'BEGINNER',
        assessed_level: 'INTERMEDIATE',
        score: 85,
        practical_evidence: '',
        notes: ''
      });
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setSuccess(`Failed to record assessment: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Technical Skill Assessments & Verification</h1>
          <p className="page-subtitle">Evaluate practical engineering competencies backed by project evidence, weekly reports, and coordinator evaluations.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadAssessments}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Record Practical Assessment
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={loadAssessments} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading skill assessments...</p>
        </div>
      ) : (
        <>
          {/* Evaluations Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {assessments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Award size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No skill assessments recorded</h3>
                <p style={{ color: 'var(--text-muted)' }}>No practical skill evaluations have been recorded yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Skill Evaluated</th>
                <th>Skill Progression</th>
                <th>Score</th>
                <th>Practical Evidence & Deliverable</th>
                <th>Evaluation Date</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.roll_number}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{a.skill_name}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                      <span className="badge badge-neutral">{a.initial_level}</span>
                      <span>→</span>
                      <span className="badge badge-success">{a.assessed_level}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{a.score}%</span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                      {a.practical_evidence}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note: {a.notes}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {a.assessed_at}
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* Record Skill Assessment Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Record Practical Skill Assessment
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Certify a student's real-world skill level based on demonstrable code, circuits, or project milestones.
            </p>

            <form onSubmit={handleAddAssessment}>
              <div className="form-group">
                <label className="form-label">Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter student name"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter roll number"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Skill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PyTorch, LoRaWAN Telemetry, Django REST"
                  value={formData.skill_name}
                  onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Initial Level</label>
                  <select 
                    value={formData.initial_level}
                    onChange={(e) => setFormData({ ...formData, initial_level: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assessed Level</label>
                  <select 
                    value={formData.assessed_level}
                    onChange={(e) => setFormData({ ...formData, assessed_level: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Score (out of 100)</label>
                  <input 
                    type="number" 
                    min={50} 
                    max={100}
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Practical Evidence Verified *</label>
                <textarea 
                  rows={2}
                  required
                  placeholder="Reference commit, hardware test, or report evidence examined..."
                  value={formData.practical_evidence}
                  onChange={(e) => setFormData({ ...formData, practical_evidence: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coordinator Feedback Note</label>
                <input 
                  type="text" 
                  placeholder="Brief note for student Career Passport record..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Verified Skill Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
