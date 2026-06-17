import { useNavigate } from 'react-router-dom';

export default function BlockListPage() {
  const navigate = useNavigate();
  const blockedUsers = [
    { id: 1, name: 'Unknown User 1', avatar: '🚫', blockedDate: '2026-06-10' },
    { id: 2, name: 'Spam Account', avatar: '🚫', blockedDate: '2026-06-08' },
    { id: 3, name: 'Rude User', avatar: '🚫', blockedDate: '2026-06-05' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-2 text-lg text-gray-600 font-bold self-start">‹ Back</button>
        <h1 className="text-xl font-bold text-errandify-brown mb-3">Block List</h1>

        <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col overflow-hidden">
          {blockedUsers.length > 0 ? (
            <div className="space-y-2 p-3 overflow-y-auto">
              {blockedUsers.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded p-3 flex items-center justify-between border border-gray-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{user.avatar}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">Blocked on {user.blockedDate}</p>
                    </div>
                  </div>
                  <button className="text-blue-600 text-xs font-bold whitespace-nowrap ml-2">Unblock</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 text-sm">No blocked users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
