import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface VillageUser {
  id: number;
  displayName: string;
  profileImage?: string;
  role: 'asker' | 'doer';
  rating: number;
  reviewCount: number;
  isTrusted: boolean;
  isBlocked: boolean;
  completedTasks: number;
}

export default function MyVillagePage() {
  const navigate = useNavigate();
  const [trustedUsers, setTrustedUsers] = useState<VillageUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<VillageUser[]>([]);
  const [activeTab, setActiveTab] = useState<'trusted' | 'blocked'>('trusted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVillageData();
  }, []);

  const fetchVillageData = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/village`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setTrustedUsers(response.data.data?.trustedUsers || []);
      setBlockedUsers(response.data.data?.blockedUsers || []);
    } catch (err: any) {
      console.error('Failed to fetch village data:', err);
      // Mock data for demo
      setTrustedUsers([
        {
          id: 1,
          displayName: 'Sarah Johnson',
          role: 'doer',
          rating: 4.8,
          reviewCount: 24,
          isTrusted: true,
          isBlocked: false,
          completedTasks: 45,
        },
        {
          id: 2,
          displayName: 'Mike Chen',
          role: 'doer',
          rating: 4.9,
          reviewCount: 31,
          isTrusted: true,
          isBlocked: false,
          completedTasks: 58,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading village...</p>
        </div>
      </div>
    );
  }

  const activeUsers = activeTab === 'trusted' ? trustedUsers : blockedUsers;

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-errandify-brown mb-6">🏘️ MyVillage</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-white rounded-lg p-1">
          <button
            onClick={() => setActiveTab('trusted')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'trusted'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            ❤️ Trusted ({trustedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'blocked'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🚫 Blocked ({blockedUsers.length})
          </button>
        </div>

        {/* User List */}
        {activeUsers.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-500">
              {activeTab === 'trusted'
                ? "No trusted users yet"
                : 'No blocked users'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{user.displayName}</h3>
                    <p className="text-sm text-gray-600">⭐ {user.rating.toFixed(1)} • {user.completedTasks} tasks</p>
                  </div>
                  <button className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">
                    {activeTab === 'trusted' ? 'Remove' : 'Unblock'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
