import { useNavigate } from 'react-router-dom';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const txs = [
    { id: 1, type: 'Errand Completed', amount: '+$45', date: '2026-06-15' },
    { id: 2, type: 'Payment', amount: '-$50', date: '2026-06-12' },
    { id: 3, type: 'Payout', amount: '+$150', date: '2026-06-10' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Transaction History</h1>
        <div className="space-y-3">
          {txs.map(tx => (
            <div key={tx.id} className="bg-white rounded-lg shadow-md p-4 flex justify-between">
              <div>
                <p className="font-bold text-gray-900">{tx.type}</p>
                <p className="text-xs text-gray-500">{tx.date}</p>
              </div>
              <p className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{tx.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
