import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: string;
  enabled: boolean;
  channels: string[];
  createdAt: string;
}

interface AlertHistory {
  id: string;
  rule: string;
  message: string;
  triggeredAt: string;
  delivered: boolean;
  channel: string;
}

interface OnCallSchedule {
  id: string;
  person: string;
  role: 'primary' | 'backup';
  startDate: string;
  endDate: string;
  phone: string;
  status: 'active' | 'inactive';
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  content: string;
  createdAt: string;
}

export default function AdminAlertsNotifications() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [onCallSchedule, setOnCallSchedule] = useState<OnCallSchedule[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [tab, setTab] = useState<'rules' | 'history' | 'on-call' | 'templates'>('rules');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);

  useEffect(() => {
    // Load alert rules
    const savedRules = localStorage.getItem('alertRules');
    if (savedRules) {
      setAlertRules(JSON.parse(savedRules));
    } else {
      const demoRules: AlertRule[] = [
        {
          id: 'rule_1',
          name: 'High Payment Failure Rate',
          condition: 'Payment failure rate > 5%',
          threshold: '5%',
          enabled: true,
          channels: ['email', 'sms'],
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: 'rule_2',
          name: 'System Downtime',
          condition: 'API response time > 5s',
          threshold: '5000ms',
          enabled: true,
          channels: ['email', 'sms', 'push'],
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
        },
        {
          id: 'rule_3',
          name: 'Suspicious Login Activity',
          condition: 'Failed login attempts > 10/hour',
          threshold: '10 attempts',
          enabled: true,
          channels: ['email'],
          createdAt: new Date(Date.now() - 604800000).toISOString(),
        },
        {
          id: 'rule_4',
          name: 'Large Refund Volume',
          condition: 'Refunds > $5000/hour',
          threshold: '$5000',
          enabled: false,
          channels: ['email'],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setAlertRules(demoRules);
      localStorage.setItem('alertRules', JSON.stringify(demoRules));
    }

    // Load alert history
    const savedHistory = localStorage.getItem('alertHistory');
    if (savedHistory) {
      setAlertHistory(JSON.parse(savedHistory));
    } else {
      const demoHistory: AlertHistory[] = [
        {
          id: 'h_1',
          rule: 'High Payment Failure Rate',
          message: 'Payment failure rate reached 5.2%',
          triggeredAt: new Date(Date.now() - 3600000).toISOString(),
          delivered: true,
          channel: 'email',
        },
        {
          id: 'h_2',
          rule: 'Suspicious Login Activity',
          message: '12 failed login attempts detected from IP 203.0.113.45',
          triggeredAt: new Date(Date.now() - 7200000).toISOString(),
          delivered: true,
          channel: 'email',
        },
        {
          id: 'h_3',
          rule: 'System Downtime',
          message: 'API response time exceeded 5.5s threshold',
          triggeredAt: new Date(Date.now() - 10800000).toISOString(),
          delivered: true,
          channel: 'sms',
        },
      ];
      setAlertHistory(demoHistory);
      localStorage.setItem('alertHistory', JSON.stringify(demoHistory));
    }

    // Load on-call schedule
    const savedSchedule = localStorage.getItem('onCallSchedule');
    if (savedSchedule) {
      setOnCallSchedule(JSON.parse(savedSchedule));
    } else {
      const demoSchedule: OnCallSchedule[] = [
        {
          id: 'ocs_1',
          person: 'Alice Wong',
          role: 'primary',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 604800000).toISOString(),
          phone: '+65 9234 5678',
          status: 'active',
        },
        {
          id: 'ocs_2',
          person: 'Bob Lee',
          role: 'backup',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 604800000).toISOString(),
          phone: '+65 8765 4321',
          status: 'active',
        },
        {
          id: 'ocs_3',
          person: 'Carol Tan',
          role: 'primary',
          startDate: new Date(Date.now() + 604800000).toISOString(),
          endDate: new Date(Date.now() + 1209600000).toISOString(),
          phone: '+65 9876 5432',
          status: 'inactive',
        },
      ];
      setOnCallSchedule(demoSchedule);
      localStorage.setItem('onCallSchedule', JSON.stringify(demoSchedule));
    }

    // Load templates
    const savedTemplates = localStorage.getItem('notificationTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      const demoTemplates: NotificationTemplate[] = [
        {
          id: 't_1',
          name: 'Payment Failed',
          type: 'email',
          content: 'Your payment for errand {{errandId}} failed. Please retry.',
          createdAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: 't_2',
          name: 'Errand Completed',
          type: 'push',
          content: '✓ {{doerName}} completed your errand {{errandTitle}}',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
        },
        {
          id: 't_3',
          name: 'Dispute Escalated',
          type: 'sms',
          content: 'Your dispute for errand {{errandId}} has been escalated to Level 2 review.',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
        },
      ];
      setTemplates(demoTemplates);
      localStorage.setItem('notificationTemplates', JSON.stringify(demoTemplates));
    }
  }, []);

  const handleToggleRule = (ruleId: string) => {
    const updated = alertRules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setAlertRules(updated);
    localStorage.setItem('alertRules', JSON.stringify(updated));
  };

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleCondition.trim() || selectedChannels.length === 0) {
      alert('Please fill in all fields and select at least one channel');
      return;
    }

    const newRule: AlertRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName,
      condition: newRuleCondition,
      threshold: newRuleCondition.split('>')[1] || 'N/A',
      enabled: true,
      channels: selectedChannels,
      createdAt: new Date().toISOString(),
    };

    const updated = [...alertRules, newRule];
    setAlertRules(updated);
    localStorage.setItem('alertRules', JSON.stringify(updated));
    setNewRuleName('');
    setNewRuleCondition('');
    setSelectedChannels(['email']);
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🔔 Alerts & Notifications
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
          Configure alert rules, on-call schedules and notification templates
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', paddingBottom: '8px' }}>
        {(['rules', 'history', 'on-call', 'templates'] as const).map(t => (
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
            {t === 'rules' && '⚙️ Rules'}
            {t === 'history' && '📜 History'}
            {t === 'on-call' && '📞 On-Call'}
            {t === 'templates' && '📝 Templates'}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {tab === 'rules' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Create New Alert Rule
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Rule name (e.g., High Payment Failure Rate)"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <textarea
                placeholder="Condition (e.g., Payment failure rate > 5%)"
                value={newRuleCondition}
                onChange={(e) => setNewRuleCondition(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                  Notification Channels
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['email', 'sms', 'push'].map(channel => (
                    <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase' }}>
                        {channel === 'email' && '📧'} {channel === 'sms' && '📱'} {channel === 'push' && '🔔'} {channel}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddRule}
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
                + Create Alert Rule
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {alertRules.map(rule => (
              <div key={rule.id} style={{
                padding: '16px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {rule.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {rule.condition}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    style={{
                      padding: '8px 12px',
                      background: rule.enabled ? '#e8f5e9' : '#ffebee',
                      color: rule.enabled ? '#2e7d32' : '#c62828',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {rule.enabled ? '✓ ON' : '✕ OFF'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {rule.channels.map(ch => (
                    <span key={ch} style={{
                      background: '#FFF8F5',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      border: '1px solid #FFD9B3',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {ch === 'email' && '📧'} {ch === 'sms' && '📱'} {ch === 'push' && '🔔'} {ch}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                  Created: {new Date(rule.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {alertHistory.map(alert => (
            <div key={alert.id} style={{
              padding: '16px',
              background: 'white',
              border: `2px solid ${alert.delivered ? '#4CAF50' : '#FF9800'}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    {alert.rule}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', display: 'flex', gap: '12px' }}>
                    <span>Time: {new Date(alert.triggeredAt).toLocaleString()}</span>
                    <span>Channel: {alert.channel.toUpperCase()}</span>
                  </div>
                </div>
                <span style={{
                  padding: '6px 10px',
                  background: alert.delivered ? '#e8f5e9' : '#fff3e0',
                  color: alert.delivered ? '#2e7d32' : '#e65100',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  height: 'fit-content',
                }}>
                  {alert.delivered ? '✓ Delivered' : '⏳ Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ON-CALL TAB */}
      {tab === 'on-call' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {onCallSchedule.map(schedule => (
            <div key={schedule.id} style={{
              padding: '16px',
              background: 'white',
              border: `2px solid ${schedule.status === 'active' ? '#4CAF50' : '#ccc'}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    {schedule.person}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    Role: <strong>{schedule.role.toUpperCase()}</strong> • Phone: <strong>{schedule.phone}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Period: {new Date(schedule.startDate).toLocaleDateString()} to {new Date(schedule.endDate).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '6px 10px',
                  background: schedule.status === 'active' ? '#e8f5e9' : '#f5f5f5',
                  color: schedule.status === 'active' ? '#2e7d32' : '#999',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  height: 'fit-content',
                }}>
                  {schedule.status === 'active' ? '✓ ACTIVE' : 'UPCOMING'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {templates.map(template => (
            <div key={template.id} style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
            }}>
              <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                {template.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                background: '#FFF8F5',
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '8px',
                fontFamily: 'monospace',
                marginTop: '8px',
              }}>
                {template.content}
              </div>
              <div style={{ fontSize: '11px', color: '#999', display: 'flex', gap: '12px' }}>
                <span>Type: <strong>{template.type.toUpperCase()}</strong></span>
                <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
