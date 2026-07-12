import { useNavigate } from 'react-router-dom';

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-xl font-bold text-errandify-brown">💳 Bank Account</h1>
          <div className="w-6" />
        </div>

        {/* Bank Account Details Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-3">
          <h2 className="text-sm font-bold text-errandify-brown mb-3">Current Bank Account</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-600 font-semibold">Bank Name</span>
              <span className="text-sm font-bold text-gray-900">STRIPE TEST BANK</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-600 font-semibold">Account Holder</span>
              <span className="text-sm font-bold text-gray-900">John Lee</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-600 font-semibold">Account Number</span>
              <span className="text-sm font-bold text-gray-900">•••• •••• •••• 3456</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 font-semibold">Status</span>
              <span className="text-sm font-bold text-green-600">✓ Approved</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <button className="w-full bg-errandify-orange text-white py-2.5 rounded-lg font-bold text-sm hover:bg-orange-600 transition mb-2">
          ✏️ Edit Bank Account
        </button>

        <button className="w-full border-2 border-errandify-orange text-errandify-orange py-2.5 rounded-lg font-bold text-sm hover:bg-orange-50 transition">
          ➕ Add Another Account
        </button>

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-blue-900 font-semibold mb-1">ℹ️ Important</p>
          <p className="text-xs text-blue-800">Bank account changes take effect within 24 hours. Earnings in transit will be sent to the previously added account.</p>
        </div>
      </div>
    </div>
  );
}
