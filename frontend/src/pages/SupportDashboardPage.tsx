// Support Dashboard for L2+L3 Dispute Resolution
// Dashboard for support team to manage escalated disputes

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './SupportDashboardPage.css';

interface DashboardStats {
  open_l2: number;
  in_progress_l2: number;
  pending_l3: number;
  avg_resolution_hours: number;
  total_l2_resolved: number;
  total_l3_resolved: number;
}

interface QueueItem {
  queue_id: number;
  dispute_id: number;
  priority: number;
  category: string;
  status: string;
  created_at: string;
  task_id: number;
  amount: number;
  level: number;
}

const SupportDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'l2' | 'l3'>('dashboard');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsRes = await api.get('/disputes/dashboard/stats');
      setStats(statsRes.data.data);

      // Fetch queue
      const queueRes = await api.get('/disputes/dashboard/queue');
      setQueue(queueRes.data.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="support-dashboard">
      <h1>Support Dashboard</h1>

      {/* KPI Cards */}
      <div className="kpi-section">
        <div className="kpi-card">
          <div className="kpi-value">{stats?.open_l2 || 0}</div>
          <div className="kpi-label">Open L2 Disputes</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-value">{stats?.in_progress_l2 || 0}</div>
          <div className="kpi-label">In Progress</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-value">{stats?.pending_l3 || 0}</div>
          <div className="kpi-label">Pending Appeals</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-value">{Math.round(stats?.avg_resolution_hours || 0)}h</div>
          <div className="kpi-label">Avg Resolution</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-value">{stats?.total_l2_resolved || 0}</div>
          <div className="kpi-label">L2 Resolved</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-value">{stats?.total_l3_resolved || 0}</div>
          <div className="kpi-label">L3 Resolved</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          Queue ({queue.length})
        </button>
        <button
          className={`tab ${activeTab === 'l2' ? 'active' : ''}`}
          onClick={() => setActiveTab('l2')}
        >
          My L2 Assignments
        </button>
        <button
          className={`tab ${activeTab === 'l3' ? 'active' : ''}`}
          onClick={() => setActiveTab('l3')}
        >
          My L3 Assignments
        </button>
      </div>

      {/* Queue Table */}
      {activeTab === 'queue' && (
        <div className="queue-section">
          <h2>Support Queue</h2>
          {queue.length === 0 ? (
            <p className="empty-state">No disputes in queue</p>
          ) : (
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Dispute ID</th>
                  <th>Errand</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.queue_id} className={`priority-${item.priority}`}>
                    <td>
                      <span className="priority-badge">{item.priority}</span>
                    </td>
                    <td>#{item.dispute_id}</td>
                    <td>Errand #{item.task_id}</td>
                    <td>${item.amount}</td>
                    <td>{item.category}</td>
                    <td>L{item.level}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>{item.status}</span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <a href={`/disputes/${item.dispute_id}`} className="action-link">
                        Review
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="overview-section">
          <h2>Quick Stats</h2>
          <div className="overview-grid">
            <div className="stat-group">
              <h3>Resolution Performance</h3>
              <p>Avg Time: {Math.round(stats?.avg_resolution_hours || 0)} hours</p>
              <p>L2 Resolved: {stats?.total_l2_resolved || 0}</p>
              <p>L3 Resolved: {stats?.total_l3_resolved || 0}</p>
            </div>

            <div className="stat-group">
              <h3>Current Workload</h3>
              <p>Open L2: {stats?.open_l2 || 0}</p>
              <p>In Progress: {stats?.in_progress_l2 || 0}</p>
              <p>Pending Appeals: {stats?.pending_l3 || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for L2/L3 tabs - will load assignments from API */}
      {(activeTab === 'l2' || activeTab === 'l3') && (
        <div className="assignments-section">
          <h2>{activeTab === 'l2' ? 'L2' : 'L3'} Assignments</h2>
          <p className="placeholder-text">Loading your assignments...</p>
        </div>
      )}
    </div>
  );
};

export default SupportDashboardPage;
