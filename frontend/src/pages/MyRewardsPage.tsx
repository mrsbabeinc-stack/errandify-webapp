import { useNavigate } from 'react-router-dom';

export default function MyRewardsPage() {
  const navigate = useNavigate();
  const rewards = [
    { id: 1, name: '$5 Discount', cost: '50 EP', available: true },
    { id: 2, name: '$10 Discount', cost: '100 EP', available: true },
    { id: 3, name: '$20 Discount', cost: '200 EP', available: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">MyRewards</h1>
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <p className="text-sm text-gray-600">Available Points</p>
          <p className="text-4xl font-bold text-errandify-orange">420 EP</p>
        </div>
        <div className="space-y-3">
          {rewards.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow-md p-4 flex justify-between">
              <div>
                <p className="font-bold text-gray-900">{r.name}</p>
                <p className="text-sm text-errandify-orange font-bold">{r.cost}</p>
              </div>
              <button className={`px-4 py-1 rounded font-bold ${r.available ? 'bg-errandify-orange text-white' : 'bg-gray-300 text-gray-500'}`}>
                {r.available ? 'Redeem' : 'Not Enough'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
