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

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', minHeight: '350px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>6-Month Trend Timeline</h3>
          <svg width="100%" height="280" viewBox="0 0 800 280" style={{ marginTop: '12px' }}>
            {/* Grid */}
            <defs>
              <pattern id="trendGrid" width="100" height="40" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="800" height="280" fill="url(#trendGrid)" />

            {/* Axes */}
            <line x1="40" y1="260" x2="780" y2="260" stroke="#ddd" strokeWidth="2"/>
            <line x1="40" y1="20" x2="40" y2="260" stroke="#ddd" strokeWidth="2"/>

            {/* Y-axis labels */}
            <text x="30" y="265" fontSize="11" textAnchor="end" fill="#999">0%</text>
            <text x="30" y="195" fontSize="11" textAnchor="end" fill="#999">10%</text>
            <text x="30" y="125" fontSize="11" textAnchor="end" fill="#999">20%</text>
            <text x="30" y="55" fontSize="11" textAnchor="end" fill="#999">30%</text>

            {/* Trend line 1 - Cleaning */}
            <polyline
              points="80,210 160,180 240,150 320,130 400,110 480,90 560,70"
              fill="none"
              stroke="#FF6B35"
              strokeWidth="2.5"
            />

            {/* Trend line 2 - Delivery */}
            <polyline
              points="80,240 160,220 240,200 320,190 400,180 480,170 560,160"
              fill="none"
              stroke="#F0A81E"
              strokeWidth="2.5"
            />

            {/* Trend line 3 - Education */}
            <polyline
              points="80,250 160,240 240,225 320,210 400,195 480,180 560,165"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="2.5"
            />

            {/* Data points for Cleaning */}
            {[80, 160, 240, 320, 400, 480, 560].map(x => (
                <circle key={`c${x}`} cx={x} cy={[210, 180, 150, 130, 110, 90, 70][[80, 160, 240, 320, 400, 480, 560].indexOf(x)]} r="3" fill="#FF6B35" />
              ))}

            {/* X-axis labels */}
            <text x="80" y="275" fontSize="11" textAnchor="middle" fill="#999">Feb</text>
            <text x="160" y="275" fontSize="11" textAnchor="middle" fill="#999">Mar</text>
            <text x="240" y="275" fontSize="11" textAnchor="middle" fill="#999">Apr</text>
            <text x="320" y="275" fontSize="11" textAnchor="middle" fill="#999">May</text>
            <text x="400" y="275" fontSize="11" textAnchor="middle" fill="#999">Jun</text>
            <text x="480" y="275" fontSize="11" textAnchor="middle" fill="#999">Jul</text>
            <text x="560" y="275" fontSize="11" textAnchor="middle" fill="#999">Aug</text>

            {/* Legend */}
            <circle cx="620" cy="100" r="3" fill="#FF6B35"/>
            <text x="630" y="104" fontSize="11" fill="#333">Cleaning (↑23%)</text>

            <circle cx="620" cy="130" r="3" fill="#F0A81E"/>
            <text x="630" y="134" fontSize="11" fill="#333">Delivery (↑18%)</text>

            <circle cx="620" cy="160" r="3" fill="#4CAF50"/>
            <text x="630" y="164" fontSize="11" fill="#333">Education (↑12%)</text>
          </svg>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketTrendsReport;
