import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI from '../../services/financeAPI';
import { rbacAPI } from '../../services/adminAPI';

interface DashboardMetric {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
}

interface SystemStatus {
  name: string;
  status: 'operational' | 'warning' | 'idle';
  records: number;
  pending: number;
}

interface RolePermissions {
  role: string;
  icon: string;
  permissions: string[];
  description: string;
}

interface DataSyncLog {
  id: string;
  module: string;
  action: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
  records: number;
}

const AccountsHRIntegrationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'systems' | 'permissions' | 'logs'>('overview');

  // State
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [syncLogs, setSyncLogs] = useState<DataSyncLog[]>([]);

  const [loading, setLoading] = useState(true);

  /**
   * Real cross-module figures. Every number on this screen was invented — 20
   * staff, SGD 247,500 in the bank, "8 modules synced, last full sync 2 mins
   * ago". There is no sync process at all: HR and Accounts read one database.
   * What is shown now is how many rows each module holds, how many are waiting
   * on someone, and what actually happened most recently.
   */
  const loadAll = async () => {
    try {
      setLoading(true);
      const [metricsData, summary, modules, activity, rolesResponse] = await Promise.all([
        financeAPI.integrationMetrics(),
        financeAPI.summary('month'),
        financeAPI.moduleStatus(),
        financeAPI.activity(20),
        rbacAPI.getRoles().catch(() => null),
      ]);

      const sgd = (v: number) => `SGD ${v.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
      setMetrics([
        {
          title: 'Active Staff',
          value: String(metricsData.activeStaff),
          trend: 'stable',
          trendValue: `${metricsData.totalStaff} on record`,
          color: '#F0A81E',
        },
        {
          title: 'Monthly Payroll',
          value: sgd(metricsData.monthlyPayroll),
          trend: 'stable',
          trendValue: metricsData.latestPayrollPeriod
            ? `Latest run: ${metricsData.latestPayrollPeriod}`
            : 'No run generated yet',
          color: '#4CAF50',
        },
        {
          title: 'Net This Month',
          value: sgd(summary.netProfit),
          trend: summary.netProfit >= 0 ? 'up' : 'down',
          trendValue: `${sgd(summary.totalIncome)} in, ${sgd(summary.totalExpenses)} out`,
          color: '#FF6B35',
        },
        {
          title: 'Leave This Month',
          value: String(metricsData.leaveThisMonth),
          trend: 'stable',
          trendValue: `${metricsData.pendingLeave} awaiting approval`,
          color: '#E2736B',
        },
        {
          title: 'Receivables',
          value: sgd(summary.receivables),
          trend: 'stable',
          trendValue: 'Invoiced, not yet received',
          color: '#FF9800',
        },
        {
          title: 'Expense Claims Pending',
          value: String(metricsData.claimsPending),
          trend: 'stable',
          trendValue: sgd(metricsData.claimsPendingValue),
          color: '#F44336',
        },
      ]);

      setSystemStatus(modules.map(m => ({
        name: m.name,
        // Nothing is "critical" — a module with items waiting needs attention,
        // a module with no rows yet is simply unused.
        status: m.pending > 0 ? 'warning' : m.records > 0 ? 'operational' : 'idle',
        records: m.records,
        pending: m.pending,
      })));

      setSyncLogs(activity.map((a, idx) => ({
        id: `act_${idx}`,
        module: a.module,
        action: a.action,
        timestamp: a.at ? new Date(a.at).toLocaleString('en-SG') : '',
        status: a.status,
        records: Number(a.records) || 0,
      })));

      const roles = rolesResponse?.data || rolesResponse?.roles || [];
      setRolePermissions(
        Array.isArray(roles) && roles.length > 0
          ? roles.map((role: any) => ({
              role: role.name,
              icon: '🔑',
              permissions: Array.isArray(role.permissions) ? role.permissions : [],
              description: role.description || '',
            }))
          : []
      );
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load integration data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    await loadAll();
    showToast('✅ Refreshed from the database', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return { bg: '#E8F5E9', text: '#2E7D32', icon: '✅' };
      case 'warning':
        return { bg: '#FFF3E0', text: '#E65100', icon: '⚠️' };
      case 'critical':
        return { bg: '#FFEBEE', text: '#C62828', icon: '🔴' };
      default:
        return { bg: '#F5F5F5', text: '#666', icon: '⚪' };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '•';
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              📊 Accounts & HR Integration Dashboard
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
            Real-time system overview, module synchronization, role-based access control
          </p>
        </div>

        {/* Info Banner */}
        <div style={{ padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#B5651D' }}>
          <strong>ℹ️ One database, no sync:</strong> HR, Payroll and Accounts read the same tables — nothing is copied between them, so these figures are the live records, not a snapshot.
        </div>

        {/* Sync Control */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '12px 16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>Live figures</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Read straight from the database on load{loading ? ' · loading…' : ''}</div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: loading ? '#ccc' : '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '12px',
            }}
          >
            {loading ? '⏳ Loading…' : '🔄 Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['overview', 'systems', 'permissions', 'logs'] as const).map(tab => (
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
              {tab === 'overview' && '📊 Overview'}
              {tab === 'systems' && '⚙️ Module Status'}
              {tab === 'permissions' && '🔐 Role Permissions'}
              {tab === 'logs' && '📋 Activity'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Key Metrics Summary</h3>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {metrics.map((metric, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    background: '#FFF8F5',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    borderLeft: `6px solid ${metric.color}`,
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{metric.title}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: metric.color, marginBottom: '6px' }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {getTrendIcon(metric.trend)} {metric.trendValue}
                  </div>
                </div>
              ))}
            </div>

            {/* System Health Overview */}
            <h3 style={{ margin: '24px 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>System Health Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {systemStatus.map((system, idx) => {
                const statusColor = getStatusColor(system.status);
                return (
                  <div key={idx} style={{ padding: '12px', background: statusColor.bg, border: `2px solid ${statusColor.text}`, borderRadius: '6px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: statusColor.text, marginBottom: '6px' }}>
                      {statusColor.icon} {system.name}
                    </div>
                    <div style={{ fontSize: '11px', color: statusColor.text, display: 'grid', gap: '2px' }}>
                      <div>Records: {system.records.toLocaleString()}</div>
                      <div style={{ fontWeight: '600' }}>
                        {system.pending > 0 ? `${system.pending} awaiting action` : 'Nothing outstanding'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SYSTEMS TAB */}
        {activeTab === 'systems' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Module Records</h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {systemStatus.map((system, idx) => {
                const statusColor = getStatusColor(system.status);
                return (
                  <div key={idx} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                          {statusColor.icon} {system.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Records: <strong>{system.records.toLocaleString()}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: statusColor.text }}>
                          {system.pending}
                        </div>
                        <div style={{ fontSize: '11px', color: statusColor.text, fontWeight: '600' }}>Awaiting action</div>
                      </div>
                    </div>
                    {/* Health bar */}
                    <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${system.records > 0 ? Math.round(((system.records - system.pending) / system.records) * 100) : 0}%`,
                          height: '100%',
                          background: statusColor.text,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E4', borderRadius: '6px', border: '2px solid #B5651D', fontSize: '12px', color: '#B5651D' }}>
              <strong>ℹ️ How to read this:</strong> the bar shows the share of each module's records that need no further action. A module with no records has simply not been used yet.
            </div>
          </div>
        )}

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Role-Based Access Control (RBAC)</h3>

            {rolePermissions.length === 0 && (
              <div style={{ padding: '16px', background: '#FFF8F5', border: '2px dashed #FFD9B3', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                No roles configured. Roles listed here are the real RBAC roles from the database — create them under Roles &amp; Permissions.
              </div>
            )}
            <div style={{ display: 'grid', gap: '16px' }}>
              {rolePermissions.map((role, idx) => (
                <div key={idx} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                    {role.icon} {role.role}
                  </div>

                  {/* Permissions */}
                  <div style={{ marginBottom: '12px' }}>
                    {role.description && (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{role.description}</div>
                    )}
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>Permissions:</div>
                    {role.permissions.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#666', display: 'grid', gap: '3px' }}>
                        {role.permissions.map((perm, pidx) => (
                          <li key={pidx}>{perm}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                        None granted yet — assign them under Roles &amp; Permissions.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: '#E8F5E9', borderRadius: '6px', border: '2px solid #2E7D32', fontSize: '12px', color: '#2E7D32' }}>
              <strong>🔐 RBAC:</strong> {rolePermissions.length} role{rolePermissions.length === 1 ? '' : 's'} defined in the database. This list reflects what is configured — it is not a check that every route enforces it.
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Recent Finance Activity</h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {syncLogs.map(log => (
                <div key={log.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>
                        {log.module}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{log.action}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: log.status === 'success' ? '#E8F5E9' : log.status === 'pending' ? '#FFF3E0' : '#FFEBEE',
                      color: log.status === 'success' ? '#2E7D32' : log.status === 'pending' ? '#E65100' : '#C62828',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {log.status === 'success' && '✅ SUCCESS'}
                      {log.status === 'pending' && '⏳ PENDING'}
                      {log.status === 'error' && '❌ ERROR'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{log.timestamp}</span>
                    <span>{log.records} record{log.records === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#F5F5F5', borderRadius: '4px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
              Newest first, across income, expenses, claims, payroll and budgets
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AccountsHRIntegrationDashboard;
