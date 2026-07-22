import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface Errand {
  id: string;
  errandId?: string;
  title: string;
  description: string;
  budget: number | null;
  location: string;
  deadline: string | null;
  askerName: string;
  askerRating: number;
  isRecurring?: boolean;
  recurringSchedule?: string;
}

interface RecurringInfo {
  isRecurringInstance: boolean;
  currentInstance?: number;
  parent?: { id: number; title: string; recurring_schedule: string };
  siblings?: Array<{ instanceNumber: number; errandId: number; scheduledDate: string; status: string; budget: number }>;
}

export default function BrowseErrandsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRecurringId, setExpandedRecurringId] = useState<string | null>(null);
  const [recurringInfo, setRecurringInfo] = useState<Record<string, RecurringInfo>>({});
  const [selectedSessions, setSelectedSessions] = useState<Record<string, number[]>>({});
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});

  const categoryNames: Record<string, string> = {
    'home-maintenance': 'Home Maintenance',
    'cleaning-laundry': 'Cleaning & Laundry',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'childcare-tutoring': 'Childcare & Tutoring',
    'pet-care': 'Pet Care',
    'tech-support': 'Tech Support',
    'moving-help': 'Moving Help',
  };

  const getMaskedLocation = (location?: string) => {
    if (!location) return null;

    // If it's "Remote", show as is
    if (location.toLowerCase() === 'remote') return 'Remote';

    // Extract postal code (6 digits) or area name
    const postalMatch = location.match(/\d{6}/);
    if (postalMatch) {
      return `Singapore ${postalMatch[0]}`;
    }

    // If it contains "Singapore", show only that + postal or area
    if (location.toLowerCase().includes('singapore')) {
      return location.split(',')[0]; // Show first part (area/postal)
    }

    // Otherwise, show only the last part (should be area/postal)
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?category=${categoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('[BrowseErrands] API Response:', response.data.data);
        if (response.data.data && response.data.data.length > 0) {
          console.log('[BrowseErrands] First errand:', response.data.data[0]);
        }
        setErrands(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load errands');
        console.error('[BrowseErrands] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [categoryId]);

  const fetchRecurringInfo = async (errandId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/recurring`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRecurringInfo(prev => ({
        ...prev,
        [errandId]: response.data.data,
      }));
    } catch (err) {
      console.error('Failed to fetch recurring info:', err);
    }
  };

  const handleExpandRecurring = async (errandId: string) => {
    setExpandedRecurringId(expandedRecurringId === errandId ? null : errandId);
    if (expandedRecurringId !== errandId && !recurringInfo[errandId]) {
      await fetchRecurringInfo(errandId);
    }
  };

  const handleSessionToggle = (errandId: string, instanceNumber: number) => {
    setSelectedSessions(prev => ({
      ...prev,
      [errandId]: prev[errandId]?.includes(instanceNumber)
        ? prev[errandId].filter(n => n !== instanceNumber)
        : [...(prev[errandId] || []), instanceNumber],
    }));
  };

  const handleAcceptErrand = (errandId: string) => {
    navigate(`/errand/${errandId}/accept`);
  };

  const handleBidOnRecurringSessions = async (parentErrandId: string, errandId: string) => {
    const sessions = selectedSessions[errandId] || [];
    if (sessions.length === 0) {
      alert('Please select at least one session');
      return;
    }

    const amount = parseFloat(bidAmounts[errandId] || '0');
    if (isNaN(amount) || amount < 8) {
      alert('Offer must be at least $8');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids`,
        {
          task_id: parentErrandId,
          amount,
          note: '',
          sessions: sessions, // Pass selected session numbers
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert(`✅ Offer placed for ${sessions.length} session(s) at $${amount}!`);
        // Reset selection
        setSelectedSessions(prev => ({
          ...prev,
          [errandId]: [],
        }));
        setBidAmounts(prev => ({
          ...prev,
          [errandId]: '',
        }));
        setExpandedRecurringId(null);
        // Refresh bids
        await fetchRecurringInfo(parentErrandId);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place offer');
      console.error('Offer error:', err);
    }
  };

  return (
    <AdminThemeWrapper title="🔍 Browse Errands" showBackButton onBack={() => navigate(-1)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-errandify-brown mb-2">
          Available Errands
        </h1>
        <p className="text-gray-600">
          Category: <span className="font-semibold">{categoryNames[categoryId || ''] || categoryId}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading errands...</p>
        </div>
      ) : errands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No errands available in this category yet.</p>
          <button
            onClick={() => navigate('/browse-errands')}
            className="text-errandify-orange font-semibold"
          >
            Browse other categories
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {errands.map((errand) => {
            console.log('[BrowseErrands] Rendering errand:', errand.id, 'errandId:', errand.errandId, 'deadline:', errand.deadline);
            return (
            <div
              key={errand.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Errand ID & Start Date Header */}
              {(errand.errandId || errand.deadline) && (
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs">
                  <code className="font-mono text-gray-700 font-semibold">{errand.errandId || 'N/A'}</code>
                  {errand.deadline && (
                    <span className="text-gray-600">
                      📅 {new Date(errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
              {/* Content */}
              <div className="p-4">
                {/* Title */}
                <h3 className="text-lg font-semibold text-errandify-brown mb-2">
                  {errand.title}
                </h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {errand.description}
              </p>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                {/* Budget */}
                {errand.budget && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-errandify-orange">
                      ${errand.budget.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Location - Masked for Privacy */}
                {errand.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍 {getMaskedLocation(errand.location)}</span>
                  </div>
                )}

                {/* Deadline */}
                {errand.deadline && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📅 {new Date(errand.deadline).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Asker Rating */}
                <div className="flex items-center gap-2 text-gray-600">
                  <span>⭐ {errand.askerRating || 'New'}</span>
                </div>
              </div>

              {/* Recurring Badge */}
              {errand.isRecurring && (
                <div className="bg-blue-50 border-t border-blue-100 px-4 py-2">
                  <button
                    onClick={() => handleExpandRecurring(errand.id)}
                    className="w-full text-left flex items-center justify-between text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <span>📋 Recurring (Multiple Sessions)</span>
                    <span>{expandedRecurringId === errand.id ? '▼' : '▶'}</span>
                  </button>
                </div>
              )}

              {/* Asker */}
              <div className="border-t pt-3 mb-4">
                <p className="text-xs text-gray-600">Posted by: <span className="font-semibold">{errand.askerName}</span></p>
              </div>

              {/* Recurring Sessions Expansion */}
              {errand.isRecurring && expandedRecurringId === errand.id && recurringInfo[errand.id] && (
                <div className="border-t bg-blue-50 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Select sessions you're available for:</p>
                  <div className="space-y-2 mb-4">
                    {recurringInfo[errand.id]?.siblings?.map((session) => (
                      <label key={`${errand.id}-${session.instanceNumber}`} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSessions[errand.id]?.includes(session.instanceNumber) || false}
                          onChange={() => handleSessionToggle(errand.id, session.instanceNumber)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Part {session.instanceNumber} • {new Date(session.scheduledDate).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-600">${session.budget} • Status: {session.status}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Bid Amount Input */}
                  <div className="mb-3">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      Your Offer Per Session
                    </label>
                    <div className="flex gap-2">
                      <span className="text-lg font-semibold text-gray-600">$</span>
                      <input
                        type="number"
                        value={bidAmounts[errand.id] || ''}
                        onChange={(e) => setBidAmounts(prev => ({ ...prev, [errand.id]: e.target.value }))}
                        placeholder="Enter offer amount"
                        min="8"
                        step="5"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum $8 per session</p>
                  </div>

                  <button
                    onClick={() => handleBidOnRecurringSessions(errand.id, errand.id)}
                    disabled={!bidAmounts[errand.id] || (selectedSessions[errand.id]?.length || 0) === 0}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    ✅ Offer for {selectedSessions[errand.id]?.length || 0} Session(s)
                  </button>
                </div>
              )}

              {/* Accept Button */}
              {!errand.isRecurring && (
                <button
                  onClick={() => handleAcceptErrand(errand.id)}
                  className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                >
                  View & Accept
                </button>
              )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </AdminThemeWrapper>
  );
}
