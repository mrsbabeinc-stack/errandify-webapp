interface ErrandsPageProps {
  userRole: 'asker' | 'doer';
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-errandify-brown mb-4">Errands</h1>
      <p className="text-gray-600 mb-6">
        {userRole === 'asker' ? 'Your posted errands' : 'Available errands'}
      </p>

      {/* TODO: Implement errand listing and management */}
      <div className="grid gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500">Errand listing coming soon...</p>
        </div>
      </div>
    </div>
  );
}
