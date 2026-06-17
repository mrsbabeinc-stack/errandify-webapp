import { useNavigate } from 'react-router-dom';

export default function PointsHistoryPage() {
  const navigate = useNavigate();
  const history = [
    { id: 1, activity: 'Completed Errand', points: '+10 EP', date: '2026-06-15' },
    { id: 2, activity: 'Referred Friend', points: '+50 EP', date: '2026-06-12' },
    { id: 3, activity: 'Redeemed Discount', points: '-50 EP', date: '2026-06-10' },
    { id: 4, activity: 'Completed Review', points: '+5 EP', date: '2026-06-08' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Points History</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-gray-900">{item.activity}</p>
                <p className="text-xs text-gray-500">{item.date}</p>
              </div>
              <p className={`font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {item.points}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
