import React, { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';

export const VulnerableUsersReport: React.FC = () => {
  const [riskLevel, setRiskLevel] = useState('all');

  const vulnerableUsers = [
    { id: 1, name: 'User-45', risk: 'high', reason: 'Multiple refund disputes', lastActive: '2 days ago' },
    { id: 2, name: 'User-78', risk: 'high', reason: 'Safety complaint filed', lastActive: '5 days ago' },
    { id: 3, name: 'User-120', risk: 'medium', reason: 'Low completion rate (45%)', lastActive: '1 day ago' },
    { id: 4, name: 'User-156', risk: 'medium', reason: 'Chargeback attempts', lastActive: '3 days ago' },
    { id: 5, name: 'User-234', risk: 'low', reason: 'New user pattern monitoring', lastActive: 'Today' },
  ];

  const filtered = riskLevel === 'all' ? vulnerableUsers : vulnerableUsers.filter(u => u.risk === riskLevel);

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            👨‍👩‍👧‍👦 Vulnerable Users
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Users requiring attention and support
          </p>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          {['all', 'high', 'medium', 'low'].map(level => (
            <button
              key={level}
              onClick={() => setRiskLevel(level)}
              style={{
                padding: '8px 16px',
                background: riskLevel === level ? '#FF6B35' : '#f5f5f5',
                color: riskLevel === level ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {level === 'all' ? 'All Users' : level.charAt(0).toUpperCase() + level.slice(1) + ' Risk'}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ffb88c', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fff5f0', borderBottom: '1px solid #ffb88c' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>User ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>Risk Level</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>Reason</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>Last Active</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #ffb88c' }}>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#333', fontWeight: '500' }}>{user.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: user.risk === 'high' ? '#FFEBEE' : user.risk === 'medium' ? '#FFF3E0' : '#E8F5E9',
                      color: user.risk === 'high' ? '#C62828' : user.risk === 'medium' ? '#E65100' : '#2E7D32',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {user.risk.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{user.reason}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#999' }}>{user.lastActive}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button style={{
                      padding: '6px 12px',
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      color: '#FF6B35'
                    }}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default VulnerableUsersReport;
