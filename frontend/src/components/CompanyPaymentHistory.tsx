import React, { useState } from 'react';

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

const CompanyPaymentHistory: React.FC = () => {
  const [transactions] = useState<Transaction[]>([
    {
      id: 1,
      date: '2026-07-10',
      description: 'House Cleaning Errand Completion - Jordan Smith',
      type: 'income',
      amount: 450,
      status: 'completed',
      reference: 'ERR-00542',
      method: 'Bank Transfer',
    },
    {
      id: 2,
      date: '2026-07-09',
      description: 'Monthly Subscription - Gold Partner',
      type: 'expense',
      amount: 199,
      status: 'completed',
      reference: 'SUB-00124',
      method: 'Credit Card',
    },
    {
      id: 3,
      date: '2026-07-08',
      description: 'Advertising Campaign - Summer Promotion',
      type: 'expense',
      amount: 320,
      status: 'completed',
      reference: 'AD-00089',
      method: 'Credit Card',
    },
    {
      id: 4,
      date: '2026-07-07',
      description: 'Referral Bonus - New Company Signup',
      type: 'income',
      amount: 250,
      status: 'completed',
      reference: 'REF-00045',
      method: 'Bank Transfer',
    },
    {
      id: 5,
      date: '2026-07-06',
      description: 'Office Maintenance Errand - Ava Johnson',
      type: 'income',
      amount: 350,
      status: 'completed',
      reference: 'ERR-00541',
      method: 'Bank Transfer',
    },
  ]);

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

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-group">
          <label>Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="all">All Transactions</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button className="btn-export-excel" onClick={() => {
          exportToExcel(filteredTransactions);
        }}>📊 Export to Excel</button>
      </div>

      {/* Transaction List */}
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
                  {transaction.status === 'completed' && transaction.type === 'expense' && (
                    <button className="btn-download-tx" onClick={() => {
                      const invoiceText = `
SPENDING INVOICE
═══════════════════════════════════════════════════════════

Reference: ${transaction.reference}
Date: ${transaction.date}
Description: ${transaction.description}
Method: ${transaction.method}
Amount: SGD $${Math.abs(transaction.amount)}
Status: ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}

═══════════════════════════════════════════════════════════

Generated from Errandify Payment System
Thank you for your business!
`;
                      const blob = new Blob([invoiceText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `invoice-${transaction.reference}-${transaction.date}.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}>📥</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          color: #FFC107;
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
          color: #E65100;
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
      `}</style>
    </div>
  );
};

export default CompanyPaymentHistory;
