import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import WarmMessage from './WarmMessage';

interface Bid {
  id: number;
  taskId: number;
  doerId: number;
  doerName: string;
  doerAlias?: string;
  doerAvatar?: string;
  amount: number;
  note?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  doerRating?: number;
  doerReviewCount?: number;
  confidenceScore?: number;
  offerId?: string;
}

interface DoerConfidence {
  total_jobs: number;
  success_rate: number;
  avg_rating: number;
  review_count: number;
  acceptance_rate: number;
  days_since_last_job?: number;
  confidence_score: number;
}

interface BidsViewerProps {
  taskId: number;
  taskBudget: number;
  onBidAccepted: () => void;
}

const BidsViewerComponent = forwardRef<{ refreshBids: () => Promise<void> }, BidsViewerProps>(
  ({ taskId, taskBudget, onBidAccepted }, ref) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectingBidId, setRejectingBidId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('accepted_another');
  const [rejectCustomReason, setRejectCustomReason] = useState('');
  const [doerConfidence, setDoerConfidence] = useState<Record<number, DoerConfidence>>({});
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'confidence' | 'newest'>('newest');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Expose refreshBids function to parent component
  useImperativeHandle(ref, () => ({
    refreshBids: fetchBids,
  }));

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
      let bidsData = response.data.data;
      console.log('[BidsViewer] Fetched offers:', bidsData);
      if (bidsData.length > 0) {
        console.log('[BidsViewer] First offer structure:', JSON.stringify(bidsData[0], null, 2));
        // Fix field name casing if needed
        bidsData = bidsData.map(bid => ({
          ...bid,
          doerId: bid.doerId || bid.doerid,
          doerName: bid.doerName || bid.doername,
          doerAlias: bid.doerAlias || bid.doeralias,
          doerAvatar: bid.doerAvatar || bid.doeravatar,
          offerId: bid.offerId || bid.offerid,
          createdAt: bid.createdAt || bid.createdat,
          taskId: bid.taskId || bid.taskid,
        }));
      }
      setBids(bidsData);
      setError('');

      // Fetch favorites list
      try {
        const favResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/favorites`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFavorites(new Set(favResponse.data.data || []));
      } catch (e) {
        console.warn('Failed to fetch favorites:', e);
      }

      // Fetch confidence scores for each doer
      for (const bid of bidsData) {
        try {
          const confidenceRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/user/${bid.doerId}/confidence`
          );
          setDoerConfidence((prev) => ({
            ...prev,
            [bid.doerId]: confidenceRes.data.data,
          }));
        } catch (e) {
          console.error('Failed to fetch confidence for doer:', bid.doerId);
        }
      }
    } catch (err: any) {
      if (err.response?.status !== 403) {
        setError(err.response?.data?.error || 'Failed to load offers');
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
      const paymentSetupError = response.data.data.paymentSetupError;

      // Only claim the money is secured if a real payment intent came back.
      // This used to auto-confirm a fabricated 'succeeded' intent and tell the
      // asker "Payment is held safely" when nothing had been charged.
      if (paymentSetupError) {
        setSuccessMessage(
          "Your offer is confirmed. We're still setting up the payment — we'll be in touch shortly."
        );
        setShowSuccessMessage(true);
      } else if (stripeIntent) {
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/confirm`,
          { intentId: stripeIntent.id },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setSuccessMessage('Your offer is confirmed. Payment is held safely.');
        setShowSuccessMessage(true);
      }

      onBidAccepted();
      fetchBids();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept offer');
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
      setError(err.response?.data?.error || 'Failed to reject offer');
    }
  };

  const handleToggleFavorite = async (doerId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (favorites.has(doerId)) {
        // Remove from favorites
        await axios.delete(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/favorites/${doerId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(doerId);
          return next;
        });
      } else {
        // Add to favorites
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/favorites/${doerId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFavorites(prev => new Set(prev).add(doerId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-3 border border-orange-100 shadow-sm">
        <p className="text-gray-600 text-xs">Loading offers...</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bg-white rounded-xl p-3 border border-orange-100 shadow-sm">
        <p className="text-gray-600 text-sm">No offers yet. Doers will see your errand and offer soon!</p>
      </div>
    );
  }

  const acceptedBid = bids.find(b => b.status === 'accepted');
  let pendingBids = bids.filter(b => b.status === 'pending');

  // Filter by rating
  pendingBids = pendingBids.filter(bid => {
    const confidence = doerConfidence[bid.doerId];
    if (!confidence) return true;
    return confidence.avg_rating >= filterMinRating;
  });

  // Sort bids - favorites first, then by selected criterion
  pendingBids = [...pendingBids].sort((a, b) => {
    // Always prioritize favorites first
    const aIsFav = favorites.has(a.doerId);
    const bIsFav = favorites.has(b.doerId);
    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;

    // Then sort by selected criterion
    switch (sortBy) {
      case 'price':
        return a.amount - b.amount;
      case 'rating':
        const ratingA = doerConfidence[a.doerId]?.avg_rating || 0;
        const ratingB = doerConfidence[b.doerId]?.avg_rating || 0;
        return ratingB - ratingA;
      case 'confidence':
        const scoreA = doerConfidence[a.doerId]?.confidence_score || 0;
        const scoreB = doerConfidence[b.doerId]?.confidence_score || 0;
        return scoreB - scoreA;
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="space-y-4">
      <WarmMessage
        isOpen={!!error}
        type="error"
        title="Could not load offers"
        message={error}
        onClose={() => setError('')}
        buttonLabel="Try again"
      />

      {acceptedBid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-900 mb-2">✓ Offer Confirmed</p>
          <p className="text-sm text-green-800">
            {acceptedBid.doerAlias || acceptedBid.doerName} has been chosen for ${acceptedBid.amount}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-errandify-brown">
            {acceptedBid ? 'Other Offers' : `Offers (${pendingBids.length})`}
          </h3>
        </div>

        {/* Sort & Filter Controls */}
        {pendingBids.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {['newest', 'price', 'rating', 'confidence'].map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option as any)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    sortBy === option
                      ? 'bg-errandify-orange text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-errandify-orange'
                  }`}
                >
                  {option === 'newest' && '🕐 Newest'}
                  {option === 'price' && '💰 Price'}
                  {option === 'rating' && '⭐ Rating'}
                  {option === 'confidence' && '💪 Confidence'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs font-semibold text-gray-700">Min Rating:</label>
              <select
                value={filterMinRating}
                onChange={(e) => setFilterMinRating(parseFloat(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="0">All</option>
                <option value="3">3.0+</option>
                <option value="4">4.0+</option>
                <option value="4.5">4.5+</option>
                <option value="5">5.0</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {pendingBids.map(bid => (
            <div key={bid.id} className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
              {/* Header: Profile Photo, Name, OFFERID, Price, Favorite */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {bid.doerAvatar && (
                    <img
                      src={bid.doerAvatar}
                      alt={bid.doerName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    {/* Doer Alias (or Name) + OFFERID Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{bid.doerAlias || bid.doerName}</p>
                      {bid.offerId && (
                        <span className="text-xs text-white bg-errandify-orange rounded px-2 py-0.5 font-semibold">
                          {bid.offerId}
                        </span>
                      )}
                    </div>

                    {/* Rating + Review Count */}
                    <div className="flex items-center gap-2 text-xs mb-1">
                      {doerConfidence[bid.doerId]?.avg_rating ? (
                        <span className="text-yellow-600 font-semibold">
                          ⭐ {doerConfidence[bid.doerId].avg_rating.toFixed(1)} ({doerConfidence[bid.doerId].review_count} review{doerConfidence[bid.doerId].review_count !== 1 ? 's' : ''})
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">No reviews yet</span>
                      )}
                    </div>

                    {/* Offer Date/Time */}
                    {bid.createdAt && (
                      <span className="text-gray-500 text-xs">
                        {new Date(bid.createdAt).toLocaleDateString()} {new Date(bid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price + Favorite */}
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-errandify-orange text-lg">${bid.amount}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(bid.doerId);
                    }}
                    className="text-xl hover:scale-110 transition-transform"
                    title={favorites.has(bid.doerId) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.has(bid.doerId) ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>

              {bid.note && (
                <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-xs font-semibold text-blue-900 mb-1">💬 Why I'm a good fit:</p>
                  <p className="text-sm text-gray-700">{bid.note}</p>
                </div>
              )}

              {/* Confidence Signals */}
              {doerConfidence[bid.doerId] && (
                <div className="mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Jobs: {doerConfidence[bid.doerId].total_jobs}</p>
                      <p className="text-gray-600">Success: {doerConfidence[bid.doerId].success_rate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rating: ⭐ {doerConfidence[bid.doerId].avg_rating}</p>
                      <p className="text-gray-600">Reviews: {doerConfidence[bid.doerId].review_count}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-700">
                      Confidence: {doerConfidence[bid.doerId].confidence_score}%
                    </div>
                    <div className="w-12 h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${doerConfidence[bid.doerId].confidence_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {taskBudget && parseFloat(bid.amount as any) > parseFloat(taskBudget as any) && (
                <p className="text-xs text-orange-600 mb-2 bg-orange-50 p-2 rounded">
                  💡 This offer (${bid.amount}) exceeds your budget of ${taskBudget}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptBid(bid.id)}
                  className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded font-semibold text-sm hover:bg-opacity-90"
                >
                  Confirm Offer
                </button>
                <button
                  onClick={() => handleRejectBid(bid.id)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded font-semibold text-sm hover:bg-gray-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rejectingBidId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-errandify-brown mb-4">Decline Offer</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tell the doer why you're declining their offer. This helps them improve future offers.
            </p>

            <div className="space-y-3 mb-4">
              {[
                { value: 'accepted_another', label: '✓ Accepted another offer' },
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
                Decline & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      <WarmMessage
        isOpen={showSuccessMessage}
        type="success"
        message={successMessage}
        onClose={() => setShowSuccessMessage(false)}
        buttonLabel="Great!"
      />
    </div>
  );
  },
);

BidsViewerComponent.displayName = 'BidsViewer';
export default BidsViewerComponent;
