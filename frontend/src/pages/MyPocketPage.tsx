import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  pendingPayouts: number;
  errandifyPoints: number;
  transactions: Array<{
    id: number;
    type: 'earn' | 'spend' | 'refund';
    amount: number;
    description: string;
    taskId?: number;
    createdAt: string;
  }>;
}

export default function MyPocketPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'asker' | 'doer' | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
    }
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setWallet(response.data.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch wallet:', err);
      setError(err.response?.data?.error || 'Failed to load wallet');
      // Set mock data for demo
      setWallet({
        balance: 450.50,
        totalEarned: 1250.00,
        totalSpent: 320.50,
        pendingPayouts: 150.00,
        errandifyPoints: 325,
        transactions: [
          {
            id: 1,
            type: 'earn',
            amount: 80,
            description: 'Completed: Clean apartment',
            taskId: 5,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 2,
            type: 'spend',
            amount: 120,
            description: 'Posted: Home repairs',
            taskId: 8,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 3,
            type: 'earn',
            amount: 150,
            description: 'Completed: Moving help',
            taskId: 3,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 4,
            type: 'refund',
            amount: 50,
            description: 'Refund: Cancelled task',
            taskId: 7,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-32">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-32">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Failed to load wallet'}</p>
          <button
            onClick={fetchWalletData}
            className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-xl font-bold text-errandify-brown">💼 MyPocket</h1>
          <div className="w-6"></div>
        </div>

        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-lg p-3 mb-3 shadow-md">
          <p className="text-xs opacity-90">Balance</p>
          <h2 className="text-3xl font-bold mb-2">{formatCurrency(wallet.balance)}</h2>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => navigate('/payout-settings')}
              className="flex-1 bg-white text-errandify-orange font-semibold py-1.5 rounded transition"
            >
              Payout
            </button>
            {wallet.pendingPayouts > 0 && (
              <button
                onClick={() => navigate('/transaction-history')}
                className="flex-1 border border-white text-white font-semibold py-1.5 rounded transition"
              >
                💰 {formatCurrency(wallet.pendingPayouts)}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
            <p className="text-gray-600 mb-0.5">Earned</p>
            <p className="font-bold text-green-600">{formatCurrency(wallet.totalEarned)}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
            <p className="text-gray-600 mb-0.5">Spent</p>
            <p className="font-bold text-errandify-orange-600">{formatCurrency(wallet.totalSpent)}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
            <p className="text-gray-600 mb-0.5">Points</p>
            <p className="font-bold text-errandify-orange">{wallet.errandifyPoints}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <div className="flex text-xs font-semibold border-b border-gray-100">
            <button
              onClick={() => navigate('/my-rewards')}
              className="flex-1 p-2 hover:bg-gray-50 text-center"
            >
              💎 Rewards
            </button>
            <button
              onClick={() => navigate('/points-history')}
              className="flex-1 p-2 hover:bg-gray-50 text-center border-l border-gray-100"
            >
              📈 History
            </button>
            <button
              onClick={() => navigate('/transaction-history')}
              className="flex-1 p-2 hover:bg-gray-50 text-center border-l border-gray-100"
            >
              📋 Txns
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        {wallet.transactions.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-3">
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 text-xs">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="p-2 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{tx.description.split(':')[1]?.trim() || tx.description}</p>
                  <p className="text-gray-500 text-xs">{formatDate(tx.createdAt)}</p>
                </div>
                <p
                  className={`font-bold ${
                    tx.type === 'earn'
                      ? 'text-green-600'
                      : tx.type === 'refund'
                        ? 'text-errandify-orange-600'
                        : 'text-gray-800'
                  }`}
                >
                  {tx.type === 'earn' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
