import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface TaxConfig {
  config_id: number;
  tax_type: string;
  rate: number;
  effective_date: string;
  status: 'active' | 'inactive';
}

interface TaxTransaction {
  transaction_id: number;
  transaction_date: string;
  type: 'purchase' | 'sale';
  amount: number;
  tax_amount: number;
  tax_rate: number;
  category: string;
  status: 'pending' | 'filed' | 'paid';
  reference: string;
}

interface TaxFiling {
  filing_id: number;
  filing_period: string;
  tax_type: string;
  total_taxable: number;
  total_tax: number;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'submitted' | 'paid';
  filing_date: string;
}

const TaxManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'transactions' | 'filings'>('config');
  const [configs, setConfigs] = useState<TaxConfig[]>([]);
  const [transactions, setTransactions] = useState<TaxTransaction[]>([]);
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState({ tax_type: 'GST', rate: 7, effective_date: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedConfigs = localStorage.getItem('tax_configs') || '[]';
    const savedTx = localStorage.getItem('tax_transactions') || '[]';
    const savedFilings = localStorage.getItem('tax_filings') || '[]';

    let mockConfigs: TaxConfig[] = [
      { config_id: 1, tax_type: 'GST', rate: 7, effective_date: '2026-01-01', status: 'active' },
      { config_id: 2, tax_type: 'Corporate Tax', rate: 17, effective_date: '2026-01-01', status: 'active' },
    ];
    let mockTx: TaxTransaction[] = [
      { transaction_id: 1, transaction_date: '2026-07-10', type: 'purchase', amount: 1000, tax_amount: 70, tax_rate: 7, category: 'Office Supplies', status: 'pending', reference: 'INV-2026-001' },
      { transaction_id: 2, transaction_date: '2026-07-09', type: 'sale', amount: 5000, tax_amount: 350, tax_rate: 7, category: 'Service Revenue', status: 'filed', reference: 'SLS-2026-001' },
    ];
    let mockFilings: TaxFiling[] = [
      { filing_id: 1, filing_period: '2026-Q2', tax_type: 'GST', total_taxable: 45000, total_tax: 3150, amount_due: 3150, amount_paid: 3150, status: 'paid', filing_date: '2026-07-01' },
      { filing_id: 2, filing_period: '2026-Q3', tax_type: 'GST', total_taxable: 52000, total_tax: 3640, amount_due: 3640, amount_paid: 0, status: 'draft', filing_date: '' },
    ];

    if (savedConfigs !== '[]') mockConfigs = JSON.parse(savedConfigs);
    if (savedTx !== '[]') mockTx = [...mockTx, ...JSON.parse(savedTx)];
    if (savedFilings !== '[]') mockFilings = [...mockFilings, ...JSON.parse(savedFilings)];

    setConfigs(mockConfigs);
    setTransactions(mockTx);
    setFilings(mockFilings);
  };

  const handleAddConfig = () => {
    if (!configForm.tax_type || !configForm.rate || !configForm.effective_date) {
      showToast('❌ Please fill all fields', 'error');
      return;
    }
    const newConfig: TaxConfig = {
      config_id: Date.now(),
      tax_type: configForm.tax_type,
      rate: configForm.rate,
      effective_date: configForm.effective_date,
      status: 'active',
    };
    const saved = localStorage.getItem('tax_configs') || '[]';
    const updated = [...JSON.parse(saved), newConfig];
    localStorage.setItem('tax_configs', JSON.stringify(updated));
    showToast(`✅ Tax config for ${configForm.tax_type} added`, 'success');
    setShowConfigForm(false);
    setConfigForm({ tax_type: 'GST', rate: 7, effective_date: '' });
    loadData();
  };

  const handleSubmitFiling = (filing: TaxFiling) => {
    const updated = filings.map(f => 
      f.filing_id === filing.filing_id 
        ? { ...f, status: 'submitted' as const, filing_date: new Date().toISOString().split('T')[0] }
        : f
    );
    setFilings(updated);
    localStorage.setItem('tax_filings', JSON.stringify(updated.filter(f => f.filing_id !== 1 && f.filing_id !== 2)));
    showToast(`✅ Filing ${filing.filing_period} submitted to IRAS`, 'success');
  };

  const gstTotal = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.tax_amount, 0);
  const gstPaid = filings.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount_paid, 0);
  const pendingAmount = filings.filter(f => f.status === 'draft').reduce((sum, f) => sum + f.amount_due, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>💰 Tax Management</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>GST/VAT tracking, tax liability & IRAS filing</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'GST Liability', value: `SGD ${gstTotal.toLocaleString()}`, color: '#FF6B35' },
            { label: 'GST Paid', value: `SGD ${gstPaid.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Pending Payment', value: `SGD ${pendingAmount.toLocaleString()}`, color: '#E65100' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['config', 'transactions', 'filings'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'config' ? '⚙️ Tax Config' : tab === 'transactions' ? '📋 Transactions' : '📄 Filings'}
            </button>
          ))}
        </div>

        {activeTab === 'config' && (
          <div>
            <button onClick={() => setShowConfigForm(!showConfigForm)} style={{ marginBottom: '24px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ Add Tax Config</button>

            {showConfigForm && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Tax Type *</label>
                  <select value={configForm.tax_type} onChange={(e) => setConfigForm({ ...configForm, tax_type: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                    <option>GST</option>
                    <option>Corporate Tax</option>
                    <option>Income Tax</option>
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Rate (%) *</label>
                  <input type="number" min="0" max="100" step="0.1" value={configForm.rate} onChange={(e) => setConfigForm({ ...configForm, rate: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Effective Date *</label>
                  <input type="date" value={configForm.effective_date} onChange={(e) => setConfigForm({ ...configForm, effective_date: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => setShowConfigForm(false)} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button onClick={handleAddConfig} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Add Config</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Tax Type</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Rate</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Effective Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.config_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{config.tax_type}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#FF6B35', fontWeight: '600' }}>{config.rate}%</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{config.effective_date}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: config.status === 'active' ? '#E8F5E9' : '#FFF3E0', color: config.status === 'active' ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>✓ {config.status.charAt(0).toUpperCase() + config.status.slice(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Type / Ref</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Tax</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.transaction_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{tx.transaction_date}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{tx.type === 'purchase' ? '📥' : '📤'} {tx.category}</div><div style={{ fontSize: '11px', color: '#666' }}>{tx.reference}</div></td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {tx.amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>SGD {tx.tax_amount}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: tx.status === 'filed' ? '#E8F5E9' : '#FFF3E0', color: tx.status === 'filed' ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>✓ {tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'filings' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Taxable Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Tax Due</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Paid</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filings.map((filing) => (
                  <tr key={filing.filing_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{filing.filing_period}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>SGD {filing.total_taxable.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {filing.total_tax.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: filing.amount_paid > 0 ? '#4CAF50' : '#999', fontWeight: '600' }}>SGD {filing.amount_paid.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: filing.status === 'paid' ? '#E8F5E9' : filing.status === 'submitted' ? '#FFF3E4' : '#FFF3E0', color: filing.status === 'paid' ? '#2E7D32' : filing.status === 'submitted' ? '#D98C0C' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {filing.status === 'paid' ? '✓ Paid' : filing.status === 'submitted' ? '📨 Submitted' : '✏️ Draft'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {filing.status === 'draft' && (
                        <button onClick={() => handleSubmitFiling(filing)} style={{ padding: '4px 8px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Submit to IRAS</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TaxManagement;
