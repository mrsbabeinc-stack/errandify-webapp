import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  changes: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  ipAddress: string;
}

interface GDPRRequest {
  id: string;
  userId: string;
  userName: string;
  requestType: 'export' | 'delete' | 'access';
  status: 'pending' | 'processing' | 'completed' | 'denied';
  createdAt: string;
  completedAt?: string;
  reason?: string;
}

interface ComplianceReport {
  id: string;
  name: string;
  type: 'security' | 'privacy' | 'payment' | 'general';
  generatedAt: string;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  findings: number;
}

export default function AdminAuditCompliance() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [tab, setTab] = useState<'audit' | 'gdpr' | 'compliance'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');

  useEffect(() => {
    // Load audit logs
    const savedLogs = localStorage.getItem('auditLogs');
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    } else {
      const demoLogs: AuditLog[] = [
        {
          id: 'log_1',
          action: 'USER_BANNED',
          actor: 'Admin (sara@errandify.ai)',
          target: 'User #5432',
          changes: 'Status changed from active to banned',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: 'critical',
          ipAddress: '203.0.113.45',
        },
        {
          id: 'log_2',
          action: 'PAYMENT_REFUND',
          actor: 'Finance Admin (john@errandify.ai)',
          target: 'Transaction #TXN-8834',
          changes: 'Refund of $125.50 processed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          severity: 'warning',
          ipAddress: '203.0.113.89',
        },
        {
          id: 'log_3',
          action: 'ADMIN_LOGIN',
          actor: 'Admin (alice@errandify.ai)',
          target: 'Admin Account',
          changes: 'Login successful with 2FA',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          severity: 'info',
          ipAddress: '203.0.113.12',
        },
        {
          id: 'log_4',
          action: 'KYC_APPROVED',
          actor: 'KYC Admin (ky@errandify.ai)',
          target: 'User #7821',
          changes: 'Identity verified and approved',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          severity: 'info',
          ipAddress: '203.0.113.67',
        },
        {
          id: 'log_5',
          action: 'ERRAND_CANCELLED',
          actor: 'Admin (ops@errandify.ai)',
          target: 'Errand #ERR-5521',
          changes: 'Errand cancelled with $50 compensation issued',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          severity: 'warning',
          ipAddress: '203.0.113.34',
        },
      ];
      setAuditLogs(demoLogs);
      localStorage.setItem('auditLogs', JSON.stringify(demoLogs));
    }

    // Load GDPR requests
    const savedGDPR = localStorage.getItem('gdprRequests');
    if (savedGDPR) {
      setGdprRequests(JSON.parse(savedGDPR));
    } else {
      const demoGDPR: GDPRRequest[] = [
        {
          id: 'gdpr_1',
          userId: 'user_123',
          userName: 'Jane Tan',
          requestType: 'export',
          status: 'completed',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
          completedAt: new Date(Date.now() - 604800000).toISOString(),
        },
        {
          id: 'gdpr_2',
          userId: 'user_456',
          userName: 'Robert Lee',
          requestType: 'delete',
          status: 'processing',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'gdpr_3',
          userId: 'user_789',
          userName: 'Sarah Wong',
          requestType: 'access',
          status: 'pending',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setGdprRequests(demoGDPR);
      localStorage.setItem('gdprRequests', JSON.stringify(demoGDPR));
    }

    // Load compliance reports
    const savedReports = localStorage.getItem('complianceReports');
    if (savedReports) {
      setComplianceReports(JSON.parse(savedReports));
    } else {
      const demoReports: ComplianceReport[] = [
        {
          id: 'report_1',
          name: 'PDPA Compliance Check',
          type: 'privacy',
          generatedAt: new Date(Date.now() - 604800000).toISOString(),
          status: 'compliant',
          findings: 0,
        },
        {
          id: 'report_2',
          name: 'Payment Security Audit',
          type: 'payment',
          generatedAt: new Date(Date.now() - 1296000000).toISOString(),
          status: 'compliant',
          findings: 0,
        },
        {
          id: 'report_3',
          name: 'General Security Assessment',
          type: 'security',
          generatedAt: new Date(Date.now() - 2592000000).toISOString(),
          status: 'at-risk',
          findings: 3,
        },
      ];
      setComplianceReports(demoReports);
      localStorage.setItem('complianceReports', JSON.stringify(demoReports));
    }
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const filteredGDPR = gdprRequests.filter(req => {
    const matchesSteatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = req.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSteatus && matchesSearch;
  });

  const severityColors = {
    'info': '#2196F3',
    'warning': '#FF9800',
    'critical': '#F44336',
  };

  const statusColors = {
    'pending': '#FF9800',
    'processing': '#2196F3',
    'completed': '#4CAF50',
    'denied': '#F44336',
  };

  const complianceStatusColors = {
    'compliant': '#4CAF50',
    'at-risk': '#FF9800',
    'non-compliant': '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📋 Audit & Compliance
          </h2>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Monitor audit logs, GDPR requests and compliance reports
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', paddingBottom: '8px' }}>
        {(['audit', 'gdpr', 'compliance'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'transparent',
              color: tab === t ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t === 'audit' && '🔍 Audit Logs'}
            {t === 'gdpr' && '🛡️ GDPR Requests'}
            {t === 'compliance' && '✓ Compliance'}
          </button>
        ))}
      </div>

      {/* AUDIT LOGS TAB */}
      {tab === 'audit' && (
        <div>
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid #FFD9B3',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            <input
              type="text"
              placeholder="Search by action, actor, or target..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #FFD9B3',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              style={{
                padding: '10px 12px',
                border: '2px solid #FFD9B3',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Severity</option>
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredLogs.map(log => (
              <div key={log.id} style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${severityColors[log.severity]}`,
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {log.actor} → {log.target}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    background: severityColors[log.severity],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    height: 'fit-content',
                  }}>
                    {log.severity.toUpperCase()}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    <strong>Changes:</strong> {log.changes}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', display: 'flex', gap: '12px' }}>
                    <span>Time: {new Date(log.timestamp).toLocaleString()}</span>
                    <span>IP: {log.ipAddress}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GDPR REQUESTS TAB */}
      {tab === 'gdpr' && (
        <div>
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid #FFD9B3',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            <input
              type="text"
              placeholder="Search by user name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #FFD9B3',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: '10px 12px',
                border: '2px solid #FFD9B3',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="processing">⚙️ Processing</option>
              <option value="completed">✓ Completed</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredGDPR.map(req => (
              <div key={req.id} style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${statusColors[req.status]}`,
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {req.userName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      User ID: {req.userId} • Request: <strong>{req.requestType.toUpperCase()}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Created: {new Date(req.createdAt).toLocaleDateString()}
                      {req.completedAt && ` • Completed: ${new Date(req.completedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    background: statusColors[req.status],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    height: 'fit-content',
                    whiteSpace: 'nowrap',
                  }}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLIANCE TAB */}
      {tab === 'compliance' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {complianceReports.map(report => (
            <div key={report.id} style={{
              padding: '16px',
              background: 'white',
              border: `2px solid ${complianceStatusColors[report.status]}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    {report.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    Type: <strong>{report.type}</strong> • Findings: <strong>{report.findings}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Generated: {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    padding: '6px 12px',
                    background: complianceStatusColors[report.status],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}>
                    {report.status.toUpperCase()}
                  </div>
                  <button style={{
                    padding: '6px 12px',
                    background: '#e3f2fd',
                    color: '#1976d2',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}>
                    View Report
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
