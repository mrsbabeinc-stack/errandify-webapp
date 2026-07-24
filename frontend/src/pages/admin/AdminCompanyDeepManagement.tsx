import React, { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNavigate } from 'react-router-dom';

interface CompanyStaff {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  status: 'active' | 'inactive';
  joinedAt: string;
  permissions: string[];
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  status: 'active' | 'revoked';
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered?: string;
  failureCount: number;
}

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  dataPoints: number;
}

export default function AdminCompanyDeepManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<CompanyStaff[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [tab, setTab] = useState<'staff' | 'api-keys' | 'webhooks' | 'integrations'>('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'owner' | 'admin' | 'staff'>('staff');
  const [newAPIKeyName, setNewAPIKeyName] = useState('');
  const [newWebhookURL, setNewWebhookURL] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['task.created']);

  useEffect(() => {
    const savedCompanies = localStorage.getItem('platformCompanies');
    if (savedCompanies) {
      const parsed = JSON.parse(savedCompanies);
      setCompanies(parsed);
      if (parsed.length > 0) {
        setSelectedCompany(parsed[0].id);
        loadCompanyData(parsed[0].id);
      }
    } else {
      const demoCompanies = [
        {
          id: 'company_1',
          name: 'TechCorp Singapore',
          email: 'admin@techcorp.sg',
          status: 'active',
          createdAt: new Date(Date.now() - 7776000000).toISOString(),
          staffCount: 5,
          apiKeysCount: 3,
        },
        {
          id: 'company_2',
          name: 'DesignHub Pte Ltd',
          email: 'info@designhub.sg',
          status: 'active',
          createdAt: new Date(Date.now() - 3888000000).toISOString(),
          staffCount: 3,
          apiKeysCount: 1,
        },
      ];
      setCompanies(demoCompanies);
      setSelectedCompany(demoCompanies[0].id);
      localStorage.setItem('platformCompanies', JSON.stringify(demoCompanies));
      loadCompanyData(demoCompanies[0].id);
    }
  }, []);

  const loadCompanyData = (companyId: string) => {
    // Load staff
    const savedStaff = localStorage.getItem(`company_staff_${companyId}`);
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    } else {
      const demoStaff: CompanyStaff[] = [
        {
          id: 'staff_1',
          name: 'Alice Wong',
          email: 'alice@techcorp.sg',
          role: 'owner',
          status: 'active',
          joinedAt: new Date(Date.now() - 7776000000).toISOString(),
          permissions: ['manage_staff', 'manage_billing', 'api_access', 'webhooks'],
        },
        {
          id: 'staff_2',
          name: 'Bob Lee',
          email: 'bob@techcorp.sg',
          role: 'admin',
          status: 'active',
          joinedAt: new Date(Date.now() - 2592000000).toISOString(),
          permissions: ['manage_staff', 'api_access', 'view_reports'],
        },
        {
          id: 'staff_3',
          name: 'Carol Tan',
          email: 'carol@techcorp.sg',
          role: 'staff',
          status: 'active',
          joinedAt: new Date(Date.now() - 1296000000).toISOString(),
          permissions: ['view_reports', 'submit_tasks'],
        },
      ];
      setStaffList(demoStaff);
      localStorage.setItem(`company_staff_${companyId}`, JSON.stringify(demoStaff));
    }

    // Load API keys
    const savedKeys = localStorage.getItem(`company_apikeys_${companyId}`);
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    } else {
      const demoKeys: APIKey[] = [
        {
          id: 'key_1',
          name: 'Production API Key',
          key: 'sk_live_51234567890abcdef',
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
          lastUsed: new Date(Date.now() - 3600000).toISOString(),
          status: 'active',
        },
        {
          id: 'key_2',
          name: 'Staging API Key',
          key: 'sk_test_51234567890abcdef',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
          lastUsed: new Date(Date.now() - 86400000).toISOString(),
          status: 'active',
        },
      ];
      setApiKeys(demoKeys);
      localStorage.setItem(`company_apikeys_${companyId}`, JSON.stringify(demoKeys));
    }

    // Load webhooks
    const savedWebhooks = localStorage.getItem(`company_webhooks_${companyId}`);
    if (savedWebhooks) {
      setWebhooks(JSON.parse(savedWebhooks));
    } else {
      const demoWebhooks: Webhook[] = [
        {
          id: 'webhook_1',
          url: 'https://techcorp.sg/webhooks/tasks',
          events: ['task.created', 'task.updated', 'task.completed'],
          status: 'active',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
          lastTriggered: new Date(Date.now() - 3600000).toISOString(),
          failureCount: 0,
        },
      ];
      setWebhooks(demoWebhooks);
      localStorage.setItem(`company_webhooks_${companyId}`, JSON.stringify(demoWebhooks));
    }

    // Load integrations
    const savedIntegrations = localStorage.getItem(`company_integrations_${companyId}`);
    if (savedIntegrations) {
      setIntegrations(JSON.parse(savedIntegrations));
    } else {
      const demoIntegrations: IntegrationStatus[] = [
        {
          name: 'Accounting System (Xero)',
          status: 'connected',
          lastSync: new Date(Date.now() - 3600000).toISOString(),
          dataPoints: 1250,
        },
        {
          name: 'CRM (Salesforce)',
          status: 'connected',
          lastSync: new Date(Date.now() - 7200000).toISOString(),
          dataPoints: 850,
        },
        {
          name: 'Email Service (SendGrid)',
          status: 'error',
          lastSync: new Date(Date.now() - 86400000).toISOString(),
          dataPoints: 0,
        },
      ];
      setIntegrations(demoIntegrations);
      localStorage.setItem(`company_integrations_${companyId}`, JSON.stringify(demoIntegrations));
    }
  };

  const handleAddStaff = () => {
    try {
      if (!newStaffName.trim() || !newStaffEmail.trim() || !selectedCompany) {
        showToast('Please fill in all fields', 'warning');
        return;
      }

      const newStaff: CompanyStaff = {
        id: `staff_${Date.now()}`,
        name: newStaffName,
        email: newStaffEmail,
        role: newStaffRole,
        status: 'active',
        joinedAt: new Date().toISOString(),
        permissions: newStaffRole === 'owner' ? ['manage_staff', 'manage_billing', 'api_access', 'webhooks'] :
                     newStaffRole === 'admin' ? ['manage_staff', 'api_access', 'view_reports'] :
                     ['view_reports', 'submit_tasks'],
      };

      const updated = [...staffList, newStaff];
      setStaffList(updated);
      localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updated));
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffRole('staff');
      showToast('✓ Staff member added successfully', 'success');
    } catch (error) {
      showToast('Failed to add staff member', 'error');
    }
  };

  const handleRemoveStaff = (staffId: string) => {
    const updated = staffList.filter(s => s.id !== staffId);
    setStaffList(updated);
    if (selectedCompany) {
      localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updated));
    }
  };

  const handleAddAPIKey = () => {
    if (!newAPIKeyName.trim() || !selectedCompany) return;

    const newKey: APIKey = {
      id: `key_${Date.now()}`,
      name: newAPIKeyName,
      key: `sk_live_${Math.random().toString(36).substr(2, 20)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    localStorage.setItem(`company_apikeys_${selectedCompany}`, JSON.stringify(updated));
    setNewAPIKeyName('');
  };

  const handleRevokeAPIKey = (keyId: string) => {
    const updated = apiKeys.map(k => k.id === keyId ? { ...k, status: 'revoked' as const } : k);
    setApiKeys(updated);
    if (selectedCompany) {
      localStorage.setItem(`company_apikeys_${selectedCompany}`, JSON.stringify(updated));
    }
  };

  const handleAddWebhook = () => {
    if (!newWebhookURL.trim() || webhookEvents.length === 0 || !selectedCompany) return;

    const newWebhook: Webhook = {
      id: `webhook_${Date.now()}`,
      url: newWebhookURL,
      events: webhookEvents,
      status: 'active',
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };

    const updated = [...webhooks, newWebhook];
    setWebhooks(updated);
    localStorage.setItem(`company_webhooks_${selectedCompany}`, JSON.stringify(updated));
    setNewWebhookURL('');
    setWebhookEvents(['task.created']);
  };

  const handleToggleWebhook = (webhookId: string) => {
    const updated = webhooks.map(w =>
      w.id === webhookId ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w
    );
    setWebhooks(updated);
    if (selectedCompany) {
      localStorage.setItem(`company_webhooks_${selectedCompany}`, JSON.stringify(updated));
    }
  };

  const handleDeleteWebhook = (webhookId: string) => {
    const updated = webhooks.filter(w => w.id !== webhookId);
    setWebhooks(updated);
    if (selectedCompany) {
      localStorage.setItem(`company_webhooks_${selectedCompany}`, JSON.stringify(updated));
    }
  };

  const toggleWebhookEvent = (event: string) => {
    if (webhookEvents.includes(event)) {
      setWebhookEvents(webhookEvents.filter(e => e !== event));
    } else {
      setWebhookEvents([...webhookEvents, event]);
    }
  };

  const availableEvents = ['task.created', 'task.updated', 'task.completed', 'task.cancelled', 'payment.received', 'payment.refunded'];

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            🏢 Company Deep Management
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Manage staff, API keys, webhooks and integrations for companies
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
            padding: '0 8px',
          }}
          title="Go back"
        >
          ←
        </button>
      </div>

      {/* Company Selector */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '2px solid #FFD9B3',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
          SELECT COMPANY
        </div>
        <select
          value={selectedCompany || ''}
          onChange={(e) => {
            setSelectedCompany(e.target.value);
            loadCompanyData(e.target.value);
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #FFD9B3',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', paddingBottom: '8px' }}>
        {(['staff', 'api-keys', 'webhooks', 'integrations'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)' : 'transparent',
              color: tab === t ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t === 'staff' && '👥 Staff'}
            {t === 'api-keys' && '🔑 API Keys'}
            {t === 'webhooks' && '🪝 Webhooks'}
            {t === 'integrations' && '🔗 Integrations'}
          </button>
        ))}
      </div>

      {/* STAFF TAB */}
      {tab === 'staff' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Add New Staff Member
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Full name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <input
                type="email"
                placeholder="Email address"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <button
                onClick={handleAddStaff}
                style={{
                  padding: '10px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Add Staff Member
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {staffList.map(staff => (
              <div key={staff.id} style={{
                padding: '16px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {staff.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                      {staff.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Role: <strong>{staff.role.toUpperCase()}</strong> • Status: <strong style={{ color: '#4CAF50' }}>ACTIVE</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Joined: {new Date(staff.joinedAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {staff.permissions.map(p => (
                        <span key={p} style={{ background: '#FFF8F5', padding: '2px 6px', borderRadius: '3px', border: '1px solid #FFD9B3' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveStaff(staff.id)}
                    style={{
                      padding: '8px 12px',
                      background: '#ffebee',
                      color: '#c62828',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API KEYS TAB */}
      {tab === 'api-keys' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Create New API Key
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Key name (e.g., Production API Key)"
                value={newAPIKeyName}
                onChange={(e) => setNewAPIKeyName(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <button
                onClick={handleAddAPIKey}
                style={{
                  padding: '10px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Generate API Key
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {apiKeys.map(key => (
              <div key={key.id} style={{
                padding: '16px',
                background: 'white',
                border: key.status === 'revoked' ? '2px solid #9E9E9E' : '2px solid #FFD9B3',
                borderRadius: '8px',
                opacity: key.status === 'revoked' ? 0.6 : 1,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {key.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      fontFamily: 'monospace',
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      wordBreak: 'break-all',
                    }}>
                      {key.key}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Created: {new Date(key.createdAt).toLocaleDateString()} •
                      Status: <strong style={{ color: key.status === 'active' ? '#4CAF50' : '#9E9E9E' }}>{key.status.toUpperCase()}</strong>
                      {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                    </div>
                  </div>
                  {key.status === 'active' && (
                    <button
                      onClick={() => handleRevokeAPIKey(key.id)}
                      style={{
                        padding: '8px 12px',
                        background: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {tab === 'webhooks' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Create New Webhook
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="url"
                placeholder="Webhook URL (https://...)"
                value={newWebhookURL}
                onChange={(e) => setNewWebhookURL(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                  Select Events to Subscribe
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {availableEvents.map(event => (
                    <label key={event} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(event)}
                        onChange={() => toggleWebhookEvent(event)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', color: '#666' }}>{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddWebhook}
                style={{
                  padding: '10px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Create Webhook
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {webhooks.map(webhook => (
              <div key={webhook.id} style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${webhook.status === 'active' ? '#FFD9B3' : '#ccc'}`,
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {webhook.url}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Status: <strong style={{ color: webhook.status === 'active' ? '#4CAF50' : '#999' }}>{webhook.status.toUpperCase()}</strong>
                      {webhook.failureCount > 0 && ` • ${webhook.failureCount} failures`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {webhook.events.map(e => (
                        <span key={e} style={{ background: '#FFF8F5', padding: '2px 6px', borderRadius: '3px', border: '1px solid #FFD9B3' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                      Created: {new Date(webhook.createdAt).toLocaleDateString()}
                      {webhook.lastTriggered && ` • Last triggered: ${new Date(webhook.lastTriggered).toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleWebhook(webhook.id)}
                      style={{
                        padding: '6px 10px',
                        background: webhook.status === 'active' ? '#fff3e0' : '#e8f5e9',
                        color: webhook.status === 'active' ? '#e65100' : '#2e7d32',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {webhook.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      style={{
                        padding: '6px 10px',
                        background: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTEGRATIONS TAB */}
      {tab === 'integrations' && (
        <div>
          <div style={{ marginBottom: '24px', padding: '16px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
            <div style={{ fontSize: '13px', color: '#2e7d32' }}>
              ✓ View and manage third-party integrations. Connected systems automatically sync data.
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {integrations.map((integration, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${integration.status === 'connected' ? '#4CAF50' : integration.status === 'error' ? '#F44336' : '#ccc'}`,
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {integration.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: integration.status === 'connected' ? '#2e7d32' : integration.status === 'error' ? '#c62828' : '#999',
                      marginBottom: '8px',
                    }}>
                      {integration.status === 'connected' && '✓ Connected'}
                      {integration.status === 'disconnected' && '○ Disconnected'}
                      {integration.status === 'error' && '⚠ Error'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Data points synced: <strong>{integration.dataPoints.toLocaleString()}</strong>
                      {integration.lastSync && ` • Last sync: ${new Date(integration.lastSync).toLocaleString()}`}
                    </div>
                  </div>
                  <button
                    style={{
                      padding: '8px 12px',
                      background: integration.status === 'connected' ? '#e8f5e9' : '#FFF3E4',
                      color: integration.status === 'connected' ? '#2e7d32' : '#B5651D',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {integration.status === 'connected' ? 'Manage' : 'Reconnect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
