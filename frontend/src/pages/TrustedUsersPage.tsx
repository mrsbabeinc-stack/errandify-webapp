import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrustedUsersPage() {
  const navigate = useNavigate();
  const [trustedUsers] = useState([
    { id: 1, name: 'Sarah Tan', avatar: '👩', status: 'Trusted' },
    { id: 2, name: 'John Lee', avatar: '👨', status: 'Trusted' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Trusted Users</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        {trustedUsers.length > 0 ? (
          <div className="space-y-3">
            {trustedUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{user.avatar}</span>
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-sm text-green-600">✓ {user.status}</p>
                  </div>
                </div>
                <button className="text-red-600 text-sm font-bold">Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No trusted users yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
