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

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '350px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Market Share Pie Chart</h3>
          <svg width="100%" height="280" viewBox="0 0 400 280" style={{ marginTop: '12px' }}>
            {/* Pie chart - Errandify */}
            <circle cx="120" cy="140" r="80" fill="none" stroke="#FF6B35" strokeWidth="80" strokeDasharray="308.7 2513" strokeDashoffset="0" opacity="0.9"/>

            {/* Pie chart - Competitor 1 */}
            <circle cx="120" cy="140" r="80" fill="none" stroke="#FFB88C" strokeWidth="80" strokeDasharray="503.6 2513" strokeDashoffset="-308.7" opacity="0.7"/>

            {/* Pie chart - Competitor 2 */}
            <circle cx="120" cy="140" r="80" fill="none" stroke="#FFCCB3" strokeWidth="80" strokeDasharray="376.95 2513" strokeDashoffset="-812.3" opacity="0.5"/>

            {/* Pie chart - Others */}
            <circle cx="120" cy="140" r="80" fill="none" stroke="#FFE0D3" strokeWidth="80" strokeDasharray="823.75 2513" strokeDashoffset="-1189.25" opacity="0.3"/>

            {/* Center circle for donut */}
            <circle cx="120" cy="140" r="50" fill="#fff" stroke="#ffb88c" strokeWidth="1"/>
            <text x="120" y="145" fontSize="14" fontWeight="700" textAnchor="middle" fill="#FF6B35">12.3%</text>

            {/* Legend */}
            <g>
              <rect x="220" y="30" width="15" height="15" fill="#FF6B35" opacity="0.9"/>
              <text x="240" y="42" fontSize="12" fill="#333">Errandify (12.3%)</text>

              <rect x="220" y="60" width="15" height="15" fill="#FFB88C" opacity="0.7"/>
              <text x="240" y="72" fontSize="12" fill="#333">Competitor 1 (20.1%)</text>

              <rect x="220" y="90" width="15" height="15" fill="#FFCCB3" opacity="0.5"/>
              <text x="240" y="102" fontSize="12" fill="#333">Competitor 2 (15.0%)</text>

              <rect x="220" y="120" width="15" height="15" fill="#FFE0D3" opacity="0.3"/>
              <text x="240" y="132" fontSize="12" fill="#333">Others (52.6%)</text>
            </g>
          </svg>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketAnalysisReport;
