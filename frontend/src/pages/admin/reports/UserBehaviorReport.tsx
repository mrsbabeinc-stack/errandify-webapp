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

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '350px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>User Retention Cohort Analysis</h3>
          <div style={{ overflowX: 'auto', marginTop: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Cohort</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 1</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 2</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 3</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 4</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 8</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Week 12</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { week: 'Jul 1', rates: [100, 68, 52, 41, 28, 18] },
                  { week: 'Jul 8', rates: [100, 71, 55, 44, 32, 21] },
                  { week: 'Jul 15', rates: [100, 73, 58, 47, 35, 23] },
                  { week: 'Jul 22', rates: [100, 75, 61, 50, 37] },
                  { week: 'Jul 29', rates: [100, 74, 59, 48] },
                  { week: 'Aug 5', rates: [100, 76, 62] },
                  { week: 'Aug 12', rates: [100, 77] },
                ].map((cohort, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px', fontWeight: '500', color: '#333' }}>{cohort.week}</td>
                    {cohort.rates.map((rate, i) => (
                      <td key={i} style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: rate > 60 ? '#E8F5E9' : rate > 40 ? '#FFF3E0' : '#FFEBEE',
                          color: rate > 60 ? '#2E7D32' : rate > 40 ? '#E65100' : '#C62828',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          {rate}%
                        </div>
                      </td>
                    ))}
                    {Array.from({ length: 6 - cohort.rates.length }).map((_, i) => (
                      <td key={`empty-${i}`} style={{ padding: '8px', color: '#ccc' }}>-</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserBehaviorReport;
