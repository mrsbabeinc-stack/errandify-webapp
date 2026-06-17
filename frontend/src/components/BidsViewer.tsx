import { useEffect, useState } from 'react';
import axios from 'axios';

interface Bid {
  id: number;
  taskId: number;
  doerId: number;
  doerName: string;
  doerAvatar?: string;
  amount: number;
  note?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface BidsViewerProps {
  taskId: number;
  taskBudget: number;
  onBidAccepted: () => void;
}

export default function BidsViewer({ taskId, taskBudget, onBidAccepted }: BidsViewerProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [taskId]);

  const fetchBids = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/task/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBids(response.data.data);
      setError('');
    } catch (err: any) {
      if (err.response?.status !== 403) {
        setError(err.response?.data?.error || 'Failed to load bids');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${bidId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Open payment modal or redirect to payment
      console.log('Stripe intent:', response.data.data.stripeIntent);
      onBidAccepted();
      fetchBids();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept bid');
    }
  };

  const handleRejectBid = async (bidId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${bidId}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchBids();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject bid');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600 text-sm">Loading bids...</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600 text-sm">No bids yet. Doers will see your errand and bid soon!</p>
      </div>
    );
  }

  const acceptedBid = bids.find(b => b.status === 'accepted');
  const pendingBids = bids.filter(b => b.status === 'pending');

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {acceptedBid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-900 mb-2">✓ Bid Accepted</p>
          <p className="text-sm text-green-800">
            {acceptedBid.doerName} has been chosen for ${acceptedBid.amount}
          </p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-errandify-brown mb-3">
          {acceptedBid ? 'Other Bids' : `Bids (${pendingBids.length})`}
        </h3>
        <div className="space-y-3">
          {pendingBids.map(bid => (
            <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {bid.doerAvatar && (
                    <img
                      src={bid.doerAvatar}
                      alt={bid.doerName}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{bid.doerName}</p>
                    <p className="text-xs text-gray-500">
                      Bid placed {new Date(bid.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-errandify-orange text-lg">${bid.amount}</p>
              </div>

              {bid.note && (
                <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                  {bid.note}
                </p>
              )}

              {taskBudget && bid.amount > taskBudget && (
                <p className="text-xs text-orange-600 mb-2">⚠️ Bid exceeds budget</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptBid(bid.id)}
                  className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded font-semibold text-sm hover:bg-opacity-90"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectBid(bid.id)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded font-semibold text-sm hover:bg-gray-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
