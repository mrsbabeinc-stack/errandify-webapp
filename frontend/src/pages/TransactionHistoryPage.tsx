import { useNavigate } from 'react-router-dom';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const txs = [
    { id: 1, type: 'Errand Completed', amount: '+$45', date: '2026-06-15' },
    { id: 2, type: 'Payment', amount: '-$50', date: '2026-06-12' },
    { id: 3, type: 'Payout', amount: '+$150', date: '2026-06-10' },
    { id: 4, type: 'Refund', amount: '+$25', date: '2026-06-08' },
    { id: 5, type: 'Commission', amount: '-$10', date: '2026-06-05' },
    { id: 6, type: 'Bonus', amount: '+$100', date: '2026-06-01' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-2 text-lg text-gray-600 font-bold self-start">‹ Back</button>
        <h1 className="text-xl font-bold text-errandify-brown mb-3">Transaction History</h1>

        <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col overflow-hidden">
          <div className="space-y-1 p-3 overflow-y-auto">
            {txs.map(tx => (
              <div key={tx.id} className="bg-gray-50 rounded p-2 flex justify-between border border-gray-200">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{tx.type}</p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                </div>
                <p className={`font-bold text-sm ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{tx.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
