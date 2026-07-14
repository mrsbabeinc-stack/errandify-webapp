import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super-admin' | 'moderator' | 'support' | 'finance' | 'ops';
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

interface Role {
  name: string;
  permissions: string[];
  description: string;
}

const ROLES: Record<string, Role> = {
  'super-admin': {
    name: 'Super Admin',
    description: 'Full access to all admin functions',
    permissions: ['all'],
  },
  'moderator': {
    name: 'Moderator',
    description: 'Manage disputes, user safety, content moderation',
    permissions: ['disputes', 'safety', 'moderation', 'user-actions'],
  },
  'support': {
    name: 'Support',
    description: 'Handle support cases and customer issues',
    permissions: ['cases', 'user-help', 'refunds'],
  },
  'finance': {
    name: 'Finance',
    description: 'Manage payments, refunds, revenue',
    permissions: ['payments', 'refunds', 'payouts', 'financial-reports'],
  },
  'ops': {
    name: 'Operations',
    description: 'Manage companies, errands, operations',
    permissions: ['companies', 'errands', 'operations', 'scheduling'],
  },
};

export default function AdminAuthManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'moderator' as const,
    password: '',
  });

  // Load admins from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adminUsers');
    if (saved) {
      setAdmins(JSON.parse(saved));
    } else {
      // Initialize with demo admin
      const demoAdmins: AdminUser[] = [
        {
          id: '1',
          email: 'admin@errandify.ai',
          name: 'Admin User',
          role: 'super-admin',
          status: 'active',
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          twoFactorEnabled: true,
        },
      ];
      setAdmins(demoAdmins);
      localStorage.setItem('adminUsers', JSON.stringify(demoAdmins));
    }
  }, []);

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;

    const newAdmin: AdminUser = {
      id: Date.now().toString(),
      email: formData.email,
      name: formData.name,
      role: formData.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
    };

    const updated = [...admins, newAdmin];
    setAdmins(updated);
    localStorage.setItem('adminUsers', JSON.stringify(updated));

    setFormData({ email: '', name: '', role: 'moderator', password: '' });
    setShowCreateForm(false);
  };

  const handleDeactivate = (id: string) => {
    const updated = admins.map(a =>
      a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a
    );
    setAdmins(updated);
    localStorage.setItem('adminUsers', JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      const updated = admins.filter(a => a.id !== id);
      setAdmins(updated);
      localStorage.setItem('adminUsers', JSON.stringify(updated));
    }
  };

  const handleToggle2FA = (id: string) => {
    const updated = admins.map(a =>
      a.id === id ? { ...a, twoFactorEnabled: !a.twoFactorEnabled } : a
    );
    setAdmins(updated);
    localStorage.setItem('adminUsers', JSON.stringify(updated));
  };

  const filteredAdmins = admins.filter(a =>
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🔐 Admin Users & Access Control
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
          Manage admin accounts, roles, permissions, and security settings
        </p>
      </div>

      {/* Search & Actions */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '2px solid #FFD9B3',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ➕ Create Admin
            </button>
            <button
              onClick={() => setShowRoleManager(!showRoleManager)}
              style={{
                padding: '10px 16px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              👥 Roles & Permissions
            </button>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div style={{
          padding: '20px',
          background: '#FFF8F5',
          border: '2px solid #FFD9B3',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', fontWeight: '600' }}>Create New Admin</h3>
          <form onSubmit={handleCreateAdmin}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {Object.entries(ROLES).map(([key, role]) => (
                  <option key={key} value={key}>{role.name}</option>
                ))}
              </select>
              <input
                type="password"
                placeholder="Temporary Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Create Admin
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roles & Permissions */}
      {showRoleManager && (
        <div style={{
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', fontWeight: '600' }}>Roles & Permissions</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(ROLES).map(([key, role]) => (
              <div key={key} style={{
                padding: '12px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
              }}>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {role.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {role.description}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Permissions: {Array.isArray(role.permissions) && role.permissions.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin List */}
      <div>
        <h3 style={{ color: '#333', marginBottom: '12px', fontWeight: '600' }}>
          Active Admins ({filteredAdmins.length})
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredAdmins.map(admin => (
            <div key={admin.id} style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '12px',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {admin.name}
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                  {admin.email}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Role: <span style={{ fontWeight: '600' }}>{ROLES[admin.role]?.name}</span> •
                  Status: <span style={{ color: admin.status === 'active' ? '#4caf50' : '#f57c00', fontWeight: '600' }}>
                    {admin.status.toUpperCase()}
                  </span> •
                  2FA: {admin.twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}
                </div>
                {admin.lastLogin && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    Last login: {new Date(admin.lastLogin).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <button
                  onClick={() => handleToggle2FA(admin.id)}
                  style={{
                    padding: '6px 12px',
                    background: admin.twoFactorEnabled ? '#e8f5e9' : '#fff3e0',
                    color: admin.twoFactorEnabled ? '#2e7d32' : '#e65100',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {admin.twoFactorEnabled ? '🔒 2FA On' : '🔓 2FA Off'}
                </button>
                <button
                  onClick={() => handleDeactivate(admin.id)}
                  style={{
                    padding: '6px 12px',
                    background: admin.status === 'active' ? '#ffebee' : '#e8f5e9',
                    color: admin.status === 'active' ? '#c62828' : '#2e7d32',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {admin.status === 'active' ? '⏹ Deactivate' : '▶ Activate'}
                </button>
                <button
                  onClick={() => handleDelete(admin.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#ffebee',
                    color: '#c62828',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
        borderRadius: '8px',
      }}>
        <h3 style={{ color: '#1976d2', marginBottom: '12px', fontWeight: '600' }}>🔐 Security Settings</h3>
        <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
            <span>Require 2FA for all admins</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
            <span>Enable IP whitelist for admin access</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
            <span>Log all admin actions to audit trail</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ cursor: 'pointer' }} />
            <span>Require password change every 90 days</span>
          </label>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
