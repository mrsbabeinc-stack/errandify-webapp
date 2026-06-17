import { useNavigate } from 'react-router-dom';

export default function TrustedUsersPage() {
  const navigate = useNavigate();
  const trustedUsers = [
    { id: 1, name: 'Sarah Tan', avatar: '👩', status: 'Trusted' },
    { id: 2, name: 'John Lee', avatar: '👨', status: 'Trusted' },
    { id: 3, name: 'Amy Wong', avatar: '👩', status: 'Trusted' },
    { id: 4, name: 'David Chen', avatar: '👨', status: 'Trusted' },
    { id: 5, name: 'Lisa Park', avatar: '👩', status: 'Trusted' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-2 text-lg text-gray-600 font-bold self-start">‹ Back</button>
        <h1 className="text-xl font-bold text-errandify-brown mb-3">Trusted Users</h1>

        <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col overflow-hidden">
          {trustedUsers.length > 0 ? (
            <div className="space-y-2 p-3 overflow-y-auto">
              {trustedUsers.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded p-3 flex items-center justify-between border border-gray-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{user.avatar}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-green-600">✓ {user.status}</p>
                    </div>
                  </div>
                  <button className="text-red-600 text-xs font-bold whitespace-nowrap ml-2">Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 text-sm">No trusted users yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
