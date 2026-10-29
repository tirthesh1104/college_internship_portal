import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Clock, Search, Sparkles, 
  CheckCircle2, X, RefreshCw, Send, AlertTriangle, Paperclip,
  PlusCircle, ArrowRight, MessageCircle, Upload, Image as ImageIcon,
  Trash2, Maximize2, ExternalLink, BarChart3, PieChart as PieChartIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { api, subscribeToLiveSync } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { FeedbackItem, FeedbackResponseItem } from '../../pages/feedback/FeedbackSupport';

export const MyFeedbackSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [followUpMsg, setFollowUpMsg] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});
  const [sendingInlineId, setSendingInlineId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Quick Submit Modal State (with Screenshot Upload)
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('BUG');
  const [overallRating, setOverallRating] = useState<number>(5);
  const [affectedPage, setAffectedPage] = useState<string>('Dashboard Overview');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchMyFeedback();
    return subscribeToLiveSync(() => fetchMyFeedback(), 8000);
  }, []);

  const fetchMyFeedback = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const list = await api.get<FeedbackItem[]>('/feedback/');
      setFeedbackList(Array.isArray(list) ? list : []);
      if (selectedItem) {
        const updated = (list || []).find((f: FeedbackItem) => f.id === selectedItem.id);
        if (updated) setSelectedItem(updated);
      }
    } catch (err: any) {
      console.error('Failed to load student feedback records:', err);
      setFetchError('Unable to load feedback submissions right now. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid file format. Please upload a PNG, JPG, JPEG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File size exceeds 5 MB limit. Please choose a smaller screenshot.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingScreenshot(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected image file.'));
        reader.readAsDataURL(file);
      });

      const res = await api.post<{ url: string; filename: string; size: number }>('/feedback/upload/', {
        filename: file.name,
        data: base64Data
      });

      setScreenshotUrl(res.url);
      setScreenshotName(res.filename || file.name);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload screenshot. Please try again.');
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUrl('');
    setScreenshotName('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!subject.trim()) {
      setSubmitError('Please enter a subject headline.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Please provide a description of your feedback or issue.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/feedback/', {
        category,
        overall_rating: overallRating,
        affected_page: affectedPage,
        subject: subject.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl || undefined,
        screenshot_name: screenshotName || undefined,
        attachment_url: screenshotUrl || undefined
      });
      setSubject('');
      setDescription('');
      setScreenshotUrl('');
      setScreenshotName('');
      setShowSubmitModal(false);
      fetchMyFeedback();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const [followUpError, setFollowUpError] = useState<string>('');

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !followUpMsg.trim()) return;

    setSending(true);
    setFollowUpError('');
    try {
      const res = await api.post<{ message: string; feedback: FeedbackItem }>(
        `/feedback/${selectedItem.id}/responses/`,
        { message: followUpMsg.trim() }
      );
      setSelectedItem(res.feedback);
      setFollowUpMsg('');
      fetchMyFeedback();
    } catch (err: any) {
      setFollowUpError(err?.message || 'Failed to send follow-up response.');
    } finally {
      setSending(false);
    }
  };

  const handleInlineReplySubmit = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const text = (inlineDrafts[ticketId] || '').trim();
    if (!text) return;

    setSendingInlineId(ticketId);
    try {
      const res = await api.post<{ message: string; feedback: FeedbackItem }>(
        `/feedback/${ticketId}/responses/`,
        { message: text }
      );
      setInlineDrafts(prev => ({ ...prev, [ticketId]: '' }));
      setFeedbackList(prev => prev.map(f => f.id === ticketId ? res.feedback : f));
      if (selectedItem?.id === ticketId) {
        setSelectedItem(res.feedback);
      }
    } catch (err: any) {
      setFollowUpError(err?.message || 'Failed to send follow-up message.');
    } finally {
      setSendingInlineId(null);
    }
  };

  const categoryChartData = [
    { name: 'General', count: feedbackList.filter(f => f.category === 'GENERAL').length, fill: '#3b82f6' },
    { name: 'Bug / Tech', count: feedbackList.filter(f => f.category === 'BUG').length, fill: '#ef4444' },
    { name: 'Feature Req', count: feedbackList.filter(f => f.category === 'FEATURE_REQUEST').length, fill: '#8b5cf6' },
    { name: 'Improvement', count: feedbackList.filter(f => f.category === 'IMPROVEMENT').length, fill: '#f59e0b' },
    { name: 'UX Feedback', count: feedbackList.filter(f => f.category === 'UX').length, fill: '#10b981' },
  ];

  const rawStatusData = [
    { name: 'Submitted', value: feedbackList.filter(f => f.status === 'SUBMITTED').length, color: '#3b82f6' },
    { name: 'Under Review', value: feedbackList.filter(f => f.status === 'UNDER_REVIEW').length, color: '#f59e0b' },
    { name: 'In Progress', value: feedbackList.filter(f => f.status === 'IN_PROGRESS').length, color: '#8b5cf6' },
    { name: 'Resolved', value: feedbackList.filter(f => f.status === 'RESOLVED').length, color: '#10b981' },
    { name: 'Closed', value: feedbackList.filter(f => f.status === 'CLOSED').length, color: '#64748b' },
  ].filter(s => s.value > 0);

  const statusChartData = rawStatusData.length > 0
    ? rawStatusData
    : [{ name: 'No Tickets Yet', value: 1, color: isDark ? '#334155' : '#cbd5e1' }];

  const filteredList = feedbackList.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchCode = item.feedback_code.toLowerCase().includes(query);
      const matchSubject = item.subject.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      if (!matchCode && !matchSubject && !matchDesc) return false;
    }
    return true;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="badge badge-submitted">Submitted</span>;
      case 'UNDER_REVIEW':
        return <span className="badge badge-warning">Under Review</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-in_progress">In Progress</span>;
      case 'RESOLVED':
        return <span className="badge badge-success">Resolved</span>;
      case 'CLOSED':
        return <span className="badge badge-neutral">Closed</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const isImageAttachment = (url?: string) => {
    if (!url) return false;
    return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/') || url.includes('/uploads/feedback/');
  };

  return (
    <div
      className="card student-feedback-section"
      data-theme-active={theme}
      style={{
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <MessageSquare size={20} style={{ color: '#10b981', flexShrink: 0 }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              My Feedback &amp; Support Tickets
            </h2>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#d1fae5',
                color: isDark ? '#34d399' : '#047857'
              }}
            >
              Interactive Thread
            </span>
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              color: isDark ? '#e2e8f0' : '#334155',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Track real-time status updates (Submitted, Under Review, In Progress, Resolved, Closed) and reply to coordinator responses.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/student/feedback"
            className="btn btn-outline"
            style={{
              height: '36px',
              padding: '0 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <span>View All / Full Hub</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/student/feedback"
            className="feedback-green-btn"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#059669',
              color: '#FFFFFF',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <PlusCircle size={14} style={{ color: '#FFFFFF', flexShrink: 0 }} />
            <span style={{ color: '#FFFFFF' }}>Submit New Feedback</span>
          </Link>
          <button
            type="button"
            onClick={fetchMyFeedback}
            disabled={loading}
            className="btn btn-outline"
            style={{
              height: '36px',
              width: '36px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)'
            }}
            title="Refresh Records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar — Vertically Aligned on the Same Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 260px',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by code or subject..."
            className="form-control"
            style={{
              height: '38px',
              padding: '0 12px 0 36px',
              fontSize: '0.85rem',
              width: '100%',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
              borderRadius: '8px',
              margin: 0
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              lineHeight: '38px',
              whiteSpace: 'nowrap'
            }}
          >
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control"
            style={{
              height: '38px',
              width: 'auto',
              minWidth: '160px',
              fontSize: '0.85rem',
              padding: '0 32px 0 12px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
              borderRadius: '8px',
              margin: 0
            }}
          >
            <option value="ALL">All Statuses ({feedbackList.length})</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAnalytics(prev => !prev)}
            className="btn btn-outline"
            style={{
              height: '38px',
              padding: '0 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <BarChart3 size={14} style={{ color: 'var(--primary)' }} />
            <span>{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
          </button>
        </div>
      </div>

      {/* RECHARTS ANALYTICS PANEL FOR CURRENT USER (Category Bar Chart & Status Pie Chart) */}
      {showAnalytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border)'
          }}
        >
          {/* Bar Chart: Feedback Categories */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={15} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  My Feedback Categories
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Total: {feedbackList.length}
              </span>
            </div>
            <div style={{ width: '100%', height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                  <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Status Distribution */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PieChartIcon size={15} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  My Ticket Status Distribution
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Resolved: {feedbackList.filter(f => f.status === 'RESOLVED').length}
              </span>
            </div>
            <div style={{ width: '100%', height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Items Grid, Error State, or Clean Empty State */}
      {loading ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border)'
          }}
        >
          <RefreshCw size={28} className="animate-spin" style={{ color: '#10b981', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Loading your submitted feedback records...
          </p>
        </div>
      ) : fetchError ? (
        <div
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)'
          }}
        >
          <AlertTriangle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>{fetchError}</h3>
          <button
            type="button"
            onClick={fetchMyFeedback}
            className="btn btn-outline btn-sm"
            style={{ marginTop: '10px' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div
          style={{
            padding: '44px 24px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <MessageSquare
            size={36}
            style={{
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '4px'
            }}
          />
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}
          >
            {feedbackList.length === 0 ? 'No feedback submissions found' : 'No records match your filters'}
          </h3>
          <p
            style={{
              fontSize: '0.82rem',
              color: isDark ? '#cbd5e1' : '#475569',
              maxWidth: '480px',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            {feedbackList.length === 0
              ? 'You have not submitted any feedback or bug reports yet. Share your experience to help us improve!'
              : 'Try selecting a different status filter or clearing your search query.'}
          </p>
          {feedbackList.length === 0 ? (
            <Link
              to="/student/feedback"
              className="feedback-green-btn"
              style={{
                marginTop: '8px',
                padding: '9px 18px',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: '#059669',
                color: '#FFFFFF',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <PlusCircle size={15} style={{ color: '#FFFFFF', flexShrink: 0 }} />
              <span style={{ color: '#FFFFFF' }}>Submit Your First Feedback</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '8px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredList.map((item) => {
            const responses = item.responses || [];
            const isThreadExpanded = expandedThreads[item.id] !== undefined ? expandedThreads[item.id] : true;

            return (
              <div
                key={item.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {item.feedback_code}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.attachment_url && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ImageIcon size={11} /> Screenshot
                        </span>
                      )}
                      {renderStatusBadge(item.status)}
                    </div>
                  </div>

                  <h3
                    onClick={() => setSelectedItem(item)}
                    style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.35, cursor: 'pointer' }}
                  >
                    {item.subject}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {'★'.repeat(item.overall_rating)}{'☆'.repeat(5 - item.overall_rating)}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>({item.overall_rating}/5)</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {/* Inline Threaded Responses Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedThreads(prev => ({ ...prev, [item.id]: !isThreadExpanded }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <MessageCircle size={13} />
                      <span>{responses.length} response(s)</span>
                      {isThreadExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem'
                      }}
                    >
                      Full Details <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Inline Threaded Responses & Follow-Up Composer */}
                  {isThreadExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                      {responses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '190px', overflowY: 'auto', paddingLeft: '8px', borderLeft: '2px solid var(--primary)' }}>
                          {responses.map((r) => {
                            const isCoord = r.user_role === 'COORDINATOR' || r.user_role === 'ADMIN';
                            return (
                              <div
                                key={r.id}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: isCoord ? 'var(--primary-light)' : 'var(--bg-subtle)',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--primary)', marginBottom: '2px', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>{r.user_name} ({r.user_role})</span>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>
                                    {new Date(r.created_at).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                  {r.message}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                          Awaiting coordinator review. You can post a follow-up message below.
                        </div>
                      )}

                      <form onSubmit={(e) => handleInlineReplySubmit(e, item.id)} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={inlineDrafts[item.id] || ''}
                          onChange={(e) => setInlineDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Send follow-up message..."
                          className="form-control"
                          style={{
                            flex: 1,
                            height: '34px',
                            fontSize: '0.78rem',
                            padding: '0 10px',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border)',
                            borderRadius: '6px'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={sendingInlineId === item.id || !(inlineDrafts[item.id] || '').trim()}
                          className="btn btn-primary btn-sm"
                          style={{ height: '34px', padding: '0 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {sendingInlineId === item.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                          Reply
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK SUBMIT FEEDBACK MODAL (WITH SCREENSHOT UPLOAD) */}
      {showSubmitModal && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }} onClick={() => setShowSubmitModal(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Submit New Feedback or Bug Report
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Share your experience or attach a screenshot of a website error.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submitError && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--danger-bg)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-control"
                  >
                    <option value="BUG">Website Bug / Technical Problem</option>
                    <option value="GENERAL">General Feedback</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="IMPROVEMENT">Improvement Suggestion</option>
                    <option value="UX">User Experience Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Overall Rating *</label>
                  <select
                    value={overallRating}
                    onChange={(e) => setOverallRating(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value={5}>★★★★★ (5/5 - Excellent)</option>
                    <option value={4}>★★★★☆ (4/5 - Very Good)</option>
                    <option value={3}>★★★☆☆ (3/5 - Good)</option>
                    <option value={2}>★★☆☆☆ (2/5 - Fair)</option>
                    <option value={1}>★☆☆☆☆ (1/5 - Poor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Subject / Headline *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Error downloading certificate on mobile"
                  className="form-control"
                />
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, steps to reproduce, or your suggestion clearly..."
                  className="form-control"
                />
              </div>

              {/* Screenshot Upload Area */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Upload Screenshot (Optional)</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>PNG, JPG, WEBP up to 5 MB</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleScreenshotFileChange}
                  style={{ display: 'none' }}
                />

                {uploadError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--danger-bg)',
                      color: 'var(--danger)',
                      fontSize: '0.78rem',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <AlertTriangle size={14} /> {uploadError}
                  </div>
                )}

                {!screenshotUrl ? (
                  <div
                    onClick={() => !uploadingScreenshot && fileInputRef.current?.click()}
                    style={{
                      padding: '18px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border)',
                      backgroundColor: 'var(--bg-subtle)',
                      textAlign: 'center',
                      cursor: uploadingScreenshot ? 'wait' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {uploadingScreenshot ? (
                      <>
                        <RefreshCw size={22} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Uploading screenshot...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={22} style={{ color: 'var(--primary)' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Click to Upload Screenshot
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Attach a screenshot of website errors, UI glitches, or bugs (PNG, JPG, JPEG)
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <img
                        src={screenshotUrl}
                        alt="Screenshot preview"
                        onClick={() => setLightboxImage(screenshotUrl)}
                        style={{
                          width: '64px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {screenshotName || 'Uploaded Screenshot'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                          ✓ Ready to attach with ticket
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '5px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingScreenshot}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & INTERACTIVE RESPONSE THREAD MODAL */}
      {selectedItem && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }} onClick={() => setSelectedItem(null)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                    {selectedItem.feedback_code}
                  </span>
                  {renderStatusBadge(selectedItem.status)}
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {selectedItem.category}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedItem.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              {/* Original Submission Details */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Submitted on: {new Date(selectedItem.created_at).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                    {'★'.repeat(selectedItem.overall_rating)}{'☆'.repeat(5 - selectedItem.overall_rating)} ({selectedItem.overall_rating}/5)
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedItem.description}
                </p>

                {selectedItem.attachment_url && (
                  <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={13} /> Attached Screenshot
                    </div>
                    {isImageAttachment(selectedItem.attachment_url) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          onClick={() => setLightboxImage(selectedItem.attachment_url!)}
                          style={{
                            position: 'relative',
                            maxHeight: '220px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <img
                            src={selectedItem.attachment_url}
                            alt="Uploaded Screenshot"
                            style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              color: '#fff',
                              fontSize: '0.72rem',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Maximize2 size={11} /> Click to Enlarge
                          </span>
                        </div>
                      </div>
                    ) : (
                      <a
                        href={selectedItem.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ExternalLink size={13} /> Open Attached File
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Coordinator & Student Interactive Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
                    Conversation Thread ({(selectedItem.responses || []).length})
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Coordinators are notified of your replies
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {(!selectedItem.responses || selectedItem.responses.length === 0) ? (
                    <div
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        fontSize: '0.825rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border)'
                      }}
                    >
                      No replies posted yet. Your submission is queued for review by department coordinators.
                    </div>
                  ) : (
                    selectedItem.responses.map((r: FeedbackResponseItem) => {
                      const isStudentReply = r.user_role === 'STUDENT';
                      return (
                        <div
                          key={r.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            backgroundColor: isStudentReply ? 'var(--bg-subtle)' : 'var(--primary-light)',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.user_name}</span>
                              <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                {r.user_role}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {new Date(r.created_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {r.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Follow-up reply composer */}
                {followUpError && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--danger)', padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--danger-bg)' }}>
                    {followUpError}
                  </div>
                )}
                <form onSubmit={handleSendFollowUp} style={{ display: 'flex', gap: '8px', paddingTop: '6px' }}>
                  <input
                    type="text"
                    value={followUpMsg}
                    onChange={(e) => setFollowUpMsg(e.target.value)}
                    placeholder="Type a follow-up reply or question for the coordinator..."
                    className="form-control"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !followUpMsg.trim()}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Reply
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                backgroundColor: 'var(--bg-subtle)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>MAEER's MITCORER Student Experience Hub</span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR SCREENSHOT PREVIEW */}
      {lightboxImage && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200, cursor: 'zoom-out' }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
            <img
              src={lightboxImage}
              alt="Full Screenshot"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFeedbackSection;
