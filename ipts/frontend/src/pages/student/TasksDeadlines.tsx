import React, { useEffect, useState } from 'react';
import { CheckSquare, Clock, Calendar, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { ImprovementTask } from '../../types';
import { api } from '../../services/api';

export const TasksDeadlines: React.FC = () => {
  const [tasks, setTasks] = useState<ImprovementTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<ImprovementTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = () => {
    setLoading(true);
    api.get<ImprovementTask[] | { results: ImprovementTask[] }>('/tasks/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setTasks(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    setSubmitting(true);

    try {
      await api.post(`/tasks/${activeTask.id}/mark_completed/`, {
        student_notes: completionNotes,
      });
      setActiveTask(null);
      setCompletionNotes('');
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Improvement Tasks & Deadlines</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Action items assigned by Coordinators to address feedback, refine project code, or prepare deliverables.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <CheckSquare size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>All caught up!</h3>
          <p style={{ fontSize: '14px' }}>You have no pending improvement tasks at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                      {task.title}
                    </h3>
                    <span className={`badge ${task.status === 'COMPLETED' ? 'badge-completed' : 'badge-pending_approval'}`}>
                      {task.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    Assigned by: <strong>{task.assigned_by_name}</strong> • Linked to {task.organization_name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> Due: {task.due_date}
                  </span>
                  {task.status !== 'COMPLETED' && (
                    <button 
                      onClick={() => { setActiveTask(task); setCompletionNotes(''); }} 
                      className="btn btn-primary btn-sm"
                    >
                      Mark Done
                    </button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '12px' }}>
                {task.description}
              </p>

              {task.student_notes && (
                <div style={{ backgroundColor: '#ecfdf5', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#065f46', border: '1px solid #a7f3d0' }}>
                  <strong>Your Completion Note:</strong> {task.student_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completion Modal */}
      {activeTask && (
        <div className="modal-overlay" onClick={() => setActiveTask(null)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Complete Task
              </h2>
              <button onClick={() => setActiveTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb', marginBottom: '12px' }}>
              {activeTask.title}
            </div>

            <form onSubmit={handleComplete}>
              <div className="form-group">
                <label className="form-label">Resolution / Evidence Notes</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Explain how you completed this improvement item or paste evidence link..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTask(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Confirm Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
