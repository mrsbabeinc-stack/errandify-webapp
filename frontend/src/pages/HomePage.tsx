interface HomePageProps {
  userRole: 'asker' | 'doer';
}

export default function HomePage({ userRole }: HomePageProps) {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-errandify-brown mb-4">
        {userRole === 'asker' ? 'Need Help?' : 'Find Tasks'}
      </h1>
      <p className="text-gray-600 mb-6">
        {userRole === 'asker'
          ? 'Post an errand and let our community help you.'
          : 'Browse available errands and start earning.'}
      </p>

      {/* TODO: Add dashboard content based on role */}
      <div className="grid gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500">Dashboard coming soon...</p>
        </div>
      </div>
    </div>
  );
}
