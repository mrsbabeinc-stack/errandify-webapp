import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Bid {
  id: number;
  errand_id: number;
  doer_id: number;
  amount: number | string;
  note?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'in_progress' | 'job_completed' | 'completed' | 'rejected' | 'withdrawn';
  is_accepted?: boolean;
  created_at: string;
  offer_id?: string;
  has_rated?: boolean;
  errand?: {
    title: string;
    budget: number | string;
    category: string;
    asker_name?: string;
    asker_display_name?: string;
    formatted_id?: string;
    status?: string;
    location?: string;
    postal_code?: string;
    deadline?: string;
    description?: string;
  };
}

export default function MyBidsPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingBid, setRatingBid] = useState<Bid | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    fetchMyBids();
  }, []);

  // Check for unrated completed jobs and show rating modal
  useEffect(() => {
    if (bids.length > 0 && !showRatingModal) {
      const unratedCompleted = bids.find(b => b.status === 'completed' && !b.has_rated);
      if (unratedCompleted) {
        setRatingBid(unratedCompleted);
        setShowRatingModal(true);
      }
    }
  }, [bids]);

  const fetchMyBids = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/my-bids`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBids(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'job_completed':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'withdrawn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ Pending Review',
      accepted: '✅ Accepted - Confirm',
      confirmed: '🟢 Confirmed - Start',
      in_progress: '🔄 In Progress',
      job_completed: '✔️ Job Completed',
      completed: '🎉 Completed',
      rejected: '❌ Rejected',
      withdrawn: '↩️ Withdrawn',
      closed: '✔️ Closed',
    };
    return labels[status] || status;
  };

  const getErrandStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '📋 Open - Awaiting Offers',
      confirmed: '🟢 Confirmed',
      in_progress: '🔄 In Progress',
      completed: '✔️ Completed - Awaiting Rating',
      rated: '🎉 Completed & Rated',
      expired: '⏰ Expired',
      cancelled: '❌ Cancelled',
    };
    return labels[status] || status;
  };

  // Get active job (confirmed or in_progress)
  // Find the confirmed/in-progress bid that is actually accepted (is_accepted=true)
  const activeBid = bids.find(b => b.is_accepted && (b.status === 'confirmed' || b.status === 'in_progress'));

  const filteredBids = filterStatus === 'all' ? bids : bids.filter(b => b.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg p-6">
        <p className="text-gray-600">Loading your offers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-semibold mb-2 text-xs"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-errandify-brown">MyOffers</h1>
          <p className="text-gray-600 text-sm">Track all your offers and active jobs</p>
        </div>

        {/* Active Job Sticky Header */}
        {activeBid && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            activeBid.status === 'in_progress'
              ? 'bg-blue-50 border-blue-300'
              : 'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {activeBid.status === 'in_progress' ? '🔄 Currently Working' : '🟢 Active Job'}
                </p>
                <h3 className="text-lg font-bold text-errandify-brown mt-1">
                  {activeBid.errand?.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {activeBid.errand?.asker_display_name || activeBid.errand?.asker_name} • SGD ${Number(activeBid.amount).toFixed(2)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(activeBid.status)}`}>
                {getStatusLabel(activeBid.status)}
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={() => navigate(`/errand/${activeBid.errand_id}`)}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                activeBid.status === 'in_progress'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {activeBid.status === 'confirmed' ? '▶️ Start Job' : '✏️ Continue Working'}
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['all', 'pending', 'accepted', 'confirmed', 'in_progress', 'job_completed', 'completed', 'rejected'].map((status) => {
            const count = bids.filter(b => b.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? 'bg-errandify-orange text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-errandify-orange'
                }`}
              >
                {status === 'all' ? '📋 All' : `${status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')} ${count > 0 ? `(${count})` : ''}`}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Bids List */}
        {filteredBids.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-2">
              {filterStatus === 'all' ? 'No offers yet' : `No ${filterStatus} offers`}
            </p>
            <p className="text-xs text-gray-500">
              Start browsing errands and place your first offer!
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="mt-4 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold text-sm hover:bg-opacity-90"
            >
              Browse ToHelp
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                className={`bg-white rounded-lg p-4 border transition-all ${
                  bid === activeBid
                    ? 'border-green-300 shadow-md'
                    : 'border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-errandify-brown">
                      {bid.errand?.title || 'Errand #' + bid.errand_id}
                    </h3>
                    <p className="text-xs text-gray-600">by {bid.errand?.asker_name || 'Unknown'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(bid.status)}`}>
                    {getErrandStatusLabel(bid.errand?.status || 'open')}
                  </span>
                </div>

                {/* Offer Amount & Details */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-gray-600">Your Offer</p>
                    <p className="font-bold text-errandify-orange text-lg">SGD ${Math.round(Number(bid.amount))}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-semibold text-gray-800">SGD ${bid.errand?.budget ? Math.round(Number(bid.errand.budget)) : 'N/A'}</p>
                  </div>
                </div>

                {/* Note */}
                {bid.note && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                    💬 {bid.note}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/errand/${bid.errand_id}`)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded font-semibold text-xs hover:bg-gray-50"
                  >
                    View Details
                  </button>

                  {bid.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded font-semibold text-xs hover:bg-opacity-90"
                    >
                      Edit Offer
                    </button>
                  )}

                  {bid.status === 'accepted' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700"
                    >
                      ✅ Confirm
                    </button>
                  )}

                  {bid.status === 'confirmed' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700"
                    >
                      ▶️ Start
                    </button>
                  )}

                  {bid.status === 'in_progress' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700"
                    >
                      ✏️ End Job
                    </button>
                  )}
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-2">
                  Offer placed {new Date(bid.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredBids.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              📊 <span className="font-semibold">{filteredBids.length}</span> offer
              {filteredBids.length !== 1 ? 's' : ''} {filterStatus === 'all' ? 'total' : `in "${filterStatus}" status`}
            </p>
          </div>
        )}
      </div>

      {/* Rating Modal - Appears when doer has completed job */}
      {showRatingModal && ratingBid && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl max-w-md w-full p-8 shadow-2xl border-2 border-amber-200 max-h-[90vh] overflow-y-auto">
            {/* Warm Header */}
            <div className="text-center mb-6">
              <p className="text-5xl mb-3">💫</p>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">Your Turn to Give Feedback!</h2>
              <p className="text-sm text-amber-700">Let {ratingBid.errand?.asker_display_name || ratingBid.errand?.asker_name || 'them'} know how it went</p>
              <p className="text-xs text-amber-600 mt-2 font-semibold">+5 Errandify Points for rating ✨</p>
            </div>

            {/* Task Info */}
            <div className="bg-white rounded-lg p-3 mb-6 border border-amber-100">
              <p className="text-xs text-gray-600 mb-1">About</p>
              <p className="text-sm font-semibold text-gray-800">"{ratingBid.errand?.title}"</p>
            </div>

            {/* Star Rating */}
            <div className="flex gap-2 mb-6 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-5xl transition-all transform hover:scale-125 hover:-translate-y-1 ${
                    star <= rating ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-300 hover:text-yellow-300'
                  } cursor-pointer`}
                  title={['Not great', 'Could be better', 'Good!', 'Really good!', 'Amazing!'][star - 1]}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Rating feedback message */}
            {rating > 0 && (
              <p className="text-center mb-6 text-sm font-semibold text-amber-800">
                {rating === 1 && '😕 Let us know what could improve'}
                {rating === 2 && '😐 Share what could be better'}
                {rating === 3 && '😊 Good job! Add details if you like'}
                {rating === 4 && '😄 Really impressed! Tell them why'}
                {rating === 5 && '🎉 Wow! They were amazing! Let us know!'}
              </p>
            )}

            {/* Feedback textarea */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="📝 Share your experience... (optional)"
              maxLength={200}
              rows={2}
              className="w-full text-xs px-3 py-2 border-2 border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition mb-4"
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingBid(null);
                  setRating(5);
                  setRatingComment('');
                }}
                className="flex-1 px-4 py-3 border border-amber-300 text-amber-700 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
              >
                Later
              </button>
              <button
                onClick={async () => {
                  if (!ratingBid) return;
                  setRatingSubmitting(true);
                  try {
                    const token = localStorage.getItem('token');
                    await axios.post(
                      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
                      {
                        taskId: ratingBid.errand_id,
                        ratedUserId: ratingBid.doer_id, // Rate the asker (doer's perspective)
                        rating,
                        comment: ratingComment || null,
                      },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    // Get current user ID
                    const userStr = localStorage.getItem('user');
                    const currentUser = userStr ? JSON.parse(userStr) : null;

                    if (currentUser) {
                      await axios.post(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/award-ep-bonus`,
                        {
                          errandId: ratingBid.errand_id,
                          userId: currentUser.id,
                          bonus: 5,
                          reason: 'doer_rating_bonus',
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                    }

                    setShowRatingModal(false);
                    setRatingBid(null);
                    setRating(5);
                    setRatingComment('');
                    window.dispatchEvent(new Event('ratingsUpdated'));
                    window.dispatchEvent(new Event('profileDataUpdated'));
                  } catch (err: any) {
                    console.error('Rating submission error:', err);
                    alert('Error submitting rating: ' + (err.response?.data?.error || err.message));
                  } finally {
                    setRatingSubmitting(false);
                  }
                }}
                disabled={ratingSubmitting || rating === 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 text-sm"
              >
                {ratingSubmitting ? '✨ Submitting...' : '💙 Submit & Earn +5 EP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
