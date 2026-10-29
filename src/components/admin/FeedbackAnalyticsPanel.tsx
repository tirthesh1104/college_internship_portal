import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, PieChart as PieIcon, MessageSquare, Star, 
  CheckCircle2, AlertTriangle, RefreshCw, Download, Printer,
  Filter, RotateCcw, Trash2, Eye, X
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { api, subscribeToLiveSync, broadcastLiveSync } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { FeedbackAnalytics, FeedbackItem } from '../../pages/feedback/FeedbackSupport';

interface ExtendedFeedbackAnalytics extends FeedbackAnalytics {
  activeFilter?: {
    category: string;
    status: string;
    filteredCount: number;
    filteredAvgOverall: number;
    filteredCategoryCounts: Record<string, number>;
    filteredStatusCounts: Record<string, number>;
  };
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'General', color: '#2563eb' },
  BUG: { label: 'Bugs / Tech', color: '#ef4444' },
  FEATURE_REQUEST: { label: 'Feature Req', color: '#8b5cf6' },
  IMPROVEMENT: { label: 'Improvement', color: '#06b6d4' },
  UX: { label: 'UX Feedback', color: '#10b981' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: '#3b82f6' },
  UNDER_REVIEW: { label: 'Under Review', color: '#f59e0b' },
  IN_PROGRESS: { label: 'In Progress', color: '#8b5cf6' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  CLOSED: { label: 'Closed', color: '#64748b' },
};

interface FeedbackAnalyticsPanelProps {
  onSelectFeedback?: (item: FeedbackItem) => void;
}

export const FeedbackAnalyticsPanel: React.FC<FeedbackAnalyticsPanelProps> = ({ onSelectFeedback }) => {
  const { user } = useAuth();
  const isAdminOrCoord = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';
  const [analytics, setAnalytics] = useState<ExtendedFeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [recentRecords, setRecentRecords] = useState<FeedbackItem[]>([]);
  const [deleteModalRecord, setDeleteModalRecord] = useState<FeedbackItem | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const [analyticsData, feedbackList] = await Promise.all([
        api.get<ExtendedFeedbackAnalytics>('/feedback/analytics/', params),
        api.get<FeedbackItem[]>('/feedback/', params)
      ]);

      setAnalytics(analyticsData);
      setRecentRecords(Array.isArray(feedbackList) ? feedbackList.slice(0, 5) : []);
    } catch (err) {
      console.error('Failed to load feedback analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    return subscribeToLiveSync(() => fetchAnalytics(), 8000);
  }, [selectedCategory, selectedStatus]);

  const handleQuickMarkResolved = async (item: FeedbackItem) => {
    try {
      await api.patch(`/feedback/${item.id}/status/`, {
        status: 'RESOLVED',
        resolution_note: 'Marked as resolved by ' + (user?.name || 'Coordinator')
      });
      setActionSuccessMessage(`Feedback ticket ${item.feedback_code} marked as Resolved.`);
      fetchAnalytics();
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      alert('Failed to resolve feedback: ' + (err?.message || 'Error'));
    }
  };

  const handleConfirmDeleteRecord = async () => {
    if (!deleteModalRecord) return;
    setDeletingRecord(true);
    const target = deleteModalRecord;
    try {
      const targetId = target.id || target.feedback_code;
      // Optimistic removal: ticket vanishes immediately from the table
      setRecentRecords(prev => prev.filter(r => r.id !== target.id && r.feedback_code !== target.feedback_code));
      setDeleteModalRecord(null);

      await api.delete(`/feedback/${targetId}/`);
      broadcastLiveSync('/feedback/');
      setActionSuccessMessage(`Feedback ticket ${target.feedback_code} permanently deleted.`);
      fetchAnalytics();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      fetchAnalytics();
      alert('Failed to delete feedback record: ' + (err?.message || 'Error'));
    } finally {
      setDeletingRecord(false);
    }
  };

  const hasActiveFilters = selectedCategory !== 'ALL' || selectedStatus !== 'ALL';

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
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
        alert('Pop-up blocked. Please allow pop-ups to view PDF report.');
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
          <title>MITCORER Feedback Analytics & Quality Audit Report</title>
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
            <div>MAEER's MITCORER Barshi — Quality Audit Report</div>
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

  // Prepare Bar Chart Data (Category Distribution)
  const categoryChartData = useMemo(() => {
    if (!analytics) return [];
    const sourceCounts = (hasActiveFilters && analytics.activeFilter)
      ? analytics.activeFilter.filteredCategoryCounts
      : analytics.categoryCounts;

    return [
      { category: 'General', key: 'GENERAL', count: sourceCounts.GENERAL || 0, fill: CATEGORY_META.GENERAL.color },
      { category: 'Bugs / Tech', key: 'BUG', count: sourceCounts.BUG || 0, fill: CATEGORY_META.BUG.color },
      { category: 'Feature Req', key: 'FEATURE_REQUEST', count: sourceCounts.FEATURE_REQUEST || 0, fill: CATEGORY_META.FEATURE_REQUEST.color },
      { category: 'Improvement', key: 'IMPROVEMENT', count: sourceCounts.IMPROVEMENT || 0, fill: CATEGORY_META.IMPROVEMENT.color },
      { category: 'UX Feedback', key: 'UX', count: sourceCounts.UX || 0, fill: CATEGORY_META.UX.color },
    ];
  }, [analytics, hasActiveFilters]);

  // Prepare Pie Chart Data (Status Distribution)
  const statusPieData = useMemo(() => {
    if (!analytics) return [];
    const sourceCounts = (hasActiveFilters && analytics.activeFilter)
      ? analytics.activeFilter.filteredStatusCounts
      : analytics.statusCounts;

    return [
      { name: 'Submitted', key: 'SUBMITTED', value: sourceCounts.SUBMITTED || 0, color: STATUS_META.SUBMITTED.color },
      { name: 'Under Review', key: 'UNDER_REVIEW', value: sourceCounts.UNDER_REVIEW || 0, color: STATUS_META.UNDER_REVIEW.color },
      { name: 'In Progress', key: 'IN_PROGRESS', value: sourceCounts.IN_PROGRESS || 0, color: STATUS_META.IN_PROGRESS.color },
      { name: 'Resolved', key: 'RESOLVED', value: sourceCounts.RESOLVED || 0, color: STATUS_META.RESOLVED.color },
      { name: 'Closed', key: 'CLOSED', value: sourceCounts.CLOSED || 0, color: STATUS_META.CLOSED.color },
    ].filter(d => d.value > 0);
  }, [analytics, hasActiveFilters]);

  if (loading && !analytics) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading feedback analytics &amp; charts...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const displayTotalCount = hasActiveFilters && analytics.activeFilter
    ? analytics.activeFilter.filteredCount
    : analytics.totalCount;

  const displayAvgOverall = hasActiveFilters && analytics.activeFilter
    ? analytics.activeFilter.filteredAvgOverall
    : analytics.avgOverall;

  const getStatusBadge = (status: string) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Panel Top Header Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary)' }} /> Feedback Analytics &amp; Recharts Insights
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              Live DB
            </span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Real-time charts visualizing category volume, status lifecycles, and institutional resolution performance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Export PDF Report
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="card" style={{ backgroundColor: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '12px 16px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Active Filtering Toolbar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
            Filter Charts:
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {hasActiveFilters ? (
              <strong style={{ color: 'var(--primary)' }}>Active Filter View ({displayTotalCount} matching records)</strong>
            ) : (
              'All-Time Summary View'
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '150px', padding: '6px 28px 6px 10px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Categories</option>
              <option value="BUG">Bugs / Technical</option>
              <option value="FEATURE_REQUEST">Feature Requests</option>
              <option value="IMPROVEMENT">Improvements</option>
              <option value="GENERAL">General Feedback</option>
              <option value="UX">UX Feedback</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '140px', padding: '6px 28px 6px 10px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              title="Reset to All-Time Summary"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn btn-outline btn-sm"
            title="Refresh Data"
            style={{ padding: '6px 10px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Matches Dashboard Standard Stat Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Total Submissions */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <p className="stat-label">{hasActiveFilters ? 'Filtered Records' : 'Total Submissions'}</p>
              <h3 className="stat-value">{displayTotalCount}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {hasActiveFilters ? `Out of ${analytics.totalCount} total` : 'Live database tickets'}
              </p>
            </div>
            <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}>
              <MessageSquare size={22} />
            </div>
          </div>
        </div>

        {/* Avg Overall Rating */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <p className="stat-label">Avg Overall Rating</p>
              <h3 className="stat-value" style={{ color: '#d97706' }}>
                {displayAvgOverall} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 5.0</span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Usability: {analytics.avgUsability} | Perf: {analytics.avgPerformance}
              </p>
            </div>
            <div style={{ background: 'var(--warning-bg)', padding: '12px', borderRadius: '12px', color: 'var(--warning)' }}>
              <Star size={22} />
            </div>
          </div>
        </div>

        {/* Resolved Issues */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <p className="stat-label">Resolved Issues</p>
              <h3 className="stat-value" style={{ color: 'var(--success)' }}>
                {hasActiveFilters && analytics.activeFilter 
                  ? (analytics.activeFilter.filteredStatusCounts.RESOLVED || 0)
                  : analytics.resolvedCount}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Avg Turnaround: {analytics.avgResolutionHours} hrs
              </p>
            </div>
            <div style={{ background: 'var(--success-bg)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Bugs & Technical */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <p className="stat-label">Bugs &amp; Technical</p>
              <h3 className="stat-value" style={{ color: 'var(--danger)' }}>
                {hasActiveFilters && analytics.activeFilter
                  ? (analytics.activeFilter.filteredCategoryCounts.BUG || 0)
                  : (analytics.categoryCounts.BUG || 0)}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Feature Requests: {hasActiveFilters && analytics.activeFilter
                  ? (analytics.activeFilter.filteredCategoryCounts.FEATURE_REQUEST || 0)
                  : (analytics.categoryCounts.FEATURE_REQUEST || 0)}
              </p>
            </div>
            <div style={{ background: 'var(--danger-bg)', padding: '12px', borderRadius: '12px', color: 'var(--danger)' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid: Bar Chart + Pie Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Recharts Bar Chart: Categories Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} style={{ color: 'var(--primary)' }} /> Feedback Categories Breakdown
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Volume across Bugs, Feature Requests, Improvements, General, and UX
              </p>
            </div>
            {selectedCategory !== 'ALL' && (
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                Filtered: {selectedCategory}
              </span>
            )}
          </div>

          <div style={{ width: '100%', height: 280, marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Tickets">
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Pie Chart: Status Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieIcon size={16} style={{ color: 'var(--primary)' }} /> Status Distribution
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Lifecycle distribution across resolution stages
              </p>
            </div>
            {selectedStatus !== 'ALL' && (
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                Filtered: {selectedStatus}
              </span>
            )}
          </div>

          <div style={{ width: '100%', height: 280, marginTop: '10px' }}>
            {statusPieData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No status records available for selected filters
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-md)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span style={{ color: 'var(--text-primary)', fontSize: '11px', marginRight: '8px' }}>{val}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Feedback Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Recent Feedback Records ({recentRecords.length})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Click any record to inspect the full discussion thread or reply
            </p>
          </div>
        </div>

        <div className="table-responsive" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Code</th>
                <th style={{ minWidth: '150px' }}>User</th>
                <th style={{ width: '140px' }}>Category</th>
                <th style={{ width: '120px' }}>Rating</th>
                <th style={{ minWidth: '220px' }}>Subject</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '110px' }}>Responses</th>
                <th style={{ width: '190px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No recent feedback records matching criteria.
                  </td>
                </tr>
              ) : (
                recentRecords.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => onSelectFeedback && onSelectFeedback(r)}
                    style={{ cursor: onSelectFeedback ? 'pointer' : 'default' }}
                  >
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {r.feedback_code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user_role}</div>
                    </td>
                    <td>{getCategoryBadge(r.category)}</td>
                    <td>
                      <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
                        {'★'.repeat(r.overall_rating)}{'☆'.repeat(5 - r.overall_rating)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.subject}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.affected_page}</div>
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {(r.responses || []).length} reply(s)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFeedback && onSelectFeedback(r);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View Details & Discussion Thread"
                        >
                          <Eye size={13} /> View
                        </button>
                        {r.status !== 'RESOLVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickMarkResolved(r);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Mark as Resolved"
                          >
                            <CheckCircle2 size={13} /> Resolve
                          </button>
                        )}
                        {(isAdminOrCoord || (user?.role === 'STUDENT' && r.user_id === user?.id)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalRecord(r);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Delete this ticket"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalRecord && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Delete Feedback Ticket?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Tracking Code: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{deleteModalRecord.feedback_code}</strong>
                </p>
              </div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '0.825rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                "{deleteModalRecord.subject}"
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Submitted by: <strong>{deleteModalRecord.user_name}</strong> ({deleteModalRecord.user_role})
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete this feedback ticket? If it is resolved or junk/spam, it will be permanently deleted and recorded in security audit logs.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalRecord(null)}
                className="btn btn-outline"
                disabled={deletingRecord}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                className="btn btn-danger"
                disabled={deletingRecord}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                {deletingRecord ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
