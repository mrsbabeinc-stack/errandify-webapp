import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BlockListPage() {
  const navigate = useNavigate();
  const [blockedUsers] = useState([
    { id: 1, name: 'Unknown User', avatar: '🚫', blockedDate: '2026-06-10' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Block List</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        {blockedUsers.length > 0 ? (
          <div className="space-y-3">
            {blockedUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{user.avatar}</span>
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">Blocked on {user.blockedDate}</p>
                  </div>
                </div>
                <button className="text-blue-600 text-sm font-bold">Unblock</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No blocked users</p>
          </div>
        )}
      </div>
    </div>
  );
}
