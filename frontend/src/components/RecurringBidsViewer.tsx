import { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  instanceNumber: number;
  errandId: number;
  scheduledDate: string;
  title: string;
  status: string;
  budget: number;
}

interface Bid {
  bidId: number;
  doerId: number;
  doerName: string;
  doerRating: string | number;
  doerRatings: number;
  amount: number;
  note: string;
  status: string;
  selectedSessions: number[];
  createdAt: string;
}

interface RecurringBidsViewerProps {
  errandId: number;
  onAcceptBid?: (bidId: number, sessions: number[]) => void;
}

export default function RecurringBidsViewer({
  errandId,
  onAcceptBid,
}: RecurringBidsViewerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingSessions, setAcceptingSessions] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecurringBids();
  }, [errandId]);

  const fetchRecurringBids = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/recurring/${errandId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSessions(response.data.data.sessions || []);
        setBids(response.data.data.bids || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load offers');
      console.error('Error fetching recurring offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionToggle = (bidId: number, instanceNumber: number) => {
    setAcceptingSessions(prev => ({
      ...prev,
      [bidId]: prev[bidId]?.includes(instanceNumber)
        ? prev[bidId].filter(n => n !== instanceNumber)
        : [...(prev[bidId] || []), instanceNumber],
    }));
  };

  const handleAcceptBid = async (bidId: number) => {
    const selectedSessions = acceptingSessions[bidId] || [];
    if (selectedSessions.length === 0) {
      alert('Please select at least one session');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${bidId}/accept-sessions`,
        { sessions: selectedSessions },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Call parent callback
      if (onAcceptBid) {
        onAcceptBid(bidId, selectedSessions);
      }

      // Refresh bids
      await fetchRecurringBids();
      setAcceptingSessions(prev => ({
        ...prev,
        [bidId]: [],
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept offer');
      console.error('Error accepting offer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getSessionStatus = (instanceNumber: number): 'open' | 'confirmed' | 'filled' => {
    const session = sessions.find(s => s.instanceNumber === instanceNumber);
    if (!session) return 'open';
    if (session.status === 'confirmed') return 'confirmed';
    if (session.status === 'open') return 'open';
    return 'filled';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading offers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
        {error}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-gray-600">No offers yet. Share your errand to get doers interested!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">📅 Sessions Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sessions.map((session) => (
            <div
              key={session.instanceNumber}
              className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  Part {session.instanceNumber}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(session.scheduledDate).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  session.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {session.status === 'confirmed' ? '✅ Confirmed' : '⏳ Open'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bids */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">💰 Offers Received</h3>
        {bids.map((bid) => (
          <div key={bid.bidId} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-errandify-orange transition">
            {/* Doer Info */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-800">{bid.doerName}</p>
                <p className="text-sm text-gray-600">
                  ⭐ {bid.doerRating} ({bid.doerRatings} ratings)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-errandify-orange">${bid.amount}</p>
                <p className="text-xs text-gray-500">per session</p>
              </div>
            </div>

            {/* Note */}
            {bid.note && (
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-4 italic">
                "{bid.note}"
              </p>
            )}

            {/* Session Selection */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Available for {bid.selectedSessions.length} session{bid.selectedSessions.length !== 1 ? 's' : ''}:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {sessions.map((session) => {
                  const isBidForThisSession = bid.selectedSessions.includes(session.instanceNumber);
                  const isSelected = acceptingSessions[bid.bidId]?.includes(session.instanceNumber);
                  const status = getSessionStatus(session.instanceNumber);

                  return (
                    <button
                      key={`bid-${bid.bidId}-session-${session.instanceNumber}`}
                      onClick={() => handleSessionToggle(bid.bidId, session.instanceNumber)}
                      disabled={!isBidForThisSession || status === 'confirmed'}
                      className={`p-3 rounded-lg border-2 transition text-center text-sm font-medium ${
                        !isBidForThisSession || status === 'confirmed'
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : isSelected
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-errandify-orange'
                      }`}
                    >
                      <div className="text-lg font-bold">P{session.instanceNumber}</div>
                      <div className="text-xs">
                        {status === 'confirmed' ? '✅ Taken' : isBidForThisSession ? '✓' : '✗'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accept Button */}
            {(acceptingSessions[bid.bidId]?.length || 0) > 0 && (
              <button
                onClick={() => handleAcceptBid(bid.bidId)}
                disabled={submitting}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
              >
                {submitting ? '💭 Accepting...' : `✅ Accept for ${acceptingSessions[bid.bidId]?.length} Session(s)`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
