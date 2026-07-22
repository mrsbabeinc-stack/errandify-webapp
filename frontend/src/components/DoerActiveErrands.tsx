import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface ActiveErrand {
  id: number;
  errandId: string;
  title: string;
  description: string;
  askerName: string;
  allocatedStaffName?: string;
  allocatedBy?: string;
  status: 'confirmed' | 'acknowledged' | 'confirmed_awaiting_start' | 'in_progress' | 'job_completed';
  budget: number;
  location: string;
  deadline?: string;
  createdAt: string;
  bidId?: number;
  bidStatus?: string;
  askerId?: number;
}

const DoerActiveErrands: React.FC = () => {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<ActiveErrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'confirmed' | 'acknowledged' | 'confirmed_awaiting_start' | 'in_progress' | 'job_completed' | 'all'>('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelErrandId, setCancelErrandId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('staff_unavailable');
  const [staffName, setStaffName] = useState('Team Member');
  const [expandedErrandId, setExpandedErrandId] = useState<number | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOwnerOrManager, setIsOwnerOrManager] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [advertisingCampaigns, setAdvertisingCampaigns] = useState<any[]>([]);

  const cancelReasons = [
    { value: 'staff_unavailable', label: 'Staff member no longer available' },
    { value: 'circumstances_changed', label: 'Circumstances changed' },
    { value: 'equipment_issue', label: 'Equipment or resource issue' },
    { value: 'safety_concern', label: 'Safety concern' },
    { value: 'other', label: 'Other reason' },
  ];

  useEffect(() => {
    fetchActiveErrands();
    fetchStaffName();
  }, []);

  const fetchStaffName = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.data?.display_name) {
        setStaffName(response.data.data.display_name);
      }
      // Get user role from localStorage or API
      const storedRole = localStorage.getItem('userRole') || localStorage.getItem('role');
      const apiRole = response.data.data?.role;
      const finalRole = storedRole || apiRole;
      const apiCompanyId = response.data.data?.company_id;

      if (finalRole) {
        setUserRole(finalRole);
        // Show sidebar modules only for owner or manager
        setIsOwnerOrManager(finalRole === 'owner' || finalRole === 'manager');
      }

      if (apiCompanyId && token) {
        setCompanyId(apiCompanyId);
        // Fetch company data if owner/manager
        if (finalRole === 'owner' || finalRole === 'manager') {
          await fetchCompanyData(apiCompanyId, token);
        }
      }

      console.log('User role:', finalRole, 'Company ID:', apiCompanyId);
    } catch (err) {
      console.warn('Could not fetch staff name:', err);
    }
  };

  const fetchCompanyData = async (cId: number, token: string) => {
    try {
      // Fetch company details
      const companyRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${cId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (companyRes.data.data) {
        setCompanyData(companyRes.data.data);
        setCurrentPoints(companyRes.data.data.errandify_points || 0);
      }

      // Fetch company subscription
      const subRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${cId}/subscription`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (subRes.data.data) {
        setSubscription(subRes.data.data);
      }

      // Fetch advertising campaigns
      const adsRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${cId}/advertising`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (adsRes.data.data) {
        setAdvertisingCampaigns(adsRes.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch company data:', err);
    }
  };

  const fetchActiveErrands = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?accepted=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const activeErrands = response.data.data.map((errand: any) => ({
          id: errand.id,
          errandId: errand.errandId || errand.formatted_id,
          title: errand.title,
          description: errand.description,
          askerName: errand.askerName,
          allocatedStaffName: errand.allocatedStaffName,
          allocatedBy: errand.allocatedBy,
          status: errand.status,
          budget: errand.budget,
          location: errand.location,
          deadline: errand.deadline,
          createdAt: errand.createdAt,
          askerId: errand.askerId || errand.asker_id,
        }));
        setErrands(activeErrands);
      }
    } catch (err) {
      console.error('Failed to fetch active errands:', err);
      setError('Failed to load active errands');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/acknowledge`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertType('success');
      setAlertMessage('✅ Errand acknowledged! Waiting for manager confirmation...');
      setShowAlertModal(true);
      setTimeout(() => {
        fetchActiveErrands();
      }, 1000);
    } catch (err: any) {
      setAlertType('error');
      setAlertMessage(err.response?.data?.error || 'Failed to acknowledge errand');
      setShowAlertModal(true);
    }
  };

  const handleStart = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/errand-detail/${errandId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start errand');
    }
  };

  const handleComplete = async (errandId: number) => {
    navigate(`/task-complete-evidence/${errandId}`);
  };

  const handleViewDetails = (errandId: number) => {
    setExpandedErrandId(expandedErrandId === errandId ? null : errandId);
  };

  const openCancelModal = (errandId: number) => {
    setCancelErrandId(errandId);
    setShowCancelModal(true);
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; icon: string; bgColor: string } } = {
      'confirmed': { label: 'Awaiting Acknowledgment', color: '#FF9800', icon: '📋', bgColor: '#FFF3E0' },
      'acknowledged': { label: 'Awaiting Manager Confirmation', color: '#FF6F00', icon: '⏳', bgColor: '#FFE0B2' },
      'confirmed_awaiting_start': { label: 'Ready to Start', color: '#4CAF50', icon: '✅', bgColor: '#E8F5E9' },
      'in_progress': { label: 'In Progress', color: '#2196F3', icon: '⚙️', bgColor: '#E3F2FD' },
      'job_completed': { label: 'Completed', color: '#4CAF50', icon: '✓', bgColor: '#E8F5E9' },
    };
    return statusMap[status] || statusMap['confirmed'];
  };

  const filteredErrands = selectedFilter === 'all'
    ? errands
    : errands.filter(e => e.status === selectedFilter);

  const stats = {
    awaiting: errands.filter(e => e.status === 'confirmed').length,
    pending: errands.filter(e => e.status === 'acknowledged').length,
    ready: errands.filter(e => e.status === 'confirmed_awaiting_start').length,
    inProgress: errands.filter(e => e.status === 'in_progress').length,
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-600 font-semibold">Loading your work...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    // Force a page reload to clear all state
    window.location.href = '/auth';
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #fffbf7 100%)' }}>
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-xl font-bold text-errandify-orange">Errandify</h1>
              <p className="text-xs text-gray-600">Staff Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1">
        {/* Left Sidebar - Modular Sections (Owner/Manager Only) */}
        {isOwnerOrManager && (
        <div className="w-72 bg-white border-r border-orange-100 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4 space-y-3">

            {/* ERRANDIFY POINTS MODULE */}
            <div className="bg-gradient-to-br from-errandify-orange to-orange-500 text-white rounded-2xl shadow-lg">
              <button
                onClick={() => setExpandedModule(expandedModule === 'points' ? null : 'points')}
                className="w-full text-left p-5 hover:bg-black/10 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold opacity-90">💰 Errandify Points</div>
                    <div className="text-3xl font-bold mt-1">{currentPoints.toLocaleString()} EP</div>
                  </div>
                  <span className="text-2xl">{expandedModule === 'points' ? '▼' : '▶'}</span>
                </div>
              </button>
              {expandedModule === 'points' && (
                <div className="border-t border-white/20 p-4 bg-black/10">
                  <div className="space-y-2">
                    <button className="w-full bg-white text-errandify-orange py-2 rounded-lg font-bold text-sm hover:bg-orange-50 transition-all">
                      📈 View History
                    </button>
                    <button className="w-full bg-white bg-opacity-20 text-white py-2 rounded-lg font-bold text-sm hover:bg-opacity-30 transition-all">
                      🎁 Redeem Points
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* VOUCHERS & REWARDS MODULE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <button
                onClick={() => setExpandedModule(expandedModule === 'vouchers' ? null : 'vouchers')}
                className="w-full text-left p-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">🎁 Vouchers & Rewards</span>
                  <span className="text-lg">{expandedModule === 'vouchers' ? '▼' : '▶'}</span>
                </div>
              </button>
              {expandedModule === 'vouchers' && (
                <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                  {vouchers && vouchers.length > 0 ? (
                    <>
                      {vouchers.map((voucher: any, i: number) => {
                        const colorMap: Record<string, string> = {
                          'purple': 'border-purple-200',
                          'blue': 'border-blue-200',
                          'green': 'border-green-200',
                          'orange': 'border-orange-200',
                          'pink': 'border-pink-200'
                        };
                        const color = Object.keys(colorMap)[i % Object.keys(colorMap).length];
                        return (
                          <button key={i} className={`w-full text-left p-3 rounded-lg hover:shadow-md transition-all bg-white border ${colorMap[color]}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-2xl mb-2 block">{voucher.emoji || '🎁'}</span>
                                <p className="font-semibold text-gray-800 text-sm">{voucher.name}</p>
                                <p className="text-xs text-gray-600">{voucher.description}</p>
                              </div>
                              <span className="text-xs font-bold text-gray-700 whitespace-nowrap ml-2">{voucher.cost_ep} EP</span>
                            </div>
                          </button>
                        );
                      })}
                      <button className="w-full text-errandify-orange font-bold text-sm py-2 hover:bg-orange-50 rounded-lg transition-colors">
                        View All Rewards →
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-600">No vouchers available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBSCRIPTIONS MODULE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <button
                onClick={() => setExpandedModule(expandedModule === 'subscription' ? null : 'subscription')}
                className="w-full text-left p-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">📦 Subscription Plan</span>
                  <span className="text-lg">{expandedModule === 'subscription' ? '▼' : '▶'}</span>
                </div>
              </button>
              {expandedModule === 'subscription' && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                  {subscription ? (
                    <>
                      <div className="bg-white p-3 rounded-lg border-l-4 border-errandify-orange">
                        <p className="font-semibold text-gray-800 text-sm">{subscription.tier || subscription.name}</p>
                        <p className="text-xs text-gray-600 mt-1">${subscription.price || 'N/A'} SGD/month</p>
                        {subscription.status && (
                          <p className="text-xs text-green-600 mt-1">✓ Active • Renews {subscription.renewal_date}</p>
                        )}
                      </div>
                      <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all">
                        View Plans
                      </button>
                      <button className="w-full bg-white border border-errandify-orange text-errandify-orange py-2 rounded-lg font-bold text-sm hover:bg-orange-50 transition-all">
                        Upgrade
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-600">No active subscription</p>
                      <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all mt-3">
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ADVERTISING MODULE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <button
                onClick={() => setExpandedModule(expandedModule === 'advertising' ? null : 'advertising')}
                className="w-full text-left p-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">📢 Advertising</span>
                  <span className="text-lg">{expandedModule === 'advertising' ? '▼' : '▶'}</span>
                </div>
              </button>
              {expandedModule === 'advertising' && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                  {advertisingCampaigns && advertisingCampaigns.length > 0 ? (
                    <>
                      {advertisingCampaigns.map((campaign: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded-lg">
                          <p className="font-semibold text-gray-800 text-sm mb-1">{campaign.type || 'Campaign'}</p>
                          <p className="text-xs text-gray-600 mb-1">${campaign.price || 'N/A'}/day</p>
                          <p className="text-xs font-semibold" style={{ color: campaign.status === 'active' ? '#16a34a' : '#ea580c' }}>
                            {campaign.status === 'active' ? '🟢' : '⏳'} {campaign.status}
                          </p>
                        </div>
                      ))}
                      <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all">
                        Create Campaign
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-600 text-center py-2">No active advertising campaigns</p>
                      <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all">
                        Create Campaign
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* REFERRALS MODULE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <button
                onClick={() => setExpandedModule(expandedModule === 'referral' ? null : 'referral')}
                className="w-full text-left p-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">👥 Referrals</span>
                  <span className="text-lg">{expandedModule === 'referral' ? '▼' : '▶'}</span>
                </div>
              </button>
              {expandedModule === 'referral' && (
                <div className="border-t border-gray-200 p-4 bg-gradient-to-br from-orange-50 to-yellow-50 space-y-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-errandify-orange">0</p>
                    <p className="text-xs text-gray-600">Friends Referred</p>
                  </div>
                  <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all">
                    🔗 Share Referral Link
                  </button>
                  <p className="text-xs text-gray-600 text-center">
                    <strong>Earn 50 EP</strong> per friend signup
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
        )}
        <div className="flex-1">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-1">👋 Welcome back, {staffName.split(' ')[0]}!</h1>
                <p className="text-orange-100 text-lg">Here's your work queue for today</p>
              </div>
              <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-lg">
                {errands.length} Errand{errands.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-orange-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-gray-600 text-sm">Need Action</p>
            <p className="text-3xl font-bold text-errandify-orange">{stats.awaiting}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-yellow-400">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-gray-600 text-sm">Awaiting Confirm</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-400">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-gray-600 text-sm">Ready to Go</p>
            <p className="text-3xl font-bold text-green-600">{stats.ready}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-blue-400">
            <div className="text-3xl mb-2">⚙️</div>
            <p className="text-gray-600 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6" role="alert">
            <p className="font-bold">⚠️ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(['confirmed', 'acknowledged', 'confirmed_awaiting_start', 'in_progress', 'job_completed', 'all'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                selectedFilter === filter
                  ? 'bg-errandify-orange text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter === 'confirmed' ? '📋 Awaiting ACK' :
               filter === 'acknowledged' ? '⏳ Awaiting Confirm' :
               filter === 'confirmed_awaiting_start' ? '✅ Ready' :
               filter === 'in_progress' ? '⚙️ In Progress' :
               filter === 'job_completed' ? '✓ Completed' : 'All Errands'}
              {filter !== 'all' && (
                <span className="ml-2 bg-opacity-30 inline-block px-2 py-0.5 rounded-full text-xs font-bold">
                  {errands.filter(e => e.status === filter).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Errands List */}
        {filteredErrands.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border-2 border-dashed border-orange-200">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">All caught up!</h3>
            <p className="text-gray-600 mb-6">You have no {selectedFilter === 'all' ? 'active' : selectedFilter} errands right now.</p>
            <p className="text-gray-500 text-sm">Great job staying on top of your work! New errands will appear here when they're assigned to you.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredErrands.map(errand => {
              const statusDisplay = getStatusDisplay(errand.status);
              return (
                <div
                  key={errand.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-orange-100"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-errandify-brown">{errand.title}</h3>
                          <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded">#{errand.errandId}</span>
                        </div>
                        <p className="text-sm text-gray-600">{errand.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span
                          className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
                          style={{ backgroundColor: statusDisplay.bgColor, color: statusDisplay.color }}
                        >
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                        <button
                          onClick={() => handleViewDetails(errand.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title={expandedErrandId === errand.id ? "Hide details" : "Show details"}
                        >
                          {expandedErrandId === errand.id ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-t border-b border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Requested by</p>
                        <p className="font-semibold text-gray-800">{errand.askerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Budget</p>
                        <p className="font-semibold text-errandify-orange text-lg">SGD ${errand.budget}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Location</p>
                        <p className="font-semibold text-gray-800">📍 {errand.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Allocated by</p>
                        <p className="font-semibold text-gray-800">👤 {errand.allocatedBy || 'Manager'}</p>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {expandedErrandId === errand.id && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-orange-100 animate-in fade-in duration-200">
                        <h4 className="font-bold text-gray-800 mb-4 text-lg">📋 Full Details</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Full Description</p>
                            <p className="text-gray-700 bg-white p-3 rounded-lg">{errand.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Posted Date</p>
                              <p className="text-gray-700 bg-white p-3 rounded-lg">{errand.createdAt ? new Date(errand.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Deadline</p>
                              <p className="text-gray-700 bg-white p-3 rounded-lg">{errand.deadline ? new Date(errand.deadline).toLocaleDateString() : 'No deadline'}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Errand ID</p>
                            <p className="text-gray-700 bg-white p-3 rounded-lg font-mono">#{errand.errandId}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Status Progress</p>
                            <div className="bg-white p-3 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{statusDisplay.icon}</span>
                                <div>
                                  <p className="font-semibold text-gray-800">{statusDisplay.label}</p>
                                  <p className="text-xs text-gray-600">Current stage of this errand</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-sm text-blue-900">
                              <strong>💡 Tip:</strong> Keep track of the deadline and stay in touch with the errand requester if you need any clarifications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {errand.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(errand.id)}
                            className="flex-1 min-w-[140px] bg-errandify-orange hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            📋 Acknowledge
                          </button>
                          <button
                            onClick={() => openCancelModal(errand.id)}
                            className="flex-1 min-w-[140px] bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            ✕ Cancel
                          </button>
                          <button
                            onClick={() => navigate(`/chat?errandId=${errand.id}&userId=${errand.askerId}`)}
                            className="flex-1 min-w-[140px] bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => handleViewDetails(errand.id)}
                            className={`flex-1 min-w-[140px] py-3 rounded-xl font-bold transition-colors shadow-sm ${
                              expandedErrandId === errand.id
                                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                          >
                            {expandedErrandId === errand.id ? '▲ Hide Details' : '▼ View Details'}
                          </button>
                        </>
                      )}

                      {errand.status === 'acknowledged' && (
                        <>
                          <button
                            disabled
                            className="flex-1 min-w-[140px] bg-gray-300 text-gray-600 py-3 rounded-xl font-bold cursor-not-allowed"
                          >
                            ⏳ Awaiting Confirmation
                          </button>
                          <button
                            onClick={() => navigate(`/chat?errandId=${errand.id}&userId=${errand.askerId}`)}
                            className="flex-1 min-w-[140px] bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => handleViewDetails(errand.id)}
                            className={`flex-1 min-w-[140px] py-3 rounded-xl font-bold transition-colors shadow-sm ${
                              expandedErrandId === errand.id
                                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                          >
                            {expandedErrandId === errand.id ? '▲ Hide Details' : '▼ View Details'}
                          </button>
                        </>
                      )}

                      {errand.status === 'confirmed_awaiting_start' && (
                        <>
                          <button
                            onClick={() => handleStart(errand.id)}
                            className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            ▶ Start Errand
                          </button>
                          <button
                            onClick={() => openCancelModal(errand.id)}
                            className="flex-1 min-w-[140px] bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            ✕ Cancel
                          </button>
                          <button
                            onClick={() => navigate(`/chat?errandId=${errand.id}&userId=${errand.askerId}`)}
                            className="flex-1 min-w-[140px] bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => handleViewDetails(errand.id)}
                            className={`flex-1 min-w-[140px] py-3 rounded-xl font-bold transition-colors shadow-sm ${
                              expandedErrandId === errand.id
                                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                          >
                            {expandedErrandId === errand.id ? '▲ Hide Details' : '▼ View Details'}
                          </button>
                        </>
                      )}

                      {errand.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleComplete(errand.id)}
                            className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            ✓ Mark Complete
                          </button>
                          <button
                            onClick={() => navigate(`/chat?errandId=${errand.id}&userId=${errand.askerId}`)}
                            className="flex-1 min-w-[140px] bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-colors shadow-sm"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => handleViewDetails(errand.id)}
                            className={`flex-1 min-w-[140px] py-3 rounded-xl font-bold transition-colors shadow-sm ${
                              expandedErrandId === errand.id
                                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                          >
                            {expandedErrandId === errand.id ? '▲ Hide Details' : '▼ View Details'}
                          </button>
                        </>
                      )}

                      {errand.status === 'job_completed' && (
                        <button
                          disabled
                          className="flex-1 min-w-[160px] bg-green-100 text-green-700 py-3 rounded-xl font-bold cursor-default"
                        >
                          ✓ Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Motivational Footer */}
        {errands.length > 0 && filteredErrands.length > 0 && (
          <div className="mt-12 mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-8 border border-orange-100 text-center">
            <p className="text-gray-700 mb-2">💪 Keep up the great work! You're doing amazing!</p>
            <p className="text-sm text-gray-600">Your excellent performance helps earn rewards for the company 🏆</p>
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Themed Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center mb-4">
              {alertType === 'success' && <span className="text-4xl">✅</span>}
              {alertType === 'error' && <span className="text-4xl">❌</span>}
              {alertType === 'info' && <span className="text-4xl">ℹ️</span>}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3 text-center">{alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Information'}</h2>
            <p className="text-gray-700 text-center mb-6">{alertMessage}</p>
            <button
              onClick={() => setShowAlertModal(false)}
              className={`w-full py-3 rounded-xl font-bold transition-colors text-white ${
                alertType === 'success'
                  ? 'bg-green-500 hover:bg-green-600'
                  : alertType === 'error'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && cancelErrandId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Cancel Errand?</h3>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:outline-none focus:border-errandify-orange"
            >
              {cancelReasons.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelErrandId(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Keep It
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelErrandId(null);
                  alert('Errand cancellation would be processed here');
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Cancel Errand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reminders Section */}
      <div className="max-w-6xl mx-auto px-4 py-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Acknowledge Reminder */}
          {stats.awaiting > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-l-4 border-orange-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h4 className="font-bold text-gray-800">Waiting for Your Acknowledgment</h4>
                  <p className="text-sm text-gray-600 mt-1">You have {stats.awaiting} errand{stats.awaiting > 1 ? 's' : ''} waiting for acknowledgment. Please review and acknowledge them to proceed.</p>
                </div>
              </div>
            </div>
          )}

          {/* Manager Confirmation Reminder */}
          {stats.pending > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <h4 className="font-bold text-gray-800">Awaiting Manager Confirmation</h4>
                  <p className="text-sm text-gray-600 mt-1">{stats.pending} errand{stats.pending > 1 ? 's' : ''} is waiting for manager confirmation. Manager will review shortly.</p>
                </div>
              </div>
            </div>
          )}

          {/* Ready to Start Reminder */}
          {stats.ready > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="font-bold text-gray-800">Ready to Start</h4>
                  <p className="text-sm text-gray-600 mt-1">You have {stats.ready} errand{stats.ready > 1 ? 's' : ''} ready to begin. Click "Start Errand" to get going!</p>
                </div>
              </div>
            </div>
          )}

          {/* Tips & Best Practices */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-bold text-gray-800">Quick Tips</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✓ Acknowledge errands promptly</li>
                  <li>✓ Use Chat for clarifications</li>
                  <li>✓ Complete on time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Safety Reminder */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="font-bold text-gray-800">Safety First</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✓ Meet in public areas</li>
                  <li>✓ Inform manager before start</li>
                  <li>✓ Report any concerns</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Communication Reminder */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="font-bold text-gray-800">Stay Connected</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✓ Chat with errand requestor</li>
                  <li>✓ Ask for clarifications</li>
                  <li>✓ Update on progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar / Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          {/* Left: Help Section */}
          <div className="flex items-center gap-2">
            <span className="text-xl">❓</span>
            <div>
              <p className="text-xs text-gray-600">Need Help?</p>
              <p className="text-sm font-semibold text-gray-800">Contact Manager</p>
            </div>
          </div>

          {/* Center Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => handleNavigation('/chat')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">💬</span>
              <p className="text-xs font-semibold text-gray-700">My Chat</p>
            </button>

            <button
              onClick={() => handleNavigation('/help')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">📚</span>
              <p className="text-xs font-semibold text-gray-700">Help</p>
            </button>

            <button
              onClick={() => handleNavigation('/faq')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">❔</span>
              <p className="text-xs font-semibold text-gray-700">FAQ</p>
            </button>

            <button
              onClick={() => navigate('/apply-leave')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">📅</span>
              <p className="text-xs font-semibold text-gray-700">Apply Leave</p>
            </button>
          </div>

          {/* Right: Stats Summary */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-600">Active Work</p>
              <p className="text-lg font-bold text-errandify-orange">{stats.inProgress + stats.ready}</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Assigned</p>
              <p className="text-lg font-bold text-gray-800">{errands.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoerActiveErrands;
