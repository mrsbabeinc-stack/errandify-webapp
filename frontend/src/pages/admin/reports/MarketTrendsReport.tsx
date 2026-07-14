import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const MarketTrendsReport: React.FC = () => {
  const [period, setPeriod] = useState('3months');

  const trends = [
    { name: 'Cleaning & Household', growth: 23, jobs: 1240 },
    { name: 'Delivery & Moving', growth: 18, jobs: 890 },
    { name: 'Education & Tutoring', growth: 12, jobs: 450 },
    { name: 'Pet Care', growth: 15, jobs: 320 },
    { name: 'Home Maintenance', growth: 9, jobs: 210 },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🎓 Market Trends
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Emerging trends and opportunities
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['1month', '3months', '6months', '1year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                background: period === p ? '#FF6B35' : '#f5f5f5',
                color: period === p ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {p === '1month' ? '1M' : p === '3months' ? '3M' : p === '6months' ? '6M' : '1Y'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Hottest Category</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF6B35', marginBottom: '4px' }}>Cleaning & Household</div>
            <div style={{ fontSize: '11px', color: '#999' }}>↑ 23% growth in {period}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Emerging Trend</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#666', marginBottom: '4px' }}>Online Services</div>
            <div style={{ fontSize: '11px', color: '#999' }}>New category gaining traction</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Category Growth Rates</h3>
          {trends.map(trend => (
            <div key={trend.name} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{trend.name}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>↑ {trend.growth}%</span>
              </div>
              <div style={{ height: '20px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#FF6B35',
                  width: `${trend.growth}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{trend.jobs} jobs posted</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Trend Timeline</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            [Timeline visualization]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketTrendsReport;
