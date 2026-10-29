import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Info, AlertTriangle, Check, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type?: string;
  notification_type?: 'OPPORTUNITY' | 'REPORT_FEEDBACK' | 'DOCUMENT_VERIFIED' | 'TASK_ASSIGNED' | 'SYSTEM' | string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications/');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read/', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read/`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  };

  const resolveNotificationLink = (item: NotificationItem): string | null => {
    if (item.link) return item.link;
    const role = user?.role || 'STUDENT';
    const nType = String(item.notification_type || item.type || '').toUpperCase();
    const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();

    if (role === 'COORDINATOR') {
      if (nType.includes('REPORT') || text.includes('report')) return '/coordinator/progress-reports';
      if (nType.includes('DOCUMENT') || text.includes('certificate') || text.includes('document')) return '/coordinator/documents';
      if (nType.includes('OPPORTUNITY') || text.includes('opportunity')) return '/coordinator/opportunities';
      if (text.includes('application')) return '/coordinator/applications';
      if (text.includes('completion')) return '/coordinator/completions';
      if (text.includes('student')) return '/coordinator/students';
      return '/coordinator';
    }
    if (role === 'ADMIN') {
      if (text.includes('opportunity')) return '/admin/opportunities';
      if (text.includes('report')) return '/admin/reports';
      if (text.includes('certificate') || text.includes('document')) return '/admin/documents';
      return '/admin';
    }
    if (nType.includes('REPORT') || text.includes('report')) return '/student/reports';
    if (nType.includes('DOCUMENT') || text.includes('certificate') || text.includes('document')) return '/student/documents';
    if (nType.includes('OPPORTUNITY') || text.includes('opportunity')) return '/student/opportunities';
    if (text.includes('application')) return '/student/applications';
    return '/student';
  };

  const handleViewNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    const target = resolveNotificationLink(item);
    if (target) {
      navigate(target);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const filtered = filter === 'ALL' ? notifications : notifications.filter((n) => !n.is_read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPORT_FEEDBACK':
        return <CheckCircle2 size={18} color="#059669" />;
      case 'OPPORTUNITY':
        return <Bell size={18} color="#2563eb" />;
      case 'DOCUMENT_VERIFIED':
        return <CheckCircle2 size={18} color="#7c3aed" />;
      case 'TASK_ASSIGNED':
        return <AlertTriangle size={18} color="#d97706" />;
      default:
        return <Info size={18} color="#6b7280" />;
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">
            Stay updated on student report submissions, document verifications, opportunity approvals, and portal alerts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <Check size={16} />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setFilter('ALL')}
          className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem', padding: '6px 16px' }}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`btn ${filter === 'UNREAD' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem', padding: '6px 16px' }}
        >
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Bell size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No notifications here
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              You are all caught up! New student submissions, reviews, and system alerts will appear here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                backgroundColor: item.is_read ? 'var(--bg-card)' : '#f8fafc',
                borderLeft: item.is_read ? '1px solid var(--border-light)' : '4px solid var(--primary)',
                padding: '1.25rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ marginTop: '2px' }}>{getIcon(item.notification_type || item.type || 'SYSTEM')}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: item.is_read ? 500 : 700, color: 'var(--text-main)', margin: 0 }}>
                    {item.title}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {item.created_at ? String(item.created_at).replace('T', ' ').slice(0, 16) : ''}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 0.65rem' }}>
                  {item.message}
                </p>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleViewNotification(item)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={12} /> View Notification
                  </button>
                  {!item.is_read && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
