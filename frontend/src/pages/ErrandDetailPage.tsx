import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BidSubmissionModal from '../components/BidSubmissionModal';
import BidsViewer from '../components/BidsViewer';
import TaskChatbox from '../components/TaskChatbox';
import RecurringErrandSessionSelector from '../components/RecurringErrandSessionSelector';
import TaskQA from '../components/TaskQA';

interface ErrandDetail {
  id: number;
  errandId?: string;
  title: string;
  description?: string;
  notes?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  location?: string;
  postal_code?: string;
  askerId?: number;
  asker?: { name: string; mobile: string };
  doerName?: string;
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
  const [confirmationTimeLeft, setConfirmationTimeLeft] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

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

  // Redirect askers to their own errands page if they try to browse others' posts
  useEffect(() => {
    if (errand && userRole === 'asker' && currentUser && currentUser.id !== errand.askerId) {
      navigate('/errands', { replace: true });
    }
  }, [errand, userRole, currentUser, navigate]);

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

  const getAreaOnly = (location?: string) => {
    if (!location) return null;
    if (location.toLowerCase() === 'remote') return 'Remote';

    // Extract just the district/area name (the part before postal code)
    // Format: "111 Duchess Avenue, Bedok, Singapore 239211"
    // We want: "Bedok"

    // Remove postal code first (6 digits)
    let cleaned = location.replace(/\s*\d{6}\s*/g, '');

    // Split by comma and get the last meaningful part (area name)
    const parts = cleaned.split(',').map(p => p.trim());

    // Filter out 'Singapore' and 'Singapore' entries, get area
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].toLowerCase();
      if (part && part !== 'singapore' && !part.includes('avenue') && !part.includes('street') && !part.includes('road')) {
        return parts[i];
      }
    }

    // Fallback: return last part
    return parts[parts.length - 1] || location;
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
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) {
      return; // User clicked Cancel
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/cancel`,
        { reason: reason || null },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('✓ Errand cancelled. All bids have been rejected.');
      navigate('/errands');
    } catch (error: any) {
      console.error('Failed to cancel errand:', error);
      alert(error.response?.data?.error || 'Failed to cancel errand. Please try again.');
    }
  };

  const handleStartJob = async () => {
    const confirmMessage = `🌟 Ready to Make a Difference?\n\n"${errand.title}"\n\nYou're about to help someone in your community. Your efforts will brighten their day and create positive impact.\n\nLet's get started! 💪`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('🚀 Amazing! You\'ve started the errand.\n\nYou\'re making a real difference in someone\'s life. Thank you for being an awesome community helper! 🌟');
      fetchErrandDetail();
    } catch (error: any) {
      console.error('Failed to start job:', error);
      alert(error.response?.data?.error || 'Failed to start job. Please try again.');
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
    <div className="min-h-screen bg-errandify-bg pb-32">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-2">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-1 text-xs"
        >
          ← Back
        </button>

        {/* Main Errand Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Errand ID Banner */}
          {errand.errandId && (
            <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-600 font-semibold">Errand ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-errandify-brown font-bold">{errand.errandId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(errand.errandId || '');
                  }}
                  className="text-xs text-errandify-orange hover:text-orange-600 font-semibold transition"
                  title="Copy ID"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  disabled={errand.status !== 'open'}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition transform ${
                    errand.status === 'open'
                      ? 'bg-gradient-to-r from-errandify-orange to-orange-500 text-white hover:shadow-md hover:scale-105 animate-pulse cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title={errand.status === 'open' ? 'Share this errand' : 'Cannot share: job is already confirmed'}
                >
                  🚀 SHARE & EARN
                </button>
              </div>
            </div>
          )}
          {/* Header Section */}
          <div className="relative bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-1">
            {/* Title Row + Price */}
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1">
                <h1 className="text-sm font-bold leading-tight">
                  {errand.title}
                  {errand.doerName && <span className="text-xs font-normal text-orange-100"> • Posted by {errand.doerName}</span>}
                </h1>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-0">
                <p className="text-base font-bold text-white">
                  SGD ${userBidAmount ? userBidAmount : errand.budget ? parseFloat(String(errand.budget)).toFixed(0) : '0'}
                </p>
                {userBidAmount && errand.budget && (
                  <p className="text-xs text-orange-100 font-normal">
                    Asker: ${parseFloat(String(errand.budget)).toFixed(0)}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: Category, Status, Offer Status */}
            <div className="flex flex-wrap items-center gap-0.5 mt-0">
              <span
                className={`${getCategoryColor(
                  errand.category
                )} px-1 py-0.5 rounded-full text-xs font-semibold`}
              >
                {errand.category}
              </span>
              <span
                className={`px-1 py-0.5 rounded-full text-xs font-semibold ${
                  errand.status === 'open'
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-400 text-white'
                }`}
              >
                {errand.status}
              </span>
              {userBidAmount && (
                <span className="text-xs bg-white text-errandify-orange px-1 py-0.5 rounded font-bold">
                  ✓ Your offer submitted
                </span>
              )}
            </div>
          </div>

          {/* Chat Button - Top Right (when not open) */}
          {errand.status !== 'open' && (
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setShowChat(true)}
                className="bg-errandify-brown text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-opacity-90 transition-colors"
              >
                💬 Chat
              </button>
            </div>
          )}

          {/* Content Section */}
          <div className="p-1 space-y-1">
            {/* Deadline + Location */}
            <div className="grid grid-cols-1 gap-0.5">
              {errand.deadline && (
                <div className="bg-orange-50 p-1 rounded-lg">
                  <p className="text-xs text-gray-600">Deadline</p>
                  <p className="text-xs text-gray-700">
                    {new Date(errand.deadline).toLocaleDateString('en-SG', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })} {new Date(errand.deadline).toLocaleTimeString('en-SG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {errand.location && (
                <>
                  {/* Area (shown always) */}
                  <div className="bg-orange-50 p-1 rounded-lg border-l-4 border-errandify-orange">
                    <p className="text-xs text-gray-600">Area</p>
                    <p className="text-xs text-gray-700 font-semibold">
                      📍 {getAreaOnly(errand.location)}
                    </p>
                  </div>

                  {/* Full Address (shown only when confirmed) */}
                  {errand.status === 'confirmed' && (
                    <div className="bg-orange-50 p-1 rounded-lg border-l-4 border-errandify-orange">
                      <p className="text-xs text-gray-600">Full Address</p>
                      <p className="text-xs text-gray-700 font-semibold">
                        📍 {errand.location}{errand.postal_code && ` ${errand.postal_code}`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            <div className="border-t border-gray-200 pt-2">
              <h2 className="font-semibold text-errandify-brown mb-1 text-xs">
                About This Errand
              </h2>
              <p className="text-xs text-gray-700 leading-relaxed">
                {errand.description || 'No description provided'}
              </p>
            </div>

            {/* Notes */}
            <div className="border-t border-gray-200 pt-2">
              <h2 className="font-semibold text-errandify-brown mb-1 text-xs">
                📝 Additional Notes
              </h2>
              <p className="text-xs text-gray-700 leading-relaxed">
                {errand.notes || 'No additional notes'}
              </p>
            </div>

            {/* Asker Info - Only show alias */}
            {errand.asker && (
              <div className="border-t border-gray-200 pt-1 pb-1">
                <p className="text-xs text-gray-600 font-semibold mb-0.5">Posted By</p>
                <p className="text-xs text-gray-700 mb-0.5">{errand.asker.display_name || 'Anonymous'}</p>
              </div>
            )}

            {/* Action Button */}
            {errand.status === 'open' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              bidSubmitted || userBidAmount ? (
                <button
                  onClick={() => setShowBidModal(true)}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
                >
                  ✏️ Update Offer
                </button>
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
                  {errand.isRecurring ? 'Select Sessions' : 'Submit an Offer'}
                </button>
              )
            ) : errand.status === 'open' && currentUser && currentUser.id === errand.askerId && !errand.acceptedBidId ? (
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
                    Locked (Has Offers)
                  </div>
                )}
                <button
                  onClick={handleCancelErrand}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Cancel Errand
                </button>
              </div>
            ) : errand.status === 'confirmed' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base"
                >
                  💬 Chat
                </button>
                <button
                  onClick={handleStartJob}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors text-base"
                >
                  ▶️ Start Errand
                </button>
              </div>
            ) : errand.status === 'in_progress' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base"
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => navigate(`/task/${id}/complete`)}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  ✓ Mark as Completed
                </button>
              </div>
            ) : errand.status === 'completed_unconfirmed' && currentUser && currentUser.id === errand.askerId ? (
              <button
                onClick={() => navigate(`/task/${id}/review-completion`)}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base mt-2"
              >
                👁️ Review Completion
              </button>
            ) : errand.status === 'disputed' ? (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mt-2 text-center">
                <p className="text-red-800 font-semibold">⚠️ Under Admin Review</p>
                <p className="text-xs text-red-600">Dispute is being reviewed. Payment is held.</p>
              </div>
            ) : errand.status === 'completed' ? (
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 mt-2 space-y-3">
                {/* Status Header */}
                <div className="text-center pb-3 border-b border-green-200">
                  <p className="text-green-800 font-bold text-lg">✓ Job Completed</p>
                  <p className="text-xs text-green-600 mt-1">Waiting for asker to review and rate your work</p>
                </div>

                {/* Process Flow */}
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-gray-700">📋 What Happens Next:</p>
                  <div className="space-y-1 text-gray-600">
                    <p>✓ You submitted completion evidence</p>
                    <p>⏳ Asker has 48 hours to review</p>
                    <p>⭐ Asker rates your work</p>
                    <p>💰 Payment releases automatically</p>
                  </div>
                </div>

                {/* Doer Actions - Only show if current user is the doer */}
                {currentUser && currentUser.id !== errand.askerId && (
                  <div className="space-y-2 pt-2 border-t border-green-200">
                    <p className="font-semibold text-gray-700 text-xs">📌 Your Options:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowChat(true)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 text-xs transition-all"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => navigate(`/task/${id}/complete`)}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 text-xs transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={errand.status === 'disputed'}
                        title={errand.status === 'disputed' ? 'Cannot add files during dispute' : 'Submit additional files before 48 hours pass'}
                      >
                        📁 Add More Files
                      </button>
                    </div>
                  </div>
                )}

                {/* Asker Actions - Only show if current user is the asker */}
                {currentUser && currentUser.id === errand.askerId && (
                  <div className="space-y-2 pt-2 border-t border-green-200">
                    <p className="font-semibold text-gray-700 text-xs">📌 Your Options:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowChat(true)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 text-xs transition-all"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt('Why do you need to reopen this job? (Explain to doer)');
                          if (reason === null) return;
                          const token = localStorage.getItem('token');
                          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/reopen`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: reason || 'Please revise your work' }),
                          })
                            .then(r => r.json())
                            .then(() => {
                              alert('✓ Job reopened. Doer notified to make changes.');
                              fetchErrandDetail();
                            })
                            .catch(e => alert('Error: ' + e.message));
                        }}
                        className="flex-1 bg-amber-500 text-white py-2 rounded-lg font-semibold hover:bg-amber-600 text-xs transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={errand.status === 'disputed'}
                        title={errand.status === 'disputed' ? 'Cannot reopen during dispute' : 'Request doer to make changes'}
                      >
                        🔄 Request Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>


        {/* Q&A Section */}
        {errand && (
          <TaskQA
            errandId={errand.id}
            isAsker={currentUser?.id === errand.askerId}
            userRole={userRole}
            errandStatus={errand.status}
          />
        )}

        {/* Bids Section - Only for Asker when task is open */}
        {currentUser && currentUser.id === errand?.askerId && errand?.status === 'open' && (
          <div className="mt-6">
            <BidsViewer
              taskId={errand?.id || 0}
              taskBudget={errand?.budget || 0}
              onBidAccepted={() => fetchErrandDetail()}
            />
          </div>
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
          errandDetails={{
            budget: errand.budget,
            deadline: errand.deadline,
            location: errand.location,
            description: errand.description,
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && errand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-2xl font-bold text-errandify-brown mb-2">
              💌 Share & Earn Together!
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Invite a friend to join Errandify. You both earn 50 EP when they complete their first task! 🎁
            </p>

            {/* Get user's referral code */}
            {currentUser && (
              <>
                {/* QR Code */}
                <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">📱 Scan to Join</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`)}`}
                    alt="Referral QR Code"
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">Opens signup with your referral code</p>
                </div>

                {/* Share Link */}
                <div className="bg-orange-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">🔗 Share Link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`}
                      className="flex-1 px-2 py-1.5 bg-white border border-orange-200 rounded text-xs font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`
                        );
                      }}
                      className="px-2 py-1.5 bg-errandify-orange text-white text-xs font-semibold rounded hover:bg-opacity-90 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Share Message */}
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">💬 Share Message (with link):</p>
                  <textarea
                    readOnly
                    value={`🎯 ${errand.title}
📌 Errand ID: ${errand.errandId}

Hi! I found this perfect errand on Errandify and thought of you!

💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}
🎁 We both earn 50 Errandify Points when you complete your first task!

🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}

Let's help each other! 🤝`}
                    className="w-full px-2 py-1.5 bg-white border border-green-200 rounded text-xs resize-none h-32 font-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`
                      );
                    }}
                    className="mt-2 w-full px-2 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
                  >
                    Copy Message
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition text-center"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => {
                      const subject = `Join me on Errandify - ${errand.title}`;
                      const body = `🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`;
                      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                  >
                    Email
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
