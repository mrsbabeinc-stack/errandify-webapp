import { useState, useEffect } from 'react';
import axios from 'axios';

interface WalletData {
  doer: {
    completedEarnings: number;
    pendingEarnings: number;
    totalEarnings: number;
    completedTasks: number;
    inProgressTasks: number;
  };
  asker: {
    pendingSpent: number;
    completedSpent: number;
    totalSpent: number;
    activePostings: number;
    completedPostings: number;
  };
}

interface Transaction {
  type: 'earning' | 'spent';
  taskId: number;
  taskTitle: string;
  amount: number;
  status: string;
  date: string;
  otherParty: string;
}

interface Breakdown {
  byCategory: Array<{
    category: string;
    taskCount: number;
    totalEarnings: number;
    averageEarning: number;
  }>;
  byMonth: Array<{
    month: string;
    taskCount: number;
    monthlyEarnings: number;
  }>;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'breakdown'>('overview');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [walletRes, transRes, breakdownRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/balance`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/transactions`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/breakdown`, { headers }),
      ]);

      setWallet(walletRes.data.data);
      setTransactions(transRes.data.data.transactions);
      setBreakdown(breakdownRes.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">💰</div>
          <p className="text-gray-600">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">💰 Your Wallet</h1>
          <p className="text-orange-100">Track your earnings and spending</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Main Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Earnings Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-green-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-1">💵 Total Earnings</p>
                <h2 className="text-4xl font-bold text-green-600">
                  {formatCurrency(wallet?.doer.totalEarnings || 0)}
                </h2>
              </div>
              <span className="text-5xl">📈</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(wallet?.doer.completedEarnings || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{wallet?.doer.completedTasks} tasks</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(wallet?.doer.pendingEarnings || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{wallet?.doer.inProgressTasks} in progress</p>
              </div>
            </div>
          </div>

          {/* Spending Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-semibold mb-1">💸 Total Spent</p>
                <h2 className="text-4xl font-bold text-blue-600">
                  {formatCurrency(wallet?.asker.totalSpent || 0)}
                </h2>
              </div>
              <span className="text-5xl">📉</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(wallet?.asker.completedSpent || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{wallet?.asker.completedPostings} tasks done</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">Pending</p>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrency(wallet?.asker.pendingSpent || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{wallet?.asker.activePostings} active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-errandify-orange text-white border-b-4 border-errandify-orange'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'transactions'
                  ? 'bg-errandify-orange text-white border-b-4 border-errandify-orange'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📜 Transactions
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'breakdown'
                  ? 'bg-errandify-orange text-white border-b-4 border-errandify-orange'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📈 Breakdown
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Quick Stats */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">⚡ Quick Stats</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <p className="text-gray-600 text-sm font-semibold mb-2">✅ Completed Tasks</p>
                      <p className="text-3xl font-bold text-green-600">
                        {wallet?.doer.completedTasks || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">as doer</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <p className="text-gray-600 text-sm font-semibold mb-2">🚀 In Progress</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {wallet?.doer.inProgressTasks || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">earning in progress</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <p className="text-gray-600 text-sm font-semibold mb-2">📋 Posted Tasks</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {wallet?.asker.activePostings || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">active postings</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                      <p className="text-gray-600 text-sm font-semibold mb-2">💎 Avg. Earning</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {wallet && wallet.doer.completedTasks > 0
                          ? formatCurrency(wallet.doer.completedEarnings / wallet.doer.completedTasks)
                          : 'SGD $0'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">per task</p>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
                  <p className="font-semibold text-blue-900 mb-2">💡 How it works</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Earnings: 80% of task budget (20% fee)</li>
                    <li>✓ Pending earnings are held until task is completed and confirmed</li>
                    <li>✓ Completed earnings can be withdrawn via payout (coming soon with Stripe)</li>
                    <li>✓ Your spending is the full budget of tasks you post as asker</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">📜 Recent Transactions</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No transactions yet</p>
                    <p className="text-gray-400 text-sm mt-2">Get started by posting or completing tasks!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl">
                              {tx.type === 'earning' ? '💵' : '💸'}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-800">{tx.taskTitle}</p>
                              <p className="text-xs text-gray-500">
                                {tx.type === 'earning' ? 'Earned from' : 'Paid to'} {tx.otherParty} • {formatDate(tx.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${tx.type === 'earning' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="space-y-8">
                {/* By Category */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📂 Earnings by Category</h3>
                  {breakdown?.byCategory && breakdown.byCategory.length > 0 ? (
                    <div className="space-y-3">
                      {breakdown.byCategory.map((cat, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-800">{cat.category}</p>
                            <p className="text-lg font-bold text-errandify-orange">
                              {formatCurrency(cat.totalEarnings)}
                            </p>
                          </div>
                          <div className="flex gap-6 text-sm text-gray-600">
                            <span>📋 {cat.taskCount} tasks</span>
                            <span>💰 Avg: {formatCurrency(cat.averageEarning)}/task</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No earnings by category yet</p>
                  )}
                </div>

                {/* By Month */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Earnings by Month</h3>
                  {breakdown?.byMonth && breakdown.byMonth.length > 0 ? (
                    <div className="space-y-3">
                      {breakdown.byMonth.map((month, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-800">
                              {new Date(month.month).toLocaleDateString('en-SG', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(month.monthlyEarnings)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">📋 {month.taskCount} tasks completed</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No monthly data yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <h3 className="font-bold text-purple-900 mb-2">🎉 Coming Soon</h3>
          <p className="text-purple-800">Withdraw earnings directly to your bank account with Stripe integration</p>
        </div>
      </div>
    </div>
  );
}
