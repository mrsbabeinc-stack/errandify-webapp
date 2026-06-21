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
  const [confirmationTimeLeft, setConfirmationTimeLeft] = useState<string>('');

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
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('✓ Job started! Get to work.');
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
      <div className="max-w-3xl mx-auto px-3">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-2 text-xs"
        >
          ← Back
        </button>

        {/* Main Errand Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-3">
            <h1 className="text-lg font-bold mb-1">{errand.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`${getCategoryColor(
                  errand.category
                )} px-2 py-0.5 rounded-full text-xs font-semibold`}
              >
                {errand.category}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
          <div className="p-2 space-y-2">
            {/* Budget + Deadline + Location */}
            <div className="grid grid-cols-1 gap-1.5">
              {errand.budget && (
                <div className="bg-orange-50 border-l-4 border-errandify-orange p-1.5 rounded">
                  <p className="text-xs text-gray-600">Budget</p>
                  <p className="text-base font-bold text-errandify-orange">
                    SGD ${parseFloat(String(errand.budget)).toFixed(0)}
                  </p>
                </div>
              )}

              {errand.deadline && (
                <div className="bg-orange-50 p-1.5 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">Deadline</p>
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
                <div className="bg-green-50 p-1.5 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">Location</p>
                  <p className="text-xs text-gray-700">📍 {getMaskedLocation(errand.location)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Exact address shown to confirmed doer only</p>
                </div>
              )}
            </div>

            {/* Description */}
            {errand.description && (
              <div>
                <h2 className="font-semibold text-errandify-brown mb-1 text-sm">
                  About This Errand
                </h2>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {errand.description}
                </p>
              </div>
            )}

            {/* Asker Info - Only show alias (contact hidden until accepted) */}
            {errand.asker && (
              <div className="border-t border-gray-200 pt-4">
                <h2 className="font-semibold text-errandify-brown mb-2 text-base">
                  Posted By
                </h2>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-0.5">
                      Alias
                    </p>
                    <p className="text-sm text-gray-700">{errand.asker.display_name || 'Anonymous'}</p>
                  </div>
                  <div className="text-xs text-gray-500 italic mt-2">
                    Contact info shown only after bid is accepted
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
                <button
                  onClick={() => setShowBidModal(true)}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
                >
                  ✏️ Update Bid
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
            ) : errand.status === 'confirmed' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <button
                onClick={handleStartJob}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors text-base mt-2"
              >
                ▶️ Start Job
              </button>
            ) : errand.status === 'in_progress' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <button
                onClick={() => navigate(`/task/${id}/complete`)}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
              >
                ✓ Mark as Completed
              </button>
            ) : errand.status === 'job_completed' && currentUser && (currentUser.id === errand.askerId || userRole === 'doer') ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    const reason = window.prompt('Why reopen this job?');
                    if (reason === null) return;
                    const token = localStorage.getItem('token');
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/reopen`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: reason || null }),
                    })
                      .then(r => r.json())
                      .then(() => {
                        alert('✓ Job reopened. Work can continue.');
                        fetchErrandDetail();
                      })
                      .catch(e => alert('Error: ' + e.message));
                  }}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Reopen Job
                </button>
                {currentUser.id === errand.askerId && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                  >
                    💬 Talk to Hana
                  </button>
                )}
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
            {errand?.status === 'open' && (
              <p className="text-xs text-green-600">
                ✓ Bid submitted. Waiting for asker to review.
              </p>
            )}
            {errand?.status === 'confirmed' && (
              <div>
                <p className="text-xs text-green-600 mb-3">
                  ✓ Bid accepted! Please confirm you'll do the job.
                </p>
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/confirm`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then(r => r.json())
                      .then(() => {
                        alert('✓ Job confirmed!');
                        fetchErrandDetail();
                      })
                      .catch(e => alert('Error: ' + e));
                  }}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 text-sm"
                >
                  Confirm Job
                </button>
              </div>
            )}
            {errand?.status === 'confirmed_awaiting_start' && (
              <div className="space-y-2">
                <p className="text-xs text-blue-600 font-semibold">
                  ✓ Confirmed. Payment held in escrow.
                </p>
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/start`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then(r => r.json())
                      .then(() => {
                        alert('✓ Job started!');
                        fetchErrandDetail();
                      })
                      .catch(e => alert('Error: ' + e));
                  }}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 text-sm"
                >
                  Start Job
                </button>
              </div>
            )}
            {errand?.status === 'in_progress' && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-blue-600 font-semibold">
                  🔄 Job in progress... Submit work proof before ending.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    What work was completed? (required)
                  </label>
                  <textarea
                    id="workProof"
                    placeholder="Describe the work completed (e.g., 'House cleaned: swept, mopped, dusted all rooms')..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-errandify-orange"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    📷 Photos/Videos (paste image URLs, one per line)
                  </label>
                  <textarea
                    id="workProofUrls"
                    placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-errandify-orange font-mono"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Take before/after photos to strengthen your claim
                  </p>
                </div>

                <button
                  onClick={() => {
                    const proof = (document.getElementById('workProof') as HTMLTextAreaElement)?.value;
                    const urlsText = (document.getElementById('workProofUrls') as HTMLTextAreaElement)?.value;

                    if (!proof?.trim()) {
                      alert('Please describe the work completed');
                      return;
                    }

                    const proofUrls = urlsText
                      ?.split('\n')
                      .map(url => url.trim())
                      .filter(url => url.length > 0) || [];

                    const token = localStorage.getItem('token');
                    // First upload proof
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/work-proof`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ proof_description: proof, proof_urls: proofUrls.length > 0 ? proofUrls : null }),
                    })
                      .then(r => {
                        if (!r.ok) throw new Error('Failed to upload proof');
                        return r.json();
                      })
                      .then(() =>
                        // Then end job
                        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/end`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                        })
                      )
                      .then(r => {
                        if (!r.ok) throw new Error('Failed to end job');
                        return r.json();
                      })
                      .then(() => {
                        alert('✓ Work proof submitted and job ended. Waiting for asker review (48h dispute window).');
                        fetchErrandDetail();
                      })
                      .catch(e => alert('Error: ' + e.message));
                  }}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 text-sm"
                >
                  ✓ End Job & Submit Proof
                </button>
              </div>
            )}
            {errand?.status === 'job_completed' && (
              <div className="space-y-2">
                <p className="text-xs text-orange-600 font-semibold">
                  ⏳ Job completed. Asker has 48 hours to dispute.
                </p>
                <p className="text-xs text-gray-600">
                  Payment will be released if no dispute.
                </p>
              </div>
            )}
          </div>
        )}

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

        {/* Bid Accepted Status - Only for Asker when bid is accepted */}
        {currentUser && currentUser.id === errand?.askerId && errand?.status === 'confirmed' && (
          <div className="mt-6 bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-lg font-bold text-green-800">Bid Accepted!</p>
                <p className="text-sm text-green-700 mt-1">
                  Waiting for doer to confirm they'll do the job (24 hour window)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bid Count Section - Only for Doers */}
        {currentUser && currentUser.id !== errand?.askerId && errand?.status === 'open' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">📊 Bids Received</p>
                <p className="text-xs text-gray-600 mt-1">
                  {errand.bidCount === 0
                    ? 'No bids yet. Be the first!'
                    : `${errand.bidCount} bid${errand.bidCount !== 1 ? 's' : ''} from other doers`}
                </p>
              </div>
              <div className="text-3xl font-bold text-blue-600">{errand.bidCount || 0}</div>
            </div>
          </div>
        )}

        {/* Chat Button - For both Asker and Doer (when not open) */}
        {errand && errand.status !== 'open' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3 font-semibold">
              📋 Task: <span className="text-errandify-brown">{errand.title}</span>
            </p>
            <button
              onClick={() => setShowChat(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              💬 Chat with {currentUser?.id === errand.askerId ? 'Doer' : 'Asker'}
            </button>
            <p className="text-xs text-gray-600 mt-2 italic">
              Questions? Use chat for direct communication about this task.
            </p>
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
        />
      )}
    </div>
  );
}
