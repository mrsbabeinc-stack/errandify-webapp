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
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-lg font-bold text-errandify-brown">📋 Transactions</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 text-xs">
          {txs.map(tx => (
            <div key={tx.id} className="p-2 flex justify-between hover:bg-gray-50">
              <div>
                <p className="font-bold text-gray-900">{tx.type}</p>
                <p className="text-gray-500">{tx.date}</p>
              </div>
              <p className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{tx.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
