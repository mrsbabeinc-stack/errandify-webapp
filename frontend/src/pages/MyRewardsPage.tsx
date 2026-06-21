import { useNavigate } from 'react-router-dom';
import HanaAssistant from '../components/HanaAssistant';

export default function MyRewardsPage() {
  const navigate = useNavigate();
  const rewards = [
    { id: 1, name: '$5 Discount', cost: '50 EP', available: true },
    { id: 2, name: '$10 Discount', cost: '100 EP', available: true },
    { id: 3, name: '$20 Discount', cost: '200 EP', available: false },
  ];

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-xl font-bold text-errandify-brown">💎 Rewards</h1>
        </div>
        <div className="bg-errandify-orange text-white rounded-lg p-2 mb-2 text-center">
          <p className="text-2xl font-bold">420 EP</p>
          <p className="text-xs opacity-90">Available Points</p>
        </div>
        <div className="space-y-1">
          {rewards.map(r => (
            <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-2 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-900">{r.name}</p>
                <p className="text-errandify-orange font-bold">{r.cost}</p>
              </div>
              <button className={`px-2 py-1 rounded text-xs font-bold ${r.available ? 'bg-errandify-orange text-white' : 'bg-gray-300 text-gray-500'}`}>
                {r.available ? 'Redeem' : 'Need'}
              </button>
            </div>
          ))}
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
