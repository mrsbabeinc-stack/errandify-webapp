import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+65 8123 4567',
    address: '123 Main St, Singapore 123456',
    bio: 'Friendly and reliable helper',
    avatar: '👤',
  });

  const handleSave = () => {
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">My Profile</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-6xl">{profile.avatar}</div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="text-2xl font-bold text-errandify-brown w-full border-b-2 border-errandify-orange"
                />
              ) : (
                <h2 className="text-2xl font-bold text-errandify-brown">{profile.name}</h2>
              )}
              <p className="text-gray-600">✅ Verified User</p>
              <p className="text-sm text-gray-500">Member since Jan 2026</p>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-200 mb-6">
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

          {/* Personal Information */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">{profile.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              ) : (
                <p className="text-gray-900">{profile.address}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600">Bio</label>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-errandify-orange text-white py-2 rounded-lg font-bold"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
