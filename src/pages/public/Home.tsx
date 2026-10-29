import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Briefcase, TrendingUp, ArrowRight, Award, Users, Clock, Building2,
  MessageSquare, Search, Send, Edit2, Trash2, Flag, Pin, ShieldAlert, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Opportunity } from '../../types';
import { api } from '../../services/api';
import { Logo } from '../../components/common/Logo';
import { HeroBackground } from '../../components/common/HeroBackground';
import { useAuth } from '../../hooks/useAuth';

interface PublicStudentMember {
  id: number;
  display_name: string;
  department: string;
  department_name: string;
  branch: string;
  academic_year: string;
  skills: string[];
  target_domain: string;
  active_internship_org: string | null;
}

interface CommunityReply {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

interface CommunityPostItem {
  id: number;
  author: number;
  author_name: string;
  author_role?: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  is_pinned?: boolean;
  is_announcement?: boolean;
  reported_count?: number;
  replies?: CommunityReply[];
  created_at: string;
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMousePos({ x, y });
  };

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Community Directory & Discussion State
  const [communityTab, setCommunityTab] = useState<'DIRECTORY' | 'DISCUSSIONS'>('DIRECTORY');
  const [studentMembers, setStudentMembers] = useState<PublicStudentMember[]>([]);
  const [dirSearch, setDirSearch] = useState('');
  const [dirDept, setDirDept] = useState('ALL');
  const [dirYear, setDirYear] = useState('ALL');

  const [posts, setPosts] = useState<CommunityPostItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Technical Query');
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});
  const [communityMsg, setCommunityMsg] = useState<string | null>(null);

  const fetchCommunityData = useCallback(async () => {
    try {
      const [studentsRes, postsRes] = await Promise.all([
        api.get<PublicStudentMember[]>('/community/students/').catch(() => []),
        api.get<CommunityPostItem[]>('/community/posts/').catch(() => [])
      ]);
      if (Array.isArray(studentsRes)) setStudentMembers(studentsRes);
      if (Array.isArray(postsRes)) setPosts(postsRes);
    } catch {
      // silent refresh
    }
  }, []);

  useEffect(() => {
    api.get<Opportunity[] | { results: Opportunity[] }>('/opportunities/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const published = list.filter((o: any) => !o.status || o.status === 'PUBLISHED');
        setOpportunities(published.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchCommunityData();
    const poll = setInterval(fetchCommunityData, 10000);
    return () => clearInterval(poll);
  }, [fetchCommunityData]);

  const showCommunityNotice = (msg: string) => {
    setCommunityMsg(msg);
    setTimeout(() => setCommunityMsg(null), 4000);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newContent.trim()) return;
    try {
      await api.post('/community/posts/', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: isAnnouncement ? 'Official Announcement' : newCategory,
        is_announcement: isAnnouncement && isStaff,
        is_pinned: isAnnouncement && isStaff
      });
      setNewTitle('');
      setNewContent('');
      setIsAnnouncement(false);
      showCommunityNotice('Discussion published to the MITCORER Community!');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Could not post message.');
    }
  };

  const handleSaveEditPost = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    try {
      await api.patch(`/community/posts/${postId}/`, {
        title: editTitle.trim(),
        content: editContent.trim()
      });
      setEditingPostId(null);
      showCommunityNotice('Your post has been updated.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Failed to update post.');
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await api.delete(`/community/posts/${postId}/`);
      showCommunityNotice('Discussion removed.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Failed to delete post.');
    }
  };

  const handleAddReply = async (postId: number) => {
    const content = (replyTextMap[postId] || '').trim();
    if (!user || !content) return;
    try {
      await api.post(`/community/posts/${postId}/replies/`, { content });
      setReplyTextMap((prev) => ({ ...prev, [postId]: '' }));
      showCommunityNotice('Reply posted and author notified.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Failed to post reply.');
    }
  };

  const handleDeleteReply = async (postId: number, replyId: number) => {
    try {
      await api.delete(`/community/posts/${postId}/replies/${replyId}/`);
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Failed to delete reply.');
    }
  };

  const handleReportPost = async (postId: number) => {
    if (!user) return;
    try {
      await api.post(`/community/posts/${postId}/report/`, { reason: 'Flagged by community member for review' });
      showCommunityNotice('Post reported to Coordinators and Admins for moderation.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Could not report post.');
    }
  };

  const handlePinPost = async (postId: number) => {
    try {
      await api.post(`/community/posts/${postId}/pin/`, {});
      showCommunityNotice('Updated post pin status.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Could not pin post.');
    }
  };

  const handleModeratePost = async (postId: number, action: 'REMOVE' | 'DISMISS_REPORTS') => {
    try {
      await api.post(`/community/posts/${postId}/moderate/`, { action, reason: 'Moderated by staff' });
      showCommunityNotice(action === 'REMOVE' ? 'Post moderated and hidden.' : 'Reports cleared.');
      await fetchCommunityData();
    } catch (err: any) {
      showCommunityNotice(err?.message || 'Moderation action failed.');
    }
  };

  const filteredMembers = studentMembers.filter((m) => {
    const q = dirSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.display_name.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.academic_year.toLowerCase().includes(q) ||
      (m.skills || []).some((sk) => sk.toLowerCase().includes(q));
    const matchesDept = dirDept === 'ALL' || m.department === dirDept;
    const matchesYear = dirYear === 'ALL' || m.academic_year === dirYear;
    return matchesSearch && matchesDept && matchesYear;
  });

  return (
    <div>
      {/* Hero Section */}
      <section 
        className="hero-banner" 
        onMouseMove={handleHeroMouseMove}
        style={{
          color: '#ffffff',
          padding: '80px 24px 100px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <HeroBackground mousePos={mousePos} />

        {/* Interactive Floating 3D Particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          <motion.div
            animate={{
              x: mousePos.x * 0.04,
              y: mousePos.y * 0.04,
              rotate: mousePos.x * 0.02
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(6, 182, 212, 0.15))',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.25)'
            }}
          />
          <motion.div
            animate={{
              x: mousePos.x * -0.06,
              y: mousePos.y * -0.06,
              rotate: mousePos.x * -0.03
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '12%',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(37, 99, 235, 0.1) 70%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 12px 36px rgba(6, 182, 212, 0.3)'
            }}
          />
          <motion.div
            animate={{
              x: mousePos.x * 0.08,
              y: mousePos.y * 0.08,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 90 }}
            style={{
              position: 'absolute',
              top: '25%',
              right: '20%',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.2))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transform: 'rotate(45deg)'
            }}
          />
          <motion.div
            animate={{
              x: mousePos.x * -0.05,
              y: mousePos.y * -0.05,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '18%',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.15))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(6px)'
            }}
          />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <Logo width={110} height={110} style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))' }} />
          </div>

          <div
            className="home-college-header"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 28px',
              borderRadius: '9999px', marginBottom: '24px', maxWidth: '100%',
              color: '#FFFFFF'
            }}
          >
            <img
              src="/assets/aistudio/mitcorer_logo_transparent.png?v=white"
              alt="MAEER's MIT College of Railway Engineering & Research, Barshi"
              className="home-college-header-img"
              style={{
                width: '100%',
                maxWidth: '520px',
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
            />
          </div>

          <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px', letterSpacing: '-0.5px', color: '#ffffff' }}>
            Empowering Careers Through <span style={{ color: '#60a5fa' }}>Verified Internships</span> &amp; Practical Performance
          </h1>

          <p style={{ fontSize: '17px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '750px', margin: '0 auto 36px' }}>
            A unified college hub connecting students, Training &amp; Placement coordinators, and industry partners. Track weekly progress, verify engineering skills, review evidence, and build accredited credentials.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/opportunities" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px', backgroundColor: '#2563eb' }}>
              Explore Opportunities <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: '15px' }}>
              Student Self-Registration
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Highlights / Stats Banner */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ maxWidth: '1100px', margin: '-40px auto 60px', padding: '0 20px', position: 'relative', zIndex: 10 }}
      >
        <div className="card card-3d" style={{
          backgroundColor: 'var(--bg-card)', borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
          padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>100%</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Centralized Tracking</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>MySQL</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Secure Relational DB</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706' }}>Weekly</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Progress &amp; Evidence Reports</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed' }}>QR Verified</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Accredited Certificates</div>
          </div>
        </div>
      </motion.section>

      {/* Core Workflow Pillars */}
      <motion.section 
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '0 24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Comprehensive Performance Tracking Ecosystem
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto', fontSize: '15px' }}>
            From verified opportunity discovery to supervisor feedback, evidence review, and Career Passport compilation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          <div className="card card-3d" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Briefcase size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Centralized Opportunities</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Both Admin and Coordinators add verified internships with multi-tier approval workflows. All eligible students browse published positions in one shared portal.
            </p>
          </div>

          <div className="card card-3d" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Weekly Progress &amp; Evidence</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Students record weekly tasks, technical skills learned, GitHub repos, and demo proofs. Coordinators provide direct constructive feedback, scores, and improvement tasks.
            </p>
          </div>

          <div className="card card-3d" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Award size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Verified Skills &amp; Passport</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Assessments evaluate skill progression from Beginner to Advanced with practical evidence. Students generate a Digital Career Passport for placement interviews.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Featured Opportunities Section */}
      <motion.section 
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        style={{ backgroundColor: 'var(--bg-card)', padding: '70px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Latest Published Opportunities
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Approved by College T&amp;P Cell for active student applications
              </p>
            </div>
            <Link to="/opportunities" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading opportunities...</div>
          ) : opportunities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No published opportunities currently available. Check back soon.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {opportunities.map((opp: any) => (
                <div key={opp.id} className="card card-3d" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="badge badge-published">{opp.opportunity_type}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Deadline: {opp.application_deadline ? String(opp.application_deadline).split('T')[0] : opp.deadline || 'Open'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {opp.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 500 }}>
                      <Building2 size={15} color="var(--primary)" /> {opp.organization}
                    </div>

                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {opp.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {String(opp.required_skills || 'Engineering')
                        .split(',')
                        .slice(0, 3)
                        .map((s, idx) => (
                          <span key={idx} style={{ fontSize: '11.5px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                            {s.trim()}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                      {opp.stipend || opp.stipend_amount || 'Stipend Offered'}
                    </div>
                    <Link to={`/opportunities?id=${opp.id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>


      {/* HOMEPAGE COMMUNITY SECTION */}
      <section id="community" style={{ backgroundColor: 'var(--bg-main)', padding: '70px 24px 90px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-published" style={{ marginBottom: '8px', display: 'inline-block' }}>
                MITCORER Campus Network
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                MITCORER Student &amp; Faculty Community Hub
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', margin: 0 }}>
                Explore registered engineering peers by department, year &amp; skills, and collaborate in moderated campus discussions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCommunityTab('DIRECTORY')}
                className={`btn ${communityTab === 'DIRECTORY' ? 'btn-primary' : 'btn-outline'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={16} /> Registered Student Community ({studentMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setCommunityTab('DISCUSSIONS')}
                className={`btn ${communityTab === 'DISCUSSIONS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageSquare size={16} /> Community Discussions ({posts.length})
              </button>
              <button
                type="button"
                onClick={fetchCommunityData}
                className="btn btn-outline btn-sm"
                title="Refresh community feed"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {communityMsg && (
            <div className="card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
              <CheckCircle2 size={18} color="#059669" />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{communityMsg}</span>
            </div>
          )}

          {communityTab === 'DIRECTORY' ? (
            /* A. REGISTERED STUDENT COMMUNITY DIRECTORY (Public-Safe Fields Only) */
            <div>
              <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '38px' }}
                    placeholder="Search registered students by name, department, year, or skill..."
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                  />
                </div>
                <select className="form-control" style={{ width: 'auto' }} value={dirDept} onChange={(e) => setDirDept(e.target.value)}>
                  <option value="ALL">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="E&TC">E&amp;TC</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
                <select className="form-control" style={{ width: 'auto' }} value={dirYear} onChange={(e) => setDirYear(e.target.value)}>
                  <option value="ALL">All Academic Years</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2028-2029">2028-2029</option>
                  <option value="2029-2030">2029-2030</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No registered student profiles match your current filter.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '18px' }}>
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="card card-3d" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '16px', flexShrink: 0
                          }}>
                            {(member.display_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {member.display_name}
                            </h3>
                            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                              {member.department} • {member.academic_year}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '10px' }}>
                          <strong>Domain:</strong> {member.target_domain || 'Software & Core Engineering'}
                        </div>

                        {member.active_internship_org && (
                          <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginBottom: '10px' }}>
                            ● Intern at {member.active_internship_org}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {(member.skills || []).slice(0, 6).map((sk, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* B. COMMUNITY DISCUSSION & THREADED REPLIES */
            <div>
              {user ? (
                <div className="card" style={{ marginBottom: '24px', padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#2563eb" />
                    Post a Question, Internship Update, or Discussion ({user.name} — {user.role})
                  </h3>
                  <form onSubmit={handleCreatePost}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="Discussion title or question..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                      <select className="form-control" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        <option value="Technical Query">Technical Query</option>
                        <option value="Internship Update">Internship Update</option>
                        <option value="Interview Prep">Interview Prep</option>
                        <option value="Project Collaboration">Project Collaboration</option>
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      required
                      className="form-control"
                      placeholder="Write your message, question, or announcement..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      style={{ marginBottom: '12px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      {isStaff ? (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isAnnouncement}
                            onChange={(e) => setIsAnnouncement(e.target.checked)}
                          />
                          Pin as Official Announcement &amp; Notify Students
                        </label>
                      ) : <span />}
                      <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={14} /> Publish Post
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: '24px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <span style={{ fontSize: '14px', color: '#1e40af', fontWeight: 500 }}>
                    Sign in as a registered Student, Coordinator, or Admin to post questions and reply in threads.
                  </span>
                  <Link to="/login" className="btn btn-primary btn-sm">
                    Sign In to Participate
                  </Link>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {posts.map((post) => {
                  const isOwner = user && Number(user.id) === Number(post.author);
                  const canEditOrDelete = isOwner || isStaff;

                  return (
                    <div
                      key={post.id}
                      className="card"
                      style={{
                        padding: '20px 24px',
                        borderLeft: post.is_pinned ? '4px solid #2563eb' : undefined
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            {post.is_pinned && (
                              <span className="badge badge-published" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Pin size={11} /> Pinned
                              </span>
                            )}
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>
                              {post.category || 'Discussion'}
                            </span>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                              {post.author_name}
                            </span>
                            <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                              {post.author_role || 'STUDENT'}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                              • {post.created_at ? new Date(post.created_at).toLocaleString() : 'Recent'}
                            </span>
                          </div>

                          {editingPostId === post.id ? (
                            <div style={{ marginTop: '8px' }}>
                              <input
                                type="text"
                                className="form-control"
                                style={{ marginBottom: '6px' }}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                              />
                              <textarea
                                rows={2}
                                className="form-control"
                                style={{ marginBottom: '6px' }}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleSaveEditPost(post.id)} className="btn btn-primary btn-sm">Save</button>
                                <button onClick={() => setEditingPostId(null)} className="btn btn-outline btn-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '4px 0 6px' }}>
                                {post.title}
                              </h3>
                              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                                {post.content}
                              </p>
                            </>
                          )}
                        </div>

                        {user && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {isOwner && editingPostId !== post.id && (
                              <button
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditTitle(post.title);
                                  setEditContent(post.content);
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '11.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Edit2 size={11} /> Edit
                              </button>
                            )}
                            {canEditOrDelete && (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '11.5px', padding: '3px 8px', color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            )}
                            {!isOwner && (
                              <button
                                onClick={() => handleReportPost(post.id)}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '11.5px', padding: '3px 8px', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                title="Report inappropriate content"
                              >
                                <Flag size={11} /> Report
                              </button>
                            )}
                            {isStaff && (
                              <>
                                <button
                                  onClick={() => handlePinPost(post.id)}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '11.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Pin size={11} /> {post.is_pinned ? 'Unpin' : 'Pin'}
                                </button>
                                {(post.reported_count || 0) > 0 && (
                                  <button
                                    onClick={() => handleModeratePost(post.id, 'REMOVE')}
                                    className="btn btn-outline btn-sm"
                                    style={{ fontSize: '11.5px', padding: '3px 8px', color: '#991b1b', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <ShieldAlert size={11} /> Moderate ({post.reported_count})
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Threaded Replies */}
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                        {(post.replies || []).length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', paddingLeft: '12px', borderLeft: '2px solid #e2e8f0' }}>
                            {(post.replies || []).map((rep) => (
                              <div key={rep.id} style={{ fontSize: '13px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div>
                                  <strong>{rep.author_name}</strong>{' '}
                                  <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>{rep.author_role}</span>
                                  <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>
                                    {rep.created_at ? new Date(rep.created_at).toLocaleTimeString() : ''}
                                  </span>
                                  <div style={{ color: '#334155', marginTop: '3px' }}>{rep.content}</div>
                                </div>
                                {user && (Number(user.id) === Number(rep.author_id) || isStaff) && (
                                  <button
                                    onClick={() => handleDeleteReply(post.id, rep.id)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {user && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '13px', padding: '6px 12px', height: '34px' }}
                              placeholder="Write a reply in this thread..."
                              value={replyTextMap[post.id] || ''}
                              onChange={(e) => setReplyTextMap((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddReply(post.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReply(post.id)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                            >
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
