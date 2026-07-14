import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const GTMReport: React.FC = () => {
  const [channel, setChannel] = useState('all');

  const channels = [
    { id: 'organic', name: 'Organic', acquisitions: 1240, cost: 0, roi: 'N/A', conv: 3.2 },
    { id: 'paid-search', name: 'Paid Search', acquisitions: 890, cost: 4500, roi: 198, conv: 5.1 },
    { id: 'social', name: 'Social Media', acquisitions: 650, cost: 3200, roi: 203, conv: 4.8 },
    { id: 'referral', name: 'Referral', acquisitions: 420, cost: 2100, roi: 200, conv: 6.2 },
    { id: 'partnership', name: 'Partnership', acquisitions: 380, cost: 1800, roi: 211, conv: 7.1 },
  ];

  const selectedChannel = channels.find(c => c.id === channel);

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🎯 GTM & Acquisition
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Go-to-market strategy and user acquisition metrics
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              style={{
                padding: '8px 16px',
                background: channel === ch.id ? '#FF6B35' : '#f5f5f5',
                color: channel === ch.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {ch.name}
            </button>
          ))}
        </div>

        {selectedChannel && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Acquisitions</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{selectedChannel.acquisitions}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>This month</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Acquisition Cost</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>SGD {selectedChannel.cost}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Total spend</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>ROI</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: selectedChannel.roi === 'N/A' ? '#666' : '#4CAF50' }}>{selectedChannel.roi}%</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Return on investment</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Conversion Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#666' }}>{selectedChannel.conv}%</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>From visit to signup</div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #ffb88c', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Channel Comparison</h3>
          {channels.map(ch => (
            <div key={ch.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{ch.name}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{ch.acquisitions}</span>
              </div>
              <div style={{ height: '20px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#FF6B35',
                  width: `${(ch.acquisitions / 1240) * 100}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default GTMReport;
