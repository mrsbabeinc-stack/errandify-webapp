import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskChatbox from '../components/TaskChatbox';
import { getSocket } from '../utils/socketClient';

interface Bid {
  id: number;
  errand_id: number;
  doer_id: number;
  amount: number;
  note?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'confirmed_awaiting_start' | 'in_progress' | 'completed_unconfirmed' | 'completed_confirmed' | 'rejected' | 'withdrawn';
  created_at: string;
  errand?: {
    title: string;
    budget: number;
    category: string;
    status: string;
    asker_name: string;
    asker_display_name?: string;
    location?: string;
    postal_code?: string;
    deadline?: string;
    description?: string;
  };
}

export default function MyOfferPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedErrandId, setSelectedErrandId] = useState<number | null>(null);
  const [showChatbox, setShowChatbox] = useState(false);

  useEffect(() => {
    // Fetch immediately on mount
    fetchMyBids();

    // Poll for updates every 2 seconds (faster updates)
    const interval = setInterval(fetchMyBids, 2000);

    // Listen for real-time bid confirmation events
    const socket = getSocket();
    if (socket) {
      socket.on('bid_confirmed', () => {
        console.log('[MyOfferPage] Received bid_confirmed event, refreshing...');
        fetchMyBids();
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('bid_confirmed');
      }
    };
  }, []);

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

  const handleConfirmBid = async (bidId: number) => {
    try {
      console.log('[MyOfferPage] Confirming bid:', bidId);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${bidId}/confirm`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('[MyOfferPage] Bid confirmed successfully:', response.data);
      // Refresh bids immediately to get updated status from server
      await fetchMyBids();
      setError('');
    } catch (err: any) {
      console.error('[MyOfferPage] Failed to confirm bid:', err);
      setError(err.response?.data?.error || 'Failed to confirm offer');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed':
      case 'confirmed_awaiting_start':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed_unconfirmed':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'completed_confirmed':
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
      confirmed_awaiting_start: '🟢 Confirmed - Start',
      in_progress: '🔄 In Progress',
      completed: '✅ Rated & Closed',
      completed_unconfirmed: '✔️ Awaiting Review',
      completed_confirmed: '🎉 Completed',
      rejected: '❌ Rejected',
      withdrawn: '↩️ Withdrawn',
    };
    return labels[status] || status;
  };

  // Get active job (confirmed or in_progress)
  const activeBid = bids.find(b => b.status === 'confirmed' || b.status === 'confirmed_awaiting_start' || b.status === 'in_progress');

  // Define priority order for sorting
  const priorityOrder: Record<string, number> = {
    'in_progress': 1,        // 🔄 Actively working - highest priority
    'confirmed_awaiting_start': 2,  // 🟢 Confirmed, ready to start
    'confirmed': 3,          // 🟢 Confirmed
    'accepted': 4,           // ✅ Selected, awaiting confirmation
    'pending': 5,            // ⏳ Bids submitted
    'completed_unconfirmed': 6,  // ✔️ Work done, awaiting review
    'completed': 7,          // ✅ Rated & Closed
    'rejected': 8,           // ❌ Rejected
    'withdrawn': 9,          // ↩️ Withdrawn
  };

  const filteredBids = (filterStatus === 'all' ? bids : bids.filter(b => b.status === filterStatus))
    .sort((a, b) => {
      const priorityA = priorityOrder[a.status] ?? 99;
      const priorityB = priorityOrder[b.status] ?? 99;
      return priorityA - priorityB;
    });

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
          <h1 className="text-2xl font-bold text-errandify-brown">MyOffer</h1>
          <p className="text-gray-600 text-sm">Track all your offers and active jobs</p>
        </div>

        {/* Active Job Sticky Header - Only show if in_progress */}
        {activeBid && activeBid.status === 'in_progress' && (
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
                  {activeBid.errand?.asker_display_name || activeBid.errand?.asker_name || 'Anonymous'} • SGD ${Math.round(activeBid.amount)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(activeBid.errand?.status || activeBid.status)}`}>
                {getStatusLabel(activeBid.errand?.status || activeBid.status)}
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
              {activeBid.status === 'confirmed' || activeBid.status === 'confirmed_awaiting_start' ? '▶️ Start Job' : '✏️ Continue Working'}
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['all', 'pending', 'accepted', 'confirmed', 'in_progress', 'completed_unconfirmed', 'completed_confirmed', 'rejected'].map((status) => {
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
          <div className="space-y-2">
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                className={`bg-white rounded-lg p-2 border transition-all text-sm ${
                  bid === activeBid
                    ? 'border-green-300 shadow-md'
                    : 'border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <h3 className="font-semibold text-errandify-brown text-sm">
                      {bid.errand?.title || 'Errand #' + bid.errand_id}
                    </h3>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-gray-600">by {bid.errand?.asker_display_name || bid.errand?.asker_name || 'Unknown'}</p>
                      {bid.errand?.category && (
                        <span className="px-2 py-0.5 bg-orange-100 text-errandify-orange rounded text-xs font-semibold">
                          {bid.errand.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(bid.errand?.status || bid.status)}`}>
                    {getStatusLabel(bid.errand?.status || bid.status)}
                  </span>
                </div>

                {/* Deadline, Location */}
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 flex-wrap">
                  {bid.errand?.deadline && (
                    <span>📅 {new Date(bid.errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}</span>
                  )}
                  {bid.errand?.location && (
                    <span>
                      📍 {bid.errand.location.split(',')[0]}
                      {bid.errand?.postal_code && ` ${bid.errand.postal_code}`}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => navigate(`/errand/${bid.errand_id}`)}
                    className="flex-1 px-2 py-1 border border-gray-300 text-gray-700 rounded font-semibold text-xs hover:bg-gray-50 min-w-20"
                  >
                    View Details
                  </button>

                  {bid.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-2 py-1 bg-errandify-orange text-white rounded font-semibold text-xs hover:bg-opacity-90"
                    >
                      Edit Offer
                    </button>
                  )}

                  {/* Show Chat if errand is in_progress or pending review, regardless of bid status */}
                  {(bid.errand?.status === 'in_progress' || bid.status === 'completed_unconfirmed') && (
                    <button
                      onClick={() => {
                        setSelectedErrandId(bid.errand_id);
                        setShowChatbox(true);
                      }}
                      className="flex-1 px-2 py-1 border-2 border-blue-400 text-blue-600 rounded font-semibold text-xs hover:bg-blue-50"
                    >
                      💬 Chat
                    </button>
                  )}

                  {/* Show Confirm only if bid is accepted AND errand is still open */}
                  {bid.status === 'accepted' && bid.errand?.status === 'open' && (
                    <button
                      onClick={() => handleConfirmBid(bid.id)}
                      className="flex-1 px-2 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700"
                    >
                      ✅ Confirm
                    </button>
                  )}

                  {/* Show Start if errand is confirmed */}
                  {(bid.errand?.status === 'confirmed' || bid.errand?.status === 'confirmed_awaiting_start') && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-2 py-1 bg-emerald-600 text-white rounded font-semibold text-xs hover:bg-emerald-700"
                    >
                      ▶️ Start
                    </button>
                  )}

                  {bid.status === 'completed_unconfirmed' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded font-semibold text-xs hover:from-amber-500 hover:to-yellow-600 hover:shadow-md transition-all transform hover:scale-105"
                    >
                      ⭐ Show Some Love! +5 EP
                    </button>
                  )}
                </div>

                {/* Photo Preview Section - Show when bid is completed */}
                {(bid.status === 'completed_unconfirmed' || bid.status === 'completed_confirmed') && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Your submitted photos:</p>
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View all photos & details
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-1">
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

        {/* TaskChatbox Modal - Handles its own modal wrapper */}
        {showChatbox && selectedErrandId && (() => {
          const selectedBid = bids.find(b => b.errand_id === selectedErrandId);
          return (
            <TaskChatbox
              taskId={selectedErrandId}
              taskTitle={selectedBid?.errand?.title || 'Errand'}
              isOpen={showChatbox}
              onClose={() => {
                setShowChatbox(false);
                setSelectedErrandId(null);
              }}
              errandDetails={{
                budget: selectedBid?.errand?.budget,
                description: selectedBid?.errand?.description,
                location: selectedBid?.errand?.location,
                postal: selectedBid?.errand?.postal_code,
                deadline: selectedBid?.errand?.deadline,
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
