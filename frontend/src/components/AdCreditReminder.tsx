import React, { useState, useEffect } from 'react';

interface AdCreditReminderProps {
  companyId: number;
  compact?: boolean; // If true, shows as small card; if false, shows as banner
}

const AdCreditReminder: React.FC<AdCreditReminderProps> = ({ companyId, compact = true }) => {
  const [available, setAvailable] = useState<number | null>(null);
  const [tier, setTier] = useState<string>('');
  const [usagePercent, setUsagePercent] = useState<number>(0);
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [companyId]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 AdCreditReminder: Fetching for company', companyId);

      const response = await fetch(`/api/ad-payment/status/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 Reminder API Response status:', response.status);
      const data = await response.json();
      console.log('📊 Reminder API Response:', data);

      if (data.success) {
        const availableAmount = parseFloat(data.data.credits.available_sgd);
        const percent = parseFloat(data.data.credits.usage_percentage);
        console.log('✅ Reminder: Available=', availableAmount, 'Usage%=', percent);
        setAvailable(availableAmount);
        setTier(data.data.subscription.tier);
        setUsagePercent(percent);

        // Don't show if they have plenty of credits
        if (percent > 50) {
          setShouldShow(true);
        }
      } else {
        console.warn('❌ Reminder API error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching ad credits:', error);
    }
  };

  if (!shouldShow || available === null) {
    return null;
  }

  // Compact Card (for sidebars, small spaces)
  if (compact) {
    return (
      <div
        style={{
          background: available > 25 ? '#E8F5E9' : '#FFEBEE',
          border: `2px solid ${available > 25 ? '#4CAF50' : '#F44336'}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          ':hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
        onClick={() => window.location.href = '/advertising'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>{available > 25 ? '✅' : '⚠️'}</span>
          <strong style={{ fontSize: '12px', color: available > 25 ? '#2E7D32' : '#C62828' }}>
            Ad Credits
          </strong>
        </div>

        <div style={{ fontSize: '18px', fontWeight: '700', color: available > 25 ? '#2E7D32' : '#C62828' }}>
          SGD ${available.toFixed(2)}
        </div>

        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
          {usagePercent.toFixed(0)}% used this month
        </p>

        {available > 0 && (
          <button
            style={{
              width: '100%',
              marginTop: '8px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/advertising/create';
            }}
          >
            Create Campaign
          </button>
        )}
      </div>
    );
  }

  // Full Banner (for main content areas)
  return (
    <div
      style={{
        background: available > 50
          ? 'linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)'
          : available > 25
            ? 'linear-gradient(135deg, #FFF3E0 0%, #FFF8E1 100%)'
            : 'linear-gradient(135deg, #FFEBEE 0%, #FCE4EC 100%)',
        border: `2px solid ${available > 50 ? '#4CAF50' : available > 25 ? '#FF9800' : '#F44336'}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer'
      }}
      onClick={() => window.location.href = '/advertising'}
    >
      {/* Icon */}
      <div style={{ fontSize: '32px' }}>
        {available > 50 ? '✨' : available > 25 ? '⚡' : '🚨'}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <strong
          style={{
            fontSize: '14px',
            color: available > 50 ? '#2E7D32' : available > 25 ? '#E65100' : '#C62828',
            display: 'block',
            marginBottom: '4px'
          }}
        >
          {available > 50
            ? `You have SGD $${available.toFixed(2)} in ad credits ready to use!`
            : available > 25
              ? `Running low on ad credits - only SGD $${available.toFixed(2)} left`
              : `Critical: Only SGD $${available.toFixed(2)} in ad credits remaining!`}
        </strong>
        <p
          style={{
            margin: '0',
            fontSize: '12px',
            color: available > 50 ? '#558B2F' : available > 25 ? '#F57C00' : '#D32F2F'
          }}
        >
          {available > 0
            ? `${usagePercent.toFixed(0)}% of your ${tier} plan's monthly allocation used. Create a campaign to boost your visibility.`
            : `You've used all your monthly ad credits. Upgrade your plan or wait for next month.`}
        </p>
      </div>

      {/* Action */}
      {available > 0 && (
        <a
          href="/advertising/create"
          style={{
            background: '#FF6B35',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Create Campaign
        </a>
      )}

      {available <= 0 && (
        <a
          href="/subscription"
          style={{
            background: '#FF6B35',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Upgrade Plan
        </a>
      )}
    </div>
  );
};

export default AdCreditReminder;
