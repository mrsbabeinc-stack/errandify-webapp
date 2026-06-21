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
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-lg font-bold text-errandify-brown">📈 Points History</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 text-xs">
          {history.map(item => (
            <div key={item.id} className="p-2 flex justify-between hover:bg-gray-50">
              <div>
                <p className="font-bold text-gray-900">{item.activity}</p>
                <p className="text-gray-500">{item.date}</p>
              </div>
              <p className={`font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
