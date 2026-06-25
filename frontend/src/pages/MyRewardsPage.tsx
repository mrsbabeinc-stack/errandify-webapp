import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function MyRewardSpacePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'errandify' | 'rewards' | 'history' | 'vouchers'>('errandify');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState('');
  const [redeemed, setRedeemed] = useState<number[]>([]);
  const [confirmRedeemData, setConfirmRedeemData] = useState<{ rewardId: number; points: number; name: string } | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);

  const rewards = [
    { id: 1, name: '$5 Discount', cost: '50 EP', available: true },
    { id: 2, name: '$10 Discount', cost: '100 EP', available: true },
    { id: 3, name: '$20 Discount', cost: '200 EP', available: false },
  ];

  const vouchers = [
    { id: 1, name: 'Starbucks', category: 'Food', cost: '500 EP', expiry: 'No Expiry' },
  ];

  useEffect(() => {
    fetchPointsAndHistory();
  }, []);

  const fetchPointsAndHistory = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch current points
      const balanceRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/balance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentPoints(balanceRes.data.data.errandifyPoints || 0);

      // Fetch transaction history
      const historyRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/point-history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const transactions = historyRes.data.data || [];
      setPointHistory(transactions);

      // Fetch user's redeemed vouchers
      const vouchersRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/my-vouchers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const vouchers = vouchersRes.data.data || [];
      setMyVouchers(vouchers);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    }
  };

  const confirmRedeem = (rewardId: number, points: number, name: string) => {
    setConfirmRedeemData({ rewardId, points, name });
  };

  const handleRedeemConfirm = async () => {
    if (!confirmRedeemData) return;

    setRedeeming(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/redeem`,
        { rewardId: confirmRedeemData.rewardId, points: confirmRedeemData.points },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('✅ Reward redeemed successfully! Points deducted from your account.');
      setRedeemed([...redeemed, confirmRedeemData.rewardId]);
      setConfirmRedeemData(null);

      // Refresh points and history
      await fetchPointsAndHistory();

      // Auto-clear message after 5 seconds but keep the redeemed state
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.error || 'Failed to redeem'}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemCancel = () => {
    setConfirmRedeemData(null);
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-xl font-bold text-errandify-brown">💎 MyRewardSpace</h1>
          <div className="w-6" />
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-900">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="flex text-xs font-bold border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('errandify')}
              className={`flex-1 p-3 text-center transition duration-300 whitespace-nowrap ${
                activeTab === 'errandify'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              ⭐ Errandify Points
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 p-2 text-center transition border-l border-gray-100 whitespace-nowrap ${activeTab === 'rewards' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              🎁 MyRewards
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 p-2 text-center transition border-l border-gray-100 whitespace-nowrap ${activeTab === 'history' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              📜 History
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`flex-1 p-2 text-center transition border-l border-gray-100 whitespace-nowrap ${activeTab === 'vouchers' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              🎟️ Vouchers
            </button>
          </div>

          {/* Tab Content */}
          <div className="text-xs">
            {/* Errandify Points Tab */}
            {activeTab === 'errandify' && (
              <div className="p-4 space-y-4">
                <div className="bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs opacity-95 font-bold mb-1">✨ Available Errandify Points</p>
                      <h2 className="text-5xl font-bold">⭐ {currentPoints} EP ⭐</h2>
                    </div>
                    <p className="text-5xl">💎</p>
                  </div>
                  <p className="text-xs opacity-90 font-semibold">{currentPoints > 0 ? 'Ready to redeem amazing rewards!' : 'Start earning to redeem rewards!'}</p>
                </div>

                <div className="bg-gradient-to-r from-orange-200 to-red-200 border-2 border-orange-400 rounded-xl p-3">
                  <p className="text-xs font-bold text-orange-900">⏰ Expiring Soon</p>
                  <p className="text-xs text-orange-800 mt-1">25 pts will expire on 30/06/2027 - Use them now!</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => confirmRedeem(1, 50, '$5 Discount')}
                    disabled={redeeming}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50"
                  >
                    🎁 {redeeming ? 'Redeeming...' : 'Redeem Now'}
                  </button>
                  <button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-200 active:scale-95">
                    🎀 Send A Gift
                  </button>
                </div>

                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs font-bold text-gray-800 mb-2">Ways to Earn</p>
                  <p className="text-xs text-gray-600">Little actions, more points.</p>
                </div>
              </div>
            )}

            {/* MyRewards Tab */}
            {activeTab === 'rewards' && (
              <div className="divide-y divide-gray-100 p-2">
                {rewards.map((reward, idx) => (
                  <div key={reward.id} className="p-2 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{reward.name}</p>
                      <p className="text-errandify-orange font-bold">{reward.cost}</p>
                    </div>
                    <button
                      onClick={() => {
                        const points = parseInt(reward.cost);
                        confirmRedeem(reward.id, points, reward.name);
                      }}
                      disabled={!reward.available || redeeming}
                      className={`px-2 py-1 rounded text-xs font-bold ${reward.available ? 'bg-errandify-orange text-white hover:bg-orange-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      {reward.available ? 'Redeem' : 'Need'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Point History Tab */}
            {activeTab === 'history' && (
              <div className="divide-y divide-gray-100 p-2">
                {pointHistory.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>📋 No transaction history yet</p>
                  </div>
                ) : (
                  pointHistory.map((item, idx) => (
                    <div key={idx} className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">{item.description || item.type}</p>
                        <p className="text-gray-500 text-xs">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <p className={`font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.points > 0 ? '+' : ''}{item.points} EP
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <div className="p-2 space-y-2">
                {myVouchers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>📋 No vouchers redeemed yet</p>
                    <p className="text-xs mt-1">Redeem Errandify Points to get vouchers!</p>
                  </div>
                ) : (
                  myVouchers.map((voucher, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{voucher.description}</p>
                          <p className="text-xs text-gray-600">{new Date(voucher.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold text-errandify-orange">✅ Redeemed</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-800">Cost: {Math.abs(voucher.points)} EP</span>
                        <span className="text-green-600 font-bold">Saved</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmRedeemData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center mb-6">
                <p className="text-4xl mb-3">🎁</p>
                <h2 className="text-2xl font-bold text-errandify-brown mb-2">Confirm Redemption</h2>
                <p className="text-gray-600">Are you sure you want to redeem this reward?</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="mb-3">
                  <p className="text-xs text-gray-600 font-semibold">Reward</p>
                  <p className="text-lg font-bold text-errandify-brown">{confirmRedeemData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Cost</p>
                  <p className="text-2xl font-bold text-errandify-orange">{confirmRedeemData.points} EP</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-6 text-center">
                These points will be deducted from your account and cannot be recovered.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleRedeemCancel}
                  disabled={redeeming}
                  className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg font-bold text-base hover:bg-gray-400 transition disabled:opacity-50 border-2 border-gray-400"
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleRedeemConfirm}
                  disabled={redeeming}
                  className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold text-base hover:bg-orange-600 transition disabled:opacity-50 border-2 border-orange-600"
                >
                  {redeeming ? '⏳ Redeeming...' : '✅ Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
