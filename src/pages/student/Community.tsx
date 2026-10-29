import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, User, Calendar, ShieldCheck, RefreshCw, AlertTriangle,
  Trash2, Edit2, Flag, Pin, Users, Search
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface ForumReply {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

interface ForumPost {
  id: number;
  author: number;
  author_name: string;
  author_role?: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_pinned?: boolean;
  is_announcement?: boolean;
  reported_count?: number;
  replies?: ForumReply[];
  created_at: string;
}

export const StudentCommunity: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';

  const [tab, setTab] = useState<'DISCUSSIONS' | 'DIRECTORY'>('DISCUSSIONS');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [studentDirectory, setStudentDirectory] = useState<any[]>([]);
  const [dirSearch, setDirSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Technical Query');
  const [newTags, setNewTags] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  const loadCommunity = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [postsData, dirData]: any = await Promise.all([
        api.get('/community/posts/'),
        api.get('/community/students/').catch(() => [])
      ]);
      const list = Array.isArray(postsData) ? postsData : postsData?.results || [];
      setPosts(list);
      setStudentDirectory(Array.isArray(dirData) ? dirData : []);
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Could not fetch community discussions from server.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunity(false);
    const poll = setInterval(() => loadCommunity(true), 10000);
    return () => clearInterval(poll);
  }, [loadCommunity]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/community/posts/', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: newTags.trim() || newCategory
      });
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      showSuccess('Your discussion has been posted to the community!');
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    try {
      await api.patch(`/community/posts/${postId}/`, {
        title: editTitle.trim(),
        content: editContent.trim()
      });
      setEditingId(null);
      showSuccess('Discussion updated.');
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not update post.');
    }
  };

  const handleDeletePost = async (id: number) => {
    try {
      await api.delete(`/community/posts/${id}/`);
      showSuccess('Post deleted.');
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not delete post.');
    }
  };

  const handleAddReply = async (postId: number) => {
    const content = (replyText[postId] || '').trim();
    if (!content) return;
    try {
      await api.post(`/community/posts/${postId}/replies/`, { content });
      setReplyText((prev) => ({ ...prev, [postId]: '' }));
      showSuccess('Reply posted and author notified!');
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not post reply.');
    }
  };

  const handleDeleteReply = async (postId: number, replyId: number) => {
    try {
      await api.delete(`/community/posts/${postId}/replies/${replyId}/`);
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not delete reply.');
    }
  };

  const handleReportPost = async (postId: number) => {
    try {
      await api.post(`/community/posts/${postId}/report/`, { reason: 'Flagged by member for coordinator review' });
      showSuccess('Post reported to Coordinators and Admins for moderation.');
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not report post.');
    }
  };

  const handlePinPost = async (postId: number) => {
    try {
      await api.post(`/community/posts/${postId}/pin/`, {});
      await loadCommunity(true);
    } catch (err: any) {
      setError(err?.message || 'Could not pin post.');
    }
  };

  const categories = ['ALL', 'Technical Query', 'Interview Prep', 'Project Help', 'Internship Review', 'General Discussion'];

  const filteredPosts = activeCategory === 'ALL'
    ? posts
    : posts.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());

  const filteredStudents = studentDirectory.filter((s) => {
    const q = dirSearch.toLowerCase().trim();
    return (
      !q ||
      String(s.display_name || '').toLowerCase().includes(q) ||
      String(s.department || '').toLowerCase().includes(q) ||
      String(s.academic_year || '').toLowerCase().includes(q) ||
      (s.skills || []).some((sk: string) => sk.toLowerCase().includes(q))
    );
  });

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">MITCORER Student Community &amp; Peer Directory</h1>
          <p className="page-subtitle">
            Real-time peer learning, threaded discussions, and registered student directory (synchronized with the Homepage Community).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('DISCUSSIONS')}
            className={`btn ${tab === 'DISCUSSIONS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <MessageSquare size={16} /> Discussions ({posts.length})
          </button>
          <button
            onClick={() => setTab('DIRECTORY')}
            className={`btn ${tab === 'DIRECTORY' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Users size={16} /> Registered Student Community ({studentDirectory.length})
          </button>
          <button
            onClick={() => loadCommunity(false)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={20} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={() => loadCommunity(false)} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {tab === 'DIRECTORY' ? (
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="Search registered students by name, department, academic year, or skill..."
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {filteredStudents.map((m) => (
              <div key={m.id} className="card">
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{m.display_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px' }}>
                  {m.department} • {m.academic_year}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Domain: {m.target_domain || 'Engineering'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {(m.skills || []).map((sk: string, idx: number) => (
                    <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem' }}>{sk}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
              Start a New Community Discussion
            </h3>
            <form onSubmit={handlePostSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Topic Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Questions asked in Bosch Embedded Software interview round..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="form-control"
                  >
                    <option value="Technical Query">Technical Query</option>
                    <option value="Interview Prep">Interview Prep</option>
                    <option value="Project Help">Project Help</option>
                    <option value="Internship Review">Internship Review</option>
                    <option value="General Discussion">General Discussion</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Content &amp; Details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your technical question, project roadblock, or internship update..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={15} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Posting as: <strong>{user?.name || 'Authenticated Student'}</strong> ({user?.role || 'STUDENT'})
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !newTitle.trim() || !newContent.trim()}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? 'Publishing...' : 'Post to Community'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading live discussions...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
              <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No discussions in this channel yet</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredPosts.map((post) => {
                const isOwner = user && Number(user.id) === Number(post.author);
                const canDelete = isOwner || isStaff;
                const formattedDate = post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently';

                return (
                  <div key={post.id} className="card" style={{ padding: '1.25rem', borderLeft: post.is_pinned ? '4px solid #2563eb' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                          {post.is_pinned && <span className="badge badge-published" style={{ fontSize: '0.7rem' }}>Pinned</span>}
                          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {post.category || 'General Discussion'}
                          </span>
                        </div>
                        {editingId === post.id ? (
                          <div style={{ marginTop: '6px' }}>
                            <input type="text" className="form-control" style={{ marginBottom: '6px' }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            <textarea rows={2} className="form-control" style={{ marginBottom: '6px' }} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleSaveEdit(post.id)} className="btn btn-primary btn-sm">Save</button>
                              <button onClick={() => setEditingId(null)} className="btn btn-outline btn-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {post.title}
                          </h2>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {isOwner && editingId !== post.id && (
                          <button
                            onClick={() => {
                              setEditingId(post.id);
                              setEditTitle(post.title);
                              setEditContent(post.content);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                        {!isOwner && (
                          <button
                            onClick={() => handleReportPost(post.id)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', color: '#d97706', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Flag size={12} /> Report
                          </button>
                        )}
                        {isStaff && (
                          <button
                            onClick={() => handlePinPost(post.id)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Pin size={12} /> {post.is_pinned ? 'Unpin' : 'Pin'}
                          </button>
                        )}
                      </div>
                    </div>

                    {editingId !== post.id && (
                      <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
                        {post.content}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                          {(post.author_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{post.author_name || 'Registered Student'}</span>
                        {post.author_role && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {post.author_role}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Threaded Replies */}
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                      {(post.replies || []).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', paddingLeft: '12px', borderLeft: '2px solid #cbd5e1' }}>
                          {(post.replies || []).map((rep) => (
                            <div key={rep.id} style={{ fontSize: '0.82rem', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                <strong>{rep.author_name}</strong> ({rep.author_role}): {rep.content}
                              </div>
                              {(Number(user?.id) === Number(rep.author_id) || isStaff) && (
                                <button
                                  onClick={() => handleDeleteReply(post.id, rep.id)}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.82rem', height: '32px' }}
                          placeholder="Reply to this discussion..."
                          value={replyText[post.id] || ''}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddReply(post.id);
                            }
                          }}
                        />
                        <button type="button" onClick={() => handleAddReply(post.id)} className="btn btn-outline btn-sm">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
