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
          background: available > 25 ? '#E2F3EF' : '#FCE9E6',
          border: `1px solid ${available > 25 ? '#2FA48F' : '#E2736B'}`,
          borderRadius: '10px',
          padding: '10px 12px',
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
          <strong style={{ fontSize: '12px', color: available > 25 ? '#1B7D6C' : '#A8392A' }}>
            Ad Credits
          </strong>
        </div>

        <div style={{ fontSize: '18px', fontWeight: '700', color: available > 25 ? '#1B7D6C' : '#A8392A' }}>
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

  // Full banner — a slim single row, not the tall block it used to be.
  //
  // The old version was a 20px-padded, three-line card ("You have SGD $X in ad
  // credits ready to use!" + a whole paragraph about your plan's allocation)
  // that owned a third of the phone screen for one number and one button. This
  // says the same thing in one line: balance, how much is used, and the action.
  const tone =
    available > 50
      ? { bg: 'linear-gradient(135deg,#FFF3E9 0%,#FFE7D3 100%)', border: '#FF6B35', ink: '#D2521C', icon: '💰' }
      : available > 25
        ? { bg: 'linear-gradient(135deg,#FDF0D8 0%,#FBE6BF 100%)', border: '#C98A16', ink: '#8A5E0F', icon: '⚡' }
        : { bg: 'linear-gradient(135deg,#FCE9E6 0%,#F9D9D4 100%)', border: '#D8452F', ink: '#A8392A', icon: '🚨' };
  const outOfCredits = available <= 0;

  return (
    <div
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: '12px',
        padding: '10px 12px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
      }}
      onClick={() => (window.location.href = '/advertising')}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{tone.icon}</span>

      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: tone.ink }}>
          SGD ${available.toFixed(2)}
          <span style={{ fontSize: '12px', fontWeight: 600, color: tone.ink, opacity: 0.85 }}>
            {' '}ad credits
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#806350' }}>
          {outOfCredits
            ? 'All monthly credits used'
            : `${usagePercent.toFixed(0)}% of ${tier} allocation used`}
        </div>
      </div>

      <a
        href={outOfCredits ? '/subscription' : '/advertising/create'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FF6B35',
          color: 'white',
          padding: '7px 14px',
          borderRadius: '999px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '12px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {outOfCredits ? 'Upgrade' : 'Campaign'}
      </a>
    </div>
  );
};

export default AdCreditReminder;
