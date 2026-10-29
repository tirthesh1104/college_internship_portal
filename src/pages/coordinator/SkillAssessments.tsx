import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, Search, CheckCircle2, Plus, RefreshCw, AlertTriangle, Edit2, Eye, User } from 'lucide-react';
import { api, subscribeToLiveSync } from '../../services/api';

interface SkillEvaluation {
  id: number;
  student?: number;
  student_id?: number;
  student_name: string;
  roll_number: string;
  department: string;
  skill_name: string;
  category?: string;
  skill_category?: string;
  initial_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  assessed_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  current_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  score: number;
  practical_evidence: string;
  assessed_at: string;
  assessment_date?: string;
  assessed_by_name?: string;
  notes: string;
  coordinator_feedback?: string;
}

export const CoordinatorSkillAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<SkillEvaluation[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<SkillEvaluation | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_id: '' as string | number,
    student_name: '',
    roll_number: '',
    department: 'CSE',
    skill_name: '',
    category: 'Technical',
    initial_level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    assessed_level: 'INTERMEDIATE' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    score: 85,
    practical_evidence: '',
    notes: ''
  });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [assessData, studentData] = await Promise.all([
        api.get<SkillEvaluation[]>('/assessments/records/'),
        api.get<any[]>('/reports/staff-students-list/').catch(() => [])
      ]);
      setAssessments(Array.isArray(assessData) ? assessData : ((assessData as any)?.results || []));
      setStudents(Array.isArray(studentData) ? studentData : ((studentData as any)?.results || []));
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    return subscribeToLiveSync(() => loadData(true), 8000);
  }, [loadData]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      student_id: '',
      student_name: '',
      roll_number: '',
      department: 'CSE',
      skill_name: '',
      category: 'Technical',
      initial_level: 'BEGINNER',
      assessed_level: 'INTERMEDIATE',
      score: 85,
      practical_evidence: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (a: SkillEvaluation) => {
    setEditingId(a.id);
    setFormData({
      student_id: a.student_id || a.student || '',
      student_name: a.student_name || '',
      roll_number: a.roll_number || '',
      department: a.department || 'CSE',
      skill_name: a.skill_name || '',
      category: a.category || a.skill_category || 'Technical',
      initial_level: a.initial_level || 'BEGINNER',
      assessed_level: a.assessed_level || a.current_level || 'INTERMEDIATE',
      score: Number(a.score ?? 85),
      practical_evidence: a.practical_evidence || '',
      notes: a.notes || a.coordinator_feedback || ''
    });
    setShowModal(true);
  };

  const handleSelectStudent = (studentIdStr: string) => {
    if (!studentIdStr) {
      setFormData({ ...formData, student_id: '' });
      return;
    }
    const found = students.find((s) => String(s.id) === studentIdStr);
    if (found) {
      setFormData({
        ...formData,
        student_id: found.id,
        student_name: found.name || '',
        roll_number: found.roll_number || '',
        department: found.department_code || 'CSE'
      });
    }
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.skill_name.trim() || !formData.practical_evidence.trim()) {
      setError('Skill name and practical evidence are required.');
      return;
    }

    try {
      if (editingId) {
        await api.patch(`/assessments/records/${editingId}/`, formData);
        setSuccess(`Updated skill assessment for ${formData.student_name} (${formData.skill_name}).`);
      } else {
        await api.post('/assessments/records/', formData);
        setSuccess(`Skill assessment recorded for ${formData.student_name} (${formData.skill_name}).`);
      }
      setShowModal(false);
      setEditingId(null);
      await loadData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to save assessment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(a.student_name || '').toLowerCase().includes(q) ||
      String(a.roll_number || '').toLowerCase().includes(q) ||
      String(a.skill_name || '').toLowerCase().includes(q) ||
      String(a.practical_evidence || '').toLowerCase().includes(q);
    const matchesDept =
      deptFilter === 'ALL' ||
      String(a.department || '').toUpperCase().includes(deptFilter.toUpperCase());
    const matchesLevel = levelFilter === 'ALL' || a.assessed_level === levelFilter;
    return matchesSearch && matchesDept && matchesLevel;
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Technical Skill Assessments &amp; Verification</h1>
          <p className="page-subtitle">
            Evaluate practical engineering competencies backed by project evidence, weekly reports, and coordinator evaluations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Record Practical Assessment
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by student name, roll number, skill, or evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="E&TC">E&amp;TC</option>
          <option value="MECH">MECH</option>
          <option value="CIVIL">CIVIL</option>
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="ALL">All Assessed Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => loadData(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredAssessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Award size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No skill assessments match your filter</h3>
              <p style={{ color: 'var(--text-muted)' }}>Click "Record Practical Assessment" to add a verified student skill evaluation.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Skill &amp; Category</th>
                    <th>Skill Progression</th>
                    <th>Score</th>
                    <th>Practical Evidence &amp; Deliverable</th>
                    <th>Evaluation Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {a.roll_number} • {a.department || 'CSE'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{a.skill_name}</div>
                        {(a.category || a.skill_category) && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.category || a.skill_category}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <span className="badge badge-neutral">{a.initial_level || 'BEGINNER'}</span>
                          <span>→</span>
                          <span className="badge badge-success">{a.assessed_level || a.current_level || 'INTERMEDIATE'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{a.score}%</span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                          {a.practical_evidence}
                        </p>
                        {(a.notes || a.coordinator_feedback) && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Note: {a.notes || a.coordinator_feedback}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {a.assessed_at || a.assessment_date || 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setViewingAssessment(a)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="View Assessment Details"
                          >
                            <Eye size={12} /> View Assessment
                          </button>
                          <button
                            onClick={() => openEditModal(a)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Assessment"
                          >
                            <Edit2 size={12} /> Edit Assessment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record / Edit Skill Assessment Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {editingId ? 'Update Practical Skill Assessment' : 'Record Practical Skill Assessment'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Certify a student's real-world skill level based on demonstrable code, circuits, or project milestones.
            </p>

            <form onSubmit={handleSaveAssessment}>
              {!editingId && students.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Select Registered Student (Auto-fills Details)</label>
                  <select
                    className="form-control"
                    value={formData.student_id}
                    onChange={(e) => handleSelectStudent(e.target.value)}
                  >
                    <option value="">-- Choose a student from directory or enter manually below --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.roll_number} • {st.department_code || 'CSE'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr', gap: '0.75rem' }}>
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
                    placeholder="e.g. CSE2601"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="form-control"
                  >
                    <option value="CSE">CSE</option>
                    <option value="E&TC">E&amp;TC</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Skill Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React, Python, AutoCAD, Embedded C"
                    value={formData.skill_name}
                    onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Skill Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Practical">Practical / Lab</option>
                    <option value="Project">Project Architecture</option>
                    <option value="Problem Solving">Problem Solving</option>
                    <option value="Communication">Technical Communication</option>
                  </select>
                </div>
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
                  <label className="form-label">Score (0 to 100) *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
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
                  {editingId ? 'Save Updated Assessment' : 'Save Verified Skill Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Skill Assessment Modal */}
      {viewingAssessment && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Skill Assessment Record — {viewingAssessment.skill_name}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {viewingAssessment.student_name} ({viewingAssessment.roll_number}) • {viewingAssessment.department || 'CSE'}
                </p>
              </div>
              <button onClick={() => setViewingAssessment(null)} className="btn btn-outline btn-sm">Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '14px' }}>
              <div><strong>Skill Category:</strong> {viewingAssessment.category || viewingAssessment.skill_category || 'Technical'}</div>
              <div><strong>Evaluation Score:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{viewingAssessment.score}%</span></div>
              <div><strong>Initial Level:</strong> {viewingAssessment.initial_level || 'BEGINNER'}</div>
              <div><strong>Assessed Level:</strong> <span className="badge badge-success">{viewingAssessment.assessed_level || viewingAssessment.current_level || 'INTERMEDIATE'}</span></div>
              <div><strong>Assessed Date:</strong> {viewingAssessment.assessed_at || viewingAssessment.assessment_date || 'N/A'}</div>
              <div><strong>Assessed By:</strong> {viewingAssessment.assessed_by_name || 'Faculty Coordinator'}</div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Practical Evidence:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{viewingAssessment.practical_evidence || 'N/A'}</p>
              </div>
              {(viewingAssessment.notes || viewingAssessment.coordinator_feedback) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Coordinator Remarks:</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{viewingAssessment.notes || viewingAssessment.coordinator_feedback}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {(viewingAssessment.student_id || viewingAssessment.student) ? (
                <Link
                  to={`/coordinator/students/${viewingAssessment.student_id || viewingAssessment.student}?tab=skills`}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <User size={14} /> View Student Profile
                </Link>
              ) : <span />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const target = viewingAssessment;
                    setViewingAssessment(null);
                    openEditModal(target);
                  }}
                  className="btn btn-primary"
                >
                  <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
