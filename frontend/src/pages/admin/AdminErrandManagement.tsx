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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  // Errands used to be kept in localStorage, so Cancel, Extend and Force
  // Complete changed nothing: the errand stayed live for both the asker and
  // the doer, and the admin's "cancellation" vanished with their cache.
  const loadErrands = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/errands`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setErrands(
        (result.data || []).map((e: any) => ({
          id: String(e.id),
          title: e.title,
          askerName: e.askerName || 'Unknown',
          doerName: e.doerName || undefined,
          status: e.status,
          budget: e.budget ?? 0,
          createdAt: e.created_at,
          deadline: e.deadline,
          category: e.category || '',
        }))
      );
    } catch (err) {
      console.error('Failed to load errands:', err);
      setErrands([]);
      showToast('Could not load errands', 'error');
    }
  };

  useEffect(() => {
    loadErrands();
  }, []);

  const handleCancelErrand = async (errandId: string) => {
    if (!cancelReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }
    try {
      const compensation = parseFloat(compensationAmount) || 0;
      const res = await fetch(`${API_URL}/api/admin/errands/${errandId}/cancel`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: cancelReason.trim(), compensationAmount: compensation }),
      });
      const result = await res.json().catch(() => ({}));

      // 501 means the errand WAS cancelled but compensation could not be
      // issued — payouts do not exist yet. That is a partial success and has
      // to read as one, not as "compensation issued".
      if (res.status === 501) {
        showToast(result.error || 'Cancelled, but compensation was not issued', 'error');
      } else if (!res.ok) {
        showToast(result.error || 'Could not cancel that errand', 'error');
        return;
      } else {
        showToast('Errand cancelled', 'success');
      }

      setCancelReason('');
      setCompensationAmount('0');
      setSelectedErrand(null);
      await loadErrands();
    } catch (err) {
      console.error('Failed to cancel errand:', err);
      showToast('Could not cancel that errand', 'error');
    }
  };

  const handleReassign = async (errandId: string) => {
    // The server answers 501: the doer comes from the accepted offer, so
    // reassigning needs an offer-transfer flow that does not exist yet.
    try {
      const res = await fetch(`${API_URL}/api/admin/errands/${errandId}/reassign`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const result = await res.json().catch(() => ({}));
      showToast(result.error || 'Reassignment is not available yet', 'error');
    } catch (err) {
      console.error('Failed to reassign:', err);
      showToast('Reassignment is not available yet', 'error');
    }
  };

  const handleExtendDeadline = async (errandId: string) => {
    const input = prompt('New deadline (YYYY-MM-DD):');
    if (!input) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      showToast('Please use the format YYYY-MM-DD', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/errands/${errandId}/extend`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ newDeadline: input.trim() }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.error || 'Could not extend that deadline', 'error');
        return;
      }
      showToast('Deadline extended', 'success');
      setSelectedErrand(null);
      await loadErrands();
    } catch (err) {
      console.error('Failed to extend deadline:', err);
      showToast('Could not extend that deadline', 'error');
    }
  };

  const handleForceComplete = async (errandId: string) => {
    if (!confirm('Mark this errand complete? This does not release any payment.')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/errands/${errandId}/complete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.error || 'Could not complete that errand', 'error');
        return;
      }
      showToast('Errand marked as completed', 'success');
      setSelectedErrand(null);
      await loadErrands();
    } catch (err) {
      console.error('Failed to complete errand:', err);
      showToast('Could not complete that errand', 'error');
    }
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
