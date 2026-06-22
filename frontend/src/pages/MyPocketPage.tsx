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
  const [activeTab, setActiveTab] = useState<'txns' | 'history' | 'payout'>('txns');
  const [showBankDetails, setShowBankDetails] = useState(false);

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
            description: 'Completed Errand (#5): Clean apartment',
            taskId: 5,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 2,
            type: 'earn',
            amount: 50,
            description: 'Referral: @SunnyLove joined',
            taskId: undefined,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 3,
            type: 'spend',
            amount: 120,
            description: 'Posted Errand (#8): Home repairs',
            taskId: 8,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 4,
            type: 'earn',
            amount: 150,
            description: 'Completed Errand (#3): Moving help',
            taskId: 3,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 5,
            type: 'spend',
            amount: 20,
            description: 'Redeemed Discount (Starbucks $20)',
            taskId: undefined,
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 6,
            type: 'refund',
            amount: 50,
            description: 'Refund: Cancelled Errand (#7)',
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
              onClick={() => setActiveTab('payout')}
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

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <div className="flex text-xs font-semibold border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('txns')}
              className={`flex-1 p-2 text-center transition whitespace-nowrap ${activeTab === 'txns' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              📋 Transactions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 p-2 text-center transition border-l border-gray-100 whitespace-nowrap ${activeTab === 'history' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              ⭐ EP Points
            </button>
            <button
              onClick={() => setActiveTab('payout')}
              className={`flex-1 p-2 text-center transition border-l border-gray-100 whitespace-nowrap ${activeTab === 'payout' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              💳 Payout
            </button>
          </div>

          {/* Tab Content */}
          <div className="text-xs">
            {/* Transactions Tab */}
            {activeTab === 'txns' && (
              <>
                {wallet.transactions.length === 0 ? (
                  <div className="text-center text-gray-500 py-3">
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {wallet.transactions.map((tx) => (
                      <div key={tx.id} className="p-2 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{tx.description}</p>
                          <p className="text-gray-500">{formatDate(tx.createdAt)}</p>
                        </div>
                        <p className={`font-bold ${tx.type === 'earn' ? 'text-green-600' : tx.type === 'refund' ? 'text-errandify-orange-600' : 'text-gray-800'}`}>
                          {tx.type === 'earn' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Points History Tab */}
            {activeTab === 'history' && (
              <div className="divide-y divide-gray-100">
                {[
                  { activity: 'Completed Errand', description: '', points: '+10 EP', date: '2026-06-15' },
                  { activity: 'Referred Friend', description: '@SunnyLove', points: '+50 EP', date: '2026-06-12' },
                  { activity: 'Redeemed Discount', description: '', points: '-50 EP', date: '2026-06-10' },
                  { activity: 'Review Submitted', description: '', points: '+5 EP', date: '2026-06-08' },
                  { activity: 'Bonus Achievement', description: '', points: '+25 EP', date: '2026-06-05' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 flex justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{item.activity} {item.description && <span className="text-gray-600">{item.description}</span>}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                    </div>
                    <p className={`font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Payout Tab */}
            {activeTab === 'payout' && (
              <div className="p-2 space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-900 font-semibold">💡 How It Works</p>
                  <p className="text-xs text-blue-800 mt-1">After 48 hours of errand completion (if no dispute is raised), earnings will be transferred to your account.</p>
                </div>

                {/* Payout & Drawout Transactions */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2">
                    <h3 className="text-xs font-bold">📊 Payout & Drawout Transactions</h3>
                  </div>
                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Errand Payout</p>
                        <p className="text-gray-500">17-06-2026 10:28 PM</p>
                      </div>
                      <p className="font-bold text-green-600">+$0.8 SGD</p>
                    </div>
                    <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Errand Payment</p>
                        <p className="text-gray-500">15-06-2026 10:25 PM</p>
                      </div>
                      <p className="font-bold text-red-600">-$12.16 SGD</p>
                    </div>
                    <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Refund</p>
                        <p className="text-gray-500">14-06-2026 10:05 PM</p>
                      </div>
                      <p className="font-bold text-green-600">+$100 SGD</p>
                    </div>
                  </div>
                </div>

                {/* Bank Account Management - Collapsible */}
                <button
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full bg-white border border-gray-200 rounded p-2 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <span className="text-xs font-bold text-gray-800">💳 Bank Account</span>
                  <span className="text-lg">{showBankDetails ? '▼' : '▶'}</span>
                </button>

                {/* Bank Details - Expanded */}
                {showBankDetails && (
                  <div className="bg-white border border-gray-200 rounded p-2 space-y-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                        <span className="text-gray-600 font-semibold">Bank</span>
                        <span className="font-bold text-gray-900">STRIPE TEST BANK</span>
                      </div>

                      <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                        <span className="text-gray-600 font-semibold">Account</span>
                        <span className="font-bold text-gray-900">•••• •••• •••• 3456</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-semibold">Status</span>
                        <span className="font-bold text-green-600">✓ Approved</span>
                      </div>
                    </div>

                    <button className="w-full bg-errandify-orange text-white py-1.5 rounded font-bold text-xs hover:bg-orange-600 transition">
                      ✏️ Edit Account
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
