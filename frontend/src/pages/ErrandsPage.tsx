interface ErrandsPageProps {
  userRole: 'asker' | 'doer';
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-errandify-brown mb-2">Errands</h1>
      <p className="text-xs text-gray-600 mb-4">
        {userRole === 'asker' ? 'Your posted errands' : 'Available errands'}
      </p>

      {/* TODO: Implement errand listing and management */}
      <div className="grid gap-2">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-sm text-gray-500">Errand listing coming soon...</p>
        </div>
      </div>
    </div>
  );
}
