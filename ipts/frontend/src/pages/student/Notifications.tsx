import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, Info, AlertTriangle, Trash2, Check } from 'lucide-react';
import { api } from '../../services/api';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: 'OPPORTUNITY' | 'REPORT_FEEDBACK' | 'DOCUMENT_VERIFIED' | 'TASK_ASSIGNED' | 'SYSTEM';
  is_read: boolean;
  created_at: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filtered = filter === 'ALL' ? notifications : notifications.filter(n => !n.is_read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPORT_FEEDBACK': return <CheckCircle2 size={18} color="#059669" />;
      case 'OPPORTUNITY': return <Bell size={18} color="#2563eb" />;
      case 'DOCUMENT_VERIFIED': return <CheckCircle2 size={18} color="#7c3aed" />;
      case 'TASK_ASSIGNED': return <AlertTriangle size={18} color="#d97706" />;
      default: return <Info size={18} color="#6b7280" />;
    }
  };

  return (
    <div className="portal-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">Stay updated on opportunity announcements, report reviews, document verifications, and coordinator feedback.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
          Unread ({notifications.filter(n => !n.is_read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Bell size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No notifications here
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              You are all caught up! When coordinators review your submissions, updates will appear here.
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
              <div style={{ marginTop: '2px' }}>
                {getIcon(item.notification_type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: item.is_read ? 500 : 600, color: 'var(--text-main)', margin: 0 }}>
                    {item.title}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {item.created_at}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 0.5rem' }}>
                  {item.message}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {!item.is_read && (
                    <button 
                      onClick={() => markAsRead(item.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Mark as Read
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(item.id)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    Dismiss
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
