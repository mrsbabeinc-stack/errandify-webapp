import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PendingConfirmation {
  id: number;
  errandId: string;
  title: string;
  description: string;
  staffName: string;
  budget: number;
  location: string;
  status: 'acknowledged';
  acknowledgedAt: string;
  hoursRemaining: number;
}

const ManagerConfirmationQueue: React.FC = () => {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPendingConfirmations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch errands with acknowledged status (waiting for manager confirmation)
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?myOnly=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const confirmations = response.data.data
          .filter((e: any) => e.status === 'acknowledged')
          .map((e: any) => {
            const acknowledgedTime = new Date(e.updatedAt);
            const now = new Date();
            const hoursRemaining = Math.max(0, 24 - ((now.getTime() - acknowledgedTime.getTime()) / (1000 * 60 * 60)));

            return {
              id: e.id,
              errandId: e.errandId || e.formatted_id,
              title: e.title,
              description: e.description,
              staffName: e.doerName || 'Unknown',
              budget: e.budget,
              location: e.location,
              status: 'acknowledged',
              acknowledgedAt: e.updatedAt,
              hoursRemaining,
            };
          });

        setPendingConfirmations(confirmations);
      } catch (err) {
        console.error('Failed to fetch pending confirmations:', err);
        setError('Failed to load pending confirmations');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingConfirmations();
  }, []);

  const handleConfirmStart = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/confirm-start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Confirmed! Staff can now start the errand.');
      setPendingConfirmations(pendingConfirmations.filter(c => c.id !== errandId));
    } catch (err) {
      console.error('Failed to confirm start:', err);
      alert('Failed to confirm. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading confirmation queue...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📋 Staff Acknowledgments Pending</h2>
        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {pendingConfirmations.length} Awaiting Confirmation
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {pendingConfirmations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No pending staff acknowledgments - all confirmed!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingConfirmations.map(confirmation => (
            <div
              key={confirmation.id}
              className="bg-white border-2 border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-errandify-brown">{confirmation.title}</h3>
                  <p className="text-sm text-gray-600">{confirmation.errandId}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    confirmation.hoursRemaining > 12
                      ? 'bg-yellow-100 text-yellow-800'
                      : confirmation.hoursRemaining > 0
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {confirmation.hoursRemaining > 0
                    ? `⏰ ${Math.ceil(confirmation.hoursRemaining)}h remaining`
                    : '⚠️ Overdue'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Staff Member</p>
                  <p className="font-semibold">{confirmation.staffName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Budget</p>
                  <p className="font-semibold">SGD ${confirmation.budget}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Location</p>
                  <p className="font-semibold">{confirmation.location}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{confirmation.description}</p>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> {confirmation.staffName} has acknowledged receipt of this errand.
                  You have 24 hours to confirm they can proceed. If you don't confirm by then, they'll need to reschedule.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmStart(confirmation.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-colors"
                >
                  ✅ Confirm & Allow Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerConfirmationQueue;
