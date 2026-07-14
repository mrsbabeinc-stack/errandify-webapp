import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const FinancialHealthReport: React.FC = () => {
  const [timeRange, setTimeRange] = useState('month');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            💰 Financial Health
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Revenue, expenses, and profitability metrics
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['week', 'month', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '8px 16px',
                background: timeRange === range ? '#FF6B35' : '#f5f5f5',
                color: timeRange === range ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>SGD 45,320</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 12% from last {timeRange}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>SGD 18,500</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↓ 5% from last {timeRange}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Net Profit</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>SGD 26,820</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>59% profit margin</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Transactions</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>1,234</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 8% from last {timeRange}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Revenue Trend</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            [Revenue chart visualization]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FinancialHealthReport;
