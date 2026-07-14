import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const UserBehaviorReport: React.FC = () => {
  const [metric, setMetric] = useState('retention');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            👥 User Behavior
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            User engagement, retention, and activity patterns
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['retention', 'engagement', 'churn', 'activity'].map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: '8px 16px',
                background: metric === m ? '#FF6B35' : '#f5f5f5',
                color: metric === m ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Monthly Active Users</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>8,452</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 15% MoM</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Avg Session Duration</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>12m 34s</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 2min from last month</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Retention Rate (30d)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>68%</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 3% from last month</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Churn Rate</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F44336' }}>8%</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↓ 1% from last month</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>User Behavior Trends</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            [Behavior chart visualization]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserBehaviorReport;
