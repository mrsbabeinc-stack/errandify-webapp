import React, { useState, useEffect } from 'react';

interface CreditStatus {
  allocated_sgd: string;
  used_sgd: string;
  available_sgd: string;
  usage_percentage: string;
  month: string;
  expires_at: string;
}

interface SubscriptionInfo {
  tier: string;
  status: string;
  billing_type: string;
  monthly_credit_allocation_sgd: string;
}

interface AdCreditTrackerProps {
  companyId: number;
  compact?: boolean;
}

const AdCreditTracker: React.FC<AdCreditTrackerProps> = ({ companyId, compact = false }) => {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchCreditStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCreditStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [companyId]);

  const fetchCreditStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 AdCreditTracker: Fetching for company', companyId, 'with token:', token?.substring(0, 10) + '...');

      const response = await fetch(`/api/ad-payment/status/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 API Response status:', response.status);
      const data = await response.json();
      console.log('📊 API Response data:', data);

      if (data.success) {
        console.log('✅ Setting credit status:', data.data.credits);
        setCreditStatus(data.data.credits);
        setSubscription(data.data.subscription);

        // Show alert if usage is high
        const usagePercent = parseFloat(data.data.credits.usage_percentage);
        if (usagePercent > 75) {
          setShowAlert(true);
        }
      } else {
        console.warn('❌ API returned error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching credit status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !creditStatus || !subscription) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading ad credits...</div>;
  }

  const usagePercent = parseFloat(creditStatus.usage_percentage);
  const availableAmount = parseFloat(creditStatus.available_sgd);
  const daysUntilExpiry = creditStatus.expires_at
    ? Math.ceil((new Date(creditStatus.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine color based on usage
  let statusColor = '#4CAF50'; // Green
  let statusIcon = '✅';
  let statusText = 'Healthy';

  if (usagePercent >= 90) {
    statusColor = '#F44336'; // Red
    statusIcon = '🚨';
    statusText = 'Critical';
  } else if (usagePercent >= 75) {
    statusColor = '#FF9800'; // Orange
    statusIcon = '⚠️';
    statusText = 'High Usage';
  } else if (usagePercent >= 50) {
    statusColor = '#FFC107'; // Amber
    statusIcon = 'ℹ️';
    statusText = 'Halfway';
  }

  // Get tier badge color
  const tierColors: { [key: string]: string } = {
    'Silver': '#C0C0C0',
    'Gold': '#FFD700',
    'Platinum': '#E5E4E2',
    'free': '#999'
  };

  const tierBgColors: { [key: string]: string } = {
    'Silver': '#F5F5F5',
    'Gold': '#FFFEF0',
    'Platinum': '#F9F9F7',
    'free': '#F0F0F0'
  };

  // Compact version for Benefits & Tracking card
  if (compact) {
    return (
      <div>
        {/* Main Credit Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Left: Credit Balance */}
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px', opacity: 0.9 }}>Available Ad Credits</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '28px', fontWeight: '700' }}>
                SGD ${creditStatus.available_sgd}
              </span>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>/ SGD ${creditStatus.allocated_sgd}</span>
            </div>
          </div>

          {/* Right: Usage Gauge */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: `3px solid rgba(255, 255, 255, 0.3)`,
                boxShadow: `inset 0 0 0 ${(80 * usagePercent) / 100 / 2}px rgba(255, 255, 255, 0.5)`
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{usagePercent.toFixed(0)}%</div>
                <div style={{ fontSize: '10px', opacity: 0.9 }}>Used</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}
        >
          {/* Allocated */}
          <div
            style={{
              background: 'white',
              border: '1px solid #E8D5C4',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px'
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#999', fontWeight: '600' }}>💰 This Month</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
              SGD ${creditStatus.allocated_sgd}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666' }}>
              {subscription.tier} plan
            </p>
          </div>

          {/* Used */}
          <div
            style={{
              background: 'white',
              border: '1px solid #E8D5C4',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px'
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#999', fontWeight: '600' }}>📊 Used</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
              SGD ${creditStatus.used_sgd}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666' }}>
              {creditStatus.usage_percentage}% of budget
            </p>
          </div>

          {/* Remaining */}
          <div
            style={{
              background: availableAmount > 0 ? '#E8F5E9' : '#FFEBEE',
              border: availableAmount > 0 ? '1px solid #4CAF50' : '1px solid #F44336',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px'
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#999', fontWeight: '600' }}>
              {availableAmount > 0 ? '✅ Ready' : '⏳ Used Up'}
            </p>
            <p
              style={{
                margin: '0',
                fontSize: '16px',
                fontWeight: '700',
                color: availableAmount > 0 ? '#2E7D32' : '#C62828'
              }}
            >
              SGD ${creditStatus.available_sgd}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#666' }}>
              {daysUntilExpiry}d until reset
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Urgent Alert */}
      {showAlert && (
        <div
          style={{
            background: '#FFEBEE',
            border: '2px solid #F44336',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '24px' }}>🚨</div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#C62828', fontSize: '14px' }}>
              Running out of ad credits!
            </strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#D32F2F' }}>
              You've used {creditStatus.usage_percentage}% of your monthly ad credits (SGD ${creditStatus.used_sgd}).
              Create campaigns now before they expire on{' '}
              {new Date(creditStatus.expires_at).toLocaleDateString()}!
            </p>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Credit Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(255, 107, 53, 0.25)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'center'
        }}
      >
        {/* Left: Credit Balance */}
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', opacity: 0.9 }}>Available Ad Credits</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '42px', fontWeight: '700' }}>
              SGD ${creditStatus.available_sgd}
            </span>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>/ SGD ${creditStatus.allocated_sgd}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <div>
              <span style={{ opacity: 0.8 }}>Tier:</span>
              <div
                style={{
                  background: tierBgColors[subscription.tier],
                  color: tierColors[subscription.tier],
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  marginTop: '4px',
                  display: 'inline-block',
                  fontSize: '11px'
                }}
              >
                {subscription.tier}
              </div>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>Expires:</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '12px' }}>
                {new Date(creditStatus.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Usage Gauge + Status */}
        <div>
          {/* Circular Progress */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                position: 'relative',
                border: `4px solid rgba(255, 255, 255, 0.3)`,
                boxShadow: `inset 0 0 0 ${(120 * usagePercent) / 100 / 2}px rgba(255, 255, 255, 0.5)`
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{usagePercent.toFixed(0)}%</div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Used</div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              background: statusColor,
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '12px'
            }}
          >
            {statusIcon} {statusText}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Allocated */}
        <div
          style={{
            background: 'white',
            border: '1px solid #E8D5C4',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
            💰 This Month Allocated
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
            SGD ${creditStatus.allocated_sgd}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
            {subscription.tier} plan
          </p>
        </div>

        {/* Used */}
        <div
          style={{
            background: 'white',
            border: '1px solid #E8D5C4',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
            📊 Already Used
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
            SGD ${creditStatus.used_sgd}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
            {creditStatus.usage_percentage}% of budget
          </p>
        </div>

        {/* Remaining */}
        <div
          style={{
            background: availableAmount > 0 ? '#E8F5E9' : '#FFEBEE',
            border: availableAmount > 0 ? '1px solid #4CAF50' : '1px solid #F44336',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
            {availableAmount > 0 ? '✅ Ready to Use' : '⏳ No Credits Left'}
          </p>
          <p
            style={{
              margin: '0',
              fontSize: '24px',
              fontWeight: '700',
              color: availableAmount > 0 ? '#2E7D32' : '#C62828'
            }}
          >
            SGD ${creditStatus.available_sgd}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
            {daysUntilExpiry} days until reset
          </p>
        </div>
      </div>

      {/* Call-to-Action Section */}
      {availableAmount > 0 && (
        <div
          className="adcredit-cta-row"
          style={{
            background: '#FFF3E0',
            border: '2px solid #FF9800',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div style={{ fontSize: '32px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#E65100', fontSize: '14px', display: 'block' }}>
              You have SGD ${creditStatus.available_sgd} in ad credits waiting to be used!
            </strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#F57C00' }}>
              Create a campaign now and boost your visibility. These credits expire on{' '}
              {new Date(creditStatus.expires_at).toLocaleDateString()}.
            </p>
          </div>
          <a
            href="/advertising/create"
            className="adcredit-cta-btn"
            style={{
              background: '#FF6B35',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              textAlign: 'center'
            }}
          >
            Create Campaign
          </a>
        </div>
      )}

      {/* Warning: Credits Running Out */}
      {usagePercent >= 75 && availableAmount > 0 && (
        <div
          style={{
            background: '#FFE0B2',
            border: '2px solid #FF9800',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#E65100', fontWeight: '700' }}>
            ⚠️ Credits running out soon
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#F57C00' }}>
            You have only SGD ${creditStatus.available_sgd} left for the rest of the month.
            {usagePercent >= 90 && (
              <>
                {' '}
                <strong>Consider upgrading to the next tier</strong> to get more ad credits, or wait until{' '}
                {new Date(creditStatus.expires_at).toLocaleDateString()} for your credits to reset.
              </>
            )}
          </p>
        </div>
      )}

      {/* Info Section */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E8D5C4',
          borderRadius: '12px',
          padding: '20px'
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
          📌 How Ad Credits Work
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          <div>
            <strong style={{ color: '#FF6B35' }}>✅ Automatic Allocation</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Every month, you get fresh ad credits based on your subscription tier.
            </p>
          </div>
          <div>
            <strong style={{ color: '#FF6B35' }}>💳 Credit First</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Your ad credits are used first. If you need more, we charge your card for the balance.
            </p>
          </div>
          <div>
            <strong style={{ color: '#FF6B35' }}>🔄 Monthly Reset</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Unused credits expire at the end of the month. Use them or lose them!
            </p>
          </div>
          <div>
            <strong style={{ color: '#FF6B35' }}>📈 Upgrade Anytime</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Upgrade to Gold or Platinum to get more credits and extra features.
            </p>
          </div>
          <div>
            <strong style={{ color: '#FF6B35' }}>🚀 No Wastage</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Campaigns can be paused anytime. Credits are refunded if you cancel.
            </p>
          </div>
          <div>
            <strong style={{ color: '#FF6B35' }}>📊 Transparent Pricing</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              See exact cost breakdown before confirming any campaign payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCreditTracker;
