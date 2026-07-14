import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Errand {
  id: string;
  title: string;
  askerName: string;
  doerName?: string;
  status: 'open' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'disputed';
  budget: number;
  createdAt: string;
  deadline: string;
  category: string;
}

export default function AdminErrandManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'disputed'>('all');
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [compensationAmount, setCompensationAmount] = useState('0');

  useEffect(() => {
    const saved = localStorage.getItem('platformErrands');
    if (saved) {
      setErrands(JSON.parse(saved));
    } else {
      const demoErrands: Errand[] = [
        {
          id: 'errand_1',
          title: 'Grocery Shopping at NTUC',
          askerName: 'John Lee',
          doerName: 'Jordan Smith',
          status: 'in-progress',
          budget: 85.50,
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 86400000).toISOString(),
          category: 'Shopping',
        },
        {
          id: 'errand_2',
          title: 'Photo Editing Assignment',
          askerName: 'Sarah Davis',
          status: 'open',
          budget: 120.00,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          deadline: new Date(Date.now() + 172800000).toISOString(),
          category: 'Design',
        },
        {
          id: 'errand_3',
          title: 'House Cleaning Service',
          askerName: 'Mike Johnson',
          doerName: 'Alex Wong',
          status: 'disputed',
          budget: 150.00,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          deadline: new Date(Date.now() - 3600000).toISOString(),
          category: 'Cleaning',
        },
      ];
      setErrands(demoErrands);
      localStorage.setItem('platformErrands', JSON.stringify(demoErrands));
    }
  }, []);

  const handleCancelErrand = (errandId: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    const updated = errands.map(e =>
      e.id === errandId ? { ...e, status: 'cancelled' as const } : e
    );
    setErrands(updated);
    localStorage.setItem('platformErrands', JSON.stringify(updated));

    if (compensationAmount && parseFloat(compensationAmount) > 0) {
      alert(`Errand cancelled. Compensation: $${compensationAmount} issued to user`);
    }

    setCancelReason('');
    setCompensationAmount('0');
    setSelectedErrand(null);
  };

  const handleReassign = (errandId: string) => {
    alert('Reassignment feature would open a modal to select new doer');
  };

  const handleExtendDeadline = (errandId: string) => {
    alert('Extension feature would open a date picker for new deadline');
  };

  const handleForceComplete = (errandId: string) => {
    const updated = errands.map(e =>
      e.id === errandId ? { ...e, status: 'completed' as const } : e
    );
    setErrands(updated);
    localStorage.setItem('platformErrands', JSON.stringify(updated));
    setSelectedErrand(null);
    alert('Errand marked as completed');
  };

  const filteredErrands = errands.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.askerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    'open': '#2196F3',
    'assigned': '#FF9800',
    'in-progress': '#2196F3',
    'completed': '#4CAF50',
    'cancelled': '#9E9E9E',
    'disputed': '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📦 Errand Management & Issue Resolution
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
          Manually manage errands, handle cancellations, reassignments, and emergency fixes
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: errands.length, color: '#2196F3' },
          { label: 'Open', value: errands.filter(e => e.status === 'open').length, color: '#2196F3' },
          { label: 'In Progress', value: errands.filter(e => e.status === 'in-progress').length, color: '#FF9800' },
          { label: 'Completed', value: errands.filter(e => e.status === 'completed').length, color: '#4CAF50' },
          { label: 'Disputed', value: errands.filter(e => e.status === 'disputed').length, color: '#F44336' },
          { label: 'Cancelled', value: errands.filter(e => e.status === 'cancelled').length, color: '#9E9E9E' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '12px',
            background: 'white',
            border: `2px solid ${stat.color}`,
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stat.label}
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search errand ID, title, or asker..."
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
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Errand List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredErrands.map(errand => (
          <div key={errand.id} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${statusColors[errand.status]}`,
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '15px' }}>
                  {errand.title}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  ID: {errand.id} • Category: {errand.category}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '12px',
                  marginBottom: '8px',
                }}>
                  <span>Asker: <strong>{errand.askerName}</strong></span>
                  <span>Doer: <strong>{errand.doerName || 'Unassigned'}</strong></span>
                  <span>Budget: <strong>${errand.budget.toFixed(2)}</strong></span>
                  <span>Status: <strong style={{ color: statusColors[errand.status] }}>
                    {errand.status.toUpperCase()}
                  </strong></span>
                  <span>Deadline: <strong>{new Date(errand.deadline).toLocaleDateString()}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedErrand(selectedErrand?.id === errand.id ? null : errand)}
                style={{
                  padding: '8px 16px',
                  background: selectedErrand?.id === errand.id ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                  color: selectedErrand?.id === errand.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {selectedErrand?.id === errand.id ? '✕' : '⚙️ Actions'}
              </button>
            </div>

            {/* Actions Panel */}
            {selectedErrand?.id === errand.id && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#FFF8F5',
                border: '1px solid #FFD9B3',
                borderRadius: '6px',
              }}>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => handleReassign(errand.id)}
                    style={{
                      padding: '8px',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    👤 Reassign to Different Doer
                  </button>
                  <button
                    onClick={() => handleExtendDeadline(errand.id)}
                    style={{
                      padding: '8px',
                      background: '#fff3e0',
                      color: '#e65100',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ⏱️ Extend Deadline
                  </button>
                  <button
                    onClick={() => handleForceComplete(errand.id)}
                    style={{
                      padding: '8px',
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Force Mark Complete
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Cancel Errand & Issue Compensation
                  </div>
                  <textarea
                    placeholder="Cancellation reason..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
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
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      placeholder="Compensation amount"
                      value={compensationAmount}
                      onChange={(e) => setCompensationAmount(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid #FFD9B3',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                    <span style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                      ${parseFloat(compensationAmount || '0').toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancelErrand(errand.id)}
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
                    🚫 Cancel & Compensate
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
