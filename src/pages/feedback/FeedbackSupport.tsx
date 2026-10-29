import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Star, Send, Filter, Search, Download, 
  FileText, CheckCircle2, Clock, AlertTriangle, Sparkles, 
  Paperclip, User, Shield, Tag, ChevronRight, Link2, X, 
  RefreshCw, Printer, ThumbsUp, MessageCircle, BarChart3,
  Layers, CheckSquare, PlusCircle, HelpCircle, Eye,
  Trash2, ChevronDown, ChevronUp, ExternalLink, Maximize2, Image as ImageIcon,
  Upload
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api, subscribeToLiveSync, broadcastLiveSync } from '../../services/api';
import { FeedbackAnalyticsPanel } from '../../components/admin/FeedbackAnalyticsPanel';

export interface FeedbackResponseItem {
  id: string;
  user_id: number;
  user_name: string;
  user_role: 'STUDENT' | 'COORDINATOR' | 'ADMIN';
  message: string;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  feedback_code: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: 'STUDENT' | 'COORDINATOR' | 'ADMIN';
  department: string;
  department_code?: string;
  category: 'GENERAL' | 'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'UX';
  overall_rating: number;
  usability_rating?: number;
  performance_rating?: number;
  design_rating?: number;
  affected_page: string;
  subject: string;
  description: string;
  attachment_url?: string;
  screenshot_name?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assigned_coordinator_id?: number | null;
  assigned_coordinator_name?: string | null;
  responses: FeedbackResponseItem[];
  linked_feedback_ids?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface FeedbackAnalytics {
  totalCount: number;
  avgOverall: number;
  avgUsability: string;
  avgPerformance: string;
  avgDesign: string;
  ratingDistribution: Record<number, number>;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  roleCounts: Record<string, number>;
  avgResolutionHours: number;
  resolvedCount: number;
}

const CATEGORIES = [
  { id: 'GENERAL', label: 'General Feedback', desc: 'Overall impressions and general platform thoughts' },
  { id: 'BUG', label: 'Website Bug / Technical Problem', desc: 'Broken layout, error messages, or unintended behavior' },
  { id: 'FEATURE_REQUEST', label: 'Feature Request', desc: 'Suggestions for new tools, modules, or workflows' },
  { id: 'IMPROVEMENT', label: 'Improvement Suggestion', desc: 'Enhancements to existing modules or processes' },
  { id: 'UX', label: 'User Experience Feedback', desc: 'Usability, navigation, clarity, and visual aesthetics' },
];

const PAGES_LIST = [
  'Dashboard Overview',
  'Internship Opportunities',
  'My Applications',
  'My Internships',
  'Weekly Progress Reports',
  'Performance Tracker',
  'Leaderboard',
  'Tasks & Deadlines',
  'Skills & Assessments',
  'Certificates & Documents',
  'Resume Builder & Matcher',
  'Career Passport',
  'AI Career Assistant',
  'Mentor Connect',
  'Student Community',
  'Coordinator Management',
  'Security Audit Logs',
  'Other / General Platform'
];

export const FeedbackSupport: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrCoord = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';
  const isStudent = user?.role === 'STUDENT';

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'MY_FEEDBACK' | 'SUBMIT' | 'ANALYTICS'>('MY_FEEDBACK');

  // Form state
  const [category, setCategory] = useState<string>('GENERAL');
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [usabilityRating, setUsabilityRating] = useState<number>(5);
  const [performanceRating, setPerformanceRating] = useState<number>(5);
  const [designRating, setDesignRating] = useState<number>(5);
  const [affectedPage, setAffectedPage] = useState<string>('Dashboard Overview');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [screenshotSize, setScreenshotSize] = useState<number>(0);
  const [uploadingScreenshot, setUploadingScreenshot] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<FeedbackItem | null>(null);
  const [formError, setFormError] = useState<string>('');

  // List state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [listFetchError, setListFetchError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRating, setFilterRating] = useState<string>('ALL');

  // Modal / Detail state
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responseMsg, setResponseMsg] = useState<string>('');
  const [sendingResponse, setSendingResponse] = useState<boolean>(false);
  const [deleteModalFeedback, setDeleteModalFeedback] = useState<FeedbackItem | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<boolean>(false);
  const [expandedMobileRows, setExpandedMobileRows] = useState<Record<string, boolean>>({});
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [inlineReplyDrafts, setInlineReplyDrafts] = useState<Record<string, string>>({});
  const [sendingInlineReplyId, setSendingInlineReplyId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Status update state for Coordinator/Admin
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Initial Load & Real-Time Sync
  useEffect(() => {
    fetchList();
    return subscribeToLiveSync(() => fetchList(), 8000);
  }, [filterCategory, filterStatus, filterRating]);

  const fetchList = async () => {
    setLoadingList(true);
    setListFetchError('');
    try {
      const params: Record<string, any> = {};
      if (searchQuery) params.search = searchQuery;
      if (filterCategory !== 'ALL') params.category = filterCategory;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterRating !== 'ALL') params.rating = filterRating;

      const data = await api.get<FeedbackItem[]>('/feedback/', params);
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load feedback list:', err);
      setListFetchError('Unable to load feedback submissions right now. Please try refreshing.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  const processScreenshotUpload = async (file: File) => {
    setUploadError('');
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid file format. Please upload a PNG, JPG, JPEG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File size exceeds the 5 MB limit. Please choose a smaller screenshot.');
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
      setScreenshotSize(res.size || file.size);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload screenshot. Please try again.');
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScreenshotInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processScreenshotUpload(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUrl('');
    setScreenshotName('');
    setScreenshotSize(0);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!subject.trim()) {
      setFormError('Please enter a feedback subject headline.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please provide a detailed description.');
      return;
    }

    setSubmitting(true);
    try {
      const finalAttachment = screenshotUrl || attachmentUrl.trim() || undefined;
      const payload = {
        category,
        overall_rating: overallRating,
        usability_rating: usabilityRating,
        performance_rating: performanceRating,
        design_rating: designRating,
        affected_page: affectedPage,
        subject: subject.trim(),
        description: description.trim(),
        attachment_url: finalAttachment,
        screenshot_url: screenshotUrl || undefined,
        screenshot_name: screenshotName || undefined
      };

      const res = await api.post<any>('/feedback/', payload);
      const createdFeedback: FeedbackItem = res?.feedback || res;
      setSubmitSuccess(createdFeedback);
      setSubject('');
      setDescription('');
      setAttachmentUrl('');
      setScreenshotUrl('');
      setScreenshotName('');
      setScreenshotSize(0);
      setOverallRating(5);
      
      // Refresh list and notify
      fetchList();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback || !responseMsg.trim()) return;

    setSendingResponse(true);
    try {
      const updated: any = await api.post(`/feedback/${selectedFeedback.id}/responses/`, {
        message: responseMsg.trim()
      });
      setSelectedFeedback(updated.feedback || updated);
      setResponseMsg('');
      fetchList();
    } catch (err: any) {
      setActionSuccessMessage(err?.message || 'Failed to post reply.');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleSendInlineReply = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = (inlineReplyDrafts[ticketId] || '').trim();
    if (!msg) return;

    setSendingInlineReplyId(ticketId);
    try {
      const updated: any = await api.post(`/feedback/${ticketId}/responses/`, {
        message: msg
      });
      const updatedItem = updated?.feedback || updated;
      setInlineReplyDrafts(prev => ({ ...prev, [ticketId]: '' }));
      setFeedbackList(prev => prev.map(f => f.id === ticketId ? updatedItem : f));
      if (selectedFeedback?.id === ticketId) {
        setSelectedFeedback(updatedItem);
      }
      setActionSuccessMessage(`Follow-up message posted to ${updatedItem.feedback_code || 'ticket'}.`);
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      setActionSuccessMessage(err?.message || 'Failed to send follow-up message.');
    } finally {
      setSendingInlineReplyId(null);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setUpdatingStatus(true);
    try {
      const payload: any = {
        status: updateStatus || selectedFeedback.status
      };
      if (resolutionNote.trim()) {
        payload.resolution_note = resolutionNote.trim();
      }

      const updated: any = await api.patch(`/feedback/${selectedFeedback.id}/status/`, payload);
      setSelectedFeedback(updated.feedback || updated);
      setResolutionNote('');
      fetchList();
      setActionSuccessMessage('Feedback ticket status updated successfully.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleInlineStatusChange = async (item: FeedbackItem, newStatus: string) => {
    try {
      await api.patch(`/feedback/${item.id}/status/`, { status: newStatus });
      setActionSuccessMessage(`Updated ticket ${item.feedback_code} status to ${newStatus}`);
      fetchList();
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to update status: ' + (err?.message || 'Error'));
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedMobileRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isImageUrl = (url?: string) => {
    if (!url) return false;
    return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/') || url.includes('/uploads/feedback/') || url.includes('/assets/') || url.includes('/images/');
  };

  const handleQuickMarkResolved = async (item: FeedbackItem) => {
    try {
      const updated: any = await api.patch(`/feedback/${item.id}/status/`, {
        status: 'RESOLVED',
        resolution_note: 'Marked as resolved by ' + (user?.name || 'Coordinator')
      });
      setActionSuccessMessage(`Feedback ticket ${item.feedback_code} marked as Resolved.`);
      fetchList();
      if (selectedFeedback && (selectedFeedback.id === item.id || selectedFeedback.feedback_code === item.feedback_code)) {
        setSelectedFeedback(updated.feedback || { ...selectedFeedback, status: 'RESOLVED' });
      }
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      alert('Failed to resolve ticket: ' + (err?.message || 'Error'));
    }
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!deleteModalFeedback) return;
    setDeletingFeedback(true);
    const target = deleteModalFeedback;
    try {
      const targetId = target.id || target.feedback_code;
      // Optimistic removal: ticket disappears instantly from the screen
      setFeedbackList(prev => prev.filter(f => f.id !== target.id && f.feedback_code !== target.feedback_code));
      if (selectedFeedback && (selectedFeedback.id === target.id || selectedFeedback.feedback_code === target.feedback_code)) {
        setSelectedFeedback(null);
      }
      setDeleteModalFeedback(null);

      await api.delete(`/feedback/${targetId}/`);
      broadcastLiveSync('/feedback/');
      setActionSuccessMessage(`Feedback ticket ${target.feedback_code} was permanently deleted.`);
      fetchList();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      fetchList();
      alert('Failed to delete feedback ticket: ' + (err?.message || 'Error'));
    } finally {
      setDeletingFeedback(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('access_token');
    window.open(`/api/feedback/export/csv/?token=${token}`, '_blank');
  };

  const handleExportPDF = async () => {
    try {
      const pdfData = await api.get<any>('/feedback/export/pdf/');
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Pop-up blocked. Please allow pop-ups to view printable PDF report.');
        return;
      }

      const rowsHtml = (pdfData.records || []).map((f: FeedbackItem) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: bold; font-family: monospace;">${f.feedback_code}</td>
          <td style="padding: 8px;">${new Date(f.created_at).toLocaleDateString('en-IN')}</td>
          <td style="padding: 8px;">${f.user_name} <br/><span style="color:#6b7280; font-size: 11px;">(${f.user_role} - ${f.department || 'N/A'})</span></td>
          <td style="padding: 8px;">${f.category}</td>
          <td style="padding: 8px; font-weight: bold; color: #2563eb;">${'★'.repeat(f.overall_rating)}${'☆'.repeat(5 - f.overall_rating)} (${f.overall_rating}/5)</td>
          <td style="padding: 8px;"><strong>${f.subject}</strong><br/><span style="color:#4b5563; font-size: 11px;">${f.description.slice(0, 80)}...</span></td>
          <td style="padding: 8px;"><span style="padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1;">${f.status}</span></td>
        </tr>
      `).join('');

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MITCORER Feedback Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1f2937; }
            h1 { color: #1e3a8a; font-size: 22px; margin-bottom: 4px; }
            p.sub { color: #4b5563; font-size: 13px; margin-top: 0; }
            .header-bar { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background-color: #f3f4f6; text-align: left; padding: 10px 8px; border-bottom: 2px solid #d1d5db; font-weight: 600; }
            .meta { display: flex; gap: 24px; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>${pdfData.institution}</h1>
              <p class="sub">${pdfData.title}</p>
            </div>
            <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Print / Save as PDF
            </button>
          </div>
          <div class="meta">
            <div><strong>Generated At:</strong> ${new Date(pdfData.generated_at).toLocaleString('en-IN')}</div>
            <div><strong>Exported By:</strong> ${pdfData.exported_by}</div>
            <div><strong>Total Feedback Items:</strong> ${pdfData.total_records}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Submitted By</th>
                <th>Category</th>
                <th>Rating</th>
                <th>Subject & Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <div>MAEER's MITCORER Barshi — Internship Hub System Audit</div>
            <div>Authorized Signature: _______________________</div>
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err: any) {
      alert('Failed to generate PDF report: ' + (err?.message || 'Unknown error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'Submitted':
        return <span className="badge badge-submitted">Submitted</span>;
      case 'UNDER_REVIEW':
      case 'Under Review':
        return <span className="badge badge-warning">Under Review</span>;
      case 'IN_PROGRESS':
      case 'In Progress':
        return <span className="badge badge-in_progress">In Progress</span>;
      case 'RESOLVED':
      case 'Resolved':
        return <span className="badge badge-success">Resolved</span>;
      case 'CLOSED':
      case 'Closed':
        return <span className="badge badge-neutral">Closed</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'BUG':
        return <span className="badge badge-danger">Bug / Technical</span>;
      case 'FEATURE_REQUEST':
        return <span className="badge badge-primary">Feature Request</span>;
      case 'IMPROVEMENT':
        return <span className="badge badge-warning">Improvement</span>;
      case 'UX':
        return <span className="badge badge-success">UX Feedback</span>;
      default:
        return <span className="badge badge-neutral">General</span>;
    }
  };

  return (
    <div className="portal-page">
      {/* Page Header (Matches AssignedStudents.tsx Exactly) */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              MITCORER IPTS Quality &amp; Experience Hub
            </span>
          </div>
          <h1 className="page-title">
            {isStudent ? 'My Feedback & Support Tickets' : 'Feedback & User Experience Analytics'}
          </h1>
          <p className="page-subtitle">
            {isStudent 
              ? 'View your previously submitted feedback records, current resolution status, and coordinator response notes.'
              : 'Monitor student and coordinator feedback metrics, category distribution, and resolution status with live Recharts visualizations.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <Printer size={15} /> Export PDF Report
          </button>
          <button
            onClick={fetchList}
            disabled={loadingList}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} />
            Refresh
          </button>
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            ● {feedbackList.filter(f => f.status === 'RESOLVED').length} Resolved
          </span>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            ▲ {feedbackList.filter(f => f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW' || f.status === 'IN_PROGRESS').length} Active
          </span>
        </div>
      </div>

      {actionSuccessMessage && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--success-bg)',
            borderColor: 'var(--success)',
            color: 'var(--success)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '12px 16px'
          }}
        >
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Navigation Tabs (Clean Professional Button Strip matching Reference) */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setActiveTab('MY_FEEDBACK')}
          className={`btn ${activeTab === 'MY_FEEDBACK' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.84rem', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <MessageSquare size={16} /> {isStudent ? 'My Feedback Tickets' : 'All Feedback Tickets'} ({feedbackList.length})
        </button>

        <button
          onClick={() => setActiveTab('SUBMIT')}
          className={`btn ${activeTab === 'SUBMIT' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.84rem', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <PlusCircle size={16} /> Submit New Feedback
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`btn ${activeTab === 'ANALYTICS' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.84rem', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BarChart3 size={16} /> Analytics &amp; Recharts Insights
        </button>
      </div>

      {/* TAB 1: ALL / MY FEEDBACK TICKETS */}
      {activeTab === 'MY_FEEDBACK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search & Filter Bar (Matching AssignedStudents.tsx Filter Card) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by tracking code, subject, user, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                />
              </form>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', minWidth: '155px' }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="GENERAL">General Feedback</option>
                  <option value="BUG">Bugs / Technical</option>
                  <option value="FEATURE_REQUEST">Feature Requests</option>
                  <option value="IMPROVEMENT">Improvements</option>
                  <option value="UX">UX Feedback</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', minWidth: '145px' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', minWidth: '135px' }}
                >
                  <option value="ALL">All Ratings</option>
                  <option value="5">★★★★★ (5 Stars)</option>
                  <option value="4">★★★★☆ (4 Stars)</option>
                  <option value="3">★★★☆☆ (3 Stars)</option>
                  <option value="2">★★☆☆☆ (2 Stars)</option>
                  <option value="1">★☆☆☆☆ (1 Star)</option>
                </select>

                <button
                  onClick={fetchList}
                  disabled={loadingList}
                  className="btn btn-outline"
                  title="Refresh records"
                  style={{ padding: '9px 14px' }}
                >
                  <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {loadingList ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Loading feedback tickets...</p>
            </div>
          ) : listFetchError ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                borderColor: 'var(--danger)',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)'
              }}
            >
              <AlertTriangle size={34} style={{ margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>
                {listFetchError}
              </h3>
              <button
                type="button"
                onClick={fetchList}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '8px' }}
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : feedbackList.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MessageSquare size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                No feedback submissions found
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '460px', margin: 0, lineHeight: 1.5 }}>
                {searchQuery || filterCategory !== 'ALL' || filterStatus !== 'ALL' || filterRating !== 'ALL'
                  ? 'No feedback tickets matched your current search or filter criteria. Try resetting the filters or submitting a new ticket.'
                  : 'You have not submitted any feedback or bug reports yet. Share your experience or attach a screenshot of an issue to help us improve!'}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                <button
                  onClick={() => setActiveTab('SUBMIT')}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                  <PlusCircle size={16} /> Submit Your First Feedback
                </button>
                {(searchQuery || filterCategory !== 'ALL' || filterStatus !== 'ALL' || filterRating !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('ALL');
                      setFilterStatus('ALL');
                      setFilterRating('ALL');
                    }}
                    className="btn btn-outline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* DESKTOP TABLE VIEW (Visible on md and up, aligns all columns properly) */}
              <div className="table-responsive hidden md:block" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>CODE</th>
                      <th style={{ minWidth: '180px' }}>SUBMITTED BY</th>
                      <th style={{ width: '150px' }}>CATEGORY</th>
                      <th style={{ width: '135px' }}>RATING</th>
                      <th style={{ minWidth: '220px' }}>SUBJECT &amp; PAGE</th>
                      <th style={{ width: '150px' }}>STATUS</th>
                      <th style={{ width: '130px' }}>RESPONSES</th>
                      <th style={{ width: '200px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.map((item) => {
                      const isThreadOpen = expandedThreadId === item.id;
                      const responses = item.responses || [];
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            onClick={() => setExpandedThreadId(isThreadOpen ? null : item.id)}
                            style={{ cursor: 'pointer', backgroundColor: isThreadOpen ? 'var(--bg-subtle)' : undefined }}
                          >
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                              {item.feedback_code}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.user_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.user_role} &bull; {item.department}
                              </div>
                            </td>
                            <td>{getCategoryBadge(item.category)}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
                                  {'★'.repeat(item.overall_rating)}{'☆'.repeat(5 - item.overall_rating)}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({item.overall_rating}/5)
                                </span>
                              </div>
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.subject}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.affected_page}
                                </span>
                                {item.attachment_url && (
                                  <span
                                    className="badge badge-neutral"
                                    style={{ fontSize: '0.68rem', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
                                    title="Includes uploaded screenshot / attachment"
                                  >
                                    <ImageIcon size={10} /> Screenshot
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {isAdminOrCoord ? (
                                <select
                                  value={item.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleInlineStatusChange(item, e.target.value);
                                  }}
                                  className="form-control"
                                  style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                  <option value="SUBMITTED">Submitted</option>
                                  <option value="UNDER_REVIEW">Under Review</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="RESOLVED">Resolved</option>
                                  <option value="CLOSED">Closed</option>
                                </select>
                              ) : (
                                getStatusBadge(item.status)
                              )}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedThreadId(isThreadOpen ? null : item.id);
                                }}
                                className={`badge ${responses.length > 0 ? 'badge-primary' : 'badge-neutral'}`}
                                style={{ fontSize: '0.75rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Click to toggle inline threaded responses"
                              >
                                <MessageCircle size={11} />
                                {responses.length} response(s)
                                {isThreadOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedThreadId(isThreadOpen ? null : item.id);
                                  }}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Toggle inline message thread"
                                >
                                  <MessageSquare size={13} /> {isThreadOpen ? 'Hide Thread' : 'Thread'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFeedback(item);
                                  }}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="View full feedback description, timeline and attached images"
                                >
                                  <Eye size={13} /> View Details
                                </button>
                                {item.status !== 'RESOLVED' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickMarkResolved(item);
                                    }}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Mark as Resolved"
                                  >
                                    <CheckCircle2 size={13} /> Resolve
                                  </button>
                                )}
                                {(isAdminOrCoord || (isStudent && item.user_id === user?.id)) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteModalFeedback(item);
                                    }}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Delete this feedback record"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* INLINE THREADED MESSAGING ROW */}
                          {isThreadOpen && (
                            <tr onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-subtle)' }}>
                              <td colSpan={8} style={{ padding: '16px 24px', borderBottom: '2px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <MessageSquare size={15} style={{ color: 'var(--primary)' }} />
                                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        Inline Support Thread — {item.feedback_code}: {item.subject}
                                      </strong>
                                      {getStatusBadge(item.status)}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Submitted {new Date(item.created_at).toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                                      Original Ticket Description ({item.user_name}):
                                    </strong>
                                    {item.description}
                                  </div>

                                  {/* Inline Coordinator & Student Responses */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px', borderLeft: '3px solid var(--primary)' }}>
                                    {responses.length === 0 ? (
                                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                        No coordinator responses yet. Send a follow-up message below to add details to this ticket.
                                      </div>
                                    ) : (
                                      responses.map((resp) => {
                                        const isCoordOrAdmin = resp.user_role === 'COORDINATOR' || resp.user_role === 'ADMIN';
                                        return (
                                          <div
                                            key={resp.id}
                                            style={{
                                              padding: '10px 14px',
                                              borderRadius: '8px',
                                              backgroundColor: isCoordOrAdmin ? 'var(--primary-light)' : 'var(--bg-card)',
                                              border: '1px solid var(--border)',
                                              fontSize: '0.82rem'
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px', flexWrap: 'wrap' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <strong style={{ color: 'var(--text-primary)' }}>{resp.user_name}</strong>
                                                <span className={`badge ${isCoordOrAdmin ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                                  {resp.user_role === 'COORDINATOR' ? 'COORDINATOR RESPONSE' : resp.user_role}
                                                </span>
                                              </div>
                                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {new Date(resp.created_at).toLocaleString('en-IN')}
                                              </span>
                                            </div>
                                            <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                              {resp.message}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Inline Follow-up Composer */}
                                  <form onSubmit={(e) => handleSendInlineReply(e, item.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                    <input
                                      type="text"
                                      value={inlineReplyDrafts[item.id] || ''}
                                      onChange={(e) => setInlineReplyDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      placeholder={isAdminOrCoord ? 'Write an official coordinator response...' : 'Send a follow-up message on this support ticket...'}
                                      className="form-control"
                                      style={{ flex: 1, fontSize: '0.84rem', height: '38px' }}
                                    />
                                    <button
                                      type="submit"
                                      disabled={sendingInlineReplyId === item.id || !(inlineReplyDrafts[item.id] || '').trim()}
                                      className="btn btn-primary btn-sm"
                                      style={{ height: '38px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                    >
                                      {sendingInlineReplyId === item.id ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                      {isAdminOrCoord ? 'Post Response' : 'Send Follow-Up'}
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE RESPONSIVE ACCORDION CARDS (Visible on screen < 768px, zero overflow) */}
              <div className="block md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                {feedbackList.map((item) => {
                  const isExpanded = !!expandedMobileRows[item.id];
                  return (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-card)',
                        padding: '14px',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div
                        onClick={() => toggleRowExpand(item.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '8px' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)' }}>
                              {item.feedback_code}
                            </span>
                            {getStatusBadge(item.status)}
                            {item.attachment_url && (
                              <span className="badge badge-neutral" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <ImageIcon size={10} /> Screenshot
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                            {item.subject}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.user_name} &bull; {item.department} &bull; {new Date(item.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
                          aria-label={isExpanded ? 'Collapse ticket' : 'Expand ticket'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                            <div>{getCategoryBadge(item.category)}</div>
                            <div style={{ color: '#f59e0b', fontWeight: 700 }}>
                              {'★'.repeat(item.overall_rating)}{'☆'.repeat(5 - item.overall_rating)} ({item.overall_rating}/5)
                            </div>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <strong>Affected Page:</strong> {item.affected_page}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: '6px', wordBreak: 'break-word' }}>
                            {item.description.length > 140 ? `${item.description.slice(0, 140)}...` : item.description}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                            <span className={`badge ${(item.responses || []).length > 0 ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                              {(item.responses || []).length} response(s)
                            </span>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setSelectedFeedback(item)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={13} /> View Details
                              </button>
                              {item.status !== 'RESOLVED' && (
                                <button
                                  onClick={() => handleQuickMarkResolved(item)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <CheckCircle2 size={13} /> Resolve
                                </button>
                              )}
                              {(isAdminOrCoord || (isStudent && item.user_id === user?.id)) && (
                                <button
                                  onClick={() => setDeleteModalFeedback(item)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT NEW FEEDBACK */}
      {activeTab === 'SUBMIT' && (
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          {submitSuccess ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Feedback Submitted Successfully!
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Your ticket has been recorded with tracking code <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{submitSuccess.feedback_code}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setSelectedFeedback(submitSuccess);
                    setSubmitSuccess(null);
                  }}
                  className="btn btn-primary"
                >
                  <Eye size={15} /> View Submitted Details &amp; Thread
                </button>
                <button
                  onClick={() => setSubmitSuccess(null)}
                  className="btn btn-outline"
                >
                  Submit Another Feedback
                </button>
                <button
                  onClick={() => {
                    setSubmitSuccess(null);
                    setActiveTab('MY_FEEDBACK');
                  }}
                  className="btn btn-secondary"
                >
                  Return to Feedback List
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Submit Feedback or Report an Issue
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Your submission is authenticated as <strong>{user?.name}</strong> ({user?.role} &bull; {user?.student_profile?.department_name || user?.coordinator_profile?.department_code || 'MITCORER'}) and routed to the coordinator review desk.
                  </p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

              {formError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Category Radio Cards */}
                <div>
                  <label className="form-label">
                    Feedback Category <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                    {CATEGORIES.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: category === cat.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: category === cat.id ? 'var(--primary-light)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="category"
                          checked={category === cat.id}
                          onChange={() => setCategory(cat.id)}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {cat.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                            {cat.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Card */}
                <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>
                    Overall Rating (1 to 5 Stars) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setOverallRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex' }}
                      >
                        <Star
                          size={28}
                          style={{
                            fill: (hoverRating || overallRating) >= star ? '#f59e0b' : 'none',
                            stroke: (hoverRating || overallRating) >= star ? '#f59e0b' : 'var(--text-light)',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      </button>
                    ))}
                    <span style={{ marginLeft: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
                      {overallRating === 1 && '1/5 — Poor'}
                      {overallRating === 2 && '2/5 — Fair'}
                      {overallRating === 3 && '3/5 — Good'}
                      {overallRating === 4 && '4/5 — Very Good'}
                      {overallRating === 5 && '5/5 — Excellent!'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Usability Rating</label>
                      <select
                        value={usabilityRating}
                        onChange={(e) => setUsabilityRating(Number(e.target.value))}
                        className="form-control"
                        style={{ padding: '8px 28px 8px 10px', fontSize: '0.8rem' }}
                      >
                        <option value={5}>5 ★ - Easy &amp; Intuitive</option>
                        <option value={4}>4 ★ - Clear Layout</option>
                        <option value={3}>3 ★ - Moderate</option>
                        <option value={2}>2 ★ - Confusing</option>
                        <option value={1}>1 ★ - Difficult to use</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Performance / Speed</label>
                      <select
                        value={performanceRating}
                        onChange={(e) => setPerformanceRating(Number(e.target.value))}
                        className="form-control"
                        style={{ padding: '8px 28px 8px 10px', fontSize: '0.8rem' }}
                      >
                        <option value={5}>5 ★ - Fast &amp; Smooth</option>
                        <option value={4}>4 ★ - Good Speed</option>
                        <option value={3}>3 ★ - Average</option>
                        <option value={2}>2 ★ - Slow loading</option>
                        <option value={1}>1 ★ - Unresponsive</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Design &amp; Aesthetics</label>
                      <select
                        value={designRating}
                        onChange={(e) => setDesignRating(Number(e.target.value))}
                        className="form-control"
                        style={{ padding: '8px 28px 8px 10px', fontSize: '0.8rem' }}
                      >
                        <option value={5}>5 ★ - Modern &amp; Clean</option>
                        <option value={4}>4 ★ - Well Formatted</option>
                        <option value={3}>3 ★ - Adequate</option>
                        <option value={2}>2 ★ - Needs improvement</option>
                        <option value={1}>1 ★ - Poor visuals</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Affected Page & Subject */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div>
                    <label className="form-label">
                      Affected Page / Module
                    </label>
                    <select
                      value={affectedPage}
                      onChange={(e) => setAffectedPage(e.target.value)}
                      className="form-control"
                    >
                      {PAGES_LIST.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Subject / Headline <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. PDF Certificate download issue on mobile"
                      className="form-control"
                    />
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="form-label">
                    Detailed Description &amp; Context <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please explain the problem, idea, or feedback clearly..."
                    className="form-control"
                    style={{ minHeight: '110px' }}
                  />
                </div>

                {/* Screenshot / Image Upload Section (For Student, Coordinator, and Admin) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
                      Upload Screenshot / Image <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Optional)</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supported: PNG, JPG, JPEG, WEBP (Max 5 MB)
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleScreenshotInputChange}
                    style={{ display: 'none' }}
                  />

                  {uploadError && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--danger-bg)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        fontSize: '0.82rem',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {!screenshotUrl ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const droppedFile = e.dataTransfer.files?.[0];
                        if (droppedFile) {
                          processScreenshotUpload(droppedFile);
                        }
                      }}
                      onClick={() => !uploadingScreenshot && fileInputRef.current?.click()}
                      style={{
                        padding: '24px 20px',
                        borderRadius: 'var(--radius-md)',
                        border: isDraggingFile ? '2px dashed var(--primary)' : '1px dashed var(--border)',
                        backgroundColor: isDraggingFile ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        textAlign: 'center',
                        cursor: uploadingScreenshot ? 'wait' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {uploadingScreenshot ? (
                        <>
                          <RefreshCw size={26} className="animate-spin" style={{ color: 'var(--primary)' }} />
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Uploading screenshot...
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Validating and saving image securely
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-light)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Upload size={20} />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                            >
                              <Upload size={14} /> Upload Screenshot
                            </button>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              or drag and drop a screenshot of website errors, bugs, or UI issues here
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                        <div
                          onClick={() => setLightboxImage(screenshotUrl)}
                          style={{
                            width: '88px',
                            height: '64px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            backgroundColor: '#0f172a',
                            cursor: 'pointer',
                            flexShrink: 0,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Click to preview full screenshot"
                        >
                          <img
                            src={screenshotUrl}
                            alt="Uploaded Screenshot Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {screenshotName || 'Attached Screenshot'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {screenshotSize > 0 ? `${(screenshotSize / 1024).toFixed(1)} KB • ` : ''}
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Screenshot attached &amp; ready</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLightboxImage(screenshotUrl)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              marginTop: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Maximize2 size={12} /> Preview Full Image
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Upload size={13} /> Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional External Attachment Link */}
                <div>
                  <label className="form-label">
                    Or Paste External Attachment / Reference URL <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Paperclip size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="https://drive.google.com/... or external reference link"
                      className="form-control"
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="submit"
                    disabled={submitting || uploadingScreenshot}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Submitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & RECHARTS INSIGHTS */}
      {activeTab === 'ANALYTICS' && (
        <FeedbackAnalyticsPanel onSelectFeedback={(item) => setSelectedFeedback(item)} />
      )}

      {/* DETAILS MODAL & DISCUSSION THREAD (Matches Clean Dashboard Modal Style) */}
      {selectedFeedback && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setSelectedFeedback(null)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '740px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                    {selectedFeedback.feedback_code}
                  </span>
                  {getStatusBadge(selectedFeedback.status)}
                  {getCategoryBadge(selectedFeedback.category)}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0', lineHeight: 1.3 }}>
                  {selectedFeedback.subject}
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {selectedFeedback.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleQuickMarkResolved(selectedFeedback)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#059669', borderColor: '#a7f3d0' }}
                    title="Mark this feedback ticket as Resolved"
                  >
                    <CheckCircle2 size={14} /> Mark Resolved
                  </button>
                )}
                {(isAdminOrCoord || (isStudent && selectedFeedback.user_id === user?.id)) && (
                  <button
                    onClick={() => setDeleteModalFeedback(selectedFeedback)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fecaca' }}
                    title="Delete this ticket"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedFeedback(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Submission Metadata */}
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Submitted by: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedFeedback.user_name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}> ({selectedFeedback.user_role} &bull; {selectedFeedback.department})</span>
                    {selectedFeedback.user_email && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                        Email: {selectedFeedback.user_email}
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    {new Date(selectedFeedback.created_at).toLocaleString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Overall Rating: </span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      {'★'.repeat(selectedFeedback.overall_rating)}{'☆'.repeat(5 - selectedFeedback.overall_rating)} ({selectedFeedback.overall_rating}/5)
                    </span>
                  </div>
                  {selectedFeedback.usability_rating !== undefined && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Usability: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedFeedback.usability_rating}/5</strong>
                    </div>
                  )}
                  {selectedFeedback.performance_rating !== undefined && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Performance: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedFeedback.performance_rating}/5</strong>
                    </div>
                  )}
                  {selectedFeedback.affected_page && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Module/Page: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedFeedback.affected_page}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Complete Feedback Description
                </h4>
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {selectedFeedback.description}
                </div>
              </div>

              {/* Attached Images or Screenshots */}
              {selectedFeedback.attachment_url && (
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Attached Screenshot / File
                  </h4>
                  
                  {isImageUrl(selectedFeedback.attachment_url) ? (
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div
                        style={{
                          position: 'relative',
                          maxHeight: '260px',
                          overflow: 'hidden',
                          borderRadius: '8px',
                          backgroundColor: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => setLightboxImage(selectedFeedback.attachment_url!)}
                        title="Click to view full size image"
                      >
                        <img
                          src={selectedFeedback.attachment_url}
                          alt="Feedback Screenshot"
                          style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Maximize2 size={12} /> Click to Enlarge
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                          {selectedFeedback.attachment_url}
                        </span>
                        <a
                          href={selectedFeedback.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink size={12} /> Open in New Tab
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileText size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedFeedback.attachment_url}
                        </span>
                      </div>
                      <a
                        href={selectedFeedback.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                      >
                        <ExternalLink size={13} /> Open Attachment
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Staff Status Control Panel (For Coordinator / Admin) */}
              {isAdminOrCoord && (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary-light)',
                  border: '1px solid var(--primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                      Staff Resolution &amp; Status Control
                    </span>
                  </div>

                  <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Update Status</label>
                        <select
                          value={updateStatus || selectedFeedback.status}
                          onChange={(e) => setUpdateStatus(e.target.value)}
                          className="form-control"
                          style={{ padding: '6px 28px 6px 10px', fontSize: '0.8rem' }}
                        >
                          <option value="SUBMITTED">Submitted</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Resolution Note</label>
                        <input
                          type="text"
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder="e.g. Issue resolved in v2.4 update"
                          className="form-control"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {selectedFeedback.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkResolved(selectedFeedback)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#059669', borderColor: '#a7f3d0' }}
                        >
                          <CheckCircle2 size={13} /> Quick Resolve
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="btn btn-primary btn-sm"
                      >
                        {updatingStatus ? 'Updating...' : 'Update Status & Resolution'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Discussion Thread & Follow-up Responses */}
              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> Full Coordinator Response History &amp; Discussion ({(selectedFeedback.responses || []).length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {(!selectedFeedback.responses || selectedFeedback.responses.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.825rem', fontStyle: 'italic', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                      No responses yet. Follow-up comments posted here will notify the student and staff.
                    </div>
                  ) : (
                    selectedFeedback.responses.map((resp) => (
                      <div
                        key={resp.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          backgroundColor: resp.user_role !== 'STUDENT' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                          fontSize: '0.825rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {resp.user_name} <span style={{ fontWeight: 600, fontSize: '0.72rem', color: 'var(--primary)', padding: '2px 6px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border)' }}>{resp.user_role}</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(resp.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {resp.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Follow-up Message Form */}
                <form onSubmit={handleSendResponse} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                    placeholder="Write a response or follow-up comment..."
                    className="form-control"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.825rem' }}
                  />
                  <button
                    type="submit"
                    disabled={sendingResponse || !responseMsg.trim()}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {sendingResponse ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Send
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div>
                {(isAdminOrCoord || (isStudent && selectedFeedback.user_id === user?.id)) && (
                  <button
                    type="button"
                    onClick={() => setDeleteModalFeedback(selectedFeedback)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={14} /> Delete Ticket
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedFeedback.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => handleQuickMarkResolved(selectedFeedback)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    <CheckCircle2 size={14} /> Mark as Resolved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalFeedback && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Delete Feedback Ticket?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Tracking Code: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{deleteModalFeedback.feedback_code}</strong>
                </p>
              </div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '0.825rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                "{deleteModalFeedback.subject}"
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Submitted by: <strong>{deleteModalFeedback.user_name}</strong> ({deleteModalFeedback.user_role} &bull; {deleteModalFeedback.department})
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete this feedback ticket? If it is already resolved or junk/spam, it will be removed from the system and logged in security audit logs.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalFeedback(null)}
                className="btn btn-outline"
                disabled={deletingFeedback}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFeedback}
                className="btn btn-danger"
                disabled={deletingFeedback}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                {deletingFeedback ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1200, cursor: 'zoom-out' }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
              title="Close Preview"
            >
              <X size={16} />
            </button>
            <img
              src={lightboxImage}
              alt="Screenshot Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default FeedbackSupport;
