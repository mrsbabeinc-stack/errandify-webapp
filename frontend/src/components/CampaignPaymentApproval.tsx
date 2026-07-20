import React, { useState, useEffect } from 'react';

interface PaymentCalculation {
  campaign_id: number;
  campaign_title: string;
  total_cost_sgd: number;
  total_cost_cents: number;
  available_credits_cents: number;
  available_credits_sgd: string;
  credits_to_use_cents: number;
  credits_to_use_sgd: string;
  requires_stripe_payment: boolean;
  stripe_amount_cents: number;
  stripe_amount_sgd: string;
  payment_method: 'credits_only' | 'credits_and_stripe' | 'stripe_only';
  credits_remaining_after_cents: number;
  credits_remaining_after_sgd: string;
}

interface CampaignPaymentApprovalProps {
  campaignId: number;
  campaignTitle: string;
  campaignBudgetSgd: number;
  companyId: number;
  onApproved: (result: any) => void;
  onCancelled: () => void;
}

const CampaignPaymentApproval: React.FC<CampaignPaymentApprovalProps> = ({
  campaignId,
  campaignTitle,
  campaignBudgetSgd,
  companyId,
  onApproved,
  onCancelled
}) => {
  const [calculation, setCalculation] = useState<PaymentCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Fetch payment calculation
  useEffect(() => {
    fetchPaymentCalculation();
  }, [campaignId, companyId]);

  const fetchPaymentCalculation = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const budgetCents = Math.round(campaignBudgetSgd * 100);

      const response = await fetch(`${API_URL}/api/ad-payment/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          company_id: companyId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate payment');
      }

      const data = await response.json();
      if (data.success) {
        setCalculation(data.data);
      } else {
        setError(data.error || 'Payment calculation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment details');
      console.error('Payment calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!calculation) return;

    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      // Process payment (deduct credits and/or charge Stripe)
      const response = await fetch(`${API_URL}/api/ad-payment/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          company_id: companyId,
          stripe_payment_intent_id: null // Will be obtained from Stripe if needed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const result = await response.json();
      if (result.success) {
        onApproved(result.data);
      } else {
        setError(result.error || 'Payment processing failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      console.error('Payment processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Calculating payment breakdown...</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>Please wait while we process your payment information</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#E74C3C' }}>❌ Payment Error</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>{error}</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancelled}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Go Back
          </button>
          <button
            onClick={fetchPaymentCalculation}
            style={{
              flex: 1,
              padding: '12px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!calculation) {
    return null;
  }

  const getPaymentMethodColor = (method: string) => {
    if (method === 'credits_only') return '#4CAF50'; // Green
    if (method === 'credits_and_stripe') return '#FF9800'; // Orange
    return '#2196F3'; // Blue
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '32px 0' }}>
      {/* Campaign Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '2px solid #f0f0f0' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#333' }}>
          {campaignTitle}
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Campaign Payment Approval</p>
      </div>

      {/* Payment Breakdown Card */}
      <div style={{
        background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.95, marginBottom: '8px' }}>
          Total Campaign Cost
        </div>
        <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '20px' }}>
          SGD ${calculation.total_cost_sgd.toFixed(2)}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
          lineHeight: '1.8'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Duration</span>
            <span style={{ fontWeight: '600' }}>4 weeks</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Type</span>
            <span style={{ fontWeight: '600' }}>Featured Ad</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{
        background: getPaymentMethodColor(calculation.payment_method),
        borderRadius: '12px',
        padding: '20px',
        color: 'white',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', opacity: 0.95 }}>
          📊 Payment Method
        </div>
        <div style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>
          {calculation.payment_method.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Credit Breakdown */}
      <div style={{
        background: '#F9F9F9',
        border: '1px solid #E8D5C4',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '16px', textTransform: 'uppercase' }}>
          💳 Ad Credit Breakdown
        </div>

        {/* Available Credits */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #E0E0E0' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Available Credits</div>
            <div style={{ fontSize: '12px', color: '#999' }}>From your subscription</div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#4CAF50', textAlign: 'right' }}>
            SGD ${calculation.available_credits_sgd}
          </div>
        </div>

        {/* Credits to Use */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #E0E0E0' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Credits to Use</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Will be deducted from balance</div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#2196F3', textAlign: 'right' }}>
            -SGD ${calculation.credits_to_use_sgd}
          </div>
        </div>

        {/* Stripe Amount (if needed) */}
        {calculation.requires_stripe_payment && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #E0E0E0' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Stripe Payment</div>
              <div style={{ fontSize: '12px', color: '#999' }}>Charged after approval</div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF9800', textAlign: 'right' }}>
              +SGD ${calculation.stripe_amount_sgd}
            </div>
          </div>
        )}

        {/* New Balance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>Balance After</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Remaining this month</div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', textAlign: 'right' }}>
            SGD ${calculation.credits_remaining_after_sgd}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        background: '#E3F2FD',
        border: '1px solid #90CAF9',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        fontSize: '13px',
        color: '#1565C0',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>✅ What Happens Next</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>Credits will be deducted from your balance</li>
          {calculation.requires_stripe_payment && <li>Stripe will charge the remaining amount</li>}
          <li>Campaign will be marked as approved</li>
          <li>Ad will go live according to schedule</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onCancelled}
          disabled={processing}
          style={{
            flex: 1,
            padding: '14px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: processing ? 0.6 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleApprovePayment}
          disabled={processing}
          style={{
            flex: 1,
            padding: '14px',
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: processing ? 0.7 : 1
          }}
        >
          {processing ? '⏳ Processing...' : '✅ Approve & Pay'}
        </button>
      </div>

      {/* Approval Details */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#F5F5F5',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>📋 Payment Details</div>
        <div>
          <strong>Payment Method:</strong> {calculation.payment_method.replace(/_/g, ' ').toUpperCase()}
        </div>
        <div>
          <strong>Expires:</strong> This month
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
          All transactions are secure and encrypted. No refunds after approval.
        </div>
      </div>
    </div>
  );
};

export default CampaignPaymentApproval;
