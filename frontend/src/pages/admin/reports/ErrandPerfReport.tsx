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
            Errand completion metrics and performance analytics
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
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Top Categories (Bar Chart)</h3>
            <svg width="100%" height="240" viewBox="0 0 500 240" style={{ marginTop: '12px' }}>
              {/* Y-axis */}
              <line x1="40" y1="20" x2="40" y2="200" stroke="#ddd" strokeWidth="2"/>
              {/* X-axis */}
              <line x1="40" y1="200" x2="480" y2="200" stroke="#ddd" strokeWidth="2"/>

              {/* Y-axis labels */}
              <text x="35" y="205" fontSize="10" textAnchor="end" fill="#999">0</text>
              <text x="35" y="155" fontSize="10" textAnchor="end" fill="#999">300</text>
              <text x="35" y="105" fontSize="10" textAnchor="end" fill="#999">600</text>
              <text x="35" y="55" fontSize="10" textAnchor="end" fill="#999">900</text>

              {/* Bars */}
              {/* Cleaning - 850 */}
              <rect x="70" y="72" width="60" height="128" fill="#FF6B35" opacity="0.8" rx="4"/>
              <text x="100" y="215" fontSize="11" textAnchor="middle" fill="#333" fontWeight="500">Cleaning</text>
              <text x="100" y="60" fontSize="12" textAnchor="middle" fill="#FF6B35" fontWeight="700">850</text>

              {/* Delivery - 720 */}
              <rect x="150" y="92" width="60" height="108" fill="#F0A81E" opacity="0.8" rx="4"/>
              <text x="180" y="215" fontSize="11" textAnchor="middle" fill="#333" fontWeight="500">Delivery</text>
              <text x="180" y="80" fontSize="12" textAnchor="middle" fill="#F0A81E" fontWeight="700">720</text>

              {/* Shopping - 540 */}
              <rect x="230" y="118" width="60" height="82" fill="#4CAF50" opacity="0.8" rx="4"/>
              <text x="260" y="215" fontSize="11" textAnchor="middle" fill="#333" fontWeight="500">Shopping</text>
              <text x="260" y="106" fontSize="12" textAnchor="middle" fill="#4CAF50" fontWeight="700">540</text>

              {/* Education - 380 */}
              <rect x="310" y="144" width="60" height="56" fill="#FFC107" opacity="0.8" rx="4"/>
              <text x="340" y="215" fontSize="11" textAnchor="middle" fill="#333" fontWeight="500">Education</text>
              <text x="340" y="132" fontSize="12" textAnchor="middle" fill="#FFC107" fontWeight="700">380</text>

              {/* Others - 280 */}
              <rect x="390" y="158" width="60" height="42" fill="#E2736B" opacity="0.8" rx="4"/>
              <text x="420" y="215" fontSize="11" textAnchor="middle" fill="#333" fontWeight="500">Others</text>
              <text x="420" y="146" fontSize="12" textAnchor="middle" fill="#E2736B" fontWeight="700">280</text>
            </svg>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ErrandPerfReport;
