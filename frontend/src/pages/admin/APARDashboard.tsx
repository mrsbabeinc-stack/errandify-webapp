import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Invoice {
  invoice_id: number;
  party: string;
  type: 'payable' | 'receivable';
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  days_outstanding: number;
}

const APARDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'all' | 'payable' | 'receivable'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'partial'>('all');

  useEffect(() => {
    loadInvoices();
  }, [invoiceType, selectedStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      // Mock data
      const mockInvoices: Invoice[] = [
        // Payables (Vendor Invoices)
        {
          invoice_id: 1,
          party: 'TechSupplies Ltd',
          type: 'payable',
          invoice_date: '2026-07-01',
          due_date: '2026-07-31',
          amount: 5000,
          paid_amount: 0,
          status: 'pending',
          days_outstanding: 14,
        },
        {
          invoice_id: 2,
          party: 'Office Furniture Co',
          type: 'payable',
          invoice_date: '2026-06-15',
          due_date: '2026-07-15',
          amount: 8500,
          paid_amount: 0,
          status: 'overdue',
          days_outstanding: 30,
        },
        {
          invoice_id: 3,
          party: 'Utilities Provider',
          type: 'payable',
          invoice_date: '2026-07-05',
          due_date: '2026-07-20',
          amount: 2000,
          paid_amount: 2000,
          status: 'paid',
          days_outstanding: 0,
        },
        {
          invoice_id: 4,
          party: 'Marketing Agency',
          type: 'payable',
          invoice_date: '2026-06-20',
          due_date: '2026-07-20',
          amount: 12000,
          paid_amount: 6000,
          status: 'partial',
          days_outstanding: 25,
        },
        // Receivables (Customer Invoices)
        {
          invoice_id: 5,
          party: 'ABC Corporation',
          type: 'receivable',
          invoice_date: '2026-06-15',
          due_date: '2026-07-15',
          amount: 15000,
          paid_amount: 0,
          status: 'overdue',
          days_outstanding: 30,
        },
        {
          invoice_id: 6,
          party: 'XYZ Services Ltd',
          type: 'receivable',
          invoice_date: '2026-07-01',
          due_date: '2026-07-31',
          amount: 22000,
          paid_amount: 22000,
          status: 'paid',
          days_outstanding: 0,
        },
        {
          invoice_id: 7,
          party: 'Global Trading Inc',
          type: 'receivable',
          invoice_date: '2026-07-05',
          due_date: '2026-08-05',
          amount: 18500,
          paid_amount: 0,
          status: 'pending',
          days_outstanding: 10,
        },
        {
          invoice_id: 8,
          party: 'Local Enterprises',
          type: 'receivable',
          invoice_date: '2026-06-01',
          due_date: '2026-07-01',
          amount: 9000,
          paid_amount: 5000,
          status: 'partial',
          days_outstanding: 45,
        },
      ];

      let filtered = mockInvoices;
      if (invoiceType !== 'all') {
        filtered = filtered.filter(inv => inv.type === invoiceType);
      }
      if (selectedStatus !== 'all') {
        filtered = filtered.filter(inv => inv.status === selectedStatus);
      }

      setInvoices(filtered);
    } catch (error) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string; icon: string } } = {
      paid: { bg: '#E8F5E9', color: '#2E7D32', text: 'Paid', icon: '✓' },
      pending: { bg: '#E3F2FD', color: '#1565C0', text: 'Pending', icon: '⏳' },
      overdue: { bg: '#FFEBEE', color: '#C62828', text: 'Overdue', icon: '⚠' },
      partial: { bg: '#FFF3E0', color: '#E65100', text: 'Partial', icon: '◐' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        style={{
          padding: '4px 8px',
          background: style.bg,
          color: style.color,
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {style.icon} {style.text}
      </span>
    );
  };

  const payables = invoices.filter(inv => inv.type === 'payable');
  const receivables = invoices.filter(inv => inv.type === 'receivable');

  const payablesTotal = payables.reduce((sum, inv) => sum + inv.amount, 0);
  const payablesPaid = payables.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const payablesOutstanding = payablesTotal - payablesPaid;

  const receivablesTotal = receivables.reduce((sum, inv) => sum + inv.amount, 0);
  const receivablesPaid = receivables.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const receivablesOutstanding = receivablesTotal - receivablesPaid;

  const overdueAP = payables.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0);
  const overdueAR = receivables.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              💳 Accounts Payable & Receivable
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Track vendor invoices and customer payments
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
            }}
          >
            ←
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Payables Total', value: `SGD ${payablesTotal.toLocaleString()}`, color: '#F44336', icon: '📤' },
            { label: 'Payables Outstanding', value: `SGD ${payablesOutstanding.toLocaleString()}`, color: '#FF9800', icon: '⏳' },
            { label: 'Receivables Total', value: `SGD ${receivablesTotal.toLocaleString()}`, color: '#4CAF50', icon: '📥' },
            { label: 'Receivables Outstanding', value: `SGD ${receivablesOutstanding.toLocaleString()}`, color: '#2196F3', icon: '⏳' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Risk Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Overdue Payables', value: `SGD ${overdueAP.toLocaleString()}`, color: '#F44336', icon: '⚠' },
            { label: 'Overdue Receivables', value: `SGD ${overdueAR.toLocaleString()}`, color: '#FF9800', icon: '⚠' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '28px' }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{stat.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Type:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'payable' as const, label: 'Payables' },
              { value: 'receivable' as const, label: 'Receivables' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInvoiceType(opt.value)}
                style={{
                  padding: '6px 12px',
                  background: invoiceType === opt.value ? '#FF6B35' : '#f0f0f0',
                  color: invoiceType === opt.value ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginLeft: '16px' }}>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
          </select>

          <button
            onClick={() => showToast('📋 New invoice created', 'success')}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ➕ New Invoice
          </button>
        </div>

        {/* Invoices Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Party
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Invoice Date
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>
                  Due Date
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>
                  Amount
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>
                  Paid
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>
                  Outstanding
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Days Outstanding
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                    {invoice.party}
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {invoice.type === 'payable' ? '📤 Payable' : '📥 Receivable'}
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                    SGD {invoice.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#4CAF50' }}>
                    SGD {invoice.paid_amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#F44336' }}>
                    SGD {(invoice.amount - invoice.paid_amount).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: invoice.days_outstanding > 30 ? '#F44336' : invoice.days_outstanding > 14 ? '#FF9800' : '#666',
                    }}
                  >
                    {invoice.days_outstanding} days
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getStatusBadge(invoice.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '12px', color: '#E65100', margin: 0, lineHeight: '1.6' }}>
            <strong>ℹ️ Aging Analysis:</strong> Monitor outstanding invoices closely. Items overdue by 30+ days should be prioritized for follow-up to ensure healthy cash flow.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default APARDashboard;
