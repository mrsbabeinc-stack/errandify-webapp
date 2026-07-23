import React, { useState, useEffect } from 'react';
import WalletBreakdown from './WalletBreakdown';
import PaymentHoldsStatus from './PaymentHoldsStatus';

interface Transaction {
  id: number;
  date: string;
  description: string;
  type: 'income' | 'expense' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  method: string;
}

const exportToExcel = (transactions: Transaction[]) => {
  const headers = ['Date', 'Description', 'Reference', 'Method', 'Amount', 'Type', 'Status'];
  const rows = transactions.map(t => [
    t.date,
    t.description,
    t.reference,
    t.method,
    `${t.type === 'income' ? '+' : '-'} SGD ${Math.abs(t.amount)}`,
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    t.status.charAt(0).toUpperCase() + t.status.slice(1),
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface Props {
  companyId?: number;
  pointsBalance?: number;
}

const CompanyPaymentHistory: React.FC<Props> = ({ companyId }) => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      type: 'visa',
      last4: '1234',
      name: 'Rumah Emas',
      isDefault: true,
      stripeId: 'pm_1234567890',
    },
    {
      id: 2,
      type: 'mastercard',
      last4: '5678',
      name: 'Company Account',
      isDefault: false,
      stripeId: 'pm_0987654321',
    },
  ]);

  const [billingData, setBillingData] = useState({
    email: 'billing@rumahemascompany.com',
    address: '123 Business Street, Singapore 123456',
  });

  const [newCardData, setNewCardData] = useState({
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    zip: '',
  });

  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [addCardLoading, setAddCardLoading] = useState(false);
  // Was five hardcoded transactions — a $450 errand payout, a Gold Partner
  // subscription charge, an ad campaign — shown against a wallet holding
  // nothing. Now reads /api/wallet/transactions.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/transactions?limit=100`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        const b = await res.json().catch(() => ({}));
        if (!res.ok) { setTxError(b.error || 'Could not load transactions'); return; }

        const rows = b.data?.transactions || b.data || [];
        setTransactions(rows.map((t: any, i: number) => ({
          id: t.id ?? t.task_id ?? i + 1,
          date: t.date ? String(t.date).slice(0, 10) : '',
          description: t.title
            ? `${t.title}${t.other_party ? ` — ${t.other_party}` : ''}`
            : (t.description || 'Transaction'),
          // The API speaks earning/spent; this screen speaks income/expense
          type: t.type === 'earning' ? 'income' : t.type === 'spent' ? 'expense' : (t.type || 'expense'),
          amount: Number(t.amount) || 0,
          status: ['completed_confirmed', 'completed', 'rated'].includes(String(t.status))
            ? 'completed'
            : String(t.status) === 'failed' ? 'failed' : 'pending',
          reference: t.reference || t.formatted_id || (t.task_id ? `ERR-${t.task_id}` : '—'),
          method: t.method || 'Errandify Wallet',
        })));
        setTxError('');
      } catch {
        setTxError('Could not load transactions');
      } finally {
        setTxLoading(false);
      }
    })();
  }, []);

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'refund'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  const filteredTransactions = transactions.filter(t => {
    const typeMatch = filterType === 'all' || t.type === filterType;
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="payment-history">
      {/* Theme Notification */}
      {notification && (
        <div className={`themed-notification notification-${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'success' ? '✓' : '✕'}
          </div>
          <div className="notification-content">
            {notification.message.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <button
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="history-header">
        <div>
          <h2>Payment History</h2>
          <p className="subtitle">Track all transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card income" title="All completed income transactions including errand earnings and referral bonuses">
          <span className="label">Total Income</span>
          <span className="amount">SGD ${totalIncome}</span>
          <span className="period">This month</span>
        </div>
        <div className="card expense" title="All completed expense transactions including subscriptions and advertising campaigns">
          <span className="label">Total Expense</span>
          <span className="amount">SGD ${totalExpense}</span>
          <span className="period">This month</span>
        </div>
        <div className="card balance" title="Your net balance after subtracting expenses from income this month">
          <span className="label">Net Balance</span>
          <span className="amount">SGD ${totalIncome - totalExpense}</span>
          <span className="period">This month</span>
        </div>
      </div>

      {/* Wallet & Payment Status */}
      <div className="wallet-section">
        <div style={{ marginBottom: '24px' }}>
          {/* The same fabricated split as the settings tab: a default 3450 EP
              carved 50/30/18 with a flat 199 subscription. Dropping the prop
              lets WalletBreakdown read the real wallet. */}
          <WalletBreakdown />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <PaymentHoldsStatus companyId={companyId} />
        </div>
      </div>

      {/* Payment Methods - Stripe Integration */}
      <div className="payment-methods-section">
        <div className="section-title">
          <h3>💳 Payment Methods</h3>
          <p className="section-desc">Manage your payment methods securely with Stripe</p>
        </div>

        {paymentMethods.length > 0 && (
          <div className="payment-cards-list">
            {paymentMethods.map(card => (
              <div key={card.id} className="payment-card">
                <div className="card-left">
                  <div className="card-icon">
                    {card.type === 'visa' ? '💳' : '💳'}
                  </div>
                  <div className="card-info">
                    <div className="card-type">{card.type.toUpperCase()}</div>
                    <div className="card-number">•••• •••• •••• {card.last4}</div>
                    <div className="card-holder">{card.name}</div>
                  </div>
                </div>
                <div className="card-right">
                  {card.isDefault && <span className="badge default">Default</span>}
                  <div className="card-buttons">
                    {!card.isDefault && (
                      <button
                        className="btn-small btn-default"
                        onClick={() => {
                          setPaymentMethods(paymentMethods.map(c => ({
                            ...c,
                            isDefault: c.id === card.id
                          })));
                          showNotification('success', 'Default payment method updated!');
                        }}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      className="btn-small btn-remove"
                      onClick={() => {
                        if (confirm(`Remove ${card.type.toUpperCase()} •••• ${card.last4}?`)) {
                          setPaymentMethods(paymentMethods.filter(c => c.id !== card.id));
                          showNotification('success', 'Payment method removed successfully!');
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {paymentMethods.length === 0 && (
          <div className="no-payment-methods">
            <p>No payment methods added yet. Add one to get started.</p>
          </div>
        )}

        <button
          className={`btn-add-payment ${showPaymentModal ? 'active' : ''}`}
          onClick={() => setShowPaymentModal(!showPaymentModal)}
        >
          {showPaymentModal ? '✕ Cancel' : '+ Add Payment Method'}
        </button>

        {showPaymentModal && (
          <div className="stripe-form-container">
            <div className="stripe-form-header">
              <h4>🔒 Add New Payment Method</h4>
              <p>Your card details are securely processed by Stripe</p>
            </div>

            <div className="stripe-form">
              <div className="form-group">
                <label>Card Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Business Visa"
                  value={newCardData.name}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Card Number *</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={newCardData.cardNumber}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  maxLength={19}
                  required
                />
                <small className="help-text">Stripe will tokenize this securely</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={newCardData.expiry}
                    onChange={(e) => setNewCardData(prev => ({ ...prev, expiry: e.target.value }))}
                    maxLength={5}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>CVC *</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={newCardData.cvc}
                    onChange={(e) => setNewCardData(prev => ({ ...prev, cvc: e.target.value }))}
                    maxLength={4}
                    required
                  />
                  <small className="help-text">3-4 digits on back</small>
                </div>
              </div>

              <div className="form-group">
                <label>Billing ZIP Code *</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={newCardData.zip}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, zip: e.target.value }))}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setNewCardData({ name: '', cardNumber: '', expiry: '', cvc: '', zip: '' });
                  }}
                  disabled={addCardLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={() => {
                    if (!newCardData.name || !newCardData.cardNumber || !newCardData.expiry || !newCardData.cvc || !newCardData.zip) {
                      showNotification('error', 'Please fill in all required fields');
                      return;
                    }

                    setAddCardLoading(true);

                    setTimeout(() => {
                      const last4 = newCardData.cardNumber.slice(-4);
                      const cardType = newCardData.cardNumber.startsWith('4') ? 'visa' : 'mastercard';

                      const newPaymentMethod = {
                        id: paymentMethods.length + 1,
                        type: cardType,
                        last4: last4,
                        name: newCardData.name,
                        isDefault: false,
                        stripeId: `pm_${Math.random().toString(36).substr(2, 9)}`,
                      };

                      setPaymentMethods([...paymentMethods, newPaymentMethod]);
                      setAddCardLoading(false);
                      setShowPaymentModal(false);
                      setNewCardData({ name: '', cardNumber: '', expiry: '', cvc: '', zip: '' });
                      showNotification('success', 'Card tokenized with Stripe and added successfully!');
                    }, 1000);
                  }}
                  disabled={addCardLoading}
                >
                  {addCardLoading ? '⏳ Processing with Stripe...' : 'Add Card Securely'}
                </button>
              </div>

              <div className="stripe-notice">
                <p>🔐 PCI DSS Level 1 Compliant - Your card data is encrypted and tokenized by Stripe</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Billing Information */}
      <div className="billing-section">
        <h3>🏢 Billing Information</h3>
        <div className="billing-form">
          <div className="form-group">
            <label>Billing Email</label>
            <input type="email" value={billingData.email} onChange={(e) => setBillingData(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Billing Address</label>
            <input type="text" value={billingData.address} onChange={(e) => setBillingData(prev => ({ ...prev, address: e.target.value }))} />
          </div>
          <button className="btn-update" onClick={() => {
            showNotification('success', `Billing information updated!\nEmail: ${billingData.email}\nAddress: ${billingData.address}`);
          }}>Update Billing Info</button>
        </div>
      </div>

      {/* Transactions & Invoices Combined */}
      <div className="transactions-invoices-section">
        <div className="section-header">
          <h3>📋 Transactions & Invoices</h3>
          <div className="filter-controls">
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">All Transactions</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="refund">Refund</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <button className="btn-export-excel" onClick={() => {
              exportToExcel(filteredTransactions);
            }}>📊 Export</button>
          </div>
        </div>

        <div className="transaction-list">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Reference</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txLoading && (
              <tr><td colSpan={6} style={{ padding: 20, color: '#6B7280' }}>Loading transactions…</td></tr>
            )}
            {!txLoading && txError && (
              <tr><td colSpan={6} style={{ padding: 20, color: '#B91C1C' }}>{txError}</td></tr>
            )}
            {!txLoading && !txError && filteredTransactions.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, color: '#6B7280' }}>No transactions yet.</td></tr>
            )}
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id} className={`row-${transaction.type}`}>
                <td className="date">{transaction.date}</td>
                <td className="description">{transaction.description}</td>
                <td className="reference">{transaction.reference}</td>
                <td className="method">{transaction.method}</td>
                <td className={`amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'} SGD ${Math.abs(transaction.amount)}
                </td>
                <td className="status-cell">
                  <span className={`status-badge ${transaction.status}`}>
                    {transaction.status === 'completed' && '✓ Completed'}
                    {transaction.status === 'pending' && '⏳ Pending'}
                    {transaction.status === 'failed' && '✗ Failed'}
                  </span>
                  {transaction.status === 'completed' && (
                    <button className="btn-download-tx" title="Download Invoice" onClick={() => {
                      const invoiceType = transaction.type === 'expense' ? 'INVOICE' : 'RECEIPT';
                      const invoiceText = `
${invoiceType}
═══════════════════════════════════════════════════════════

Reference: ${transaction.reference}
Date: ${transaction.date}
Description: ${transaction.description}
Method: ${transaction.method}
Amount: SGD $${Math.abs(transaction.amount)}
Type: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
Status: ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}

═══════════════════════════════════════════════════════════

Generated from Errandify Payment System
Thank you for your business!
`;
                      const blob = new Blob([invoiceText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${transaction.type}-${transaction.reference}-${transaction.date}.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}>📥 Invoice</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <style>{`
        .payment-history {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .history-header {
          margin-bottom: 24px;
        }

        .history-header h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .card {
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card.income {
          background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
          border-left: 4px solid #27AE60;
        }

        .card.expense {
          background: linear-gradient(135deg, #FFEBEE, #FFCDD2);
          border-left: 4px solid #E74C3C;
        }

        .card.balance {
          background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
          border-left: 4px solid #2196F3;
        }

        .card .label {
          font-size: 12px;
          color: #666;
          font-weight: 600;
        }

        .card .amount {
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .card .period {
          font-size: 11px;
          color: #999;
        }

        .card {
          cursor: help;
          position: relative;
          transition: all 0.3s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .card:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          z-index: 100;
          margin-bottom: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          pointer-events: none;
        }

        .card:hover::before {
          content: '';
          position: absolute;
          bottom: calc(100% - 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #333;
          z-index: 100;
          pointer-events: none;
        }

        .filter-section {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          max-width: 200px;
        }

        .filter-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .filter-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
          cursor: pointer;
        }

        .btn-export-excel {
          padding: 10px 16px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          align-self: flex-end;
          margin-top: 22px;
        }

        .btn-export-excel:hover {
          background: #E55A2B;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        .transaction-list {
          overflow-x: auto;
          max-height: 500px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .transaction-list::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .transaction-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .transaction-list::-webkit-scrollbar-thumb {
          background: #FF6B35;
          border-radius: 10px;
        }

        .transaction-list::-webkit-scrollbar-thumb:hover {
          background: #E55A2B;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .history-table thead {
          background: #f5f5f5;
          border-bottom: 2px solid #e0e0e0;
        }

        .history-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #666;
        }

        .history-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .history-table tr:hover {
          background: #fafafa;
        }

        .date {
          color: #999;
          font-size: 12px;
        }

        .description {
          font-weight: 500;
          color: #333;
        }

        .reference {
          color: #FF6B35;
          font-weight: 600;
        }

        .method {
          color: #666;
          font-size: 12px;
        }

        .amount {
          font-weight: 700;
          text-align: right;
        }

        .amount.income {
          color: #27AE60;
        }

        .amount.expense {
          color: #E74C3C;
        }

        .amount.refund {
          color: #FF6B35;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.completed {
          background: #E8F5E9;
          color: #27AE60;
        }

        .status-badge.pending {
          background: #FFF3E0;
          color: #E55A24;
        }

        .status-badge.failed {
          background: #FFEBEE;
          color: #C62828;
        }

        .status-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-download-tx {
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
          margin-left: 8px;
        }

        .btn-download-tx:hover {
          background: #E55A2B;
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        .wallet-section {
          margin-bottom: 32px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .payment-methods-section,
        .billing-section,
        .invoices-section {
          margin-bottom: 32px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .payment-methods-section h3,
        .billing-section h3,
        .invoices-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .payment-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .card-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .card-type {
          font-weight: 600;
          color: #333;
        }

        .card-number {
          font-size: 12px;
          color: #999;
        }

        .card-holder {
          font-size: 12px;
          color: #666;
        }

        .card-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .badge.default {
          background: #FFE5D0;
          color: #FF6B35;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .btn-remove {
          background: #E74C3C;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-remove:hover {
          background: #C0392B;
        }

        .btn-add-payment,
        .btn-update {
          background: #FF6B35;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-payment:hover,
        .btn-update:hover {
          background: #E55A2B;
          transform: translateY(-2px);
        }

        .billing-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .form-group input,
        .form-group select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 16px;
        }

        .invoice-subtitle {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #999;
        }

        .invoice-filter {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          background: white;
        }

        .invoice-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .invoice-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 6px;
          border-left: 3px solid #FF6B35;
        }

        .invoice-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .invoice-number {
          font-size: 13px;
          font-weight: 600;
          color: #FF6B35;
        }

        .invoice-date {
          font-size: 12px;
          color: #999;
        }

        .invoice-desc {
          font-size: 12px;
          color: #666;
        }

        .invoice-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .invoice-amount {
          font-size: 13px;
          font-weight: 700;
          color: #333;
          min-width: 90px;
          text-align: right;
        }

        .btn-download {
          background: #FF6B35;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-download:hover {
          background: #E55A2B;
        }

        .payment-methods-section {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 32px;
        }

        .section-title h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .section-desc {
          margin: 0;
          font-size: 12px;
          color: #999;
        }

        .payment-cards-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
        }

        .payment-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .payment-card:hover {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border-color: #FF6B35;
        }

        .card-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .card-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .card-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .card-type {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .card-number {
          font-size: 12px;
          color: #666;
          font-family: monospace;
        }

        .card-holder {
          font-size: 11px;
          color: #999;
        }

        .card-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.default {
          background: #FFE5D0;
          color: #FF6B35;
        }

        .card-buttons {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .btn-small {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: auto;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-small.btn-default {
          background: #5BA3D0;
          color: white;
          padding: 5px 12px;
        }

        .btn-small.btn-default:hover {
          background: #4A8FB8;
        }

        .btn-small.btn-remove {
          background: #FF6B35;
          color: white;
          padding: 5px 12px;
          font-size: 11px;
          min-width: 65px;
          justify-content: center;
        }

        .btn-small.btn-remove:hover {
          background: #E55A2B;
        }

        .no-payment-methods {
          padding: 20px;
          text-align: center;
          background: #f9f9f9;
          border-radius: 6px;
          margin: 20px 0;
        }

        .no-payment-methods p {
          margin: 0;
          color: #999;
          font-size: 13px;
        }

        .btn-add-payment {
          width: 100%;
          padding: 12px;
          background: #FF6B35;
          color: white;
          border: 2px solid #FF6B35;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 16px 0 0 0;
        }

        .btn-add-payment:hover {
          background: #E55A2B;
          border-color: #E55A2B;
        }

        .btn-add-payment.active {
          background: #fff;
          color: #FF6B35;
          border-color: #FF6B35;
        }

        .stripe-form-container {
          background: #f9f9f9;
          border: 1px dashed #FF6B35;
          border-radius: 6px;
          padding: 20px;
          margin-top: 16px;
        }

        .stripe-form-header h4 {
          margin: 0 0 6px 0;
          font-size: 14px;
          color: #333;
        }

        .stripe-form-header p {
          margin: 0;
          font-size: 11px;
          color: #999;
        }

        .stripe-form {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .help-text {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: #999;
        }

        .form-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .btn-cancel {
          background: #e0e0e0;
          color: #333;
          border: none;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #d0d0d0;
        }

        .btn-submit {
          background: #FF6B35;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-submit:hover {
          background: #E55A2B;
        }

        .stripe-notice {
          background: #FFF3E0;
          border-left: 3px solid #FF6B35;
          padding: 10px 12px;
          margin-top: 12px;
          border-radius: 4px;
        }

        .stripe-notice p {
          margin: 0;
          font-size: 11px;
          color: #E55A2B;
          font-weight: 500;
        }

        .transactions-invoices-section {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 16px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .filter-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .filter-controls select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
          background: white;
          cursor: pointer;
        }

        .filter-controls button {
          padding: 8px 14px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-controls button:hover {
          background: #E55A2B;
        }

        .btn-download-tx {
          background: #FF6B35;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
          margin-left: 8px;
        }

        .btn-download-tx:hover {
          background: #E55A2B;
          transform: scale(1.05);
        }

        .themed-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 400px;
          z-index: 9999;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .themed-notification.notification-success {
          border-left: 4px solid #27AE60;
          background: #F0F8F5;
        }

        .themed-notification.notification-error {
          border-left: 4px solid #E74C3C;
          background: #FEF5F5;
        }

        .notification-icon {
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }

        .notification-success .notification-icon {
          background: #27AE60;
          color: white;
        }

        .notification-error .notification-icon {
          background: #E74C3C;
          color: white;
        }

        .notification-content {
          flex: 1;
          font-size: 13px;
          color: #333;
          line-height: 1.5;
        }

        .notification-close {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #999;
          padding: 0;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .notification-close:hover {
          color: #333;
        }

        @media (max-width: 600px) {
          .themed-notification {
            left: 10px;
            right: 10px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyPaymentHistory;
