import { useNavigate } from 'react-router-dom';
import HanaAssistant from '../components/HanaAssistant';

export default function ErrandifyPointsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Errandify Points</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-errandify-orange">420 EP</p>
            <p className="text-gray-600 mt-2">Available to redeem</p>
          </div>
          <h3 className="font-bold text-gray-900 mb-3">How to Earn</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Complete errand: +10 EP</li>
            <li>✓ Refer friend: +50 EP</li>
            <li>✓ Complete review: +5 EP</li>
          </ul>
          <button className="w-full mt-6 bg-errandify-orange text-white py-2 rounded-lg font-bold">Redeem Points</button>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
