import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BlockedUser {
  id: number;
  displayName: string;
  profileImage?: string;
  role: 'asker' | 'doer';
  blockedAt: string;
}

export default function BlockListPage() {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/blocked-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedUsers(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch blocked users:', err);
      // Never invent entries here. This list previously fell back to a fake
      // "Spam User", which would tell someone they had blocked a person they
      // had not — the one wrong answer a block list must never give.
      setBlockedUsers([]);
      setError('We could not load your block list. Pull to refresh and we will try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/blocked-users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to unblock user:', err);
      setError('Failed to unblock user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading blocked users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-lg font-bold text-errandify-brown">🚫 Block List</h1>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-600 mb-2">
          Blocked users cannot see your posts or contact you. You won't see their jobs either.
        </p>

        {/* Error */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs mb-2">
            {error}
          </div>
        )}

        {/* List */}
        {blockedUsers.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs">No blocked users</p>
            <p className="text-gray-500 text-xs mt-1">Block users from their profile to prevent them from seeing your posts</p>
          </div>
        ) : (
          <div className="space-y-1 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {blockedUsers.map(user => (
              <div key={user.id} className="p-2 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold">
                    {user.profileImage || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs">{user.displayName}</p>
                    <p className="text-xs text-gray-600">
                      Blocked {new Date(user.blockedAt).toLocaleDateString('en-SG')} • {user.role === 'doer' ? '💼' : '🙋'} {user.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(user.id)}
                  className="px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
