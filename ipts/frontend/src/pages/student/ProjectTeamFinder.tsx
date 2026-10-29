import React, { useState } from 'react';
import { UserPlus, Search, Filter, ShieldCheck, Mail, BookOpen, UserCheck, MessageSquare } from 'lucide-react';

interface TeamListing {
  id: number;
  project_title: string;
  lead_name: string;
  department: string;
  academic_year: string;
  description: string;
  open_roles: string[];
  skills_required: string[];
  members_count: number;
  max_members: number;
  status: 'RECRUITING' | 'FULL';
}

export const ProjectTeamFinder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const initialTeams: TeamListing[] = [];

  const [teams, setTeams] = useState<TeamListing[]>(initialTeams);
  const [newTeam, setNewTeam] = useState({
    title: '',
    description: '',
    openRoles: '',
    skills: '',
    maxMembers: 4
  });

  const handleJoin = (teamTitle: string) => {
    setJoinSuccess(`Application request sent to the project lead of "${teamTitle}". They will contact you via your college email.`);
    setTimeout(() => setJoinSuccess(null), 6000);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.title || !newTeam.description) return;

    const created: TeamListing = {
      id: Date.now(),
      project_title: newTeam.title,
      lead_name: 'Current Student',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      description: newTeam.description,
      open_roles: newTeam.openRoles.split(',').map(s => s.trim()).filter(Boolean),
      skills_required: newTeam.skills.split(',').map(s => s.trim()).filter(Boolean),
      members_count: 1,
      max_members: Number(newTeam.maxMembers),
      status: 'RECRUITING'
    };

    setTeams([created, ...teams]);
    setShowCreateModal(false);
    setNewTeam({ title: '', description: '', openRoles: '', skills: '', maxMembers: 4 });
  };

  const filteredTeams = teams.filter(t => 
    t.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.skills_required.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Project Team Finder</h1>
          <p className="page-subtitle">Collaborate with fellow MITCORER engineers on capstone projects, hackathons, and research initiatives.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} />
          Create Team Project
        </button>
      </div>

      {joinSuccess && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={20} color="#059669" />
          <span>{joinSuccess}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search teams by project title or required technical skills (e.g., PyTorch, IoT, LoRaWAN)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Team Cards Grid */}
      {filteredTeams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <UserPlus size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No project teams recruiting yet
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Have an innovative capstone or hackathon idea? Click "Create Team Project" above to post your project scope and recruit student teammates.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredTeams.map((team) => (
          <div key={team.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className={`badge ${team.status === 'RECRUITING' ? 'badge-success' : 'badge-neutral'}`}>
                  {team.status === 'RECRUITING' ? '● Open for Recruiting' : 'Team Full'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {team.members_count} / {team.max_members} Members
                </span>
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {team.project_title}
              </h2>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                {team.description}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Looking for:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {team.open_roles.map((role, idx) => (
                    <span key={idx} style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Tech Stack:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {team.skills_required.map((skill, idx) => (
                    <span key={idx} style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{team.lead_name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.department}</p>
              </div>

              {team.status === 'RECRUITING' ? (
                <button 
                  onClick={() => handleJoin(team.project_title)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  Request to Join
                </button>
              ) : (
                <button disabled className="btn" style={{ fontSize: '0.85rem', padding: '6px 12px', background: '#f3f4f6', color: '#9ca3af' }}>
                  Position Filled
                </button>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Create New Project Team</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Post your technical project idea and recruit talented engineering teammates across departments.
            </p>

            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label className="form-label">Project Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. IoT Railway Track Vibration Monitor"
                  value={newTeam.title}
                  onChange={(e) => setNewTeam({ ...newTeam, title: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project Description & Scope *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Describe your project, engineering objectives, and goals..."
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Roles Needed (comma-separated) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Backend Developer, Circuit Designer"
                  value={newTeam.openRoles}
                  onChange={(e) => setNewTeam({ ...newTeam, openRoles: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Skills (comma-separated) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Python, Django, C++, Embedded C"
                  value={newTeam.skills}
                  onChange={(e) => setNewTeam({ ...newTeam, skills: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Team Members</label>
                <select 
                  value={newTeam.maxMembers}
                  onChange={(e) => setNewTeam({ ...newTeam, maxMembers: Number(e.target.value) })}
                  className="form-control"
                >
                  <option value={2}>2 Members</option>
                  <option value={3}>3 Members</option>
                  <option value={4}>4 Members</option>
                  <option value={5}>5 Members</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Team Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
