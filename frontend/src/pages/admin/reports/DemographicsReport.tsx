import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const DemographicsReport: React.FC = () => {
  const [metric, setMetric] = useState('age');

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            👥 Demographics
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            User demographics and characteristics
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['age', 'gender', 'location', 'income'].map(m => (
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
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Users</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>42,580</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>↑ 8% from last month</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Median Age</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>32 years</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Prime demographic</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Age Distribution (Pyramid)</h3>
          <svg width="100%" height="220" viewBox="0 0 600 220" style={{ marginTop: '12px' }}>
            {/* Center axis */}
            <line x1="300" y1="30" x2="300" y2="200" stroke="#ddd" strokeWidth="2"/>

            {/* Age groups - Left side (Female) */}
            <rect x="120" y="30" width="180" height="25" fill="#E91E63" opacity="0.8"/>
            <text x="115" y="47" fontSize="11" textAnchor="end" fill="#333">18-24</text>
            <text x="210" y="47" fontSize="11" textAnchor="middle" fill="#E91E63" fontWeight="600">8%</text>

            <rect x="100" y="60" width="200" height="25" fill="#E91E63" opacity="0.8"/>
            <text x="95" y="77" fontSize="11" textAnchor="end" fill="#333">25-34</text>
            <text x="200" y="77" fontSize="11" textAnchor="middle" fill="#E91E63" fontWeight="600">15%</text>

            <rect x="90" y="90" width="210" height="25" fill="#E91E63" opacity="0.8"/>
            <text x="85" y="107" fontSize="11" textAnchor="end" fill="#333">35-44</text>
            <text x="195" y="107" fontSize="11" textAnchor="middle" fill="#E91E63" fontWeight="600">18%</text>

            <rect x="130" y="120" width="170" height="25" fill="#E91E63" opacity="0.8"/>
            <text x="125" y="137" fontSize="11" textAnchor="end" fill="#333">45-54</text>
            <text x="215" y="137" fontSize="11" textAnchor="middle" fill="#E91E63" fontWeight="600">12%</text>

            <rect x="170" y="150" width="130" height="25" fill="#E91E63" opacity="0.8"/>
            <text x="165" y="167" fontSize="11" textAnchor="end" fill="#333">55+</text>
            <text x="235" y="167" fontSize="11" textAnchor="middle" fill="#E91E63" fontWeight="600">5%</text>

            {/* Age groups - Right side (Male) */}
            <rect x="300" y="30" width="160" height="25" fill="#F0A81E" opacity="0.8"/>
            <text x="470" y="47" fontSize="11" textAnchor="start" fill="#333">18-24</text>
            <text x="390" y="47" fontSize="11" textAnchor="middle" fill="#F0A81E" fontWeight="600">7%</text>

            <rect x="300" y="60" width="180" height="25" fill="#F0A81E" opacity="0.8"/>
            <text x="490" y="77" fontSize="11" textAnchor="start" fill="#333">25-34</text>
            <text x="390" y="77" fontSize="11" textAnchor="middle" fill="#F0A81E" fontWeight="600">13%</text>

            <rect x="300" y="90" width="190" height="25" fill="#F0A81E" opacity="0.8"/>
            <text x="500" y="107" fontSize="11" textAnchor="start" fill="#333">35-44</text>
            <text x="395" y="107" fontSize="11" textAnchor="middle" fill="#F0A81E" fontWeight="600">14%</text>

            <rect x="300" y="120" width="150" height="25" fill="#F0A81E" opacity="0.8"/>
            <text x="460" y="137" fontSize="11" textAnchor="start" fill="#333">45-54</text>
            <text x="375" y="137" fontSize="11" textAnchor="middle" fill="#F0A81E" fontWeight="600">6%</text>

            <rect x="300" y="150" width="110" height="25" fill="#F0A81E" opacity="0.8"/>
            <text x="420" y="167" fontSize="11" textAnchor="start" fill="#333">55+</text>
            <text x="355" y="167" fontSize="11" textAnchor="middle" fill="#F0A81E" fontWeight="600">2%</text>

            {/* Legend */}
            <circle cx="320" cy="195" r="5" fill="#E91E63"/>
            <text x="330" y="199" fontSize="11" fill="#333">Female (58%)</text>

            <circle cx="480" cy="195" r="5" fill="#F0A81E"/>
            <text x="490" y="199" fontSize="11" fill="#333">Male (40%)</text>
          </svg>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Gender Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Female</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>58%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#E91E63', width: '58%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Male</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>40%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#F0A81E', width: '40%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Other</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>2%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#E2736B', width: '2%' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Top Locations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Central', 'East', 'West', 'North', 'Northeast'].map((loc, idx) => (
                <div key={loc}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#333' }}>{loc}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{[8540, 7210, 6340, 5980, 5120][idx]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DemographicsReport;
