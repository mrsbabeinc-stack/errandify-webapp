interface ProfilePageProps {
  userRole: 'asker' | 'doer';
}

export default function ProfilePage({ userRole }: ProfilePageProps) {
  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-errandify-brown mb-2">Profile</h1>
      <p className="text-xs text-gray-600 mb-4">
        {userRole === 'asker' ? 'Your profile and history' : 'Your profile and ratings'}
      </p>

      {/* TODO: Implement user profile with ratings and history */}
      <div className="grid gap-2">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-sm text-gray-500">Profile details coming soon...</p>
        </div>
      </div>
    </div>
  );
}
