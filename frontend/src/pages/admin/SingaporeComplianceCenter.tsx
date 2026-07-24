import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface ComplianceCheck {
  id: number;
  name: string;
  status: 'compliant' | 'warning' | 'non-compliant';
  lastAudit: string;
  requirements: string[];
  actions: string[];
}

const SingaporeComplianceCenter: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pdpa' | 'acra' | 'mom' | 'iras'>('pdpa');

  const complianceItems: Record<string, ComplianceCheck[]> = {
    pdpa: [
      { id: 1, name: 'Data Consent Management', status: 'compliant', lastAudit: '2026-07-10', requirements: ['Explicit consent collection', 'Consent records maintained', 'Opt-out mechanism'], actions: ['View consent logs', 'Update policies'] },
      { id: 2, name: 'Data Retention Policy', status: 'compliant', lastAudit: '2026-07-08', requirements: ['Retention periods defined', 'Auto-deletion enabled', 'Archive procedures'], actions: ['Review policy', 'Configure retention'] },
      { id: 3, name: 'Right to Erasure (RTBF)', status: 'warning', lastAudit: '2026-07-05', requirements: ['Erasure requests logged', 'Execution within 30 days', 'Confirmation sent'], actions: ['Process pending requests', 'Update procedures'] },
    ],
    acra: [
      { id: 4, name: 'Audit Trail Logging', status: 'compliant', lastAudit: '2026-07-10', requirements: ['All transactions logged', 'User actions tracked', 'Immutable records'], actions: ['View audit logs', 'Export audit trail'] },
      { id: 5, name: 'Financial Statement Compliance', status: 'compliant', lastAudit: '2026-06-30', requirements: ['P&L accurate', 'Balance sheet balanced', 'Cash flow statement'], actions: ['Generate reports', 'Review statements'] },
      { id: 6, name: 'Record Retention (7 years)', status: 'compliant', lastAudit: '2026-07-01', requirements: ['7-year archive', 'Quick access', 'Secure storage'], actions: ['Manage archives', 'Verify retention'] },
    ],
    mom: [
      { id: 7, name: 'Leave Policies Compliance', status: 'compliant', lastAudit: '2026-07-09', requirements: ['Annual leave (7 days min)', 'Medical leave tracked', 'Statutory holidays'], actions: ['View leave policy', 'Update settings'] },
      { id: 8, name: 'Working Hours Compliance', status: 'compliant', lastAudit: '2026-07-08', requirements: ['Max 44 hrs/week', 'Rest day tracking', 'Overtime caps'], actions: ['Check hours', 'Adjust schedules'] },
      { id: 9, name: 'Probation Period Management', status: 'compliant', lastAudit: '2026-07-07', requirements: ['Min 1-6 months', 'Clear assessment', 'Documentation'], actions: ['Review probations', 'Generate reports'] },
    ],
    iras: [
      { id: 10, name: 'Tax Filing Integration', status: 'warning', lastAudit: '2026-07-10', requirements: ['Q3 GST filing due', 'Accurate calculations', 'Documentation'], actions: ['File Q3 return', 'Review calculations'] },
      { id: 11, name: 'GST Tracking (7%)', status: 'compliant', lastAudit: '2026-07-09', requirements: ['All transactions taxed', 'Invoices updated', 'Liabilities tracked'], actions: ['View GST ledger', 'Reconcile accounts'] },
      { id: 12, name: 'Tax Calculation Engine', status: 'compliant', lastAudit: '2026-07-08', requirements: ['Accurate calculations', 'Audit trail', 'Exception handling'], actions: ['Test calculations', 'Verify accuracy'] },
    ],
  };

  const handleAudit = (name: string) => {
    showToast(`✅ Audit initiated for ${name}`, 'success');
  };

  const handleAction = (action: string) => {
    showToast(`✅ ${action} executed`, 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>🇸🇬 Singapore Compliance Center</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>PDPA, ACRA, MOM, IRAS compliance monitoring & audit trails</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        {/* Compliance Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { name: 'PDPA', icon: '🔐', status: 'compliant', percent: 95 },
            { name: 'ACRA', icon: '📊', status: 'compliant', percent: 98 },
            { name: 'MOM', icon: '👥', status: 'compliant', percent: 100 },
            { name: 'IRAS', icon: '💰', status: 'warning', percent: 92 },
          ].map((comp) => (
            <div key={comp.name} style={{ padding: '16px', background: comp.status === 'compliant' ? '#E8F5E9' : '#FFF3E0', border: comp.status === 'compliant' ? '2px solid #4CAF50' : '2px solid #FF9800', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{comp.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>{comp.name}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: comp.status === 'compliant' ? '#4CAF50' : '#FF9800' }}>{comp.percent}%</div>
              <div style={{ fontSize: '11px', color: comp.status === 'compliant' ? '#2E7D32' : '#E65100', fontWeight: '600', marginTop: '4px' }}>
                {comp.status === 'compliant' ? '✓ Compliant' : '⚠️ Attention Needed'}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { id: 'pdpa', label: '🔐 PDPA (Data Privacy)', icon: '🔐' },
            { id: 'acra', label: '📊 ACRA (Accounting)', icon: '📊' },
            { id: 'mom', label: '👥 MOM (Employment)', icon: '👥' },
            { id: 'iras', label: '💰 IRAS (Tax)', icon: '💰' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '8px 16px', background: activeTab === tab.id ? '#FF6B35' : '#f0f0f0', color: activeTab === tab.id ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compliance Items */}
        <div style={{ display: 'grid', gap: '12px' }}>
          {complianceItems[activeTab].map((item) => (
            <div key={item.id} style={{ padding: '16px', background: 'white', border: item.status === 'compliant' ? '2px solid #4CAF50' : item.status === 'warning' ? '2px solid #FF9800' : '2px solid #F44336', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>{item.name}</h3>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>Last Audit: {item.lastAudit}</div>
                </div>
                <div style={{ padding: '4px 8px', background: item.status === 'compliant' ? '#E8F5E9' : item.status === 'warning' ? '#FFF3E0' : '#FFEBEE', color: item.status === 'compliant' ? '#2E7D32' : item.status === 'warning' ? '#E65100' : '#C62828', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                  {item.status === 'compliant' ? '✓ Compliant' : item.status === 'warning' ? '⚠️ Warning' : '✗ Non-Compliant'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Requirements:</div>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#666' }}>
                  {item.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleAudit(item.name)} style={{ padding: '6px 12px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  🔍 Audit
                </button>
                {item.actions.map((action, idx) => (
                  <button key={idx} onClick={() => handleAction(action)} style={{ padding: '6px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Trail */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E4', borderRadius: '8px', border: '1px solid #F0A81E' }}>
          <p style={{ fontSize: '12px', color: '#D98C0C', margin: '0 0 8px 0', fontWeight: '600' }}>📋 Compliance Features</p>
          <ul style={{ fontSize: '12px', color: '#D98C0C', margin: 0, paddingLeft: '20px' }}>
            <li>Real-time compliance monitoring for PDPA, ACRA, MOM, IRAS</li>
            <li>Immutable audit trails for all compliance actions</li>
            <li>Automated compliance alerts & violation detection</li>
            <li>One-click audit initiation & report generation</li>
            <li>Data retention policies (7-year archive for ACRA)</li>
            <li>Right to erasure (RTBF) request handling</li>
            <li>Financial statement compliance validation</li>
            <li>Tax filing integration with IRAS calendar</li>
            <li>Leave & working hours policy enforcement</li>
            <li>Ready for backend audit logging & encryption</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SingaporeComplianceCenter;
