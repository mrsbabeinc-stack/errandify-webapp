import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

const SecurityEncryptionHub: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'encryption' | 'audit' | 'policies'>('encryption');

  const securityMetrics = [
    { name: 'Data Encryption (At Rest)', status: 'configured', icon: '🔐', description: 'AES-256 encryption for all stored data' },
    { name: 'SSL/TLS (In Transit)', status: 'configured', icon: '🔒', description: 'HTTPS enforced, TLS 1.3+' },
    { name: 'API Rate Limiting', status: 'active', icon: '🛡️', description: '1000 req/min per IP, 100 req/min per user' },
    { name: 'CSRF Protection', status: 'enabled', icon: '⚔️', description: 'Token validation on all POST/PUT/DELETE' },
    { name: 'XSS Protection', status: 'enabled', icon: '🛡️', description: 'Content-Security-Policy headers enforced' },
    { name: 'SQL Injection Prevention', status: 'enabled', icon: '🔍', description: 'Parameterized queries, input validation' },
  ];

  const auditActivities = [
    { timestamp: '2026-07-15 14:32:15', user: 'admin@errandify.ai', action: 'Create Budget', status: 'success', ip: '192.168.1.100' },
    { timestamp: '2026-07-15 14:28:42', user: 'finance@errandify.ai', action: 'View Invoice', status: 'success', ip: '192.168.1.105' },
    { timestamp: '2026-07-15 14:15:08', user: 'hr@errandify.ai', action: 'Update Probation', status: 'success', ip: '192.168.1.110' },
    { timestamp: '2026-07-15 13:45:22', user: 'unknown', action: 'Failed Login Attempt', status: 'blocked', ip: '203.45.67.89' },
    { timestamp: '2026-07-15 13:22:11', user: 'ops@errandify.ai', action: 'Export Report', status: 'success', ip: '192.168.1.115' },
  ];

  const handleEnableEncryption = (type: string) => {
    showToast(`✅ ${type} encryption enabled`, 'success');
  };

  const handleRotateKeys = () => {
    showToast('✅ Encryption keys rotated successfully', 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🔐 Security & Encryption Hub</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Data encryption, audit trails, CSRF/XSS protection, rate limiting</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        {/* Security Score */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Security Score', value: '94/100', color: '#4CAF50' },
            { label: 'Encryption Level', value: 'AES-256', color: '#F0A81E' },
            { label: 'Vulnerabilities', value: '0 Critical', color: '#4CAF50' },
            { label: 'Last Audit', value: '2 hours ago', color: '#FF9800' },
          ].map((metric, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${metric.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{metric.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: metric.color }}>{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'encryption', label: '🔐 Encryption', icon: '🔐' },
            { id: 'audit', label: '📋 Audit Trail', icon: '📋' },
            { id: 'policies', label: '📜 Policies', icon: '📜' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '8px 16px', background: activeTab === tab.id ? '#FF6B35' : '#f0f0f0', color: activeTab === tab.id ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Encryption Tab */}
        {activeTab === 'encryption' && (
          <div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {securityMetrics.map((metric, idx) => (
                <div key={idx} style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '24px' }}>{metric.icon}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '4px' }}>{metric.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{metric.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '4px 8px', background: metric.status === 'configured' || metric.status === 'active' ? '#E8F5E9' : '#FFF3E0', color: metric.status === 'configured' || metric.status === 'active' ? '#2E7D32' : '#E65100', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                      {metric.status === 'configured' ? '✓ Configured' : metric.status === 'active' ? '✓ Active' : '⚠️ Disabled'}
                    </div>
                    {metric.status !== 'enabled' && (
                      <button onClick={() => handleEnableEncryption(metric.name)} style={{ padding: '4px 8px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>🔑 Key Management</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Master Encryption Key</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: 'monospace' }}>•••••••••••••••• (Rotated: 2026-07-01)</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>TLS Certificate</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Valid until 2027-07-15</div>
                </div>
              </div>
              <button onClick={handleRotateKeys} style={{ padding: '8px 16px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                🔄 Rotate Keys
              </button>
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Timestamp</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Action</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>IP Address</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditActivities.map((activity, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{activity.timestamp}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#333', fontWeight: '600' }}>{activity.user}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{activity.action}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>{activity.ip}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: activity.status === 'success' ? '#E8F5E9' : '#FFEBEE', color: activity.status === 'success' ? '#2E7D32' : '#C62828', fontWeight: '600', borderRadius: '4px' }}>
                      {activity.status === 'success' ? '✓ Success' : '✗ Blocked'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              { name: 'Password Policy', desc: 'Min 12 chars, uppercase, numbers, symbols', icon: '🔑' },
              { name: 'Session Timeout', desc: '30 min inactivity, auto-logout', icon: '⏱️' },
              { name: 'Two-Factor Authentication', desc: 'Optional for users, required for admins', icon: '📱' },
              { name: 'IP Whitelisting', desc: 'Admin access limited to approved IPs', icon: '🌐' },
              { name: 'Data Backup Policy', desc: 'Daily backups, 30-day retention, geo-redundant', icon: '💾' },
              { name: 'Incident Response', desc: '24-hour response time for security incidents', icon: '🚨' },
            ].map((policy, idx) => (
              <div key={idx} style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                  <div style={{ fontSize: '24px' }}>{policy.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '4px' }}>{policy.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{policy.desc}</div>
                  </div>
                  <button style={{ padding: '6px 12px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Features Info */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>🔐 Security Implementation Features</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>AES-256 encryption for data at rest</li>
            <li>TLS 1.3+ for data in transit (HTTPS)</li>
            <li>API rate limiting (1000 req/min per IP)</li>
            <li>CSRF token validation on all mutations</li>
            <li>XSS protection via Content-Security-Policy</li>
            <li>SQL injection prevention via parameterized queries</li>
            <li>Immutable audit trails for all actions</li>
            <li>User activity logging with IP tracking</li>
            <li>Encryption key rotation procedures</li>
            <li>Incident response protocols (24-hour SLA)</li>
            <li>Ready for backend implementation & monitoring</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SecurityEncryptionHub;
