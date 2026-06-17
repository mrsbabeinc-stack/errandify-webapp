import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BidSubmissionModal from '../components/BidSubmissionModal';
import BidsViewer from '../components/BidsViewer';

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
}

interface UserProfile {
  id: number;
  role: 'asker' | 'doer';
}

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    fetchErrandDetail();
  }, [id]);

  const fetchErrandDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setErrand(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'pet-care': 'bg-amber-100 text-amber-700',
      'cleaning-laundry': 'bg-blue-100 text-blue-700',
      'shopping-errands': 'bg-green-100 text-green-700',
      'tech-support': 'bg-purple-100 text-purple-700',
      'childcare-tutoring': 'bg-pink-100 text-pink-700',
      'home-maintenance': 'bg-orange-100 text-orange-700',
      'delivery-moving': 'bg-indigo-100 text-indigo-700',
      'moving-help': 'bg-red-100 text-red-700',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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
          <div className="text-center py-12">
            <p className="text-red-600 text-sm">{error || 'Errand not found'}</p>
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
                  SGD ${errand.budget.toFixed(2)}
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
              <div className="bg-blue-50 p-4 rounded-lg">
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
            {errand.status === 'open' && currentUser && currentUser.id !== errand.askerId ? (
              <button
                onClick={() => setShowBidModal(true)}
                className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
              >
                {bidSubmitted ? '✓ Bid Submitted' : 'Submit a Bid'}
              </button>
            ) : errand.status === 'open' && currentUser && currentUser.id === errand.askerId ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => navigate(`/errand/${id}/edit`)}
                  className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Edit Errand
                </button>
                <button
                  onClick={handleCancelErrand}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Cancel Errand
                </button>
              </div>
            ) : null}
          </div>
        </div>

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
          </div>
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-8"></div>

      {/* Bid Submission Modal */}
      {showBidModal && errand && (
        <BidSubmissionModal
          taskId={errand.id}
          taskBudget={errand.budget || 0}
          taskTitle={errand.title}
          onSuccess={() => {
            setBidSubmitted(true);
            setShowBidModal(false);
          }}
          onClose={() => setShowBidModal(false)}
        />
      )}
    </div>
  );
}
