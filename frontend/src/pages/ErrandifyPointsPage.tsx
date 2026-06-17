import { useNavigate } from 'react-router-dom';

export default function ErrandifyPointsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Errandify Points</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-errandify-orange">420 EP</p>
            <p className="text-gray-600 mt-2">Available to redeem</p>
          </div>

          <div className="bg-errandify-orange/10 border border-errandify-orange rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Earn points by completing errands, referring friends, and more! Redeem points for discounts on future errands.
            </p>
          </div>

          <h3 className="font-bold text-errandify-brown mb-3">How to Earn</h3>
          <ul className="space-y-2 text-sm text-gray-700 mb-6">
            <li>✓ Complete an errand: +10 EP</li>
            <li>✓ Refer a friend: +50 EP</li>
            <li>✓ Complete review: +5 EP</li>
            <li>✓ Bonus achievement: +25 EP</li>
          </ul>

          <button className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold">
            Redeem Points
          </button>
        </div>
      </div>
    </div>
  );
}
