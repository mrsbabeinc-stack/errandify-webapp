import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'charge' | 'refund' | 'payout';
  status: 'completed' | 'pending' | 'failed';
  errandId?: string;
  reason: string;
  date: string;
  processor: 'stripe' | 'paypal';
}

export default function AdminPaymentsManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'charge' | 'refund' | 'payout'>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('paymentTransactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    } else {
      const demoTx: Transaction[] = [
        {
          id: 'tx_001',
          userId: 'user_1',
          userName: 'Jordan Smith',
          amount: 85.50,
          type: 'charge',
          status: 'completed',
          errandId: 'errand_1',
          reason: 'Errand completion',
          date: new Date().toISOString(),
          processor: 'stripe',
        },
        {
          id: 'tx_002',
          userId: 'user_2',
          userName: 'Sarah Davis',
          amount: 120.00,
          type: 'charge',
          status: 'failed',
          reason: 'Insufficient funds',
          date: new Date(Date.now() - 3600000).toISOString(),
          processor: 'stripe',
        },
        {
          id: 'tx_003',
          userId: 'user_3',
          userName: 'Mike Johnson',
          amount: 50.00,
          type: 'refund',
          status: 'pending',
          reason: 'User requested cancellation',
          date: new Date(Date.now() - 7200000).toISOString(),
          processor: 'stripe',
        },
      ];
      setTransactions(demoTx);
      localStorage.setItem('paymentTransactions', JSON.stringify(demoTx));
    }
  }, []);

  const handleRefund = (txId: string) => {
    if (!refundReason.trim()) {
      alert('Please provide a reason for refund');
      return;
    }

    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const refundTx: Transaction = {
      id: `refund_${Date.now()}`,
      userId: tx.userId,
      userName: tx.userName,
      amount: -tx.amount,
      type: 'refund',
      status: 'completed',
      reason: refundReason,
      date: new Date().toISOString(),
      processor: tx.processor,
    };

    const updated = [...transactions, refundTx];
    setTransactions(updated);
    localStorage.setItem('paymentTransactions', JSON.stringify(updated));

    setRefundReason('');
    setSelectedTx(null);
    alert('Refund processed successfully');
  };

  const handleRetry = (txId: string) => {
    const updated = transactions.map(t =>
      t.id === txId ? { ...t, status: 'pending' as const } : t
    );
    setTransactions(updated);
    localStorage.setItem('paymentTransactions', JSON.stringify(updated));
    alert('Transaction marked for retry');
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalRevenue = transactions
    .filter(t => t.type === 'charge' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const failedAmount = transactions
    .filter(t => t.status === 'failed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            💳 Payments & Refunds Management
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
          Manage transactions, process refunds, handle failed payments, and track payouts
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, color: '#4CAF50' },
          { label: 'Failed Payments', value: `$${failedAmount.toFixed(2)}`, count: transactions.filter(t => t.status === 'failed').length, color: '#F44336' },
          { label: 'Pending', value: `$${pendingAmount.toFixed(2)}`, count: transactions.filter(t => t.status === 'pending').length, color: '#FF9800' },
          { label: 'Total Transactions', value: transactions.length, color: '#F0A81E' },
        ].map((card, i) => (
          <div key={i} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${card.color}`,
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {card.label}
              {'count' in card && ` (${card.count})`}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '2px solid #FFD9B3',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search transaction ID or user..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '10px 12px',
              border: '2px solid #FFD9B3',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{
              padding: '10px 12px',
              border: '2px solid #FFD9B3',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="charge">Charges</option>
            <option value="refund">Refunds</option>
            <option value="payout">Payouts</option>
          </select>
          <div style={{
            padding: '10px 12px',
            background: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#666',
            textAlign: 'center',
          }}>
            {filteredTransactions.length} transactions
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredTransactions.map(tx => (
          <div key={tx.id} style={{
            padding: '16px',
            background: 'white',
            border: '2px solid #FFD9B3',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '15px' }}>
                  {tx.userName}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  ID: {tx.id} • {tx.date ? new Date(tx.date).toLocaleString() : 'N/A'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                }}>
                  <span>Amount: <strong style={{ fontSize: '14px', color: tx.amount > 0 ? '#F44336' : '#4CAF50' }}>
                    ${Math.abs(tx.amount).toFixed(2)}
                  </strong></span>
                  <span>Type: <strong>{tx.type.toUpperCase()}</strong></span>
                  <span>Status: <strong style={{
                    color: tx.status === 'completed' ? '#4CAF50' : tx.status === 'pending' ? '#FF9800' : '#F44336',
                  }}>
                    {tx.status.toUpperCase()}
                  </strong></span>
                  <span>Processor: <strong>{tx.processor.toUpperCase()}</strong></span>
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Reason: {tx.reason}
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                style={{
                  padding: '8px 16px',
                  background: selectedTx?.id === tx.id ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                  color: selectedTx?.id === tx.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {selectedTx?.id === tx.id ? '✕' : '⚙️'}
              </button>
            </div>

            {/* Actions */}
            {selectedTx?.id === tx.id && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#FFF8F5',
                border: '1px solid #FFD9B3',
                borderRadius: '6px',
              }}>
                {tx.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(tx.id)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#fff3e0',
                      color: '#e65100',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginBottom: '8px',
                    }}
                  >
                    🔄 Retry Payment
                  </button>
                )}

                {tx.type !== 'refund' && (
                  <>
                    <textarea
                      placeholder="Refund reason..."
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #FFD9B3',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '8px',
                        minHeight: '50px',
                      }}
                    />
                    <button
                      onClick={() => handleRefund(tx.id)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      💰 Process Refund
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
