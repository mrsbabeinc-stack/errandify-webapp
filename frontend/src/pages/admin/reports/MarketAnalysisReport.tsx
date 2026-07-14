import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const MarketAnalysisReport: React.FC = () => {
  const [view, setView] = useState('overview');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            📈 Market Analysis
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Market trends, competition, and opportunities
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['overview', 'competition', 'trends', 'forecast'].map(v => (
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
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Market Size</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>SGD 2.4B</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Growing at 23% YoY</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Market Share</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>12.3%</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 2.1% from last year</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Competitors</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>7</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Active competitors tracked</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Market Opportunity</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>SGD 1.8B</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Untapped potential</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '300px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Market Trends</h3>
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            [Market trend visualization]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketAnalysisReport;
