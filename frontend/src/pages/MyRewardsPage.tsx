import { useNavigate, useState } from 'react-router-dom';

export default function MyRewardSpacePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'errandify' | 'rewards' | 'history' | 'vouchers'>('errandify');

  const rewards = [
    { id: 1, name: '$5 Discount', cost: '50 EP', available: true },
    { id: 2, name: '$10 Discount', cost: '100 EP', available: true },
    { id: 3, name: '$20 Discount', cost: '200 EP', available: false },
  ];

  const vouchers = [
    { id: 1, name: 'Starbucks', category: 'Food', cost: '500 EP', expiry: 'No Expiry' },
  ];

  const pointHistory = [
    { activity: 'Errand Completion', points: '+5 EP', date: '17-06-2026 10:28 PM' },
    { activity: 'Point Granted', points: '+20 EP', date: '15-06-2026 02:54 PM' },
  ];

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-xl font-bold text-errandify-brown">💎 MyRewardSpace</h1>
          <div className="w-6" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <div className="flex text-xs font-semibold border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('errandify')}
              className={`flex-1 p-2 text-center transition whitespace-nowrap ${activeTab === 'errandify' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
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
              <div className="p-3 space-y-3">
                <div className="bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-lg p-3">
                  <p className="text-xs opacity-90 mb-1">Available Points</p>
                  <p className="text-3xl font-bold mb-2">25 EP</p>
                  <p className="text-xs opacity-80 bg-orange-700 bg-opacity-50 rounded p-1.5">
                    ⚠️ Expiring Soon: 25 pts will expire on 30/06/2027
                  </p>
                </div>

                <div className="space-y-2">
                  <button className="w-full bg-errandify-orange text-white py-2 rounded font-bold text-xs hover:bg-orange-600">
                    🎁 Redeem Now
                  </button>
                  <button className="w-full border-2 border-errandify-orange text-errandify-orange py-2 rounded font-bold text-xs hover:bg-orange-50">
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
                    <button className={`px-2 py-1 rounded text-xs font-bold ${reward.available ? 'bg-errandify-orange text-white' : 'bg-gray-300 text-gray-500'}`}>
                      {reward.available ? 'Redeem' : 'Need'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Point History Tab */}
            {activeTab === 'history' && (
              <div className="divide-y divide-gray-100 p-2">
                {pointHistory.map((item, idx) => (
                  <div key={idx} className="p-2 flex justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{item.activity}</p>
                      <p className="text-gray-500 text-xs">{item.date}</p>
                    </div>
                    <p className={`font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <div className="p-2 space-y-2">
                {vouchers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>📋 No vouchers yet</p>
                    <p className="text-xs mt-1">Start earning Errandify Points to redeem vouchers!</p>
                  </div>
                ) : (
                  vouchers.map((voucher) => (
                    <div key={voucher.id} className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{voucher.name}</p>
                          <p className="text-xs text-gray-600">{voucher.category}</p>
                        </div>
                        <span className="text-xs font-bold text-errandify-orange">x1</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-bold text-gray-800">Cost: {voucher.cost}</span>
                        <span className="text-gray-600">{voucher.expiry}</span>
                      </div>
                      <button className="w-full bg-errandify-orange text-white py-1.5 rounded font-bold text-xs hover:bg-orange-600">
                        🎁 Redeem
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
