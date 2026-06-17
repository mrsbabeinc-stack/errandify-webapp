import { useNavigate } from 'react-router-dom';

export default function TrustedUsersPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Trusted Users</h1>
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">No trusted users yet</div>
      </div>
    </div>
  );
}
