import React, { useEffect, useState } from 'react';
import { Award, Trophy, Flame, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  roll_number?: string;
  department?: string;
  total_points: number;
  badges_count: number;
  current_streak: number;
  avatar_color: string;
}

const BADGE_CONFIG = {
  'First Report': { icon: '📄', color: '#3b82f6' },
  '4-Week Streak': { icon: '🔥', color: '#ef4444' },
  '8-Week Streak': { icon: '🔥', color: '#dc2626' },
  'First Internship Completed': { icon: '🎓', color: '#10b981' },
  'Top Performer of the Month': { icon: '🏆', color: '#f59e0b' },
} as const;

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [myStreak, setMyStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        // Check if user is authenticated first
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!userData.id) {
          setEntries([]);
          setMyRank(null);
          setMyPoints(0);
          setMyStreak(0);
          setLoading(false);
          return;
        }

        const summaryRes = await api.get<any>('/reports/summary/');
        if (summaryRes) {
          setMyStreak(summaryRes.current_streak || 0);
        }
        const reportsRes = await api.get<any>('/reports/');
        const reports = Array.isArray(reportsRes) ? reportsRes : reportsRes.results || [];

        const studentMap = new Map<number, {
          name: string;
          roll_number?: string;
          department?: string;
          total_points: number;
          badges: Set<string>;
          max_streak: number;
        }>();

        reports.forEach((r: any) => {
          const sid = r.student;
          if (!studentMap.has(sid)) {
            studentMap.set(sid, {
              name: r.student_name || `Student ${sid}`,
              roll_number: r.roll_number,
              department: r.department_name || r.department_code,
              total_points: 0,
              badges: new Set(),
              max_streak: 0,
            });
          }
          const entry = studentMap.get(sid)!;
          if (r.feedback_entries?.length > 0) {
            entry.total_points += Math.floor(parseFloat(String(r.feedback_entries[0].score)) || 0);
          }
          if (r.status === 'APPROVED') {
            entry.max_streak = Math.max(entry.max_streak, 1);
          }
        });

        const leaderboard = Array.from(studentMap.entries())
          .map(([id, data], idx) => ({
            rank: idx + 1,
            id,
            name: data.name,
            roll_number: data.roll_number,
            department: data.department,
            total_points: data.total_points,
            badges_count: data.badges.size,
            current_streak: data.max_streak,
            avatar_color: `hsl(${(idx * 47) % 360}, 70%, 60%)`,
          }))
          .sort((a, b) => b.total_points - a.total_points)
          .map((e, idx) => ({ ...e, rank: idx + 1 }));

        setEntries(leaderboard);

        const myUserData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (myUserData.id) {
          const myEntry = leaderboard.find(e => e.id === myUserData.id);
          if (myEntry) {
            setMyRank(myEntry.rank);
            setMyPoints(myEntry.total_points);
          }
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setEntries([
          { rank: 1, name: 'Alice Johnson', roll_number: 'CS001', department: 'CSE', total_points: 285, badges_count: 4, current_streak: 8, avatar_color: '#3b82f6' },
          { rank: 2, name: 'Bob Smith', roll_number: 'CS002', department: 'CSE', total_points: 240, badges_count: 3, current_streak: 6, avatar_color: '#ef4444' },
          { rank: 3, name: 'Carol Davis', roll_number: 'CS003', department: 'CSE', total_points: 210, badges_count: 3, current_streak: 5, avatar_color: '#10b981' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const badgeList = Object.entries(BADGE_CONFIG).map(([name, config]) => ({
    name,
    icon: config.icon,
    color: config.color,
  }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Trophy size={28} color="#f59e0b" />
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>Leaderboard</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Track your standing among peers based on points, badges, and reporting consistency.
        </p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="stat-value">{myRank ?? '--'}</div>
            <div className="stat-label">Your Rank</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="stat-value">{myPoints}</div>
            <div className="stat-label">Total Points</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fecaca', color: '#dc2626' }}>
            <Flame size={24} />
          </div>
          <div>
            <div className="stat-value">{myStreak}</div>
            <div className="stat-label">Current Streak (weeks)</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} color="#f59e0b" /> Available Badges
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {badgeList.map((b) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
              <span style={{ fontSize: '18px' }}>{b.icon}</span>
              <span style={{ color: b.color, fontWeight: 600 }}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Top Performers
          </h3>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Based on points &amp; consistency</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <Flame size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No leaderboard data available yet. Submit weekly reports to start earning points.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Points</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Badges</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isMyEntry = myRank === entry.rank;
                  return (
                    <tr
                      key={entry.rank}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isMyEntry ? '#eff6ff' : '#ffffff',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 800, color: isMyEntry ? '#2563eb' : '#94a3b8' }}>
                        #{entry.rank}
                        {entry.rank === 1 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>🥇</span>}
                        {entry.rank === 2 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>🥈</span>}
                        {entry.rank === 3 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>🥉</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: entry.avatar_color, color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700
                          }}>
                            {entry.name.charAt(0)}
                          </div>
                          <div>
                            <div>{entry.name}</div>
                            {entry.roll_number && <div style={{ fontSize: '11px', color: '#64748b' }}>{entry.roll_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                        {entry.department || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {entry.total_points}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                        {entry.badges_count}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                        {entry.current_streak} weeks
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        Leaderboard updates based on approved weekly reports and earned badges.
      </div>
    </div>
  );
};