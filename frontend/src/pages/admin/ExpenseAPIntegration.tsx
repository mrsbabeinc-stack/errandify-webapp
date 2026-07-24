import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n } from '../../services/financeAPI';

interface ExpenseClaim {
  claim_id: number;
  claim_number: string;
  employee_name: string;
  amount: number;
  category: string;
  vendor_id?: number;
  vendor_name?: string;
  status: 'approved' | 'rejected' | 'pending';
  created_date: string;
  ap_created: boolean;
}

interface APInvoice {
  ap_id: number;
  invoice_number: string;
  vendor_id: number;
  vendor_name: string;
  amount: number;
  due_date: string;
  source_claim_id: number;
  status: 'pending' | 'paid' | 'partial';
}

const ExpenseAPIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [apInvoices, setAPInvoices] = useState<APInvoice[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'invoices'>('expenses');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Real claims and AP invoices. This screen carried three invented claims and
   * two invented invoices, and "creating" an invoice only pushed an object into
   * localStorage — accounts payable never saw it.
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [{ claims }, invoices] = await Promise.all([
        financeAPI.listClaims(),
        financeAPI.listAPInvoices(),
      ]);
      const invoicedClaims = new Set(invoices.map(i => i.claim_id).filter(Boolean));
      setExpenses(claims.map(c => ({
        claim_id: c.id,
        claim_number: c.claim_number,
        employee_name: c.staff_name,
        amount: n(c.amount),
        category: c.category,
        vendor_name: c.receipt_extracted_vendor || undefined,
        // A claim can be raised as an AP invoice once it is past submission; the
        // vendor comes off the receipt.
        vendor_id: c.receipt_extracted_vendor ? c.id : undefined,
        status: c.status === 'rejected' ? 'rejected' : c.status === 'submitted' ? 'pending' : 'approved',
        created_date: c.claim_date,
        ap_created: invoicedClaims.has(c.id),
      })));
      setAPInvoices(invoices.map(i => ({
        ap_id: i.id,
        invoice_number: i.invoice_number,
        vendor_id: i.claim_id || 0,
        vendor_name: i.vendor,
        amount: n(i.amount),
        due_date: i.due_date,
        source_claim_id: i.claim_id || 0,
        status: i.status === 'paid' ? 'paid' : 'pending',
      })));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load expense/AP data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAPInvoice = async (expense: ExpenseClaim) => {
    if (!expense.vendor_name) {
      showToast('⚠️ This claim has no vendor on its receipt — an AP invoice needs one', 'error');
      return;
    }
    try {
      const invoice = await financeAPI.createAPInvoice({ claim_id: expense.claim_id });
      showToast(`✅ AP Invoice ${invoice.invoice_number} created from ${expense.claim_number}`, 'success');
      await loadData();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create AP invoice'}`, 'error');
    }
  };

  const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const totalAP = apInvoices.reduce((sum, i) => sum + i.amount, 0);
  const pendingAP = apInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>📝 Expense → AP Integration</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Raise supplier invoices from expense claims{loading ? ' · loading…' : ''}</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Approved Expenses', value: `SGD ${totalExpenses.toLocaleString()}`, color: '#FF6B35' },
            { label: 'Total AP Created', value: `SGD ${totalAP.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Pending Payment', value: `SGD ${pendingAP.toLocaleString()}`, color: '#E65100' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['expenses', 'invoices'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '8px 16px', background: activeTab === tab ? '#FF6B35' : '#f0f0f0', color: activeTab === tab ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              {tab === 'expenses' ? '💰 Approved Expenses' : '📤 AP Invoices Created'}
            </button>
          ))}
        </div>

        {activeTab === 'expenses' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Claim #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Employee / Vendor</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>AP Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.claim_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{expense.claim_number}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}><div style={{ fontWeight: '600', color: '#333' }}>{expense.employee_name}</div><div style={{ fontSize: '11px', color: '#666' }}>{expense.vendor_name || 'N/A'}</div></td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{expense.category}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {expense.amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: expense.ap_created ? '#E8F5E9' : '#FFF3E0', color: expense.ap_created ? '#2E7D32' : '#E65100', fontWeight: '600', borderRadius: '4px' }}>
                      {expense.ap_created ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {!expense.ap_created && expense.status === 'approved' && (
                        <button onClick={() => handleCreateAPInvoice(expense)} style={{ padding: '4px 8px', background: '#F0A81E', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Create AP</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Invoice #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Vendor</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>From Claim</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {apInvoices.map((invoice) => (
                  <tr key={invoice.ap_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{invoice.invoice_number}</td>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{invoice.vendor_name}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {invoice.amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{invoice.due_date}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>EXP-2026-{String(invoice.source_claim_id).padStart(3, '0')}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', background: invoice.status === 'pending' ? '#FFF3E0' : invoice.status === 'partial' ? '#FFF3E4' : '#E8F5E9', color: invoice.status === 'pending' ? '#E65100' : invoice.status === 'partial' ? '#D98C0C' : '#2E7D32', fontWeight: '600', borderRadius: '4px' }}>
                      {invoice.status === 'pending' ? '⏳ Pending' : invoice.status === 'partial' ? '↔️ Partial' : '✓ Paid'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
          <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0 0 8px 0', fontWeight: '600' }}>ℹ️ Integration Features</p>
          <ul style={{ fontSize: '12px', color: '#2E7D32', margin: 0, paddingLeft: '20px' }}>
            <li>Creates an AP invoice from a claim on demand — the vendor comes off the receipt, and a claim can only be raised once</li>
            <li>Sets due date 30 days from invoice date (Net 30 terms)</li>
            <li>Maintains reference link: Expense Claim → AP Invoice</li>
            <li>Prevents duplicate AP creation</li>
            <li>Tracks payment status: Pending, Partial, Paid</li>
            <li>Full audit trail with source claim reference</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExpenseAPIntegration;
