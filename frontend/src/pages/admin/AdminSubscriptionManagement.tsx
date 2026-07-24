/**
 * Admin Subscription Management
 * View and manage all company subscriptions
 */

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

interface CompanySubscription {
  company_id: number;
  company_name: string;
  current_tier: string;
  billing_type: string;
  status: string;
  renewal_date: string;
  stripe_subscription_id: string;
  created_at: string;
  pending_downgrade_to?: string;
}

export default function AdminSubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/subscriptions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setSubscriptions(data.data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || sub.current_tier === filterTier;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-rose-100 text-rose-800',
      free: 'bg-gray-50 text-gray-600',
    };
    return colors[tier] || colors.free;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      downgrade_pending: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || colors.pending;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const tierFeatures: Record<string, string[]> = {
    silver: [
      'Team coordination (5 people)',
      'AI-powered dashboard',
      '2x EP multiplier',
      'SGD $50/month ad credits',
      '18% commission rate',
    ],
    gold: [
      'Team coordination (15 people)',
      'AI-powered dashboard',
      '3x EP multiplier',
      'SGD $200/month ad credits',
      '17% commission rate',
    ],
    platinum: [
      'Unlimited team members',
      'AI-powered dashboard',
      '5x EP multiplier',
      'SGD $500/month ad credits',
      '16% commission rate',
    ],
  };

  return (
    <AdminLayout>
    <div className="p-8 bg-white rounded-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Management</h1>
        <p className="text-gray-600">Manage company subscriptions and tiers</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="downgrade_pending">Pending Downgrade</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Subscriptions</p>
          <p className="text-2xl font-bold text-orange-600">{subscriptions.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {subscriptions.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-rose-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Platinum</p>
          <p className="text-2xl font-bold text-rose-600">
            {subscriptions.filter(s => s.current_tier === 'platinum').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Pending Downgrade</p>
          <p className="text-2xl font-bold text-yellow-600">
            {subscriptions.filter(s => s.status === 'downgrade_pending').length}
          </p>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading subscriptions...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No subscriptions found</div>
        ) : (
          filteredSubscriptions.map(sub => (
            <div key={sub.company_id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.company_id ? null : sub.company_id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className={`text-gray-400 transition ${expandedId === sub.company_id ? 'rotate-180' : ''}`}>▼</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{sub.company_name}</p>
                    <p className="text-sm text-gray-500">ID: {sub.company_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(sub.current_tier)}`}>
                    {sub.current_tier.charAt(0).toUpperCase() + sub.current_tier.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sub.status)}`}>
                    {sub.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </button>

              {expandedId === sub.company_id && (
                <div className="bg-gray-50 border-t border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Billing Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{sub.billing_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Renewal Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(sub.renewal_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Stripe ID</p>
                      <p className="font-mono text-sm text-gray-900">{sub.stripe_subscription_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Created</p>
                      <p className="font-semibold text-gray-900">{formatDate(sub.created_at)}</p>
                    </div>
                  </div>

                  {sub.pending_downgrade_to && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Pending downgrade to <strong>{sub.pending_downgrade_to}</strong> at month-end
                      </p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Benefits</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {(tierFeatures[sub.current_tier as keyof typeof tierFeatures] || []).map((feature, i) => (
                        <li key={i}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100">
                      View Details
                    </button>
                    {sub.status === 'active' && (
                      <>
                        <button className="px-4 py-2 text-sm font-medium text-orange-700 border border-orange-300 rounded hover:bg-orange-50">
                          Change Tier
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded hover:bg-red-50">
                          Cancel Subscription
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
