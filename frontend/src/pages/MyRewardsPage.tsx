import { useNavigate } from 'react-router-dom';

export default function MyRewardsPage() {
  const navigate = useNavigate();
  const rewards = [
    { id: 1, name: '$5 Discount', cost: '50 EP', available: true },
    { id: 2, name: '$10 Discount', cost: '100 EP', available: true },
    { id: 3, name: '$20 Discount', cost: '200 EP', available: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">MyRewards</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Available Points</p>
          <p className="text-4xl font-bold text-errandify-orange">420 EP</p>
        </div>

        <h2 className="text-lg font-bold text-errandify-brown mb-3">Available Rewards</h2>
        <div className="space-y-3">
          {rewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{reward.name}</p>
                <p className="text-sm text-errandify-orange font-bold">{reward.cost}</p>
              </div>
              <button
                disabled={!reward.available}
                className={`py-1 px-4 rounded font-bold ${
                  reward.available
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {reward.available ? 'Redeem' : 'Not Enough'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
