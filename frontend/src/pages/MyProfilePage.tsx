import { useNavigate } from 'react-router-dom';

export default function MyProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-lg text-gray-600 font-bold"
        >
          ‹ Back
        </button>

        <h1 className="text-3xl font-bold text-errandify-brown mb-6">My Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl">👤</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">John Doe</h2>
              <p className="text-gray-600">✅ Verified User</p>
              <p className="text-sm text-gray-500">Member since Jan 2026</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">24</p>
              <p className="text-xs text-gray-600">Errands Posted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">18</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">4.9</p>
              <p className="text-xs text-gray-600">Rating</p>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 font-bold">Email</label>
              <p className="text-gray-900">john@example.com</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-bold">Phone</label>
              <p className="text-gray-900">+65 8123 4567</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-bold">Address</label>
              <p className="text-gray-900">123 Main St, Singapore 123456</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-bold">Bio</label>
              <p className="text-gray-900">Friendly and reliable helper</p>
            </div>
          </div>

          {/* Edit Button */}
          <button className="w-full mt-6 bg-errandify-orange text-white py-2 rounded-lg font-bold">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
