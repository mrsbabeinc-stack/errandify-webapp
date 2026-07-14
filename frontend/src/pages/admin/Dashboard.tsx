import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [criticalAlerts] = useState([
    { id: 1, severity: 'critical', title: '⚠️ 5 Disputes Overdue (>4h)', desc: 'Urgent resolution needed', impact: '2 cases risking auto-refund', action: 'Resolve Now', bgColor: '#fee2e2', borderColor: '#dc2626' },
    { id: 2, severity: 'critical', title: '🚨 Payment Processing Failed', desc: '3 transactions stuck', impact: 'SGD $450 at risk', action: 'Fix Now', bgColor: '#fef2f2', borderColor: '#991b1b' },
  ]);

  const [highPriority] = useState([
    { id: 3, severity: 'high', title: '⚡ 12 New Safety Reports', desc: 'Potential harassment/threats', impact: '3 users flagged', action: 'Review', bgColor: '#fef3c7', borderColor: '#f59e0b' },
    { id: 4, severity: 'high', title: '📱 New Feature Bugs (8)', desc: 'Users reporting app crashes', impact: '180 affected users', action: 'Triage', bgColor: '#fef3c7', borderColor: '#d97706' },
  ]);

  const [stats] = useState([
    { label: 'Platform Health', value: '98.5%', trend: '+2.1%', icon: '💚', color: '#10b981', detail: 'Excellent' },
    { label: 'Revenue (24h)', value: '$2,450', trend: '+18%', icon: '💰', color: '#f59e0b', detail: 'Above target' },
    { label: 'Active Users', value: '2.8K', trend: '+5.2%', icon: '👥', color: '#3b82f6', detail: 'Growing steady' },
    { label: 'Avg Rating', value: '4.8★', trend: '+0.3', icon: '⭐', color: '#8b5cf6', detail: 'Excellent service' },
  ]);

  const [aiInsights] = useState([
    { id: 1, type: 'pattern', title: 'Surge in Refund Requests', desc: 'Recent 23% increase in refunds (vs. 8% historical)', action: 'Investigate', icon: '📈', color: '#ef4444' },
    { id: 2, type: 'anomaly', title: 'Suspicious User: ID #4521', desc: '15 disputes filed in 48h (avg: 0.3/month)', action: 'Flag', icon: '🚩', color: '#f97316' },
    { id: 3, type: 'opportunity', title: 'High-Value Doers', desc: '24 doers with 50+ 5-star reviews = premium tier eligible', action: 'Engage', icon: '👑', color: '#06b6d4' },
  ]);

  const [recentActions] = useState([
    { id: 1, action: '✅ Case #D26-A1B2 Resolved', time: '2m ago', by: 'Sarah Chen', status: 'Sent $38.50 to doer', color: '#10b981' },
    { id: 2, action: '⚠️ User #3421 Warned', time: '8m ago', by: 'Admin', status: 'False report #2 - escalate next', color: '#f59e0b' },
    { id: 3, action: '🔒 User #7890 Suspended', time: '14m ago', by: 'System', status: '3 false emergency alerts', color: '#ef4444' },
    { id: 4, action: '💳 Refund Processed', time: '22m ago', by: 'Auto', status: 'SGD $120 → User #2891', color: '#3b82f6' },
  ]);

  return (
    <AdminLayout>
      <div style={{ padding: '24px', background: '#fafafa', minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 4px 0', color: '#1f2937' }}>
            🎯 Command Center
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Real-time platform monitoring • AI-powered insights • Action queue
          </p>
        </div>

        {/* CRITICAL ALERTS - TOP PRIORITY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#dc2626' }}>🔴 CRITICAL - MUST ACT NOW</h2>
            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {criticalAlerts.length} items
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '12px' }}>
            {criticalAlerts.map(alert => (
              <div key={alert.id} style={{ background: alert.bgColor, border: `2px solid ${alert.borderColor}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>{alert.title}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{alert.desc}</div>
                  </div>
                  <button style={{
                    background: alert.borderColor,
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    {alert.action}
                  </button>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', fontSize: '11px', color: '#333', fontWeight: 600 }}>
                  💥 Impact: {alert.impact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HIGH PRIORITY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f59e0b' }}>⚡ HIGH PRIORITY</h2>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {highPriority.length} items
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '12px' }}>
            {highPriority.map(item => (
              <div key={item.id} style={{ background: '#fff', border: `1px solid #fed7aa`, borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{item.desc} • <strong>{item.impact}</strong></div>
                </div>
                <button style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginLeft: '12px'
                }}>
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KEY METRICS - COMPACT */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 12px 0', color: '#666', textTransform: 'uppercase' }}>📊 Key Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ background: stat.color, color: 'white', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '24px' }}>{stat.icon}</div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{stat.value}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>{stat.trend} • {stat.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI INSIGHTS & ANOMALIES */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 12px 0', color: '#666', textTransform: 'uppercase' }}>🤖 AI Analysis & Alerts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '12px' }}>
            {aiInsights.map(insight => (
              <div key={insight.id} style={{ background: '#fff', border: `2px solid ${insight.color}`, borderRadius: '8px', padding: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '20px', minWidth: '30px' }}>{insight.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{insight.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{insight.desc}</div>
                </div>
                <button style={{
                  background: insight.color,
                  color: 'white',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: 'fit-content'
                }}>
                  {insight.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIONS AUDIT TRAIL */}
        <div>
          <h2 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 12px 0', color: '#666', textTransform: 'uppercase' }}>📋 Action Log (Last 24h)</h2>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {recentActions.map((item, i) => (
              <div key={item.id} style={{
                padding: '12px 16px',
                borderBottom: i < recentActions.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: item.color,
                  borderRadius: '2px'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{item.action}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>by {item.by} • {item.status}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
