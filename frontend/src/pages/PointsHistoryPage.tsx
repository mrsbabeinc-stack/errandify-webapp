import { useNavigate } from 'react-router-dom';

export default function PointsHistoryPage() {
  const navigate = useNavigate();
  const history = [
    { id: 1, activity: 'Completed Errand', points: '+10 EP', date: '2026-06-15' },
    { id: 2, activity: 'Referred Friend', points: '+50 EP', date: '2026-06-12' },
    { id: 3, activity: 'Redeemed Discount', points: '-50 EP', date: '2026-06-10' },
    { id: 4, activity: 'Review Submitted', points: '+5 EP', date: '2026-06-08' },
    { id: 5, activity: 'Bonus Achievement', points: '+25 EP', date: '2026-06-05' },
    { id: 6, activity: 'Redeemed Reward', points: '-100 EP', date: '2026-06-01' },
    { id: 7, activity: 'Completed Errand', points: '+10 EP', date: '2026-05-28' },
    { id: 8, activity: 'Referred Friend', points: '+50 EP', date: '2026-05-25' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-2 text-lg text-gray-600 font-bold self-start">‹ Back</button>
        <h1 className="text-xl font-bold text-errandify-brown mb-3">Points History</h1>

        <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col overflow-hidden">
          <div className="space-y-1 p-3 overflow-y-auto">
            {history.map(item => (
              <div key={item.id} className="bg-gray-50 rounded p-2 flex justify-between border border-gray-200">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.activity}</p>
                  <p className="text-xs text-gray-500">{item.date}</p>
                </div>
                <p className={`font-bold text-sm ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
