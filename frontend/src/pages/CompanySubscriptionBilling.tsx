/**
 * Company Subscription & Billing Tab
 * Display current subscription, billing history, and upgrade/downgrade options
 */

import React, { useState, useEffect } from 'react';
import { useToastNotification } from '../utils/toastNotification';
import AdCreditTracker from '../components/AdCreditTracker';

interface Subscription {
  tier: string;
  billing_type: string;
  renewal_date: string;
  commission_rate: number;
  ad_credit_monthly: number;
  ad_credit_balance: number;
  ep_multiplier: number;
  max_team_members: number;
  milestone_progress: any[];
  is_active: boolean;
}

interface BillingHistory {
  id: number;
  stripe_invoice_id: string;
  amount: number;
  status: string;
  created_at: string;
  error_message?: string;
}

interface Tier {
  name: string;
  price_monthly: number;
  price_annual: number;
  commission_rate: number;
  ad_credit_monthly: number;
  ep_multiplier: number;
  max_team_members: number;
  features: string[];
}

const TIER_PRICES: Record<string, Record<string, number>> = {
  silver: { monthly: 2800, annual: 26800 },
  gold: { monthly: 7800, annual: 74800 },
  platinum: { monthly: 14800, annual: 142000 },
};

export default function CompanySubscriptionBilling() {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [availableTiers, setAvailableTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedBillingType, setSelectedBillingType] = useState<'monthly' | 'annual'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [companyId, setCompanyId] = useState<number>(3); // Default to 3 for demo

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch current subscription
      const subRes = await fetch(`${API_URL}/api/subscriptions/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const subData = await subRes.json();
      setSubscription(subData);

      // Fetch billing history
      const histRes = await fetch(`${API_URL}/api/subscriptions/billing-history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const histData = await histRes.json();
      setBillingHistory(histData.data || []);

      // Fetch available tiers
      const tiersRes = await fetch(`${API_URL}/api/subscriptions/tiers`);
      const tiersData = await tiersRes.json();
      setAvailableTiers(tiersData.data || []);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      showError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (tier: string) => {
    try {
      setCheckoutLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          billingType: selectedBillingType,
        }),
      });

      const data = await response.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        showError('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showError('Failed to proceed with checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/subscriptions/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Upgraded to ${tier}`);
        fetchSubscriptionData();
        setShowUpgradeModal(false);
      } else {
        showError('Failed to upgrade subscription');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      showError('Failed to upgrade subscription');
    }
  };

  const handleDowngrade = async (tier: string) => {
    if (!confirm(`Downgrade to ${tier}? This will take effect at month-end.`)) return;

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/subscriptions/downgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Downgrade scheduled to ${tier}`);
        fetchSubscriptionData();
      } else {
        showError('Failed to schedule downgrade');
      }
    } catch (error) {
      console.error('Downgrade error:', error);
      showError('Failed to schedule downgrade');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Subscription canceled');
        fetchSubscriptionData();
      } else {
        showError('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      showError('Failed to cancel subscription');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading subscription data...</div>;
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8 p-8">
      {/* Current Subscription Summary */}
      {subscription && subscription.is_active && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Current Plan: {subscription.tier.toUpperCase()}</h2>
            <span className="px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-full">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Billing Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{subscription.billing_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Renewal Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(subscription.renewal_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Commission Rate</p>
              <p className="text-lg font-semibold text-gray-900">{(subscription.commission_rate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">EP Multiplier</p>
              <p className="text-lg font-semibold text-gray-900">{subscription.ep_multiplier}x</p>
            </div>
          </div>
        </div>
      )}

      {/* Ad Credits Tracker */}
      {subscription && subscription.is_active && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Your Ad Credits</h3>
          <AdCreditTracker companyId={companyId} />
        </div>
      )}

      {/* Benefits Overview */}
      {subscription && subscription.is_active && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💳</span>
              <h3 className="font-bold text-gray-900">Ad Credits</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-2">
              SGD ${formatPrice(subscription.ad_credit_balance)}
            </p>
            <p className="text-sm text-gray-600">
              Monthly allowance: SGD ${formatPrice(subscription.ad_credit_monthly)}
            </p>
          </div>

          <div className="border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="font-bold text-gray-900">Team Members</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              {subscription.max_team_members === 999999 ? 'Unlimited' : subscription.max_team_members}
            </p>
            <p className="text-sm text-gray-600">Maximum team size allowed</p>
          </div>
        </div>
      )}

      {/* Upgrade/Downgrade Options */}
      {subscription && subscription.is_active && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Management</h3>
          <div className="flex gap-3">
            {['silver', 'gold', 'platinum'].map(tier => {
              if (tier === subscription.tier) return null;
              const isUpgrade = ['silver', 'gold', 'platinum'].indexOf(tier) >
                ['silver', 'gold', 'platinum'].indexOf(subscription.tier);

              return (
                <button
                  key={tier}
                  onClick={() => isUpgrade ? handleUpgrade(tier) : handleDowngrade(tier)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    isUpgrade
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {isUpgrade ? '↑' : '↓'} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
              );
            })}
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded font-medium bg-red-500 text-white hover:bg-red-600 transition"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* Available Tiers */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Subscription Plans</h3>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="monthly"
              checked={selectedBillingType === 'monthly'}
              onChange={(e) => setSelectedBillingType(e.target.value as 'monthly' | 'annual')}
            />
            <span>Monthly Billing</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="annual"
              checked={selectedBillingType === 'annual'}
              onChange={(e) => setSelectedBillingType(e.target.value as 'monthly' | 'annual')}
            />
            <span>Annual Billing</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableTiers.map(tier => (
            <div
              key={tier.name}
              className={`border-2 rounded-lg p-6 transition ${
                subscription?.tier === tier.name
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200'
              }`}
            >
              <h4 className="text-lg font-bold text-gray-900 mb-2 capitalize">{tier.name}</h4>
              <p className="text-3xl font-bold text-orange-600 mb-4">
                SGD ${formatPrice(TIER_PRICES[tier.name][selectedBillingType])}
                <span className="text-sm text-gray-600">/{selectedBillingType}</span>
              </p>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(tier.name)}
                disabled={checkoutLoading || subscription?.tier === tier.name}
                className="w-full px-4 py-2 rounded font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition"
              >
                {subscription?.tier === tier.name ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Billing History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600">Date</th>
                  <th className="text-left py-2 text-gray-600">Invoice ID</th>
                  <th className="text-left py-2 text-gray-600">Amount</th>
                  <th className="text-left py-2 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.slice(0, 10).map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">{formatDate(entry.created_at)}</td>
                    <td className="py-3 font-mono text-xs">{entry.stripe_invoice_id}</td>
                    <td className="py-3">SGD ${formatPrice(entry.amount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : entry.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Active Subscription */}
      {!subscription?.is_active && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
          <div className="flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">ℹ️</span>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-700 mb-4">
                Upgrade to a paid plan to unlock advanced features like higher commission rates, ad credits, and EP multipliers.
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 rounded font-medium bg-orange-500 text-white hover:bg-orange-600 transition"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
