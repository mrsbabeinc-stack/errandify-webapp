import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TrustedUser {
  id: number;
  displayName: string;
  profileImage?: string;
  rating: number;
  role: 'asker' | 'doer';
  addedAt: string;
}

export default function TrustedUsersPage() {
  const navigate = useNavigate();
  const [trustedUsers, setTrustedUsers] = useState<TrustedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrustedUsers();
  }, []);

  const fetchTrustedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/trusted-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrustedUsers(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch trusted users:', err);
      // Show the failure. This list previously fell back to two invented
      // people, which read as a real trusted list the user never built.
      setTrustedUsers([]);
      setError('We could not load your trusted neighbours. Pull to refresh and we will try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrusted = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/trusted-users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrustedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to remove trusted user:', err);
      setError('Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading trusted users...</p>
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
          <h1 className="text-lg font-bold text-errandify-brown">❤️ Trusted Users</h1>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-600 mb-2">
          Mark users as trusted to prioritize them in your recommendations and job matching.
        </p>

        {/* Error */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs mb-2">
            {error}
          </div>
        )}

        {/* List */}
        {trustedUsers.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs">No trusted users yet</p>
            <p className="text-gray-500 text-xs mt-1">Mark users as trusted from their profile</p>
          </div>
        ) : (
          <div className="space-y-1 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {trustedUsers.map(user => (
              <div key={user.id} className="p-2 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold">
                    {user.profileImage || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs">{user.displayName}</p>
                    <p className="text-xs text-gray-600">
                      ⭐ {user.rating} • {user.role === 'doer' ? '💼' : '🙋'} {user.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveTrusted(user.id)}
                  className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
