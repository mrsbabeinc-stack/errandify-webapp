import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [criticalAlerts] = useState([
    { id: 1, severity: 'critical', icon: '⚠️', title: 'Overdue Cases (>4h)', metric: '5', impact: 'SGD $450', action: 'Resolve', color: '#dc2626', bg: '#fee2e2' },
    { id: 2, severity: 'critical', icon: '🚨', title: 'Payment Failed', metric: '3', impact: 'SGD $890', action: 'Fix', color: '#991b1b', bg: '#fecaca' },
  ]);

  const [metrics] = useState([
    { label: 'Health', value: '98.5%', trend: '+2.1%', icon: '💚', color: '#10b981', bg: '#d1fae5' },
    { label: 'Revenue', value: 'SGD $2.4K', trend: '+18%', icon: '💰', color: '#0891b2', bg: '#cffafe' },
    { label: 'Transactions', value: '847', trend: '+12.4%', icon: '📈', color: '#6366f1', bg: '#e0e7ff' },
    { label: 'Rating', value: '4.8★', trend: '+0.3', icon: '⭐', color: '#f59e0b', bg: '#fef3c7' },
  ]);

  const [aiInsights] = useState([
    { id: 1, category: 'ALERT', title: 'Suspicious User #4521', desc: '15 disputes in 48h', action: 'Review', color: '#ef4444', bg: '#fee2e2', icon: '🚩' },
    { id: 2, category: 'TREND', title: 'Refund Spike +23%', desc: 'Payment method X issues', action: 'Investigate', color: '#f59e0b', bg: '#fef3c7', icon: '📊' },
    { id: 3, category: 'OPPORTUNITY', title: '24 Premium Doers Ready', desc: '50+ 5-star reviews', action: 'Engage', color: '#06b6d4', bg: '#cffafe', icon: '👑' },
  ]);

  const [operationalStatus] = useState([
    { area: 'Cases', pending: 12, inProgress: 28, completed: 340, sla: '96%', color: '#f59e0b' },
    { area: 'Payments', pending: 2, inProgress: 15, completed: 892, sla: '99.2%', color: '#ef4444' },
    { area: 'Support', pending: 8, inProgress: 19, completed: 156, sla: '2.1h', color: '#06b6d4' },
  ]);

  const [recentActivity] = useState([
    { id: 1, icon: '✅', title: 'Case #D26-4521 Resolved', detail: 'SGD $45.20 → Doer', time: '12m', color: '#10b981' },
    { id: 2, icon: '⚠️', title: 'User #7814 Warned', detail: 'False alert #2', time: '28m', color: '#f59e0b' },
    { id: 3, icon: '🔴', title: 'Payment Issue Detected', detail: 'Method X rejection 8.3%', time: '1h', color: '#ef4444' },
  ]);

  return (
    <AdminLayout>
      <div style={{ padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Command Center</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Real-time operations • AI insights • Action required</p>
        </div>

        {/* CRITICAL ALERTS */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔴 Critical - Act Now
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {criticalAlerts.map(alert => (
              <div key={alert.id} style={{
                background: alert.bg,
                border: `2px solid ${alert.color}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      {alert.icon} {alert.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Impact: <strong>{alert.impact}</strong></div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: alert.color, minWidth: '30px', textAlign: 'right' }}>
                    {alert.metric}
                  </div>
                </div>
                <button style={{
                  background: alert.color,
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}>
                  ➜ {alert.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KPI METRICS - COMPACT */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase' }}>📊 Key Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {metrics.map((m, i) => (
              <div key={i} style={{
                background: m.bg,
                border: `2px solid ${m.color}`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: m.color, marginBottom: '2px' }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: m.color, fontWeight: 600 }}>{m.trend}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OPERATIONS STATUS - COMPACT ROW */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase' }}>🏢 Operations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {operationalStatus.map((item, i) => (
              <div key={i} style={{
                background: '#fff',
                border: `2px solid ${item.color}`,
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{item.area}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.completed}</span> done
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: item.color, marginBottom: '2px' }}>
                    {item.pending} ⏳
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>SLA {item.sla}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase' }}>🤖 AI Insights (Qwen)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {aiInsights.map(insight => (
              <div key={insight.id} style={{
                background: insight.bg,
                border: `2px solid ${insight.color}`,
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{insight.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: insight.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {insight.category}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
                      {insight.title}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>{insight.desc}</div>
                <button style={{
                  background: insight.color,
                  color: 'white',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}>
                  {insight.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVITY LOG */}
        <div>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase' }}>📋 Activity</h2>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {recentActivity.map((item, i) => (
              <div key={item.id} style={{
                padding: '12px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: item.color + '08'
              }}>
                <div style={{ fontSize: '16px' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: '10px', color: '#999', fontWeight: 600 }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
