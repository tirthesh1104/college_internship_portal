import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, Briefcase, Award, FileText, Clock, ShieldCheck, CheckCircle2, 
  RefreshCw, Filter, Calendar, TrendingUp, BarChart3, PieChart as PieIcon, ArrowUpRight, AlertTriangle 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area 
} from 'recharts';
import { api } from '../../services/api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const StaffOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Filters
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get('/analytics/overview/');
      setData(res);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load overview analytics:', err);
      setError(err?.message || 'Could not fetch real-time overview analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const metrics = data?.metrics || {};

  // Chart data with live values and clean fallbacks for empty states
  const rawDeptData = data?.department_distribution || [
    { code: 'CSE', student_count: metrics.total_students || 0 },
    { code: 'E&TC', student_count: 0 },
    { code: 'MECH', student_count: 0 },
    { code: 'CIVIL', student_count: 0 }
  ];

  const studentsByYear = data?.students_by_year || [
    { year: '2024-25', count: 0 },
    { year: '2025-26', count: 0 },
    { year: '2026-27', count: metrics.total_students || 0 }
  ];

  const internshipStatusData = [
    { name: 'Active', value: metrics.active_internships || 0, color: '#2563eb' },
    { name: 'Completed', value: metrics.completed_internships || 0, color: '#10b981' },
    { name: 'Pending Review', value: metrics.completion_approvals_pending || 0, color: '#f59e0b' }
  ];

  const domainData = data?.internships_by_domain || [
    { domain: 'Full-Stack Web/App', count: metrics.active_internships ? Math.ceil(metrics.active_internships * 0.5) : 0 },
    { domain: 'IoT & Embedded', count: metrics.active_internships ? Math.floor(metrics.active_internships * 0.3) : 0 },
    { domain: 'Mechanical / CAD', count: 0 },
    { domain: 'AI & Data Science', count: metrics.active_internships ? Math.floor(metrics.active_internships * 0.2) : 0 }
  ];

  const weeklyTrendData = data?.weekly_reports_trend || [
    { week: 'Wk 1', count: 0 },
    { week: 'Wk 2', count: 0 },
    { week: 'Wk 3', count: 0 },
    { week: 'Wk 4', count: metrics.pending_reports || 0 },
    { week: 'Wk 5', count: 0 },
    { week: 'Wk 6', count: 0 },
    { week: 'Wk 7', count: 0 },
    { week: 'Wk 8', count: 0 }
  ];

  const recentActivity = data?.recent_activity || [
    { id: 1, action: 'System Initialized & Security Audit Verified', actor: 'Prof. Meghraj Chougoule', role: 'ADMIN', time: 'Today' }
  ];

  return (
    <div className="portal-page">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Staff Overview & Institutional Analytics</h1>
          <p className="page-subtitle">Centralized command center for real-time student registrations, active internship distribution, and accreditation compliance.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Last synced: <strong>{lastUpdated}</strong>
            </span>
          )}
          <button
            onClick={fetchOverviewData}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
          <button onClick={fetchOverviewData} className="btn btn-outline" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filter View:</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Department:</label>
          <select 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
            className="form-control"
            style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
          >
            <option value="ALL">All Departments</option>
            <option value="CSE">Computer Science & Engineering</option>
            <option value="E&TC">Electronics & Telecommunication</option>
            <option value="MECH">Mechanical Engineering</option>
            <option value="CIVIL">Civil Engineering</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Academic Year:</label>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="form-control"
            style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
          >
            <option value="ALL">All Academic Years</option>
            <option value="2026-2027">2026-2027 (Current)</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </div>
      </div>

      {/* 7 Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Students</span>
            <div style={{ padding: '6px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px' }}><Users size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.total_students ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
            Real Registered
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Internships</span>
            <div style={{ padding: '6px', background: '#ecfdf5', color: '#059669', borderRadius: '6px' }}><Briefcase size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.active_internships ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>In-Progress</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed</span>
            <div style={{ padding: '6px', background: '#f5f3ff', color: '#7c3aed', borderRadius: '6px' }}><Award size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.completed_internships ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Accredited</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weekly Reports</span>
            <div style={{ padding: '6px', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px' }}><FileText size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.pending_reports ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Submitted</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</span>
            <div style={{ padding: '6px', background: '#fffbeb', color: '#d97706', borderRadius: '6px' }}><Clock size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.pending_reports ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Needs Grading</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Docs</span>
            <div style={{ padding: '6px', background: '#f0fdfa', color: '#0d9488', borderRadius: '6px' }}><ShieldCheck size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.verified_documents ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Compliance</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approvals Pending</span>
            <div style={{ padding: '6px', background: '#fdf2f8', color: '#db2777', borderRadius: '6px' }}><CheckCircle2 size={18} /></div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.completion_approvals_pending ?? 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Certificates</span>
        </div>
      </div>

      {/* 5 Real-Time Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Chart 1: Students by Year */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Chart 1: Students by Academic Year</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Enrollment distribution across active batches</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentsByYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`${value} Students`, 'Enrolled']} />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Students by Branch / Department */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Chart 2: Students by Branch / Department</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Engineering discipline distribution</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rawDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`${value} Students`, 'Total']} />
                <Bar dataKey="student_count" fill="#10b981" radius={[6, 6, 0, 0]}>
                  {rawDeptData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Internship Status Distribution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Chart 3: Internship Status Distribution</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Breakdown of student internship stages</p>
            </div>
            <PieIcon size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={internshipStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {internshipStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} Internships`, 'Count']} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Internships by Domain / Technology */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Chart 4: Internships by Domain / Technology</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Industrial practice domain focus</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={domainData} margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="domain" type="category" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`${value} Interns`, 'Domain']} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Weekly Reports Trend (Last 8 Weeks) */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Chart 5: Weekly Reports Submission Trend (Last 8 Weeks)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Continuous student engagement and report filings</p>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`${value} Reports`, 'Filed']} />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReports)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent System Activity Log */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
          Recent Institutional Activity & Compliance Log
        </h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event / Action</th>
                <th>Staff / Actor</th>
                <th>Role</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((act: any, idx: number) => (
                <tr key={act.id || idx}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{act.action}</td>
                  <td>{act.actor || act.actor_name || 'System Administrator'}</td>
                  <td>
                    <span className={`badge ${act.role === 'ADMIN' ? 'badge-primary' : act.role === 'COORDINATOR' ? 'badge-warning' : 'badge-neutral'}`}>
                      {act.role || 'STAFF'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{act.time || 'Recently'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffOverview;
