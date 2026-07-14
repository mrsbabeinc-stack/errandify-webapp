import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const OverviewPage: React.FC = () => {
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

  return (
    <AdminLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 4px 0', color: '#ff6b35' }}>🎯 Action Center</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Focus on what matters most right now</p>
          </div>
        </div>

        {/* Urgent Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#ff6b35' }}>⚡ URGENT ACTIONS</h2>
          <div style={{ borderLeft: '4px solid #ff6b35', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actionItems.map(item => (
              <div key={item.id} style={{ background: '#fff', border: '1px solid #ddd', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{item.desc}</div>
                  </div>
                </div>
                <button style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#666', textTransform: 'uppercase' }}>📊 KEY METRICS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {kpis.map((kpi, i) => (
              <div key={i} style={{ background: '#ff6b35', color: '#fff', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{kpi.title}</span>
                  <span style={{ fontSize: '20px' }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#666', textTransform: 'uppercase' }}>📝 RECENT</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.map(activity => (
              <div key={activity.id} style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{activity.event}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{activity.user}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default OverviewPage;
