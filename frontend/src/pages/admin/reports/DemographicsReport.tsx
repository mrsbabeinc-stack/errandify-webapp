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
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Age Distribution</h3>
          {['18-24', '25-34', '35-44', '45-54', '55+'].map((age, idx) => (
            <div key={age} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{age} years</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{[15, 28, 32, 18, 7][idx]}%</span>
              </div>
              <div style={{ height: '20px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#FF6B35',
                  width: `${[15, 28, 32, 18, 7][idx]}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          ))}
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
                  <div style={{ height: '100%', background: '#2196F3', width: '40%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#333' }}>Other</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>2%</span>
                </div>
                <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <div style={{ height: '100%', background: '#9C27B0', width: '2%' }} />
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
