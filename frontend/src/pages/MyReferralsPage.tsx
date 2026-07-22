import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ReferralStats {
  myCode: string;
  myLink: string;
  referredByCode?: string;
  referredByName?: string;
  referredByDate?: string;
  totalReferred: number;
  totalEarned: number;
  referralsList: ReferralUser[];
}

interface ReferralUser {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive';
  jobsCompleted: number;
  earnedFromThem: number;
  referralStatus: 'pending' | 'activated' | 'loyal';
  firstJobDate?: string;
  loyaltyDate?: string;
  earningsBreakdown: {
    joinBonus: number;
    firstJobBonus: number;
    loyaltyBonus: number;
  };
}

export default function MyReferralsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/referrals/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
      // Mock data for demo
      setStats({
        myCode: 'CELESTIA123',
        myLink: 'https://errandify.ai/join?ref=CELESTIA123',
        referredByName: 'Yvonne Lim',
        referredByDate: '2025-12-01',
        totalReferred: 8,
        totalEarned: 400,
        referralsList: [
          {
            id: '1',
            name: 'Ahmad Hassan',
            email: 'ahmad@example.com',
            joinDate: '2026-01-15',
            status: 'active',
            jobsCompleted: 15,
            earnedFromThem: 300,
            referralStatus: 'loyal',
            firstJobDate: '2026-01-20',
            loyaltyDate: '2026-03-10',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 150, loyaltyBonus: 100 },
          },
          {
            id: '2',
            name: 'Priya Sharma',
            email: 'priya@example.com',
            joinDate: '2026-02-10',
            status: 'active',
            jobsCompleted: 3,
            earnedFromThem: 200,
            referralStatus: 'activated',
            firstJobDate: '2026-02-15',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 150, loyaltyBonus: 0 },
          },
          {
            id: '3',
            name: 'James Chen',
            email: 'james@example.com',
            joinDate: '2026-03-05',
            status: 'active',
            jobsCompleted: 7,
            earnedFromThem: 200,
            referralStatus: 'activated',
            firstJobDate: '2026-03-12',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 150, loyaltyBonus: 0 },
          },
          {
            id: '4',
            name: 'Maria Santos',
            email: 'maria@example.com',
            joinDate: '2026-03-20',
            status: 'inactive',
            jobsCompleted: 0,
            earnedFromThem: 50,
            referralStatus: 'pending',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 0, loyaltyBonus: 0 },
          },
          {
            id: '5',
            name: 'David Kim',
            email: 'david@example.com',
            joinDate: '2026-04-01',
            status: 'active',
            jobsCompleted: 12,
            earnedFromThem: 300,
            referralStatus: 'loyal',
            firstJobDate: '2026-04-08',
            loyaltyDate: '2026-05-15',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 150, loyaltyBonus: 100 },
          },
          {
            id: '6',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            joinDate: '2026-04-15',
            status: 'active',
            jobsCompleted: 2,
            earnedFromThem: 50,
            referralStatus: 'pending',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 0, loyaltyBonus: 0 },
          },
          {
            id: '7',
            name: 'Wei Liu',
            email: 'wei@example.com',
            joinDate: '2026-05-01',
            status: 'active',
            jobsCompleted: 6,
            earnedFromThem: 200,
            referralStatus: 'activated',
            firstJobDate: '2026-05-08',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 150, loyaltyBonus: 0 },
          },
          {
            id: '8',
            name: 'Sophia Petrov',
            email: 'sophia@example.com',
            joinDate: '2026-05-20',
            status: 'active',
            jobsCompleted: 0,
            earnedFromThem: 50,
            referralStatus: 'pending',
            earningsBreakdown: { joinBonus: 50, firstJobBonus: 0, loyaltyBonus: 0 },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading referral data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
            ‹ Back to Home
          </button>
          <p className="text-gray-600">Unable to load referral data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🎁 My Referrals</h1>
          <p className="text-gray-600">Track who you referred and earn from their activity</p>
        </div>

        {/* Who Referred You */}
        {stats.referredByName && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-errandify-brown mb-4">👥 Who Referred You</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-errandify-orange rounded-full flex items-center justify-center text-white font-bold">
                {stats.referredByName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{stats.referredByName}</p>
                <p className="text-sm text-gray-600">Referred you on {new Date(stats.referredByDate!).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-1">Total Referred</p>
            <p className="text-3xl font-bold text-errandify-orange">{stats.totalReferred}</p>
            <p className="text-xs text-gray-500 mt-2">people you've referred</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-1">Points Earned</p>
            <p className="text-3xl font-bold text-errandify-brown">{stats.totalEarned}</p>
            <p className="text-xs text-gray-500 mt-2">from referrals</p>
          </div>
        </div>

        {/* Your Referral Code */}
        <div className="bg-errandify-orange text-white rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-3">📤 Your Referral Code</h3>
          <div className="bg-white/20 rounded-lg p-3 font-mono text-center mb-2">
            <p className="text-sm">{stats.myCode}</p>
          </div>
          <p className="text-sm opacity-90">Share this code with friends to earn points</p>
        </div>

        {/* Referrals List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-errandify-brown mb-4">👫 People You Referred ({stats.referralsList.length})</h2>

          {stats.referralsList.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No referrals yet. Share your code to get started!</p>
          ) : (
            <div className="space-y-3">
              {stats.referralsList.map((referral) => {
                const statusIcon =
                  referral.referralStatus === 'loyal' ? '⭐' :
                  referral.referralStatus === 'activated' ? '🌟' :
                  '⏳';
                const statusLabel =
                  referral.referralStatus === 'loyal' ? 'LOYALTY' :
                  referral.referralStatus === 'activated' ? 'ACTIVATED' :
                  'PENDING';

                return (
                  <div key={referral.id} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                    {/* Header with status */}
                    <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2">
                      <span className="text-lg">{statusIcon}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        referral.referralStatus === 'loyal' ? 'bg-yellow-100 text-yellow-700' :
                        referral.referralStatus === 'activated' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Main content */}
                    <div className="p-3 flex items-start gap-3">
                      <div className="w-10 h-10 bg-errandify-orange rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {referral.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{referral.name}</p>
                        <p className="text-xs text-gray-500 mb-2">
                          Joined {new Date(referral.joinDate).toLocaleDateString()} • {referral.jobsCompleted} jobs
                        </p>

                        {/* Earnings breakdown */}
                        <div className="space-y-1 text-xs">
                          {referral.earningsBreakdown.joinBonus > 0 && (
                            <p className="text-gray-600">✓ Friend joined: <span className="font-semibold text-gray-800">+{referral.earningsBreakdown.joinBonus} EP</span></p>
                          )}
                          {referral.earningsBreakdown.firstJobBonus > 0 && (
                            <p className="text-gray-600">✓ First job completed: <span className="font-semibold text-gray-800">+{referral.earningsBreakdown.firstJobBonus} EP</span></p>
                          )}
                          {referral.earningsBreakdown.loyaltyBonus > 0 && (
                            <p className="text-gray-600">✓ Reached 10 jobs: <span className="font-semibold text-gray-800">+{referral.earningsBreakdown.loyaltyBonus} EP</span></p>
                          )}
                          {referral.referralStatus === 'pending' && referral.jobsCompleted === 0 && (
                            <p className="text-gray-500 italic">→ Will earn +150 EP when {referral.name.split(' ')[0]} completes first job</p>
                          )}
                        </div>
                      </div>

                      {/* Total earned */}
                      <div className="text-right flex-shrink-0 border-l border-gray-200 pl-3">
                        <p className="text-lg font-bold text-errandify-brown">{referral.earnedFromThem}</p>
                        <p className="text-xs text-gray-500">total EP</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How Referrals Work */}
        <div className="mt-8 bg-orange-50 rounded-lg border border-orange-200 p-6">
          <h3 className="font-bold text-errandify-brown mb-3">💡 How Referrals Work</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Share your referral code with friends</li>
            <li>• When they sign up with your code, they join your network</li>
            <li>• Earn points from their activity on the platform</li>
            <li>• Points can be redeemed for rewards or cash</li>
            <li>• No limit on how many people you can refer!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
