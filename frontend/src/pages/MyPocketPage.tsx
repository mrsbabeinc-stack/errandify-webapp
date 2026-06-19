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
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
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
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown mb-1">💼 MyPocket</h1>
          <p className="text-sm text-gray-600">Manage your earnings and spending</p>
        </div>

        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-xl p-6 mb-6 shadow-lg">
          <p className="text-sm opacity-90 mb-1">Available Balance</p>
          <h2 className="text-4xl font-bold mb-4">{formatCurrency(wallet.balance)}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/payout-settings')}
              className="flex-1 bg-white text-errandify-orange font-semibold py-2 rounded-lg hover:bg-opacity-90 transition text-sm"
            >
              Payout Settings
            </button>
            {wallet.pendingPayouts > 0 && (
              <button
                onClick={() => navigate('/transaction-history')}
                className="flex-1 border-2 border-white text-white font-semibold py-2 rounded-lg hover:bg-white hover:text-errandify-orange transition text-sm"
              >
                Pending: {formatCurrency(wallet.pendingPayouts)}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Total Earned */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Total Earned</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(wallet.totalEarned)}</p>
            <p className="text-xs text-gray-500 mt-2">As a Doer</p>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Total Spent</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(wallet.totalSpent)}</p>
            <p className="text-xs text-gray-500 mt-2">On Tasks</p>
          </div>

          {/* Errandify Points */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 col-span-2">
            <p className="text-xs text-gray-600 mb-2">⭐ Errandify Points</p>
            <p className="text-2xl font-bold text-errandify-orange">{wallet.errandifyPoints} EP</p>
            <p className="text-xs text-gray-500 mt-2">Earn points on every task completed</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <p className="text-sm font-bold text-gray-700 mb-3">Quick Actions</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/my-rewards')}
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <span>💎</span>
                <span className="text-sm font-medium">Redeem Rewards</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>
            <button
              onClick={() => navigate('/points-history')}
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <span>📈</span>
                <span className="text-sm font-medium">Points History</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>
            <button
              onClick={() => navigate('/transaction-history')}
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span className="text-sm font-medium">Transaction History</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-bold text-gray-700">Recent Activity</p>
          </div>

          {wallet.transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {wallet.transactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          tx.type === 'earn'
                            ? 'text-green-600'
                            : tx.type === 'refund'
                              ? 'text-blue-600'
                              : 'text-gray-800'
                        }`}
                      >
                        {tx.type === 'earn' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      {tx.taskId && (
                        <button
                          onClick={() => navigate(`/errand/${tx.taskId}`)}
                          className="text-xs text-errandify-orange hover:underline mt-1"
                        >
                          View Task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>💡 Tip:</strong> Earn Errandify Points on every completed task. Redeem them for discounts, rewards, or donate to charity!
          </p>
        </div>
      </div>
    </div>
  );
}
