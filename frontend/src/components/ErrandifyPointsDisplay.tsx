import { useEffect, useState } from 'react';
import axios from 'axios';

interface GamificationData {
  totalEp: number;
  currentMonthEp: number;
  tier: string;
  loginStreak: number;
  nextTierEp: number;
  nextTier: string;
}

export default function ErrandifyPointsDisplay() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamification();
  }, []);

  const fetchGamification = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch gamification:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!data) return null;

  const tierEmojis = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '👑',
  };

  const tierEmoji = tierEmojis[data.tier as keyof typeof tierEmojis] || '🌟';
  const tierColor = {
    bronze: 'from-amber-600 to-amber-700',
    silver: 'from-gray-400 to-gray-500',
    gold: 'from-yellow-400 to-yellow-500',
    platinum: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-2 border-errandify-orange">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-errandify-brown">Errandify Points</h3>
        <span className="text-2xl">{tierEmoji}</span>
      </div>

      {/* Total EP */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-gray-600">Total EP</span>
          <span className="text-2xl font-bold text-errandify-orange">{data.totalEp}</span>
        </div>
        <div className="text-xs text-gray-500">This month: {data.currentMonthEp} EP</div>
      </div>

      {/* Tier Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-errandify-brown capitalize">
            {data.tier}
          </span>
          <span className="text-xs text-gray-600">
            {data.nextTierEp} EP to {data.nextTier}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-gradient-to-r ${tierColor[data.tier as keyof typeof tierColor]} h-2 rounded-full transition-all`}
            style={{
              width: `${Math.min(
                ((data.nextTierEp === 0 ? 100 : 100 - (data.nextTierEp / data.totalEp) * 100) || 0),
                100
              )}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Streak */}
      {data.loginStreak > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">🔥</span>
          <span className="text-xs text-errandify-brown font-semibold">
            {data.loginStreak}-day streak
          </span>
        </div>
      )}
    </div>
  );
}
