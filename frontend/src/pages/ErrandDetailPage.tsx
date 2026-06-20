import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BidSubmissionModal from '../components/BidSubmissionModal';
import BidsViewer from '../components/BidsViewer';
import TaskChatbox from '../components/TaskChatbox';
import RecurringErrandSessionSelector from '../components/RecurringErrandSessionSelector';

interface ErrandDetail {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  location?: string;
  askerId?: number;
  asker?: { name: string; mobile: string };
  createdAt: string;
  isRecurring?: boolean;
  bidCount?: number;
  acceptedBidId?: number;
}

interface UserProfile {
  id: number;
  role: 'asker' | 'doer';
  name?: string;
}

interface AcceptedBid {
  id: number;
  doerId: number;
}

interface Props {
  userRole?: 'asker' | 'doer';
}

export default function ErrandDetailPage({ userRole = 'doer' }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [userBidAmount, setUserBidAmount] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }

    // Load user bids from localStorage
    if (id) {
      const bids = JSON.parse(localStorage.getItem('userBids') || '{}');
      setUserBidAmount(bids[id] || null);
    }
  }, [id]);

  useEffect(() => {
    fetchErrandDetail();
  }, [id]);

  const fetchErrandDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        setErrand(response.data.data);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Errand fetch error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load errand details';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      // GROUP 1: HOME & HOUSEHOLD
      'home-maintenance': 'bg-orange-100 text-orange-700',
      'cleaning-household': 'bg-orange-100 text-errandify-orange-700',
      'food-beverage': 'bg-red-100 text-red-700',
      'furniture-assembly': 'bg-amber-100 text-amber-700',

      // GROUP 2: ERRANDS & LOGISTICS
      'shopping-errands': 'bg-pink-100 text-pink-700',
      'delivery-moving': 'bg-yellow-100 text-yellow-700',
      'travel-mobility': 'bg-sky-100 text-sky-700',
      'event-planning': 'bg-violet-100 text-violet-700',

      // GROUP 3: CARE & WELLBEING
      'childcare-education': 'bg-green-100 text-green-700',
      'eldercare-healthcare': 'bg-gray-100 text-gray-700',
      'pet-care': 'bg-purple-100 text-purple-700',
      'personal-care': 'bg-rose-100 text-rose-700',

      // GROUP 4: SKILLS & SERVICES
      'tech-support': 'bg-indigo-100 text-indigo-700',
      'creative-arts': 'bg-fuchsia-100 text-fuchsia-700',
      'admin-business': 'bg-slate-100 text-slate-700',
      'charity-community': 'bg-red-100 text-red-700',

      // Legacy category names for backwards compatibility
      'cleaning-laundry': 'bg-orange-100 text-errandify-orange-700',
      'childcare-tutoring': 'bg-pink-100 text-pink-700',
      'moving-help': 'bg-red-100 text-red-700',
      'tech-support-it': 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
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

  const handleCancelErrand = async () => {
    if (!window.confirm('Are you sure you want to cancel this errand?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { status: 'cancelled' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate('/errands');
    } catch (error) {
      console.error('Failed to cancel errand:', error);
      alert('Failed to cancel errand. Please try again.');
    }
  };

  const handleCompleteErrand = async () => {
    if (!window.confirm('Mark this errand as completed?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('✓ Errand marked as completed! Awaiting asker rating.');
      fetchErrandDetail();
    } catch (error: any) {
      console.error('Failed to complete errand:', error);
      alert(error.response?.data?.error || 'Failed to complete errand. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Loading errand details...</p>
          <p className="text-xs text-gray-500">Errand ID: {id}</p>
        </div>
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="min-h-screen bg-errandify-bg">
        <div className="h-12"></div>
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-2">⚠️ {error || 'Errand not found'}</p>
            <p className="text-xs text-gray-600 mb-4">Errand ID: {id}</p>
            <p className="text-xs text-gray-500">The errand you're looking for may have been deleted or you don't have permission to view it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back
        </button>

        {/* Main Errand Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-4">
            <h1 className="text-xl font-bold mb-2">{errand.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`${getCategoryColor(
                  errand.category
                )} px-3 py-1 rounded-full text-sm font-semibold`}
              >
                {errand.category}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  errand.status === 'open'
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-400 text-white'
                }`}
              >
                {errand.status}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-4">
            {/* Budget Highlight */}
            {errand.budget && (
              <div className="bg-orange-50 border-l-4 border-errandify-orange p-3 rounded">
                <p className="text-xs text-gray-600 mb-1">Budget</p>
                <p className="text-2xl font-bold text-errandify-orange">
                  SGD ${parseFloat(String(errand.budget)).toFixed(2)}
                </p>
              </div>
            )}

            {/* Description */}
            {errand.description && (
              <div>
                <h2 className="font-semibold text-errandify-brown mb-2 text-base">
                  About This Errand
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {errand.description}
                </p>
              </div>
            )}

            {/* Deadline */}
            {errand.deadline && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h2 className="font-semibold text-errandify-brown mb-2">
                  Deadline
                </h2>
                <p className="text-gray-700">
                  {new Date(errand.deadline).toLocaleDateString('en-SG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(errand.deadline).toLocaleTimeString('en-SG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* Location - Masked for Privacy */}
            {errand.location && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h2 className="font-semibold text-errandify-brown mb-2">
                  Location
                </h2>
                <p className="text-gray-700">
                  📍 {getMaskedLocation(errand.location)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Exact address shown to confirmed doer only
                </p>
              </div>
            )}

            {/* Asker Info */}
            {errand.asker && (
              <div className="border-t border-gray-200 pt-4">
                <h2 className="font-semibold text-errandify-brown mb-2 text-base">
                  Posted By
                </h2>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-0.5">
                      Name
                    </p>
                    <p className="text-sm text-gray-700">{errand.asker.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-0.5">
                      Contact
                    </p>
                    <p className="text-sm text-gray-700">{errand.asker.mobile}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Posted Date */}
            <div className="text-center border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500 text-xs">
                Posted on{' '}
                {new Date(errand.createdAt).toLocaleDateString('en-SG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Action Button */}
            {errand.status === 'open' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              bidSubmitted || userBidAmount ? (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowChat(true)}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                  >
                    📋 View Details
                  </button>
                  <button
                    onClick={() => setShowBidModal(true)}
                    className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                  >
                    ✏️ Update Bid
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (errand.isRecurring) {
                      setShowSessionSelector(true);
                    } else {
                      setShowBidModal(true);
                    }
                  }}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
                >
                  {errand.isRecurring ? 'Select Sessions' : 'Submit a Bid'}
                </button>
              )
            ) : errand.status === 'open' && currentUser && currentUser.id === errand.askerId ? (
              <div className="flex gap-2 mt-2">
                {!errand.bidCount ? (
                  <button
                    onClick={() => navigate(`/errand/${id}/edit`)}
                    className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                  >
                    Edit Errand
                  </button>
                ) : (
                  <div className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-bold text-center text-base cursor-not-allowed">
                    Locked (Has Bids)
                  </div>
                )}
                <button
                  onClick={handleCancelErrand}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Cancel Errand
                </button>
              </div>
            ) : errand.status === 'confirmed' && currentUser && currentUser.role === 'doer' ? (
              <button
                onClick={handleCompleteErrand}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
              >
                ✓ Mark as Completed
              </button>
            ) : errand.status === 'completed' ? (
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 mt-2 text-center">
                <p className="text-green-800 font-semibold">✓ Completed</p>
                <p className="text-xs text-green-600">Awaiting asker rating</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Your Bid Section - Only for Doers who have bid */}
        {userBidAmount && currentUser && currentUser.id !== errand?.askerId && userRole === 'doer' && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Your Bid</h3>
            <p className="text-sm text-green-700 mb-2">
              Amount: <span className="font-bold text-lg">SGD ${userBidAmount?.toFixed(2)}</span>
            </p>
            <p className="text-xs text-green-600">
              ✓ Bid submitted. Waiting for asker to review.
            </p>
          </div>
        )}

        {/* Bids Section - Only for Asker */}
        {currentUser && currentUser.id === errand?.askerId && (
          <div className="mt-6">
            <BidsViewer
              taskId={errand?.id || 0}
              taskBudget={errand?.budget || 0}
              onBidAccepted={() => fetchErrandDetail()}
            />
          </div>
        )}

        {/* Chat Button - For both Asker and Doer */}
        {errand && errand.status !== 'open' && (
          <button
            onClick={() => setShowChat(true)}
            className="mt-6 w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600"
          >
            💬 Chat with {currentUser?.id === errand.askerId ? 'Doer' : 'Asker'}
          </button>
        )}
      </div>

      {/* Page Container End */}

      {/* Bottom Spacing */}
      <div className="h-8"></div>

      {/* Bid Submission Modal */}
      {showBidModal && errand && !errand.isRecurring && (
        <BidSubmissionModal
          taskId={errand.id}
          taskBudget={errand.budget || 0}
          taskTitle={errand.title}
          existingBidAmount={userBidAmount || undefined}
          askerId={errand.askerId}
          onSuccess={() => {
            setBidSubmitted(true);
            setShowBidModal(false);
            // Reload bid amount
            const bids = JSON.parse(localStorage.getItem('userBids') || '{}');
            setUserBidAmount(bids[errand.id] || null);
          }}
          onClose={() => setShowBidModal(false)}
        />
      )}

      {/* Recurring Errand Session Selector */}
      {showSessionSelector && errand && errand.isRecurring && (
        <RecurringErrandSessionSelector
          errandId={errand.id}
          onSessionsSelected={() => {
            setBidSubmitted(true);
            setShowSessionSelector(false);
          }}
          onCancel={() => setShowSessionSelector(false)}
        />
      )}

      {/* Task Chatbox */}
      {errand && (
        <TaskChatbox
          taskId={errand.id}
          taskTitle={errand.title}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
