import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'doer' | 'asker' | 'staff';
  status: 'active' | 'suspended' | 'banned';
  reputation: number;
  tier: 'new' | 'trusted' | 'vip';
  createdAt: string;
  violations: number;
  lastActive: string;
}

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doer' | 'asker' | 'staff'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionReason, setActionReason] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  // This screen used to keep the user list — and every ban — in localStorage.
  // An admin banning someone saw it succeed while the account stayed active,
  // the ban died with the browser cache, and no other admin ever saw it. The
  // endpoints below were already real; only the wiring was missing.
  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setUsers(
        (result.data || []).map((u: any) => ({
          id: String(u.id),
          email: u.email || '',
          name: u.name || 'Unnamed',
          role: u.role || 'doer',
          status: u.status || 'active',
          reputation: u.reputation ?? 0,
          tier: u.tier ?? 'new',
          createdAt: u.created_at,
          violations: u.violations ?? 0,
          lastActive: u.last_active_at || u.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
      showToast('Could not load users', 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // One helper for all three: they differ only by endpoint and message, and a
  // ban that silently no-ops is exactly what this screen used to do.
  const runUserAction = async (
    userId: string,
    action: 'suspend' | 'ban' | 'restore',
    reason: string | null,
    successMsg: string
  ) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.error || `Could not ${action} that user`, 'error');
        return false;
      }
      showToast(successMsg, 'success');
      setActionReason('');
      setSelectedUser(null);
      await loadUsers();
      return true;
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
      showToast(`Could not ${action} that user`, 'error');
      return false;
    }
  };

  const handleSuspend = (userId: string) => {
    if (!actionReason.trim()) {
      showToast('Please provide a reason for suspension', 'error');
      return;
    }
    runUserAction(userId, 'suspend', actionReason.trim(), 'User suspended');
  };

  const handleBan = (userId: string) => {
    if (!actionReason.trim()) {
      showToast('Please provide a reason for ban', 'error');
      return;
    }
    runUserAction(userId, 'ban', actionReason.trim(), 'User banned');
  };

  const handleUnban = (userId: string) => {
    runUserAction(userId, 'restore', null, 'User restored');
  };

  const handleChangeTier = async (userId: string, newTier: 'new' | 'trusted' | 'vip') => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ tier: newTier }),
      });
      const result = await res.json().catch(() => ({}));
      // The server answers 501 here: there is no tier column yet. Say so
      // rather than showing the change and losing it on refresh.
      showToast(result.error || 'Tiers are not available yet', 'error');
    } catch (err) {
      console.error('Failed to change tier:', err);
      showToast('Tiers are not available yet', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            👥 User Management & Moderation
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
          Manage user accounts, verify identities, handle suspensions and appeals
        </p>
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
            placeholder="Search by email or name..."
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
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            style={{
              padding: '10px 12px',
              border: '2px solid #FFD9B3',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Roles</option>
            <option value="doer">Doers</option>
            <option value="asker">Askers</option>
            <option value="staff">Staff</option>
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
            {filteredUsers.length} users found
          </div>
        </div>
      </div>

      {/* User List */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {filteredUsers.map(user => (
          <div key={user.id} style={{
            padding: '16px',
            background: 'white',
            border: '2px solid #FFD9B3',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '15px' }}>
                  {user.name}
                  {user.tier === 'vip' && ' 👑'}
                  {user.tier === 'trusted' && ' ✓'}
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  {user.email}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#999',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '8px',
                }}>
                  <span>Role: <strong>{user.role}</strong></span>
                  <span>Reputation: <strong>{user.reputation}%</strong></span>
                  <span>Status: <strong style={{
                    color: user.status === 'active' ? '#4caf50' : user.status === 'suspended' ? '#ff9800' : '#f44336',
                  }}>
                    {user.status.toUpperCase()}
                  </strong></span>
                  <span>Violations: <strong>{user.violations}</strong></span>
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Joined: {new Date(user.createdAt).toLocaleDateString()} • Last active: {new Date(user.lastActive).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                style={{
                  padding: '8px 16px',
                  background: selectedUser?.id === user.id ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                  color: selectedUser?.id === user.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {selectedUser?.id === user.id ? '✕ Close' : '⚙️ Actions'}
              </button>
            </div>

            {/* Actions Panel */}
            {selectedUser?.id === user.id && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#FFF8F5',
                border: '1px solid #FFD9B3',
                borderRadius: '6px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Actions for {user.name}
                </div>

                {/* Tier Management */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
                    User Tier:
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['new', 'trusted', 'vip'] as const).map(tier => (
                      <button
                        key={tier}
                        onClick={() => handleChangeTier(user.id, tier)}
                        style={{
                          padding: '6px 12px',
                          background: user.tier === tier ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : '#f5f5f5',
                          color: user.tier === tier ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {tier === 'vip' && '👑'} {tier.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Actions */}
                {user.status === 'active' && (
                  <div style={{ marginBottom: '12px' }}>
                    <textarea
                      placeholder="Reason for action..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #FFD9B3',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '8px',
                        minHeight: '60px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleSuspend(user.id)}
                        style={{
                          flex: 1,
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
                        ⏸ Suspend User
                      </button>
                      <button
                        onClick={() => handleBan(user.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        🚫 Ban User
                      </button>
                    </div>
                  </div>
                )}

                {(user.status === 'suspended' || user.status === 'banned') && (
                  <button
                    onClick={() => handleUnban(user.id)}
                    style={{
                      width: '100%',
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
                    ✓ Restore User
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
      }}>
        {[
          { label: 'Total Users', value: users.length, color: '#2196F3' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: '#4CAF50' },
          { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, color: '#FF9800' },
          { label: 'Banned', value: users.filter(u => u.status === 'banned').length, color: '#F44336' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${stat.color}`,
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
