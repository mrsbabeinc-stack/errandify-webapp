import { useNavigate } from 'react-router-dom';

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-6">Payout Settings</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Bank Name</p>
            <p className="font-bold text-gray-900">DBS Bank</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Account Holder</p>
            <p className="font-bold text-gray-900">John Doe</p>
          </div>
          <button className="w-full mt-6 bg-errandify-orange text-white py-2 rounded-lg font-bold">Change Bank Account</button>
        </div>
      </div>
    </div>
  );
}
