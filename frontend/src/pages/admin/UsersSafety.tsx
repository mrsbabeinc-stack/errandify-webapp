import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const UsersSafetyPage: React.FC = () => {
  const [users] = useState([
    { id: 1, name: 'Sarah Tan', role: 'Asker/Doer', status: 'active', rating: 4.9, tasks: 145, verified: true, flag: null },
    { id: 2, name: 'John Lee', role: 'Doer', status: 'active', rating: 4.7, tasks: 89, verified: true, flag: null },
    { id: 3, name: 'Alice Wong', role: 'Asker', status: 'active', rating: 4.5, tasks: 23, verified: true, flag: 'warning' },
    { id: 4, name: 'Bob Chen', role: 'Doer', status: 'suspended', rating: 2.1, tasks: 5, verified: false, flag: 'critical' },
    { id: 5, name: 'Eve Kumar', role: 'Asker/Doer', status: 'active', rating: 4.8, tasks: 234, verified: true, flag: null },
  ]);

  const [safetyAlerts] = useState([
    { id: 1, severity: 'critical', type: '🚨 Safety Concern', desc: '1 user flagged for harassment', action: 'Review' },
    { id: 2, severity: 'high', type: '⚠️ Low Rating Trend', desc: '3 users dropped below 3 stars', action: 'Investigate' },
    { id: 3, severity: 'medium', type: '🔍 Verification Issue', desc: '5 unverified accounts created today', action: 'Check' },
  ]);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* PAGE HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0', color: '#333' }}>
              🛡️ Safety Monitoring
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Monitor user activity, verify accounts, and resolve safety concerns
            </p>
          </div>
          <button style={{
            padding: '10px 16px',
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FF5722';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FF6B35';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            Export Users
          </button>
        </div>

        {/* SAFETY ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#FF6B35' }}>
            🛡️ Safety Alerts
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {safetyAlerts.map((alert) => {
              let bgColor, borderColor;
              if (alert.severity === 'critical') {
                bgColor = '#FEE2E2';
                borderColor = '#F44336';
              } else if (alert.severity === 'high') {
                bgColor = '#FFF8F5';
                borderColor = '#FF6B35';
              } else {
                bgColor = '#FFF9F5';
                borderColor = '#FFD9B3';
              }
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: '16px',
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>
                    {alert.type}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                    {alert.desc}
                  </div>
                  <button style={{
                    alignSelf: 'flex-start',
                    padding: '8px 12px',
                    background: borderColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  >
                    {alert.action} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* USERS TABLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#FF6B35' }}>
            👤 Active Users
          </h2>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '2px solid #FFD9B3', background: 'white' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
            }}>
              <thead>
                <tr style={{
                  background: 'linear-gradient(to right, #FFF8F5, #FFFBF7)',
                  borderBottom: '2px solid #FFD9B3',
                }}>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>User</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Role</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Rating</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Errands</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Status</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Verified</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Alert</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF6B35',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: idx < users.length - 1 ? '1px solid #FFE6D9' : 'none',
                      background: user.flag === 'critical' ? '#FEE2E2' : user.flag === 'warning' ? '#FFF9F5' : 'white',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!user.flag) {
                        (e.currentTarget as HTMLElement).style.background = '#FFF8F5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = user.flag === 'critical' ? '#FEE2E2' : user.flag === 'warning' ? '#FFF9F5' : 'white';
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      {user.name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#666' }}>
                      {user.role}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#FF6B35' }}>
                      {user.rating}★
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      {user.tasks}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: user.status === 'active' ? '#E6F9F0' : '#FEE2E2',
                        color: user.status === 'active' ? '#4CAF50' : '#F44336',
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '16px' }}>
                      {user.verified ? '✅' : '⚠️'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {user.flag ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: user.flag === 'critical' ? '#FFD6D6' : '#FFE6CC',
                          color: user.flag === 'critical' ? '#F44336' : '#FF6B35',
                        }}>
                          {user.flag}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button style={{
                        padding: '6px 10px',
                        background: '#FFF8F5',
                        color: '#FF6B35',
                        border: '1px solid #FFD9B3',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FF6B35';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFF8F5';
                        e.currentTarget.style.color = '#FF6B35';
                      }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UsersSafetyPage;

