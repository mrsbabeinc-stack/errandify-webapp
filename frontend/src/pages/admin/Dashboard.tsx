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

  const [qwenInsights] = useState([
    {
      period: '📅 TODAY',
      insights: [
        { id: 1, category: 'ALERT', title: 'Suspicious User #4521', desc: '15 disputes filed (2h window)', action: 'Review', color: '#ef4444', bg: '#fee2e2', icon: '🚩' },
        { id: 2, category: 'TREND', title: 'Payment Errors +8% (vs yesterday)', desc: 'Method X: rejection rate 8.3%', action: 'Investigate', color: '#f59e0b', bg: '#fef3c7', icon: '📊' },
      ]
    },
    {
      period: '📊 WEEKLY',
      insights: [
        { id: 3, category: 'PATTERN', title: 'Refund Spike +23% Week-over-Week', desc: 'Avg refund value: SGD $65 (was $53)', action: 'Analyze', color: '#8b5cf6', bg: '#ede9fe', icon: '📈' },
        { id: 4, category: 'OPPORTUNITY', title: '24 Premium Doers (50+ 5-stars)', desc: 'Avg rating: 4.9★ | Completion: 98%', action: 'Engage', color: '#06b6d4', bg: '#cffafe', icon: '👑' },
        { id: 5, category: 'QUALITY', title: 'Top Doer: ProHelper_John', desc: 'Week: 28 tasks • 4.95★ avg • $1,240 earned', action: 'Recognize', color: '#10b981', bg: '#d1fae5', icon: '⭐' },
      ]
    },
    {
      period: '📆 MONTHLY',
      insights: [
        { id: 6, category: 'BUSINESS', title: 'Platform Growth: +18% MoM', desc: 'Users: +2.1K | Revenue: +SGD $8.4K | Disputes: -12%', action: 'Report', color: '#0891b2', bg: '#cffafe', icon: '🎯' },
        { id: 7, category: 'RISK', title: 'Churn Alert: Support Avg -15%', desc: 'Users citing slow responses. SLA compliance: 89% (target: 95%)', action: 'Action', color: '#f59e0b', bg: '#fef3c7', icon: '⚡' },
        { id: 8, category: 'FORECAST', title: 'July Projection: SGD $28K Revenue', desc: 'Based on current velocity & historical patterns', action: 'Plan', color: '#6366f1', bg: '#e0e7ff', icon: '🔮' },
      ]
    }
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
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          50% { box-shadow: 0 0 20px 10px rgba(220, 38, 38, 0); }
        }
        @keyframes bounce-alert {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.6; }
        }
        .critical-pulse {
          animation: pulse-glow 2s infinite;
        }
        .critical-bounce {
          animation: bounce-alert 1s infinite;
        }
        .critical-shake {
          animation: shake 0.5s infinite;
        }
        .critical-blink {
          animation: blink 1s infinite;
        }
      `}</style>

      <div style={{ padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Command Center</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Real-time operations • AI insights • Action required</p>
        </div>

        {/* CRITICAL ALERTS - HIGHLY ANIMATED */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔴 CRITICAL - ACT NOW
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {criticalAlerts.map(alert => (
              <div key={alert.id} className="critical-pulse" style={{
                background: alert.bg,
                border: `3px solid ${alert.color}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Animated background glow */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(45deg, transparent, ${alert.color}20, transparent)`,
                  animation: 'slideGradient 3s infinite',
                  pointerEvents: 'none'
                }} />

                {/* Blinking urgent indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                  <span className="critical-blink" style={{ fontSize: '12px', fontWeight: 700, color: alert.color }}>● URGENT</span>
                  <span style={{ fontSize: '10px', color: '#666', fontWeight: 600 }}>Action required immediately</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <div className="critical-bounce" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px', display: 'inline-block' }}>
                      {alert.icon} {alert.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Impact: <strong>{alert.impact}</strong></div>
                  </div>
                  <div className="critical-shake" style={{ fontSize: '24px', fontWeight: 700, color: alert.color, minWidth: '35px', textAlign: 'right', lineHeight: 1 }}>
                    {alert.metric}
                  </div>
                </div>

                <button style={{
                  background: alert.color,
                  color: 'white',
                  border: 'none',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 0 20px ${alert.color}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  ➜ {alert.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KPI METRICS */}
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

        {/* OPERATIONS STATUS */}
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

        {/* QWEN AI INSIGHTS - DAILY/WEEKLY/MONTHLY */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', textTransform: 'uppercase' }}>🤖 AI Highlights (Qwen)</h2>
          
          {qwenInsights.map((periodGroup, periodIdx) => (
            <div key={periodIdx} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '8px', paddingLeft: '4px', borderLeft: '3px solid #6366f1' }}>
                {periodGroup.period}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {periodGroup.insights.map(insight => (
                  <div key={insight.id} style={{
                    background: insight.bg,
                    border: `2px solid ${insight.color}`,
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{insight.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: insight.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {insight.category}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
                          {insight.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', lineHeight: 1.3 }}>{insight.desc}</div>
                    <button style={{
                      background: insight.color,
                      color: 'white',
                      border: 'none',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
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
          ))}
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
