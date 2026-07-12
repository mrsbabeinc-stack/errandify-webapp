import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [actionItems] = useState([
    { id: 1, priority: 'critical', title: '5 Disputes Need Review', desc: 'Urgent action required', icon: '🚨', action: 'Review Now' },
    { id: 2, priority: 'high', title: '12 New User Reports', desc: 'Safety issues flagged', icon: '👁️', action: 'Check Now' },
    { id: 3, priority: 'high', title: 'Payment Processing Failed', desc: '3 transactions stuck', icon: '💳', action: 'Resolve' },
  ]);

  const [kpis] = useState([
    { title: 'Health', value: '98.5%', icon: '💚', sparkline: [95, 96, 97, 98, 98.5] },
    { title: 'Revenue', value: '$24.5K', icon: '💰', sparkline: [20, 21, 22, 23, 24.5] },
    { title: 'Users', value: '2.8K', icon: '👥', sparkline: [2.5, 2.6, 2.65, 2.7, 2.8] },
    { title: 'Rating', value: '4.8★', icon: '⭐', sparkline: [4.6, 4.65, 4.7, 4.75, 4.8] },
  ]);

  const [recentActivity] = useState([
    { id: 1, event: '✅ Task Completed', user: 'Sarah → John', time: '2m' },
    { id: 2, event: '💬 Dispute Filed', user: 'Incomplete work', time: '15m' },
    { id: 3, event: '👤 New User', user: 'Alice joined', time: '1h' },
  ]);

  // Simple sparkline SVG generator
  const Sparkline = ({ data }: { data: number[] }) => {
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const width = 60;
    const height = 24;
    const padding = 2;
    const pointWidth = (width - padding * 2) / (data.length - 1);

    const points = data.map((val, i) => {
      const x = padding + i * pointWidth;
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline">
        <polyline points={points} fill="none" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <AdminLayout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>🎯 Action Center</h1>
          <p>Focus on what matters most right now</p>
        </div>

        {/* CRITICAL ACTIONS - Top Priority */}
        <div className="actions-box">
          <h2>⚡ Urgent Actions</h2>
          <div className="actions-list">
            {actionItems.map((item) => (
              <div key={item.id} className={`action-card priority-${item.priority}`}>
                <div className="action-icon">{item.icon}</div>
                <div className="action-content">
                  <div className="action-title">{item.title}</div>
                  <div className="action-desc">{item.desc}</div>
                </div>
                <button className="action-btn">{item.action}</button>
              </div>
            ))}
          </div>
        </div>

        {/* COMPACT KPI SECTION WITH SPARKLINES */}
        <div className="kpi-compact-section">
          <h2>📊 Key Metrics</h2>
          <div className="kpi-compact-grid">
            {kpis.map((kpi) => (
              <div key={kpi.title} className="kpi-compact-card">
                <div className="kpi-header">
                  <span className="kpi-icon">{kpi.icon}</span>
                  <span className="kpi-title">{kpi.title}</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-value-big">{kpi.value}</div>
                  <Sparkline data={kpi.sparkline} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIVITY - Ultra Compact */}
        <div className="quick-activity">
          <h2>📈 Recent</h2>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.id} className="activity-compact-row">
                <span className="activity-emoji">{item.event.split(' ')[0]}</span>
                <div className="activity-text">
                  <span className="activity-title">{item.event}</span>
                  <span className="activity-sub">{item.user}</span>
                </div>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 0;
        }

        .dashboard-header {
          margin-bottom: 4px;
        }

        .dashboard-header h1 {
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 2px 0;
          color: #ff6b35;
        }

        .dashboard-header p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }

        /* ACTION ITEMS - URGENT */
        .actions-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .actions-box h2 {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .actions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .action-card.priority-critical {
          background: #fff4f0;
          border-left-color: #ff3333;
        }

        .action-card.priority-critical:hover {
          background: #ffebeb;
          box-shadow: 0 2px 8px rgba(255, 51, 51, 0.15);
        }

        .action-card.priority-high {
          background: #fff9f5;
          border-left-color: #ff6b35;
        }

        .action-card.priority-high:hover {
          background: #fff0e6;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15);
        }

        .action-icon {
          font-size: 20px;
          min-width: 20px;
        }

        .action-content {
          flex: 1;
          min-width: 0;
        }

        .action-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .action-desc {
          font-size: 11px;
          color: #999;
        }

        .action-btn {
          padding: 6px 12px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #ff5722;
          box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
        }

        /* COMPACT KPI SECTION */
        .kpi-compact-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kpi-compact-section h2 {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-compact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
        }

        .kpi-compact-card {
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          border-radius: 8px;
          padding: 12px;
          color: white;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15);
          transition: all 0.2s;
        }

        .kpi-compact-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
        }

        .kpi-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .kpi-icon {
          font-size: 16px;
        }

        .kpi-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          opacity: 0.9;
        }

        .kpi-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .kpi-value-big {
          font-size: 18px;
          font-weight: 700;
        }

        .sparkline {
          filter: drop-shadow(0 1px 2px rgba(255, 255, 255, 0.2));
        }

        /* QUICK ACTIVITY */
        .quick-activity {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .quick-activity h2 {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .activity-compact-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.06), rgba(255, 140, 66, 0.04));
          border-radius: 6px;
          border: 1px solid rgba(255, 107, 53, 0.1);
          font-size: 12px;
        }

        .activity-emoji {
          font-size: 14px;
          min-width: 14px;
        }

        .activity-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .activity-title {
          font-weight: 600;
          color: #333;
          font-size: 12px;
        }

        .activity-sub {
          font-size: 11px;
          color: #888;
        }

        .activity-time {
          font-size: 10px;
          color: #aaa;
          white-space: nowrap;
        }

        /* Mobile - Stack vertically */
        @media (max-width: 768px) {
          .dashboard {
            gap: 12px;
          }

          .kpi-compact-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-header h1 {
            font-size: 20px;
          }

          .action-card {
            flex-wrap: wrap;
          }

          .action-btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;
