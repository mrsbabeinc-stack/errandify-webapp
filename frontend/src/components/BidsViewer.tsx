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
  const [rejectingBidId, setRejectingBidId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('accepted_another');
  const [rejectCustomReason, setRejectCustomReason] = useState('');

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

      const stripeIntent = response.data.data.stripeIntent;
      console.log('Stripe intent created:', stripeIntent);

      // In dummy mode, auto-confirm payment
      if (stripeIntent) {
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/confirm`,
          { intentId: stripeIntent.id },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        alert('✓ Bid accepted! Payment confirmed and amount held in escrow.');
      }

      onBidAccepted();
      fetchBids();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept bid');
    }
  };

  const handleRejectBid = async (bidId: number) => {
    setRejectingBidId(bidId);
    setRejectReason('accepted_another');
    setRejectCustomReason('');
  };

  const confirmRejectBid = async () => {
    if (!rejectingBidId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${rejectingBidId}/reject`,
        {
          reason: rejectReason,
          custom_reason: rejectCustomReason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRejectingBidId(null);
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

      {rejectingBidId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-errandify-brown mb-4">Reject Bid</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tell the doer why you're rejecting their bid. This helps them improve future bids.
            </p>

            <div className="space-y-3 mb-4">
              {[
                { value: 'accepted_another', label: '✓ Accepted another bid' },
                { value: 'budget_changed', label: '💰 Budget changed' },
                { value: 'skill_mismatch', label: '🎯 Need different skills' },
                { value: 'price_too_high', label: '💸 Price too high' },
                { value: 'other', label: '📝 Other reason' },
              ].map((option) => (
                <label key={option.value} className="flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    checked={rejectReason === option.value}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>

            {rejectReason === 'other' && (
              <textarea
                value={rejectCustomReason}
                onChange={(e) => setRejectCustomReason(e.target.value)}
                placeholder="Please explain..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange mb-4"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setRejectingBidId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectBid}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
              >
                Reject & Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
