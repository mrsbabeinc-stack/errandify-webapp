import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  lastModified: string;
}

interface PricingConfig {
  errandType: string;
  baseFee: number;
  commissionRate: number;
  minPrice: number;
  maxPrice: number;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  country: string;
}

interface EmailConfig {
  service: 'sendgrid' | 'mailgun' | 'ses';
  senderEmail: string;
  senderName: string;
  enabled: boolean;
  templateCount: number;
}

export default function AdminSystemConfiguration() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [tab, setTab] = useState<'features' | 'pricing' | 'holidays' | 'email'>('features');
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  useEffect(() => {
    // Load feature flags
    const savedFlags = localStorage.getItem('systemFeatureFlags');
    if (savedFlags) {
      setFeatureFlags(JSON.parse(savedFlags));
    } else {
      const demoFlags: FeatureFlag[] = [
        {
          id: 'flag_1',
          name: 'AI Errand Matching',
          description: 'Enable AI-powered errand recommendations',
          enabled: true,
          rolloutPercentage: 100,
          lastModified: new Date(Date.now() - 604800000).toISOString(),
        },
        {
          id: 'flag_2',
          name: 'Company Accounts',
          description: 'Enable B2B company account features',
          enabled: true,
          rolloutPercentage: 100,
          lastModified: new Date(Date.now() - 1296000000).toISOString(),
        },
        {
          id: 'flag_3',
          name: 'SOS Emergency Feature',
          description: 'Enable SOS emergency button on app',
          enabled: true,
          rolloutPercentage: 75,
          lastModified: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: 'flag_4',
          name: 'Referral Program',
          description: 'Enable user referral rewards',
          enabled: false,
          rolloutPercentage: 0,
          lastModified: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setFeatureFlags(demoFlags);
      localStorage.setItem('systemFeatureFlags', JSON.stringify(demoFlags));
    }

    // Load pricing configs
    const savedPricing = localStorage.getItem('systemPricing');
    if (savedPricing) {
      setPricingConfigs(JSON.parse(savedPricing));
    } else {
      const demoPricing: PricingConfig[] = [
        {
          errandType: 'Shopping',
          baseFee: 5.00,
          commissionRate: 15,
          minPrice: 20,
          maxPrice: 500,
        },
        {
          errandType: 'Delivery',
          baseFee: 3.00,
          commissionRate: 12,
          minPrice: 15,
          maxPrice: 300,
        },
        {
          errandType: 'Services',
          baseFee: 8.00,
          commissionRate: 20,
          minPrice: 50,
          maxPrice: 2000,
        },
        {
          errandType: 'Cleaning',
          baseFee: 6.00,
          commissionRate: 15,
          minPrice: 30,
          maxPrice: 800,
        },
      ];
      setPricingConfigs(demoPricing);
      localStorage.setItem('systemPricing', JSON.stringify(demoPricing));
    }

    // Load holidays
    const savedHolidays = localStorage.getItem('systemHolidays');
    if (savedHolidays) {
      setHolidays(JSON.parse(savedHolidays));
    } else {
      const demoHolidays: Holiday[] = [
        { id: 'h_1', date: '2026-01-01', name: 'New Year Day', country: 'SG' },
        { id: 'h_2', date: '2026-02-12', name: 'Chinese New Year', country: 'SG' },
        { id: 'h_3', date: '2026-04-10', name: 'Good Friday', country: 'SG' },
        { id: 'h_4', date: '2026-05-01', name: 'Labour Day', country: 'SG' },
        { id: 'h_5', date: '2026-06-15', name: 'Hari Raya Puasa', country: 'SG' },
        { id: 'h_6', date: '2026-08-09', name: 'National Day', country: 'SG' },
      ];
      setHolidays(demoHolidays);
      localStorage.setItem('systemHolidays', JSON.stringify(demoHolidays));
    }

    // Load email config
    const savedEmailConfig = localStorage.getItem('systemEmailConfig');
    if (savedEmailConfig) {
      setEmailConfig(JSON.parse(savedEmailConfig));
    } else {
      const demoEmailConfig: EmailConfig = {
        service: 'sendgrid',
        senderEmail: 'noreply@errandify.sg',
        senderName: 'Errandify',
        enabled: true,
        templateCount: 24,
      };
      setEmailConfig(demoEmailConfig);
      localStorage.setItem('systemEmailConfig', JSON.stringify(demoEmailConfig));
    }
  }, []);

  const handleToggleFlag = (flagId: string) => {
    const updated = featureFlags.map(f =>
      f.id === flagId ? { ...f, enabled: !f.enabled, lastModified: new Date().toISOString() } : f
    );
    setFeatureFlags(updated);
    localStorage.setItem('systemFeatureFlags', JSON.stringify(updated));
  };

  const handleUpdateRollout = (flagId: string, percentage: number) => {
    const updated = featureFlags.map(f =>
      f.id === flagId ? { ...f, rolloutPercentage: Math.min(100, Math.max(0, percentage)), lastModified: new Date().toISOString() } : f
    );
    setFeatureFlags(updated);
    localStorage.setItem('systemFeatureFlags', JSON.stringify(updated));
  };

  const handleAddHoliday = () => {
    if (!newHolidayDate.trim() || !newHolidayName.trim()) return;

    const newHoliday: Holiday = {
      id: `h_${Date.now()}`,
      date: newHolidayDate,
      name: newHolidayName,
      country: 'SG',
    };

    const updated = [...holidays, newHoliday];
    setHolidays(updated);
    localStorage.setItem('systemHolidays', JSON.stringify(updated));
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (holidayId: string) => {
    const updated = holidays.filter(h => h.id !== holidayId);
    setHolidays(updated);
    localStorage.setItem('systemHolidays', JSON.stringify(updated));
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            ⚙️ System Configuration
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
          Manage feature flags, pricing, holidays and email settings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', paddingBottom: '8px' }}>
        {(['features', 'pricing', 'holidays', 'email'] as const).map(t => (
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
            {t === 'features' && '🚀 Features'}
            {t === 'pricing' && '💰 Pricing'}
            {t === 'holidays' && '📅 Holidays'}
            {t === 'email' && '📧 Email'}
          </button>
        ))}
      </div>

      {/* FEATURES TAB */}
      {tab === 'features' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {featureFlags.map(flag => (
            <div key={flag.id} style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    {flag.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {flag.description}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Modified: {new Date(flag.lastModified).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleFlag(flag.id)}
                  style={{
                    padding: '8px 12px',
                    background: flag.enabled ? '#e8f5e9' : '#ffebee',
                    color: flag.enabled ? '#2e7d32' : '#c62828',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {flag.enabled ? '✓ ON' : '✕ OFF'}
                </button>
              </div>

              {flag.enabled && (
                <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    Rollout: <strong>{flag.rolloutPercentage}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={flag.rolloutPercentage}
                    onChange={(e) => handleUpdateRollout(flag.id, parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    Gradually roll out to users
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PRICING TAB */}
      {tab === 'pricing' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {pricingConfigs.map((config, idx) => (
            <div key={idx} style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
            }}>
              <div style={{ fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                {config.errandType}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                    BASE FEE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
                    ${config.baseFee.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                    COMMISSION RATE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
                    {config.commissionRate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                    MIN PRICE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    ${config.minPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                    MAX PRICE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    ${config.maxPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HOLIDAYS TAB */}
      {tab === 'holidays' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Add Holiday
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <input
                type="text"
                placeholder="Holiday name (e.g., Chinese New Year)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
              />
              <button
                onClick={handleAddHoliday}
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
                + Add Holiday
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {holidays.map(holiday => (
              <div key={holiday.id} style={{
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
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    {holiday.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(holiday.date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(holiday.id)}
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
            ))}
          </div>
        </div>
      )}

      {/* EMAIL TAB */}
      {tab === 'email' && emailConfig && (
        <div style={{
          padding: '16px',
          background: 'white',
          border: '2px solid #FFD9B3',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                EMAIL SERVICE
              </div>
              <div style={{ fontSize: '14px', color: '#333', textTransform: 'uppercase', fontWeight: '600' }}>
                {emailConfig.service}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                ✓ {emailConfig.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                SENDER EMAIL
              </div>
              <div style={{ fontSize: '14px', color: '#333', fontFamily: 'monospace' }}>
                {emailConfig.senderEmail}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                SENDER NAME
              </div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {emailConfig.senderName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                EMAIL TEMPLATES
              </div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {emailConfig.templateCount} templates configured
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                • Welcome email
                • Password reset
                • Errand notifications
                • Payment receipts
                • Dispute alerts
                • And more...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
