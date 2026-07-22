import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [criticalAlerts] = useState([
    { id: 1, severity: 'critical', icon: '⚠️', title: 'Revenue at Risk', metric: '5', impact: 'SGD $450 blocked', action: 'Resolve', color: '#dc2626', bg: '#fee2e2' },
    { id: 2, severity: 'critical', icon: '🚨', title: 'Payment System Down', metric: '3', impact: 'Losing SGD $12/min', action: 'Fix Now', color: '#dc2626', bg: '#fee2e2' },
  ]);

  const [startupMetrics] = useState([
    { label: 'MRR', value: 'SGD $24K', trend: '+18%', icon: '💰', color: '#FF6B35', bg: '#FFF8F5', context: 'Monthly Recurring' },
    { label: 'Active Users', value: '2.8K', trend: '+12%', icon: '👥', color: '#FF6B35', bg: '#FFF8F5', context: 'DAU this week' },
    { label: 'Churn Rate', value: '3.2%', trend: '-0.8%', icon: '📊', color: '#FF6B35', bg: '#FFF8F5', context: 'Monthly (lower is better)' },
    { label: 'Signups', value: '87/day', trend: '+15%', icon: '📈', color: '#FF6B35', bg: '#FFF8F5', context: 'New users today' },
  ]);

  const [operationsStatus] = useState([
    { label: 'Pending Cases', value: '12', icon: '📋', color: '#FF9800', bg: '#FFF3E0', action: 'Review Now', link: '/admin/cases' },
    { label: 'Failed Payments', value: '8', icon: '💳', color: '#F44336', bg: '#FFEBEE', action: 'Fix Now', link: '/admin/operations/payments' },
    { label: 'Active Disputes', value: '3', icon: '⚖️', color: '#FF9800', bg: '#FFF3E0', action: 'Resolve', link: '/admin/dashboard/disputes' },
    { label: 'Pending Signups', value: '15', icon: '🔐', color: '#FF6B35', bg: '#FFF8F5', action: 'Verify', link: '/admin/operations/user-management' },
  ]);

  const [fundingContext] = useState([
    { metric: 'Burn Rate', value: 'SGD $1.2K/day', status: 'Sustainable', color: '#FF6B35' },
    { metric: 'Cash Runway', value: '14 months', status: 'Healthy', color: '#FF6B35' },
    { metric: 'Unit Economics', value: 'LTV:CAC = 3.2:1', status: 'Strong', color: '#FF6B35' },
  ]);

  const [growthInsights] = useState([
    {
      period: '📅 TODAY',
      insights: [
        { id: 1, category: 'REVENUE', title: 'Revenue On Track', desc: 'SGD $850 processed (daily avg: $730)', action: 'Monitor', color: '#F44336', bg: '#FFEBEE', icon: '💵' },
        { id: 2, category: 'CHURN', title: '2 Users Churned', desc: 'Both payment method issues (recoverable)', action: 'Reach Out', color: '#FF9800', bg: '#FFF3E0', icon: '📉' },
      ]
    },
    {
      period: '📊 WEEKLY',
      insights: [
        { id: 3, category: 'GROWTH', title: 'Signup Velocity +23%', desc: 'Up from 71/day last week → 87/day now', action: 'Analyze', color: '#FF6B35', bg: '#FFF8F5', icon: '📈' },
        { id: 4, category: 'ENGAGEMENT', title: 'Errand Completion Rate 87%', desc: 'Users completing errands at high rate (healthy)', action: 'Maintain', color: '#FF6B35', bg: '#FFF8F5', icon: '⭐' },
        { id: 5, category: 'MONETIZATION', title: 'ARPU Growth +$3.50', desc: 'Avg Revenue Per User: $28.50 → $32.00', action: 'Celebrate', color: '#FF6B35', bg: '#FFF8F5', icon: '🎯' },
      ]
    },
    {
      period: '📆 MONTHLY',
      insights: [
        { id: 6, category: 'BUSINESS', title: 'MRR: +18% This Month', desc: 'SGD $24K revenue | Runway: 14 months @ current burn', action: 'Plan Spend', color: '#FF6B35', bg: '#FFF8F5', icon: '🏦' },
        { id: 7, category: 'RISK', title: 'Payment Disputes +12%', desc: 'Monthly disputes: 8 → 9. Mostly false alerts (recoverable)', action: 'Fix SOS', color: '#FF9800', bg: '#FFF3E0', icon: '⚡' },
        { id: 8, category: 'FORECAST', title: 'Projected MRR in 60 days', desc: 'At +15% growth: SGD $28.2K | Runway extends to 16 months', action: 'Plan', color: '#FF6B35', bg: '#FFF8F5', icon: '🔮' },
      ]
    }
  ]);

  const [recentActivity] = useState([
    { id: 1, icon: '🎉', title: 'New User Milestone', detail: '2,800 total active users reached', time: '2h', color: '#FF6B35' },
    { id: 2, icon: '⚖️', title: 'Dispute Resolved (L2)', detail: 'Case #7814 settled 50/50 split', time: '3h', color: '#FF6B35' },
    { id: 3, icon: '⚠️', title: 'Payment Failed', detail: '8 users have payment retry pending', time: '4h', color: '#FF9800' },
    { id: 4, icon: '💳', title: 'Stripe Connection OK', detail: 'Last check: 6m ago, all systems nominal', time: '6h', color: '#FF6B35' },
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

      <div style={{ padding: '20px', background: '#fff', minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#333' }}>📊 Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>Growth tracking • Operations • Safety & Disputes</p>
        </div>

        {/* CRITICAL ALERTS - REVENUE/PAYMENT */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#FF6B35', letterSpacing: '0px' }}>
            🔴 Critical Blockers - Act Now
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                  <span className="critical-blink" style={{ fontSize: '13px', fontWeight: 700, color: alert.color }}>● URGENT</span>
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Losing money right now</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <div className="critical-bounce" style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px', display: 'inline-block' }}>
                      {alert.icon} {alert.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Impact: <strong>{alert.impact}</strong></div>
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

        {/* OPERATIONS STATUS - ACTIONABLE */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#333', whiteSpace: 'nowrap' }}>⚙️ Operations & Safety (Action Required)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {operationsStatus.map((item, i) => (
              <div key={i} style={{
                background: item.bg,
                border: `2px solid ${item.color}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '20px' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>{item.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                </div>
                <button style={{
                  background: item.color,
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
                onClick={() => window.location.href = item.link}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  {item.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* STARTUP METRICS - KEY INDICATORS */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#333' }}>📊 Startup Metrics (Growth)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {startupMetrics.map((m, i) => (
              <div key={i} style={{
                background: m.bg,
                border: `2px solid ${m.color}`,
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{m.icon}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: m.color, marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '12px', color: m.color, fontWeight: 600, marginBottom: '8px' }}>{m.trend}</div>
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>{m.context}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FUNDING & RUNWAY */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#333' }}>🏦 Funding & Runway</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {fundingContext.map((item, i) => (
              <div key={i} style={{
                background: '#fff',
                border: `2px solid ${item.color}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.metric}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontWeight: 600 }}>{item.value}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: item.color, background: item.color + '15', padding: '4px 8px', borderRadius: '4px' }}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GROWTH INSIGHTS - DAILY/WEEKLY/MONTHLY */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#333' }}>🚀 Growth Insights (Qwen)</h2>
          
          {growthInsights.map((periodGroup, periodIdx) => (
            <div key={periodIdx} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', marginBottom: '8px', paddingLeft: '4px', borderLeft: '3px solid #FF6B35' }}>
                {periodGroup.period}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {periodGroup.insights.map(insight => (
                  <div key={insight.id} style={{
                    background: insight.bg,
                    border: `2px solid ${insight.color}`,
                    borderRadius: '8px',
                    padding: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{insight.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: insight.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {insight.category}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
                          {insight.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', lineHeight: 1.3 }}>{insight.desc}</div>
                    <button style={{
                      background: insight.color,
                      color: 'white',
                      border: 'none',
                      padding: '5px 8px',
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
          ))}
        </div>

        {/* ACTIVITY LOG */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#333' }}>📋 Recent Activity</h2>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {recentActivity.map((item, i) => (
              <div key={item.id} style={{
                padding: '13px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: item.color + '08'
              }}>
                <div style={{ fontSize: '18px' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '1px' }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#999', fontWeight: 600 }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
