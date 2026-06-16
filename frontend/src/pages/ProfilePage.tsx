interface ProfilePageProps {
  userRole: 'asker' | 'doer';
}

export default function ProfilePage({ userRole }: ProfilePageProps) {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-errandify-brown mb-4">Profile</h1>
      <p className="text-gray-600 mb-6">
        {userRole === 'asker' ? 'Your profile and history' : 'Your profile and ratings'}
      </p>

      {/* TODO: Implement user profile with ratings and history */}
      <div className="grid gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500">Profile details coming soon...</p>
        </div>
      </div>
    </div>
  );
}
