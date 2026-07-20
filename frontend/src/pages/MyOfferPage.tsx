import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskChatbox from '../components/TaskChatbox';
import AdminThemeWrapper from '../components/AdminThemeWrapper';
import { getSocket } from '../utils/socketClient';

interface Bid {
  id: number;
  errand_id: number;
  doer_id: number;
  amount: number | string;
  note?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'confirmed_awaiting_start' | 'in_progress' | 'completed_unconfirmed' | 'completed_confirmed' | 'rejected' | 'withdrawn';
  created_at: string;
  offer_id?: string;
  errand?: {
    title: string;
    budget: number | string;
    category: string;
    status: string;
    asker_name: string;
    asker_display_name?: string;
    asker_alias?: string;
    location?: string;
    full_address?: string;
    postal_code?: string;
    deadline?: string;
    description?: string;
    formatted_id?: string;
  };
}

export default function MyOfferPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
      case 'expired':
        return 'bg-gray-200 text-gray-500 border-gray-400';
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
      rated: '✅ Rated & Closed',
      completed_unconfirmed: '✔️ Awaiting Review',
      completed_confirmed: '🎉 Completed',
      rejected: '❌ Rejected',
      withdrawn: '↩️ Withdrawn',
      expired: '⏰ Expired',
      closed: '✅ Rated & Closed',
    };
    return labels[status] || status;
  };
  // Get active job (confirmed or in_progress)
  const activeBid = bids.find(b => b.status === 'confirmed' || b.status === 'confirmed_awaiting_start' || b.status === 'in_progress');

  // Define priority order for sorting by ERRAND STATUS (lower number = higher priority, shown first)
  const priorityOrder: Record<string, number> = {
    'in_progress': 0,               // 🔄 Actively working - HIGHEST PRIORITY
    'confirmed_awaiting_start': 1,  // 🟢 Confirmed, ready to start
    'confirmed': 2,                 // 🟢 Confirmed
    'open': 3,                      // 🔓 Open (bids submitted)
    'completed_unconfirmed': 4,     // ✔️ Work done, awaiting review
    'completed': 5,                 // ✅ Rated & Closed
    'rated': 6,                     // ✅ Rated & Closed (final state)
    'rejected': 7,                  // ❌ Rejected
    'withdrawn': 8,                 // ↩️ Withdrawn
    'expired': 99,                  // ⏰ Expired - LOWEST PRIORITY (shown at bottom, greyed out)
  };

  const filteredBids = bids
    // Filter by ERRAND status (not bid status)
    .filter(b => {
      if (filterStatus === 'all') return true;
      const errandStatus = b.errand?.status;
      if (filterStatus === 'open') return errandStatus === 'open';
      return errandStatus === filterStatus;
    })
    // Apply search filter
    .filter(b => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const title = (b.errand?.title || '').toLowerCase();
      const category = (b.errand?.category || '').toLowerCase();
      const location = (b.errand?.location || '').toLowerCase();
      return title.includes(query) || category.includes(query) || location.includes(query);
    })
    .sort((a, b) => {
      // Sort by ERRAND STATUS priority first
      const errandStatusA = a.errand?.status || 'unknown';
      const errandStatusB = b.errand?.status || 'unknown';
      const priorityA = priorityOrder[errandStatusA] ?? 99;
      const priorityB = priorityOrder[errandStatusB] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort: within same status, sort by newest first
      return 0; // Keep original order if priorities are equal
    });

  console.log('[MyOffer] filterStatus:', filterStatus);
  console.log('[MyOffer] filteredBids count:', filteredBids.length);
  filteredBids.forEach((bid, idx) => {
    console.log(`[MyOffer] Bid ${idx + 1}: "${bid.errand?.title}" - Bid Status: ${bid.status}, Errand Status: ${bid.errand?.status}`);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg p-6">
        <p className="text-gray-600">Loading your offers...</p>
      </div>
    );
  }

  return (
    <AdminThemeWrapper title="💼 MyOffer" showBackButton onBack={() => navigate('/home')}>
      <div className="max-w-3xl mx-auto">
        {/* Header Subtitle */}
        <div style={{marginBottom: '16px', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF5F0 100%)', borderRadius: '12px', padding: '16px', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)'}}>
          <p style={{color: '#555', fontSize: '14px', margin: 0, fontWeight: '500', lineHeight: '1.6'}}>
            ✨ Track all your offers and active jobs. Your earnings dashboard awaits! 🚀
          </p>
        </div>

        {/* Active Job Sticky Header - Only show if in_progress */}
        {activeBid && activeBid.status === 'in_progress' && (
          <div style={{marginBottom: '16px', padding: '16px', borderRadius: '14px', border: '2px solid #4CAF50', background: 'linear-gradient(135deg, #F1F8F4 0%, #E8F5E9 100%)', boxShadow: '0 6px 20px rgba(76, 175, 80, 0.25)'}}>
            <p style={{fontSize: '12px', fontWeight: '700', color: '#4CAF50', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px'}}>🚀 CURRENTLY ACTIVE</p>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {activeBid.status === 'in_progress' ? '🔄 Currently Working' : '🟢 Active Job'}
                </p>
                <h3 className="text-lg font-bold text-errandify-brown mt-1">
                  {activeBid.errand?.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {activeBid.errand?.asker_display_name || activeBid.errand?.asker_name || 'Anonymous'} • SGD ${Math.round(Number(activeBid.amount))}
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

        {/* Search Bar */}
        <div style={{marginBottom: '16px'}}>
          <input
            type="text"
            placeholder="🔍 Search by title, category, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #FFE0D6',
              borderRadius: '12px',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.3s',
              background: 'white',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(255, 107, 53, 0.08)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF6B35';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 53, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#FFE0D6';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.08)';
            }}
          />
        </div>

        {/* Filter Tabs - Organized by priority */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', paddingBottom: '8px'}}>
          {['all', 'in_progress', 'confirmed', 'open', 'completed_unconfirmed', 'completed', 'rated', 'expired'].map((status) => {
            // Count by ERRAND status, not bid status
            const count = bids.filter(b => {
              if (status === 'all') return true;
              if (status === 'open') return b.errand?.status === 'open';
              return b.errand?.status === status;
            }).length;
            if (count === 0 && status !== 'all') return null; // Hide empty tabs except 'All'

            const labels: Record<string, string> = {
              all: '📋 All',
              in_progress: '🔄 In Progress',
              confirmed: '🟢 Confirmed',
              open: '🔓 Open',
              completed_unconfirmed: '✔️ Awaiting Review',
              completed: '✅ Completed',
              rated: '✅ Rated & Closed',
              expired: '⏰ Expired',
            };

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  border: 'none',
                  cursor: 'pointer',
                  background: filterStatus === status ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)' : 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)',
                  color: filterStatus === status ? 'white' : '#333',
                  boxShadow: filterStatus === status ? '0 8px 20px rgba(255, 107, 53, 0.35)' : '0 2px 8px rgba(255, 107, 53, 0.12)',
                }}
                onMouseOver={(e) => {
                  if (filterStatus !== status) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 107, 53, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (filterStatus !== status) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.12)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.35)';
                  }
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {labels[status]} {count > 0 ? `(${count})` : ''}
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
          <div style={{background: 'linear-gradient(135deg, #FFF9F5 0%, #FFEFEA 100%)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)'}}>
            <p style={{fontSize: '32px', marginBottom: '8px'}}>🎯</p>
            <p style={{fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '8px'}}>
              {filterStatus === 'all' ? 'No offers yet' : `No ${filterStatus} offers`}
            </p>
            <p style={{fontSize: '13px', color: '#555', marginBottom: '16px', fontWeight: '500'}}>
              Start browsing errands and place your first offer to earn! 🚀
            </p>
            <button
              onClick={() => navigate('/browse')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
              }}
            >
              🔍 Browse Errands ToHelp
            </button>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {filteredBids.map((bid) => (
              <div
                key={bid.id}
                style={{
                  background: bid === activeBid
                    ? 'linear-gradient(135deg, #F1F8F4 0%, #E8F5E9 100%)'
                    : 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)',
                  borderRadius: '14px',
                  padding: '16px',
                  border: bid === activeBid ? '2px solid #4CAF50' : '2px solid #FFE0D6',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: bid === activeBid
                    ? '0 8px 20px rgba(76, 175, 80, 0.25)'
                    : '0 4px 12px rgba(255, 107, 53, 0.15)',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  if (bid !== activeBid) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.borderColor = '#FF6B35';
                  } else {
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(76, 175, 80, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (bid !== activeBid) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = '#FFE0D6';
                  } else {
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(76, 175, 80, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Line 1: Title, Errand ID, Status */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0}}>
                    <h3 style={{fontWeight: '700', color: '#FF6B35', fontSize: '14px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {bid.errand?.title || 'Errand #' + bid.errand_id}
                    </h3>
                    <span style={{fontSize: '11px', color: '#666', background: '#FFF0E6', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', whiteSpace: 'nowrap', fontWeight: '600'}}>
                      {bid.errand?.formatted_id || `ER26${String(bid.errand_id).padStart(2, '0')}-${String(bid.id).slice(-4).toUpperCase().padEnd(4, '0')}`}
                    </span>
                  </div>
                  <span style={{padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: '1.5px solid #FF6B35', color: '#FF6B35', background: '#FFF5F0', whiteSpace: 'nowrap'}}>
                    {getStatusLabel(bid.errand?.status || bid.status)}
                  </span>
                </div>

                {/* Line 2: Posted by + Category on left, Price + ID on right */}
                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', fontSize: '12px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0}}>
                    <p style={{color: '#666', whiteSpace: 'nowrap', margin: 0, fontWeight: '500'}}>by {bid.errand?.asker_alias || bid.errand?.asker_name || 'Unknown'}</p>
                    {bid.errand?.category && (
                      <span style={{padding: '4px 10px', background: 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)', color: '#FF6B35', borderRadius: '8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap'}}>
                        {bid.errand.category}
                      </span>
                    )}
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <p style={{color: '#333', fontWeight: '700', margin: '0 0 4px 0'}}>SGD ${Number(bid.amount).toFixed(2)}</p>
                    <p style={{color: '#999', fontFamily: 'monospace', fontSize: '10px', margin: 0}}>{bid.offer_id || `OF${bid.id}`}</p>
                  </div>
                </div>

                {/* Line 3: Date/Time + Location on left, Offer placed date on right */}
                <div className="flex items-center justify-between gap-2 text-xs mb-1 flex-wrap">
                  <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                    {bid.errand?.deadline && (
                      <>
                        <span>📅 {new Date(bid.errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}</span>
                        <span>⏰ {new Date(bid.errand.deadline).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    )}
                    {(() => {
                      const isCompleted = bid.errand?.status === 'completed' || bid.errand?.status === 'completed_confirmed' || bid.errand?.status === 'completed_unconfirmed';
                      const isExpired = bid.errand?.status === 'expired';

                      // Don't show location for expired errands
                      if (isExpired) return null;

                      // For completed: only show if area is valid and not generic
                      if (isCompleted) {
                        const loc = bid.errand?.location?.trim() || '';
                        if (!loc || loc.toLowerCase() === 'singapore' || loc.toLowerCase() === 'remote') {
                          return null;
                        }
                        return (
                          <span>
                            📍 {loc}
                          </span>
                        );
                      }

                      // For active: show full address or location + postal
                      if (bid.errand?.location || bid.errand?.postal_code) {
                        const displayText = bid.errand.full_address
                          ? bid.errand.full_address
                          : `${bid.errand.location || ''}${bid.errand?.postal_code ? ` ${bid.errand.postal_code}` : ''}`.trim();

                        return (
                          <span>
                            📍 {displayText}
                          </span>
                        );
                      }

                      return null;
                    })()}
                  </div>
                  <p className="text-gray-400 whitespace-nowrap">Offer placed {new Date(bid.created_at).toLocaleDateString()}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-wrap mt-2">
                  {bid.errand?.status !== 'expired' && (
                    <button
                      onClick={() => navigate(`/errand/${bid.errand_id}`)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-gray-700 rounded font-semibold text-xs hover:bg-gray-50 min-w-20"
                    >
                      View Details
                    </button>
                  )}

                  {bid.status === 'pending' && bid.errand?.status !== 'expired' && (
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
                budget: selectedBid?.errand?.budget ? Number(selectedBid.errand.budget) : undefined,
                description: selectedBid?.errand?.description,
                location: selectedBid?.errand?.location,
                postal_code: selectedBid?.errand?.postal_code,
                deadline: selectedBid?.errand?.deadline,
              }}
            />
          );
        })()}
      </div>
    </AdminThemeWrapper>
  );
}
