import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'asker' | 'doer' | null>(null);
  const tabFromUrl = searchParams.get('tab') as 'txns' | 'history' | 'payout' | null;
  const [activeTab, setActiveTab] = useState<'txns' | 'history' | 'payout'>(tabFromUrl || 'txns');
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: 'STRIPE TEST BANK',
    accountHolder: 'John Lee',
    accountNumber: '•••• •••• •••• 3456',
  });

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
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/wallet`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const walletData = response.data.data;
      if (walletData && walletData.transactions) {
        walletData.transactions = walletData.transactions.reverse();
      }
      setWallet(walletData);
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
            id: 6,
            type: 'refund',
            amount: 50,
            description: 'Refund: Cancelled Errand (#7)',
            taskId: 7,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
            id: 4,
            type: 'earn',
            amount: 150,
            description: 'Completed Errand (#3): Moving help',
            taskId: 3,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
            id: 2,
            type: 'earn',
            amount: 50,
            description: 'Referral: @SunnyLove joined',
            taskId: undefined,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 1,
            type: 'earn',
            amount: 80,
            description: 'Completed Errand (#5): Clean apartment',
            taskId: 5,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
            {wallet.pendingPayouts > 0 && (
              <button
                onClick={() => navigate('/transaction-history')}
                className="flex-1 border border-white text-white font-semibold py-1.5 rounded transition group relative"
                title="Money earned but waiting to be paid out"
              >
                💰 {formatCurrency(wallet.pendingPayouts)}
                <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  Pending: Waiting 48h after completion
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center group relative cursor-help">
            <p className="text-gray-600 mb-0.5">Earned</p>
            <p className="font-bold text-green-600">{formatCurrency(wallet.totalEarned)}</p>
            <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
              Total from completed errands
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center group relative cursor-help">
            <p className="text-gray-600 mb-0.5">Spent</p>
            <p className="font-bold text-errandify-orange-600">{formatCurrency(wallet.totalSpent)}</p>
            <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
              Total paid for posted errands
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 text-center group relative cursor-help">
            <p className="text-gray-600 mb-0.5">Points</p>
            <p className="font-bold text-errandify-orange">{wallet.errandifyPoints}</p>
            <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
              Errandify Points balance
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <div className="flex text-xs font-semibold border-b border-gray-100">
            <button
              onClick={() => setActiveTab('txns')}
              className={`flex-1 p-1.5 text-center transition whitespace-nowrap text-xs ${activeTab === 'txns' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              📋 Transactions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 p-1.5 text-center transition border-l border-gray-100 whitespace-nowrap text-xs ${activeTab === 'history' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
            >
              ⭐ Errandify Points (EP)
            </button>
            <button
              onClick={() => setActiveTab('payout')}
              className={`flex-1 p-1.5 text-center transition border-l border-gray-100 whitespace-nowrap text-xs ${activeTab === 'payout' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
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

            {/* Payout Tab - Transactions */}
            {activeTab === 'payout' && (
              <div className="p-2 space-y-2">
                {console.log('Payout tab is active')}
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

                {/* Bank Details Section */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <button
                    onClick={() => setShowBankDetails(!showBankDetails)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition"
                  >
                    <h3 className="text-xs font-bold text-gray-800">🏦 Bank Account Details</h3>
                    <span className="text-lg">{showBankDetails ? '▼' : '▶'}</span>
                  </button>

                  {showBankDetails && (
                    <div className="border-t border-gray-100 p-2 space-y-2">
                      {!isEditingPayout ? (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Bank</span>
                            <span className="font-bold">{bankDetails.bankName}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Account Holder</span>
                            <span className="font-bold">{bankDetails.accountHolder}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Account</span>
                            <span className="font-bold">{bankDetails.accountNumber}</span>
                          </div>
                          <button
                            onClick={() => setIsEditingPayout(true)}
                            className="w-full mt-2 bg-errandify-orange text-white py-1 rounded text-xs font-bold hover:bg-orange-600"
                          >
                            ✏️ Edit Bank Details
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={bankDetails.bankName}
                              onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Account Holder</label>
                            <input
                              type="text"
                              value={bankDetails.accountHolder}
                              onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Account Number</label>
                            <input
                              type="text"
                              value={bankDetails.accountNumber}
                              onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setIsEditingPayout(false)}
                              className="flex-1 bg-errandify-orange text-white py-1 rounded text-xs font-bold hover:bg-orange-600"
                            >
                              ✓ Save
                            </button>
                            <button
                              onClick={() => setIsEditingPayout(false)}
                              className="flex-1 border border-gray-300 text-gray-700 py-1 rounded text-xs font-bold hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Important Note Section */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3">
                  <div className="flex gap-2">
                    <p className="text-sm font-bold text-blue-900">ℹ️ Important</p>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">Bank account changes take effect within 24 hours. Earnings in transit will be sent to the previously added account.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
