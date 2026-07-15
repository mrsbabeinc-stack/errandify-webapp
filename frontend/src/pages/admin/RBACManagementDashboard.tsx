import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  type: 'admin' | 'manager' | 'staff' | 'viewer' | 'custom';
  permissions: string[]; // permission IDs
  userCount: number;
  createdAt: string;
  lastModified: string;
  isActive: boolean;
}

interface RoleUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  department: string;
  status: 'active' | 'inactive';
}

// All available permissions
const ALL_PERMISSIONS: Permission[] = [
  // Accounts & HR Module
  { id: 'accounts_view', name: 'View Accounts', description: 'View income, expenses, and ledger', category: 'Accounts', action: 'view' },
  { id: 'accounts_create', name: 'Create Income/Expense', description: 'Record new income or expense', category: 'Accounts', action: 'create' },
  { id: 'accounts_edit', name: 'Edit Transactions', description: 'Modify existing transactions', category: 'Accounts', action: 'edit' },
  { id: 'accounts_delete', name: 'Delete Transactions', description: 'Delete income or expense entries', category: 'Accounts', action: 'delete' },
  { id: 'accounts_reconcile', name: 'Reconcile Accounts', description: 'Perform account reconciliation', category: 'Accounts', action: 'reconcile' },
  { id: 'accounts_export', name: 'Export Financial Data', description: 'Export reports to PDF/Excel', category: 'Accounts', action: 'export' },

  // HR Module
  { id: 'hr_view', name: 'View HR Data', description: 'View staff information and details', category: 'HR', action: 'view' },
  { id: 'hr_create', name: 'Add Staff', description: 'Register new staff members', category: 'HR', action: 'create' },
  { id: 'hr_edit', name: 'Edit Staff Information', description: 'Modify staff details', category: 'HR', action: 'edit' },
  { id: 'hr_delete', name: 'Delete Staff', description: 'Remove staff from system', category: 'HR', action: 'delete' },
  { id: 'hr_export', name: 'Export HR Reports', description: 'Export staff reports', category: 'HR', action: 'export' },

  // Payroll Module
  { id: 'payroll_view', name: 'View Payroll', description: 'View salary and CPF details', category: 'Payroll', action: 'view' },
  { id: 'payroll_edit', name: 'Edit Payroll', description: 'Modify salary structures and rates', category: 'Payroll', action: 'edit' },
  { id: 'payroll_process', name: 'Process Payroll', description: 'Run monthly payroll', category: 'Payroll', action: 'process' },
  { id: 'payroll_export', name: 'Export Payroll', description: 'Export payslips and reports', category: 'Payroll', action: 'export' },

  // Leave Management
  { id: 'leave_view', name: 'View Leave', description: 'View leave requests and balances', category: 'Leave', action: 'view' },
  { id: 'leave_approve', name: 'Approve Leave', description: 'Approve/reject leave requests', category: 'Leave', action: 'approve' },
  { id: 'leave_manage', name: 'Manage Leave Settings', description: 'Configure leave policies', category: 'Leave', action: 'manage' },

  // Expense Claims
  { id: 'expense_view', name: 'View Expense Claims', description: 'View submitted expense claims', category: 'Expense Claims', action: 'view' },
  { id: 'expense_approve', name: 'Approve Expense Claims', description: 'Approve expense claims', category: 'Expense Claims', action: 'approve' },
  { id: 'expense_reimburse', name: 'Process Reimbursement', description: 'Process claim reimbursements', category: 'Expense Claims', action: 'reimburse' },

  // Financial Reports
  { id: 'reports_view', name: 'View Reports', description: 'View financial reports', category: 'Reports', action: 'view' },
  { id: 'reports_create', name: 'Generate Reports', description: 'Create new reports', category: 'Reports', action: 'create' },
  { id: 'reports_export', name: 'Export Reports', description: 'Export financial reports', category: 'Reports', action: 'export' },

  // Invoicing
  { id: 'invoicing_view', name: 'View Invoices', description: 'View client invoices', category: 'Invoicing', action: 'view' },
  { id: 'invoicing_create', name: 'Create Invoices', description: 'Create new invoices', category: 'Invoicing', action: 'create' },
  { id: 'invoicing_edit', name: 'Edit Invoices', description: 'Modify invoices', category: 'Invoicing', action: 'edit' },
  { id: 'invoicing_send', name: 'Send Invoices', description: 'Send invoices to clients', category: 'Invoicing', action: 'send' },

  // Vendor & Client Management
  { id: 'vendor_view', name: 'View Vendors', description: 'View vendor information', category: 'Vendor Management', action: 'view' },
  { id: 'vendor_manage', name: 'Manage Vendors', description: 'Add/edit/delete vendors', category: 'Vendor Management', action: 'manage' },
  { id: 'client_view', name: 'View Clients', description: 'View client information', category: 'Client Management', action: 'view' },
  { id: 'client_manage', name: 'Manage Clients', description: 'Add/edit/delete clients', category: 'Client Management', action: 'manage' },

  // Recruitment
  { id: 'recruitment_view', name: 'View Recruitment', description: 'View jobs and candidates', category: 'Recruitment', action: 'view' },
  { id: 'recruitment_create', name: 'Create Job Openings', description: 'Post new job openings', category: 'Recruitment', action: 'create' },
  { id: 'recruitment_evaluate', name: 'Evaluate Candidates', description: 'Review and score candidates', category: 'Recruitment', action: 'evaluate' },
  { id: 'recruitment_hire', name: 'Hire Candidates', description: 'Approve and hire candidates', category: 'Recruitment', action: 'hire' },

  // Settings & Admin
  { id: 'admin_view', name: 'View Settings', description: 'View system settings', category: 'Admin', action: 'view' },
  { id: 'admin_manage', name: 'Manage Settings', description: 'Configure system settings', category: 'Admin', action: 'manage' },
  { id: 'rbac_manage', name: 'Manage RBAC', description: 'Create and manage roles/permissions', category: 'Admin', action: 'manage' },
  { id: 'audit_view', name: 'View Audit Logs', description: 'Access audit trail and logs', category: 'Admin', action: 'view' },
];

const RBACManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [apiPermissions, setApiPermissions] = useState<{ [key: string]: Permission[] }>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    type: 'custom' as const,
  });

  // Fetch data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch roles
        console.log('[RBAC] Fetching roles from /api/admin/roles');
        const rolesRes = await fetch('/api/admin/roles');
        console.log('[RBAC] Roles response status:', rolesRes.status, 'Content-Type:', rolesRes.headers.get('content-type'));

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          console.log('[RBAC] Roles data:', rolesData);
          const transformedRoles: Role[] = rolesData.data.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            description: r.description || '',
            type: 'custom' as const,
            permissions: [],
            userCount: 0,
            createdAt: r.created_at || new Date().toISOString(),
            lastModified: r.created_at || new Date().toISOString(),
            isActive: true,
          }));
          setRoles(transformedRoles);
          showToast('✅ Roles loaded from server', 'success');
        } else {
          throw new Error(`Failed to fetch roles: ${rolesRes.status}`);
        }

        // Fetch permissions
        setLoadingPermissions(true);
        console.log('[RBAC] Fetching permissions from /api/admin/permissions');
        const permsRes = await fetch('/api/admin/permissions');
        console.log('[RBAC] Permissions response status:', permsRes.status, 'Content-Type:', permsRes.headers.get('content-type'));

        if (permsRes.ok) {
          const permsData = await permsRes.json();
          console.log('[RBAC] Permissions data:', permsData);
          const grouped: { [key: string]: Permission[] } = {};

          // Transform API permissions to local format
          if (permsData.data) {
            Object.entries(permsData.data).forEach(([module, perms]: any) => {
              grouped[module] = (perms || []).map((p: any) => ({
                id: p.key,
                name: p.key.replace(/\./g, ' ').replace(/_/g, ' ').toUpperCase(),
                description: p.description || '',
                category: module,
                action: p.key.split('.')[1] || 'manage'
              }));
            });
          }
          setApiPermissions(grouped);
          showToast(`✅ ${Object.values(grouped).reduce((a, b) => a + b.length, 0)} permissions loaded`, 'success');
        } else {
          throw new Error(`Failed to fetch permissions: ${permsRes.status}`);
        }
        setLoadingPermissions(false);
      } catch (error) {
        console.error('[RBAC] Error loading data:', error);
        showToast('⚠️ Could not load from server, using defaults', 'warning');
        setLoadingPermissions(false);
      }
    };

    loadData();
  }, []);

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);

    try {
      // Fetch permissions for this role from the API
      const response = await fetch(`/api/admin/roles/${role.id}/permissions`);
      if (response.ok) {
        const data = await response.json();
        const permKeys = new Set(data.data.map((p: any) => p.permission_key));
        setSelectedPermissions(permKeys);
        console.log(`[RBAC] Loaded ${permKeys.size} permissions for role ${role.name}`);
      } else {
        // If API fails, use empty set (no permissions assigned yet)
        setSelectedPermissions(new Set());
      }
    } catch (error) {
      console.error('[RBAC] Error loading role permissions:', error);
      setSelectedPermissions(new Set());
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    const newPerms = new Set(selectedPermissions);
    if (newPerms.has(permissionId)) {
      newPerms.delete(permissionId);
    } else {
      newPerms.add(permissionId);
    }
    setSelectedPermissions(newPerms);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Get permission IDs from the selected permission keys
      const permissionKeyToId: { [key: string]: number } = {};
      Object.values(getPermissionsByCategory()).forEach(perms => {
        perms.forEach(p => {
          permissionKeyToId[p.id] = p.id as any; // Assuming permission ID matches the key for now
        });
      });

      // Map selected permission keys to IDs from the API response
      const permissionIds: number[] = [];
      for (const [module, perms] of Object.entries(apiPermissions)) {
        perms.forEach(p => {
          if (selectedPermissions.has(p.id)) {
            permissionIds.push(p.id as any);
          }
        });
      }

      console.log('[RBAC] Saving permissions for role', selectedRole.id, ':', permissionIds);

      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds })
      });

      if (response.ok) {
        const updatedRoles = roles.map(r =>
          r.id === selectedRole.id
            ? { ...r, permissions: Array.from(selectedPermissions), lastModified: new Date().toISOString() }
            : r
        );
        setRoles(updatedRoles);
        setSelectedRole({ ...selectedRole, permissions: Array.from(selectedPermissions) });
        showToast(`✅ Saved ${permissionIds.length} permissions for "${selectedRole.name}"`, 'success');
      } else {
        showToast('❌ Failed to save permissions', 'error');
      }
    } catch (error) {
      console.error('[RBAC] Error saving permissions:', error);
      showToast('❌ Error saving permissions', 'error');
    }
  };

  const handleCreateRole = () => {
    if (!roleForm.name || !roleForm.description) {
      showToast('❌ Please fill in all fields', 'error');
      return;
    }

    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: roleForm.name,
      description: roleForm.description,
      type: roleForm.type,
      permissions: [],
      userCount: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isActive: true,
    };

    setRoles([...roles, newRole]);
    showToast(`✅ Role "${roleForm.name}" created`, 'success');
    setShowRoleForm(false);
    setRoleForm({ name: '', description: '', type: 'custom' });
  };

  const getPermissionsByCategory = (): { [key: string]: Permission[] } => {
    // Use API permissions if available, otherwise fall back to demo permissions
    if (Object.keys(apiPermissions).length > 0) {
      return apiPermissions;
    }

    const grouped: { [key: string]: Permission[] } = {};
    ALL_PERMISSIONS.forEach(perm => {
      if (!grouped[perm.category]) grouped[perm.category] = [];
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  const stats = {
    totalRoles: roles.length,
    activeRoles: roles.filter(r => r.isActive).length,
    totalUsers: users.length,
    totalPermissions: ALL_PERMISSIONS.length,
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              🔐 Role-Based Access Control
            </h1>
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
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Create roles, assign permissions, and manage user access control
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '4px' }}>Total Roles</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#4CAF50' }}>{stats.totalRoles}</div>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>{stats.activeRoles} active</div>
          </div>
          <div style={{ padding: '16px', background: '#E3F2FD', borderRadius: '8px', border: '2px solid #2196F3' }}>
            <div style={{ fontSize: '12px', color: '#0D47A1', marginBottom: '4px' }}>Total Users</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#2196F3' }}>{stats.totalUsers}</div>
            <div style={{ fontSize: '11px', color: '#0D47A1', marginTop: '4px' }}>across all roles</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Permissions</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>{stats.totalPermissions}</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>available</div>
          </div>
          <div style={{ padding: '16px', background: '#F3E5F5', borderRadius: '8px', border: '2px solid #9C27B0' }}>
            <div style={{ fontSize: '12px', color: '#4A148C', marginBottom: '4px' }}>Modules</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9C27B0' }}>10+</div>
            <div style={{ fontSize: '11px', color: '#4A148C', marginTop: '4px' }}>controlled</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['roles', 'users', 'permissions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'roles' && '👔 Roles'}
              {tab === 'users' && '👥 Users'}
              {tab === 'permissions' && '🔑 Permissions'}
            </button>
          ))}
        </div>

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Roles</h3>
              <button
                onClick={() => setShowRoleForm(!showRoleForm)}
                style={{
                  padding: '8px 16px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showRoleForm ? '✕ Cancel' : '+ Create Role'}
              </button>
            </div>

            {showRoleForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Role Name *"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <textarea
                  placeholder="Description *"
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1', minHeight: '60px', fontFamily: 'inherit' }}
                />
                <select
                  value={roleForm.type}
                  onChange={e => setRoleForm({ ...roleForm, type: e.target.value as any })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  onClick={handleCreateRole}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Create Role
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  style={{
                    padding: '16px',
                    background: selectedRole?.id === role.id ? '#FFE0CC' : 'white',
                    border: selectedRole?.id === role.id ? '3px solid #FF6B35' : '2px solid #FFD9B3',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{role.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{role.description}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: role.isActive ? '#E8F5E9' : '#F5F5F5',
                      color: role.isActive ? '#2E7D32' : '#999',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: '600',
                    }}>
                      {role.isActive ? '✓ Active' : 'Inactive'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                    Type: <strong>{role.type}</strong> • Users: <strong>{role.userCount}</strong> • Permissions: <strong>{role.permissions.length}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Users & Roles</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#FFD9B3', borderBottom: '2px solid #FF6B35' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Name</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Email</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Role</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Department</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const userRole = roles.find(r => r.id === user.roleId);
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid #FFD9B3', background: idx % 2 === 0 ? 'white' : '#FFF8F5' }}>
                        <td style={{ padding: '10px' }}>{user.name}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: '#FF6B35' }}>{userRole?.name || 'Unassigned'}</td>
                        <td style={{ padding: '10px' }}>{user.department}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: user.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                            color: user.status === 'active' ? '#2E7D32' : '#999',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}>
                            {user.status === 'active' ? '✓ Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && selectedRole && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                Permissions for: <span style={{ color: '#FF6B35' }}>{selectedRole.name}</span>
              </h3>
              <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
                Select which modules and actions this role can access
              </p>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: '#E3F2FD', borderRadius: '6px', fontSize: '12px', color: '#0D47A1' }}>
              <strong>Currently assigned: {selectedPermissions.size} permissions</strong> • <button
                onClick={() => {
                  // Get all permission IDs from current category view
                  const allPerms = new Set<string>();
                  Object.entries(getPermissionsByCategory()).forEach(([, perms]) => {
                    perms.forEach(p => allPerms.add(p.id));
                  });
                  setSelectedPermissions(allPerms);
                  showToast(`✅ Selected all ${allPerms.size} permissions`, 'success');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0D47A1',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 4px',
                }}
              >
                Select All
              </button> • <button
                onClick={() => {
                  setSelectedPermissions(new Set());
                  showToast('✅ Cleared all permissions', 'success');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0D47A1',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 4px',
                }}
              >
                Clear All
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
              {Object.entries(getPermissionsByCategory()).map(([category, perms]) => {
                return (
                  <div key={category} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 {category}
                        <span style={{ fontSize: '11px', color: '#999', fontWeight: '400' }}>({perms.length} permissions)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const categoryPerms = new Set(selectedPermissions);
                            perms.forEach(p => categoryPerms.add(p.id));
                            setSelectedPermissions(categoryPerms);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF6B35',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                            textDecoration: 'underline',
                            padding: '0 4px',
                          }}
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => {
                            const categoryPerms = new Set(selectedPermissions);
                            perms.forEach(p => categoryPerms.delete(p.id));
                            setSelectedPermissions(categoryPerms);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF6B35',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                            textDecoration: 'underline',
                            padding: '0 4px',
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
                      {perms.map(perm => {
                        return (
                          <label
                            key={perm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px',
                              background: selectedPermissions.has(perm.id) ? '#FFF8F5' : 'transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: selectedPermissions.has(perm.id) ? '1px solid #FFD9B3' : '1px solid transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm.id)}
                              onChange={() => handlePermissionToggle(perm.id)}
                              style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', fontSize: '12px', color: '#333' }}>
                                {perm.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {perm.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSavePermissions}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✓ Save Permissions
              </button>
              <button
                onClick={() => {
                  setSelectedRole(null);
                  setSelectedPermissions(new Set());
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* PERMISSIONS TAB - No Role Selected */}
        {activeTab === 'permissions' && !selectedRole  && (
          <div style={{ padding: '32px', textAlign: 'center', background: '#F5F5F5', borderRadius: '8px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👔</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Select a Role</div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Go to the <strong>Roles</strong> tab and click on a role to manage its permissions
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RBACManagementDashboard;
