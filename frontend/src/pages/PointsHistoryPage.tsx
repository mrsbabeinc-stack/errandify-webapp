import { useNavigate } from 'react-router-dom';

export default function PointsHistoryPage() {
  const navigate = useNavigate();
  const history = [
    { id: 1, activity: 'Completed Errand', points: '+10 EP', date: '2026-06-15' },
    { id: 2, activity: 'Referred Friend', points: '+50 EP', date: '2026-06-12' },
    { id: 3, activity: 'Redeemed Discount', points: '-50 EP', date: '2026-06-10' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Points History</h1>
        <div className="space-y-3">
          {history.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 flex justify-between">
              <div>
                <p className="font-bold text-gray-900">{item.activity}</p>
                <p className="text-xs text-gray-500">{item.date}</p>
              </div>
              <p className={`font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
