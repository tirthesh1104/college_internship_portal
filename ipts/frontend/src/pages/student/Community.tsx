import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, User, Calendar, ShieldCheck, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface ForumPost {
  id: number;
  author: number;
  author_name: string;
  author_role?: string;
  author_email?: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_pinned?: boolean;
  created_at: string;
}

export const StudentCommunity: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Technical Query');
  const [newTags, setNewTags] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.get('/community/posts/');
      const list = Array.isArray(data) ? data : (data.results || []);
      setPosts(list);
    } catch (err: any) {
      console.error('Failed to load community posts:', err);
      setError(err?.message || 'Could not fetch community discussions from server.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: newTags.trim() || newCategory
      };

      const created: any = await api.post('/community/posts/', payload);
      setPosts([created, ...posts]);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setSuccessMsg('Your discussion has been posted to the community!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to post discussion:', err);
      setError(err?.message || 'Failed to publish post. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;
    try {
      await api.delete(`/community/posts/${id}/`);
      setPosts(posts.filter(p => p.id !== id));
      setSuccessMsg('Post deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setError(err?.message || 'Could not delete post. Only authors or coordinators can delete.');
    }
  };

  const categories = ['ALL', 'Technical Query', 'Interview Prep', 'Project Help', 'Internship Review', 'General Discussion'];

  const filteredPosts = activeCategory === 'ALL' 
    ? posts 
    : posts.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">MITCORER Student Community & Forum</h1>
          <p className="page-subtitle">Real-time peer learning, technical queries, interview experiences, and collaborative discussions for registered students.</p>
        </div>
        <button
          onClick={loadPosts}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Discussions
        </button>
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
          <button onClick={loadPosts} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

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
            <label className="form-label">Content & Details *</label>
            <textarea
              required
              rows={4}
              placeholder="Share your technical question, project roadblock, or detailed internship interview questions to help fellow MITCORER students..."
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
          <p style={{ color: 'var(--text-muted)' }}>Loading live discussions from MITCORER Community...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No discussions in this channel yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Be the first student to post an interview question, ask for project guidance, or share advice for your peers.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map((post) => {
            const canDelete = user && (user.id === post.author || user.role === 'ADMIN' || user.role === 'COORDINATOR');
            const formattedDate = post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently';

            return (
              <div key={post.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                      {post.category || 'General Discussion'}
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {post.title}
                    </h2>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecaca', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Delete Discussion"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>

                <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
                  {post.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(post.author_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{post.author_name || 'Registered Student'}</span>
                    {post.author_role && (
                      <span className={`badge ${post.author_role === 'ADMIN' ? 'badge-primary' : post.author_role === 'COORDINATOR' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {post.author_role}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
