import { useState } from 'react';

interface ReferralUser {
  userId: string;
  alias: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  thisWeekReferrals: number;
  totalEarnings: number;
  lastReferralDate: string;
}

interface ReferralConversion {
  id: string;
  referrerId: string;
  referrerAlias: string;
  referrerType: 'individual' | 'company';
  referredAlias: string;
  signupDate: string;
  errandsCompleted: number;
  epEarned: number;
  status: 'pending' | 'active' | 'inactive';
}

export default function ReferralTracking() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'performance'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');

  // Mock data
  const referralUsers: ReferralUser[] = [
    {
      userId: '1',
      alias: 'Sarah Tan',
      referralCode: 'ERRAND001',
      totalReferrals: 12,
      activeReferrals: 10,
      thisWeekReferrals: 3,
      totalEarnings: 600,
      lastReferralDate: '2024-07-18',
    },
    {
      userId: '2',
      alias: 'John Doe',
      referralCode: 'ERRAND002',
      totalReferrals: 8,
      activeReferrals: 7,
      thisWeekReferrals: 1,
      totalEarnings: 350,
      lastReferralDate: '2024-07-17',
    },
    {
      userId: '3',
      alias: 'Jane Smith',
      referralCode: 'ERRAND003',
      totalReferrals: 5,
      activeReferrals: 4,
      thisWeekReferrals: 2,
      totalEarnings: 200,
      lastReferralDate: '2024-07-16',
    },
  ];

  const conversions: ReferralConversion[] = [
    {
      id: '1',
      referrerId: '1',
      referrerAlias: 'Sarah Tan',
      referrerType: 'individual',
      referredAlias: 'Mike Johnson',
      signupDate: '2024-07-18',
      errandsCompleted: 5,
      epEarned: 350,
      status: 'active',
    },
    {
      id: '2',
      referrerId: '1',
      referrerAlias: 'Sarah Tan',
      referrerType: 'individual',
      referredAlias: 'Alex Chen',
      signupDate: '2024-07-17',
      errandsCompleted: 2,
      epEarned: 150,
      status: 'active',
    },
    {
      id: '3',
      referrerId: '2',
      referrerAlias: 'Acme Corp',
      referrerType: 'company',
      referredAlias: 'Lisa Wong',
      signupDate: '2024-07-16',
      errandsCompleted: 0,
      epEarned: 50,
      status: 'pending',
    },
  ];

  const filteredUsers = referralUsers.filter(u =>
    u.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topReferrers = [...referralUsers].sort((a, b) => b.totalReferrals - a.totalReferrals).slice(0, 5);
  const thisWeekTotal = referralUsers.reduce((sum, u) => sum + u.thisWeekReferrals, 0);
  const totalActive = referralUsers.reduce((sum, u) => sum + u.activeReferrals, 0);
  const conversionRate = ((totalActive / referralUsers.reduce((sum, u) => sum + u.totalReferrals, 0)) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-orange-900 mb-2">🎁 Referral Tracking</h1>
          <p className="text-orange-800">Monitor and manage user referrals • Celebrate community growth</p>
          <p className="text-xs text-orange-700 mt-2 font-bold">📊 Tracking both individual & company referrals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-orange-300 overflow-x-auto">
          {(['overview', 'users', 'analytics', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold text-sm transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-orange-500 text-white rounded-t-lg'
                  : 'text-orange-800 hover:text-orange-900'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'users' && '👥 Users'}
              {tab === 'analytics' && '📈 Analytics'}
              {tab === 'performance' && '🎯 Performance'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
                <p className="text-xs text-orange-700 font-bold mb-1">This Week</p>
                <p className="text-3xl font-black text-orange-600">{thisWeekTotal}</p>
                <p className="text-xs text-orange-600">New Referrals</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow border-2 border-green-300">
                <p className="text-xs text-green-700 font-bold mb-1">Active Rate</p>
                <p className="text-3xl font-black text-green-600">{conversionRate}%</p>
                <p className="text-xs text-green-600">Conversion</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow border-2 border-blue-300">
                <p className="text-xs text-blue-700 font-bold mb-1">Total Active</p>
                <p className="text-3xl font-black text-blue-600">{totalActive}</p>
                <p className="text-xs text-blue-600">Referrals</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow border-2 border-purple-300">
                <p className="text-xs text-purple-700 font-bold mb-1">Total Users</p>
                <p className="text-3xl font-black text-purple-600">{referralUsers.length}</p>
                <p className="text-xs text-purple-600">Referring</p>
              </div>
            </div>

            {/* Top Referrers */}
            <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-orange-800">🌟 Top Referrers</h2>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">Community Heroes! 🦸</span>
              </div>
              <div className="space-y-2">
                {topReferrers.map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-orange-600 w-6 text-center">#{idx + 1}</span>
                      <div>
                        <p className="font-bold text-gray-800">{user.alias}</p>
                        <p className="text-xs text-gray-600">{user.referralCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-orange-600">{user.totalReferrals}</p>
                      <p className="text-xs text-orange-700">referrals</p>
                      <p className="text-xs text-orange-600 font-bold">{user.totalEarnings} EP from them</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
              <input
                type="text"
                placeholder="Search by alias or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg mb-4 text-sm focus:outline-none focus:border-orange-500"
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div key={user.userId} className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-300">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-800">{user.alias}</p>
                        <p className="text-xs text-orange-700 font-mono">{user.referralCode}</p>
                      </div>
                      <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                        {user.activeReferrals}/{user.totalReferrals} active
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded p-1.5 border border-orange-200">
                        <p className="text-orange-700 font-bold">This Week</p>
                        <p className="font-black text-orange-600">{user.thisWeekReferrals}</p>
                      </div>
                      <div className="bg-white rounded p-1.5 border border-orange-200">
                        <p className="text-orange-700 font-bold">Earnings</p>
                        <p className="font-black text-orange-600">{user.totalEarnings} EP</p>
                      </div>
                      <div className="bg-white rounded p-1.5 border border-orange-200">
                        <p className="text-orange-700 font-bold">Last</p>
                        <p className="font-black text-orange-600">{new Date(user.lastReferralDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
              <h2 className="text-lg font-bold text-orange-800 mb-3">📈 Referral Engagement & Earnings</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conversions.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-800">{conv.referrerAlias} → {conv.referredAlias}</p>
                        <span className={`px-1 py-0.5 rounded text-xs font-bold ${
                          conv.referrerType === 'company'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {conv.referrerType === 'company' ? '🏢' : '👤'}
                        </span>
                      </div>
                      <p className="text-gray-600">{new Date(conv.signupDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-xs whitespace-nowrap ${
                        conv.status === 'active' ? 'bg-green-500 text-white' :
                        conv.status === 'pending' ? 'bg-yellow-500 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                        {conv.status === 'active' ? '✓' : conv.status === 'pending' ? '⏳' : '✕'}
                      </span>
                      <span className="font-bold text-orange-600 whitespace-nowrap">{conv.errandsCompleted} errands • {conv.epEarned} EP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE ANALYSIS TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            {/* Period Selector */}
            <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
              <div className="flex gap-2 mb-4">
                {(['daily', 'weekly', 'monthly', 'all'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-1.5 rounded text-sm font-bold transition ${
                      timePeriod === period
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                    }`}
                  >
                    {period === 'daily' && '📅 Daily'}
                    {period === 'weekly' && '📊 Weekly'}
                    {period === 'monthly' && '📈 Monthly'}
                    {period === 'all' && '⏱️ All-Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual vs Company Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-4 shadow border-2 border-blue-300">
                <p className="text-xs text-blue-700 font-bold mb-1">👤 Individual Referrers</p>
                <p className="text-2xl font-black text-blue-600">{conversions.filter(c => c.referrerType === 'individual').length}</p>
                <p className="text-xs text-blue-600 mt-1">Active conversions</p>
                <p className="text-xs text-blue-700 font-bold mt-2">Avg: {(conversions.filter(c => c.referrerType === 'individual').reduce((s, c) => s + c.errandsCompleted, 0) / Math.max(conversions.filter(c => c.referrerType === 'individual').length, 1)).toFixed(1)} errands/person</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow border-2 border-purple-300">
                <p className="text-xs text-purple-700 font-bold mb-1">🏢 Company Referrers</p>
                <p className="text-2xl font-black text-purple-600">{conversions.filter(c => c.referrerType === 'company').length}</p>
                <p className="text-xs text-purple-600 mt-1">Active conversions</p>
                <p className="text-xs text-purple-700 font-bold mt-2">Avg: {(conversions.filter(c => c.referrerType === 'company').reduce((s, c) => s + c.errandsCompleted, 0) / Math.max(conversions.filter(c => c.referrerType === 'company').length, 1)).toFixed(1)} errands/person</p>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg p-4 shadow border-2 border-orange-300">
              <h2 className="text-lg font-bold text-orange-800 mb-3">🎯 Conversion Funnel</h2>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-blue-900">QR Code Scans → Signups</span>
                    <span className="text-blue-700 font-black">{conversions.length} signups</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">100% - All referred users signed up</p>
                </div>

                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-green-900">Signups → Active (1+ errand)</span>
                    <span className="text-green-700 font-black">{conversions.filter(c => c.errandsCompleted > 0).length}/{conversions.length}</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: `${(conversions.filter(c => c.errandsCompleted > 0).length / conversions.length * 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-green-700 mt-1">{((conversions.filter(c => c.errandsCompleted > 0).length / conversions.length) * 100).toFixed(0)}% activation rate</p>
                </div>

                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-orange-900">Active → High Value (5+ errands)</span>
                    <span className="text-orange-700 font-black">{conversions.filter(c => c.errandsCompleted >= 5).length}/{conversions.length}</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: `${(conversions.filter(c => c.errandsCompleted >= 5).length / conversions.length * 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">{((conversions.filter(c => c.errandsCompleted >= 5).length / conversions.length) * 100).toFixed(0)}% high value rate</p>
                </div>
              </div>
            </div>

            {/* Key Insights & Recommendations */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 shadow border-2 border-orange-300">
              <h2 className="text-lg font-bold text-orange-900 mb-3">💡 Key Insights & Growth Recommendations</h2>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-white rounded border-l-4 border-blue-500">
                  <p className="font-bold text-blue-900">📊 Individual vs Company Performance</p>
                  <p className="text-gray-700 text-xs mt-1">
                    Individual referrers show higher engagement ({(conversions.filter(c => c.referrerType === 'individual').reduce((s, c) => s + c.errandsCompleted, 0) / Math.max(conversions.filter(c => c.referrerType === 'individual').length, 1)).toFixed(1)} avg errands) vs companies ({(conversions.filter(c => c.referrerType === 'company').reduce((s, c) => s + c.errandsCompleted, 0) / Math.max(conversions.filter(c => c.referrerType === 'company').length, 1)).toFixed(1)} avg). <strong>Action: Promote B2C referrals with personal incentives.</strong>
                  </p>
                </div>

                <div className="p-2 bg-white rounded border-l-4 border-green-500">
                  <p className="font-bold text-green-900">🎯 Activation Bottleneck</p>
                  <p className="text-gray-700 text-xs mt-1">
                    {((1 - conversions.filter(c => c.errandsCompleted > 0).length / conversions.length) * 100).toFixed(0)}% of referred users haven't completed their first errand yet. <strong>Action: Send onboarding messages with errand recommendations within 24-48h of signup.</strong>
                  </p>
                </div>

                <div className="p-2 bg-white rounded border-l-4 border-orange-500">
                  <p className="font-bold text-orange-900">💰 Revenue Potential</p>
                  <p className="text-gray-700 text-xs mt-1">
                    Total EP earned from referrals: {conversions.reduce((s, c) => s + c.epEarned, 0)} EP. Tier at 5+ errands to unlock retention. <strong>Action: Create "Referral VIP" status for those generating 250+ EP/month from friends.</strong>
                  </p>
                </div>

                <div className="p-2 bg-white rounded border-l-4 border-purple-500">
                  <p className="font-bold text-purple-900">📈 Viral Loop Strategy</p>
                  <p className="text-gray-700 text-xs mt-1">
                    Both referrer and referred users earn EP. <strong>Action: After 1st errand, show both earned amounts in celebratory notification. Encourage referred user to become a referrer with +50 EP bonus for their first referral.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
