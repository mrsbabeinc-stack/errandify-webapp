import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const AdminDashboard: React.FC = () => {
  const [criticalAlerts] = useState([
    { id: 1, severity: 'critical', icon: '⚠️', title: 'Overdue Case Resolutions', metric: '5', detail: 'Cases pending >4 hours', impact: 'SGD $450 at risk • 2 auto-refunds', timeline: 'Act within 1h', color: '#dc2626' },
    { id: 2, severity: 'critical', icon: '🚨', title: 'Payment Processing Failure', metric: '3', detail: 'Transactions stuck in queue', impact: 'SGD $890 unable to process', timeline: 'Act immediately', color: '#991b1b' },
  ]);

  const [operationalMetrics] = useState([
    { label: 'Platform Health', value: '98.5%', change: '+2.1%', status: 'Excellent', icon: '📊', color: '#10b981' },
    { label: 'Revenue (24h)', value: 'SGD $2,450', change: '+18%', status: 'Above Target', icon: '💰', color: '#0891b2' },
    { label: 'Active Transactions', value: '847', change: '+12.4%', status: 'Growing', icon: '📈', color: '#6366f1' },
    { label: 'Avg User Rating', value: '4.8/5.0', change: '+0.3', status: 'Excellent', icon: '⭐', color: '#f59e0b' },
  ]);

  const [aiInsights] = useState([
    { id: 1, category: 'ALERT', icon: '🚩', title: 'Anomalous Activity Detected', desc: 'User #4521: 15 disputes filed in 48h (typical: 0.3/month)', severity: 'high', action: 'Review Profile', color: '#ef4444' },
    { id: 2, category: 'TREND', icon: '📊', title: 'Refund Rate Spike', desc: 'Refund requests up 23% YoY. Correlation with payment method X', severity: 'medium', action: 'Investigate', color: '#f59e0b' },
    { id: 3, category: 'OPPORTUNITY', icon: '👑', title: 'Premium Doer Pool Expanding', desc: '24 doers now eligible for platinum tier (50+ 5-star reviews)', severity: 'low', action: 'Engage', color: '#06b6d4' },
  ]);

  const [operationalStatus] = useState([
    { area: 'Case Management', pending: 12, inProgress: 28, completed: 340, sla: '96% on-time', health: 'healthy' },
    { area: 'Payment Processing', pending: 2, inProgress: 15, completed: 892, sla: '99.2% successful', health: 'critical' },
    { area: 'User Support', pending: 8, inProgress: 19, completed: 156, sla: '2.1h avg response', health: 'healthy' },
    { area: 'Quality Assurance', pending: 3, inProgress: 7, completed: 94, sla: '98% approval rate', health: 'healthy' },
  ]);

  const [recentActivity] = useState([
    { id: 1, type: 'resolution', icon: '✅', title: 'Case #D26-4521 Resolved', detail: 'Full payment approved • SGD $45.20 processed', time: '12 min', agent: 'Sarah Chen', status: 'completed' },
    { id: 2, type: 'action', icon: '⚠️', title: 'User #7814 Warned', detail: 'False emergency alert #2 • Next: suspension', time: '28 min', agent: 'System', status: 'warning' },
    { id: 3, type: 'alert', icon: '🔴', title: 'Payment Method X Issues', detail: 'Transaction rejection rate 8.3% (threshold: 2%)', time: '1h 4m', agent: 'AI Monitor', status: 'alert' },
    { id: 4, type: 'success', icon: '💳', title: 'Refund Batch Processed', detail: '23 refunds • SGD $1,245 distributed • 0 failed', time: '2h 15m', agent: 'Auto', status: 'success' },
  ]);

  return (
    <AdminLayout>
      <div style={{ padding: '32px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
                Operations Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 0 0' }}>
                Real-time platform monitoring • AI-powered insights • Enterprise metrics
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Last Updated</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>2 minutes ago</div>
            </div>
          </div>
        </div>

        {/* CRITICAL ALERTS - TOP PRIORITY */}
        {criticalAlerts.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Critical Priority
              </h2>
              <span style={{ background: '#fee2e2', color: '#7f1d1d', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                {criticalAlerts.length} Action Items
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '16px' }}>
              {criticalAlerts.map(alert => (
                <div key={alert.id} style={{
                  background: '#fff',
                  border: `2px solid ${alert.color}`,
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                      <span style={{ fontSize: '24px', minWidth: '32px', textAlign: 'center' }}>{alert.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{alert.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{alert.detail}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '60px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: alert.color }}>{alert.metric}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>pending</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                    💥 {alert.impact}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: alert.color, fontWeight: 600 }}>⏱️ {alert.timeline}</div>
                    <button style={{
                      background: alert.color,
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OPERATIONAL METRICS - GRID */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Key Performance Indicators
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {operationalMetrics.map((metric, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px' }}>{metric.icon}</div>
                  <span style={{
                    background: metric.color + '20',
                    color: metric.color,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {metric.change}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{metric.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{metric.value}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Status: <strong>{metric.status}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPERATIONAL STATUS */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operations Status
          </h2>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {operationalStatus.map((item, i) => (
              <div key={i} style={{
                padding: '16px 20px',
                borderBottom: i < operationalStatus.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'grid',
                gridTemplateColumns: '200px 1fr auto',
                gap: '32px',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.area}</div>
                  <div style={{
                    fontSize: '11px',
                    color: item.health === 'critical' ? '#dc2626' : '#10b981',
                    fontWeight: 600,
                    marginTop: '4px'
                  }}>
                    {item.health === 'critical' ? '🔴 Attention Needed' : '🟢 Healthy'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Pending</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{item.pending}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>In Progress</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#0ea5e9' }}>{item.inProgress}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Completed</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{item.completed}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{item.sla}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>SLA</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI Intelligence & Insights
            </h2>
            <span style={{ background: '#e0f2fe', color: '#075985', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
              Powered by Qwen
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {aiInsights.map(insight => (
              <div key={insight.id} style={{
                background: '#fff',
                border: `1px solid ${insight.color}20`,
                borderLeft: `4px solid ${insight.color}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                gap: '12px'
              }}>
                <div style={{ fontSize: '22px', minWidth: '32px', textAlign: 'center' }}>{insight.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: insight.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {insight.category}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                      {insight.severity === 'high' ? '⚠️ High' : insight.severity === 'medium' ? '⚡ Medium' : '💡 Low'}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>{insight.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{insight.desc}</div>
                </div>
                <button style={{
                  background: insight.color,
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
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

        {/* ACTIVITY LOG */}
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Activity Log
          </h2>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {recentActivity.map((item, i) => (
              <div key={item.id} style={{
                padding: '16px 20px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '20px', minWidth: '28px', textAlign: 'center' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{item.detail}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>by {item.agent}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{item.time}</div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    marginTop: '4px',
                    color: item.status === 'completed' ? '#10b981' : item.status === 'success' ? '#0ea5e9' : item.status === 'warning' ? '#f59e0b' : '#dc2626',
                    textTransform: 'capitalize'
                  }}>
                    {item.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
