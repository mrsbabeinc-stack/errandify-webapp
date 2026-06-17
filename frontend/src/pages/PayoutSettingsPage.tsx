import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  const [bankInfo, setBankInfo] = useState({
    bankName: 'DBS Bank',
    accountNumber: '****1234',
    accountHolder: 'John Doe',
  });
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown">Payout Settings</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 text-2xl">‹</button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold text-errandify-brown mb-4">Bank Account</h2>
          
          <div>
            <label className="text-sm text-gray-600">Bank Name</label>
            <p className="text-gray-900 font-medium">{bankInfo.bankName}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600">Account Holder</label>
            <p className="text-gray-900 font-medium">{bankInfo.accountHolder}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600">Account Number</label>
            <p className="text-gray-900 font-medium">{bankInfo.accountNumber}</p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold mt-4"
          >
            {isEditing ? 'Done' : 'Change Bank Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
