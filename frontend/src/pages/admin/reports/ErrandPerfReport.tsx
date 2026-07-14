import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const ErrandPerfReport: React.FC = () => {
  const [view, setView] = useState('overview');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            ⏱️ Errand Performance
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Task completion metrics and performance analytics
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['overview', 'completion', 'quality', 'timing'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '8px 16px',
                background: view === v ? '#FF6B35' : '#f5f5f5',
                color: view === v ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Errands</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>3,450</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>This month</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Completion Rate</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>94.2%</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 2.1% from last month</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Avg Completion Time</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>2.4 days</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↓ 0.6 days from target</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Quality Score</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>4.6/5.0</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 0.2 from last month</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Status Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Completed</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>3,250</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#4CAF50', width: '94%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>In Progress</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>150</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#FFC107', width: '4%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Cancelled</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>50</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#F44336', width: '1.4%' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Top Categories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Cleaning</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>850</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Delivery</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>720</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Shopping</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>540</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Education</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>380</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ErrandPerfReport;
