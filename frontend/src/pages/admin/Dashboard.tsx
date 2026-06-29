import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [kpis] = useState([
    { title: 'Platform Health', value: '98.5%', change: '+2.3%', icon: '💚', trend: 'up' },
    { title: 'Revenue', value: '$24.5K', change: '+15.2%', icon: '💰', trend: 'up' },
    { title: 'Active Users', value: '2.8K', change: '+8.1%', icon: '👥', trend: 'up' },
    { title: 'Rating', value: '4.8★', change: '+0.1★', icon: '⭐', trend: 'up' },
  ]);

  const [alerts] = useState([
    { id: 1, type: 'warning', message: '5 open disputes waiting', icon: '⚠️' },
    { id: 2, type: 'success', message: 'Weekly report ready', icon: '✅' },
  ]);

  const [recentActivity] = useState([
    { id: 1, event: '✅ Task Completed', user: 'Sarah → John', time: '2m ago' },
    { id: 2, event: '💬 Dispute Filed', user: 'Incomplete work', time: '15m ago' },
    { id: 3, event: '👤 New User', user: 'Alice Wong joined', time: '1h ago' },
    { id: 4, event: '🎯 Category Update', user: 'Cleaning +12%', time: '2h ago' },
  ]);

  return (
    <AdminLayout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>👋 Welcome Back!</h1>
          <p>Here's what's happening on the platform today</p>
        </div>

        {/* KPI Grid - Compact and Happy */}
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="kpi-card">
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-info">
                <div className="kpi-label">{kpi.title}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-change up">↑ {kpi.change}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts - Compact */}
        <div className="alerts-box">
          <h2>🔔 Quick Alerts</h2>
          <div className="alerts-compact">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-row alert-${alert.type}`}>
                <span className="alert-icon">{alert.icon}</span>
                <span className="alert-text">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed - Compact */}
        <div className="activity-box">
          <h2>📊 Recent Activity</h2>
          <div className="activity-compact">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-row">
                <div className="activity-left">
                  <span className="activity-event">{activity.event}</span>
                  <span className="activity-user">{activity.user}</span>
                </div>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 0;
        }

        .dashboard-header {
          margin-bottom: 8px;
        }

        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #fff;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .dashboard-header p {
          font-size: 14px;
          color: #a0aec0;
          margin: 0;
        }

        /* KPI Grid - Compact 2x2 or 4x1 */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .kpi-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.25);
        }

        .kpi-icon {
          font-size: 28px;
          min-width: 28px;
        }

        .kpi-info {
          flex: 1;
        }

        .kpi-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .kpi-value {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
        }

        .kpi-change {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .kpi-change.up {
          color: #4ade80;
        }

        /* Alerts - Compact */
        .alerts-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alerts-box h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          color: #fff;
        }

        .alerts-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .alert-warning {
          background: rgba(251, 146, 60, 0.15);
          color: #fed7aa;
          border-left: 3px solid #fb923c;
        }

        .alert-success {
          background: rgba(74, 222, 128, 0.15);
          color: #bbf7d0;
          border-left: 3px solid #4ade80;
        }

        .alert-icon {
          font-size: 16px;
          min-width: 16px;
        }

        .alert-text {
          flex: 1;
        }

        /* Activity Feed - Compact */
        .activity-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-box h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          color: #fff;
        }

        .activity-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-radius: 8px;
          border: 1px solid rgba(102, 126, 234, 0.2);
          transition: all 0.2s;
        }

        .activity-row:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border-color: rgba(102, 126, 234, 0.4);
        }

        .activity-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .activity-event {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
        }

        .activity-user {
          font-size: 12px;
          color: #a0aec0;
        }

        .activity-time {
          font-size: 11px;
          color: #718096;
          white-space: nowrap;
          margin-left: 12px;
        }

        /* Mobile - Stacked Layout */
        @media (max-width: 768px) {
          .dashboard {
            gap: 16px;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header h1 {
            font-size: 22px;
          }

          .activity-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .activity-time {
            margin-left: 0;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;
