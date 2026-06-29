import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

interface KPICard {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

export const AdminDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPICard[]>([
    { title: 'Platform Health', value: '98.5%', change: '+2.3%', icon: '💚', trend: 'up' },
    { title: 'Total Revenue', value: '$24.5K', change: '+15.2%', icon: '💰', trend: 'up' },
    { title: 'Active Users', value: '2,847', change: '+8.1%', icon: '👥', trend: 'up' },
    { title: 'Average Rating', value: '4.8★', change: '+0.1★', icon: '⭐', trend: 'up' },
  ]);

  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: '5 open disputes awaiting resolution', timestamp: '5 min ago' },
    { id: 2, type: 'info', message: 'Weekly report available', timestamp: '1 hour ago' },
  ]);

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, event: '✅ Task Completed', user: 'Sarah Tan → John Lee', time: '2 min ago' },
    { id: 2, event: '💬 Dispute Filed', user: 'Complaint: Incomplete work', time: '15 min ago' },
    { id: 3, event: '👤 New User', user: 'Alice Wong registered', time: '1 hour ago' },
    { id: 4, event: '🎯 Category Updated', user: 'Cleaning category GMV +12%', time: '2 hours ago' },
  ]);

  return (
    <AdminLayout>
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>Dashboard Overview</h1>
          <p>Platform health & key metrics at a glance</p>
        </header>

        {/* KPI Cards */}
        <section className="kpi-section">
          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <div key={kpi.title} className="kpi-card">
                <div className="kpi-icon">{kpi.icon}</div>
                <div className="kpi-content">
                  <h3>{kpi.title}</h3>
                  <div className="kpi-value">{kpi.value}</div>
                  <div className={`kpi-change ${kpi.trend}`}>
                    {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Alerts */}
        <section className="alerts-section">
          <h2>Safety Alerts</h2>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert alert-${alert.type}`}>
                <div className="alert-content">
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-event">{activity.event}</div>
                <div className="activity-details">
                  <span className="activity-user">{activity.user}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .dashboard-header {
          margin-bottom: 8px;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #e2e8f0;
        }

        .dashboard-header p {
          font-size: 14px;
          color: #a0aec0;
          margin: 0;
        }

        /* KPI Section */
        .kpi-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          background: linear-gradient(135deg, #1a1f2e, #252d3d);
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          transition: all 0.2s;
        }

        .kpi-card:hover {
          background: linear-gradient(135deg, #1f2535, #2a3245);
          border-color: #4a5568;
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        .kpi-icon {
          font-size: 32px;
          min-width: 40px;
        }

        .kpi-content {
          flex: 1;
        }

        .kpi-content h3 {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e0;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-value {
          font-size: 24px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 4px;
        }

        .kpi-change {
          font-size: 12px;
          font-weight: 600;
          color: #a0aec0;
        }

        .kpi-change.up {
          color: #4ade80;
        }

        .kpi-change.down {
          color: #f87171;
        }

        .kpi-change.neutral {
          color: #60a5fa;
        }

        /* Alerts Section */
        .alerts-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alerts-section h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #e2e8f0;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          border-left: 3px solid;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-warning {
          background: rgba(251, 146, 60, 0.1);
          border-color: #fb923c;
        }

        .alert-info {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .alert-content {
          flex: 1;
        }

        .alert-message {
          font-size: 13px;
          color: #e2e8f0;
          margin: 0;
          font-weight: 500;
        }

        .alert-time {
          font-size: 11px;
          color: #718096;
        }

        /* Activity Section */
        .activity-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-section h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #e2e8f0;
        }

        .activity-list {
          background: linear-gradient(135deg, #1a1f2e, #252d3d);
          border: 1px solid #2d3748;
          border-radius: 8px;
          overflow: hidden;
        }

        .activity-item {
          padding: 16px;
          border-bottom: 1px solid #2d3748;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-item:hover {
          background: rgba(255,255,255,0.02);
        }

        .activity-event {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .activity-details {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 12px;
        }

        .activity-user {
          color: #a0aec0;
        }

        .activity-time {
          color: #718096;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .dashboard {
            gap: 24px;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header h1 {
            font-size: 22px;
          }

          .activity-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;
