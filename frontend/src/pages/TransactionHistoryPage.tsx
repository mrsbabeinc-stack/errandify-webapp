import { useNavigate } from 'react-router-dom';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const transactions = [
    { id: 1, type: 'Errand Completed', amount: '+$45.00', date: '2026-06-15', status: '✓ Completed' },
    { id: 2, type: 'Errand Payment', amount: '-$50.00', date: '2026-06-12', status: '✓ Paid' },
    { id: 3, type: 'Payout', amount: '+$150.00', date: '2026-06-10', status: '✓ Received' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Transaction History</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-gray-900">{tx.type}</p>
                <p className="text-xs text-gray-500">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount}
                </p>
                <p className="text-xs text-gray-500">{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
