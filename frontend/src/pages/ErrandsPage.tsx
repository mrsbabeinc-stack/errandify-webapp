import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { capitalizeStatus } from '../utils/format';

interface ErrandsPageProps {
  userRole: 'asker' | 'doer';
}

interface Errand {
  id: number;
  errandId?: string; // API returns camelCase
  title: string;
  description?: string;
  category: string;
  status: string;
  budget?: number | string;
  deadline?: string;
  location?: string;
  postal_code?: string;
  postalCode?: string;
  isRecurring?: boolean;
  createdAt: string;
  askerName?: string;
  askerRating?: number;
  bidCount?: number; // Number of bids/offers received
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  console.log('[ErrandsPage] Mounted, userRole:', userRole);

  useEffect(() => {
    // Redirect doers to MyBids page
    if (userRole === 'doer') {
      console.log('[ErrandsPage] Redirecting doer to /my-bids');
      navigate('/my-bids', { replace: true });
      return;
    }

    console.log('[ErrandsPage] useEffect triggered, userRole:', userRole);
    fetchErrands();
  }, [userRole, navigate]);

  const fetchErrands = async () => {
    let url = '';
    let token = '';

    try {
      console.log('[ErrandsPage] fetchErrands called, userRole:', userRole);
      token = localStorage.getItem('token') || '';

      if (!token) {
        console.error('[ErrandsPage] No token found');
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`;

      if (userRole === 'asker') {
        // Askers see their posted errands
        url += '?myOnly=true';
        console.log('[ErrandsPage] Asker - fetching my errands from:', url);
      } else {
        // Doers see their accepted errands
        url += '?accepted=true';
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[ErrandsPage] API Response received:', response.data);
      const errandsList = response.data.data || [];
      console.log('[ErrandsPage] Errands count:', errandsList.length);
      setErrands(errandsList);
    } catch (err: any) {
      console.error('Failed to fetch errands:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        url: url,
        token: token ? 'present' : 'missing'
      });
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
      } else if (err.response?.status === 400) {
        setError(`Bad request: ${err.response?.data?.error || err.message}`);
      } else if (err.response?.status === 500) {
        setError(`Server error: ${err.response?.data?.error || 'Please try again'}`);
      } else {
        setError(`Failed to fetch errands: ${err.response?.data?.error || err.message || 'Unknown error'}`);
      }
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

  const getPendingAction = (errand: Errand) => {
    // Only show "Rate Now" badge if status is exactly 'completed'
    if (errand.status === 'completed') {
      return { type: 'awaiting_rating', label: '💛 Rate Now', color: 'bg-amber-400' };
    }
    return null;
  };

  const getStatusBarColor = (errand: Errand) => {
    const pendingAction = getPendingAction(errand);
    if (pendingAction?.type === 'awaiting_rating') return 'border-l-4 border-red-500 bg-red-50';
    if (errand.status === 'in_progress') return 'border-l-4 border-blue-500 bg-blue-50';
    if (errand.status === 'completed') return 'border-l-4 border-orange-500 bg-orange-50';
    if (errand.status === 'rated') return 'border-l-4 border-green-500 bg-green-50';
    if (errand.status === 'confirmed') return 'border-l-4 border-purple-500 bg-purple-50';
    return 'border-l-4 border-gray-300 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCopyErrand = (errand: Errand) => {
    // Store errand data in sessionStorage for create-errand page to use
    sessionStorage.setItem('copyErrandData', JSON.stringify({
      title: errand.title,
      description: errand.description,
      category: errand.category,
      budget: errand.budget,
      deadline: errand.deadline,
      location: errand.location,
      isRecurring: errand.isRecurring,
    }));

    // Navigate to create errand page
    navigate('/create-errand');
  };

  const pageTitle = userRole === 'asker' ? 'MyErrands' : 'MyErrands';
  const pageSubtitle = userRole === 'asker' ? 'Errands you have posted' : 'Errands you have accepted';

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="text-center py-12 text-gray-500">
            Loading errands...
          </div>
        </div>
      </div>
    );
  }

  // Define status priority for sorting (lowest number = first)
  const statusPriority: Record<string, number> = {
    'in_progress': 0,
    'confirmed': 1,
    'open': 2,
    'completed': 3,
    'rated': 4,
    'closed': 4,
  };

  const getStatusPriority = (status: string) => statusPriority[status] ?? 99;

  // Filter errands
  const filteredErrands = errands
    .filter((errand) => {
      const matchesSearch = !searchQuery ||
        errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        errand.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || errand.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by status priority first (in_progress → confirmed → open → completed → rated/closed)
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      // Then by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Get unique statuses
  const uniqueStatuses = Array.from(new Set(errands.map(e => e.status)));

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-3xl mx-auto px-2 py-2">
        {/* Page Header - Compact */}
        <div className="mb-2">
          <h1 className="text-lg font-bold text-errandify-brown">
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-600">
            {pageSubtitle}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-errandify-orange"
          />
        </div>

        {/* Status Filter - Horizontal Chips */}
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {uniqueStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="space-y-1">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          ) : errands.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4 text-sm">No errands yet</p>
              <button
                onClick={() => navigate(userRole === 'asker' ? '/create-errand' : '/')}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 text-sm inline-block"
              >
                {userRole === 'asker' ? 'Post an Errand' : 'Browse Errands'}
              </button>
            </div>
          ) : filteredErrands.length === 0 ? (
            <div className="text-center py-6 bg-white rounded border border-gray-200 text-xs text-gray-500">
              No errands found
            </div>
          ) : (
            filteredErrands.map((errand) => {
              const pendingAction = getPendingAction(errand);
              return (
              <div
                key={errand.id}
                className={`bg-white rounded border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${getStatusBarColor(errand)}`}
              >
                {/* Redesigned Card Layout */}
                <div className="w-full p-2 text-left">
                  {/* Top Row: Status + View/Copy Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-semibold">
                      {capitalizeStatus(errand.status)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {userRole === 'asker' && (errand.status === 'confirmed' || errand.status === 'in_progress') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chat?errandId=${errand.id}`);
                          }}
                          className="text-lg hover:scale-110 transition-transform"
                          title="Chat about this task"
                        >
                          💬
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/errand/${errand.id}`);
                        }}
                        className="px-2 py-1 bg-errandify-orange text-white text-xs rounded font-semibold hover:bg-opacity-90 transition"
                        title="View errand details"
                      >
                        View
                      </button>
                      {userRole === 'asker' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyErrand(errand);
                          }}
                          className="px-2 py-1 bg-orange-500 text-white text-xs rounded font-semibold hover:bg-orange-600 transition"
                          title="Copy this errand"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title Row: Title on left, Errand ID on right */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-errandify-brown truncate text-sm flex-1">
                      {errand.title}
                    </h3>
                    <span className="font-mono text-xs font-bold text-gray-500 flex-shrink-0">
                      {errand.errandId}
                    </span>
                  </div>

                  {/* Quick Info Row: Category, Postal, Budget, Date, Offers, Rate Badge */}
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className="text-gray-500 text-xs">
                      {formatDate(errand.createdAt)}
                    </span>

                    <span
                      className={`${getCategoryColor(
                        errand.category
                      )} px-1.5 py-0.5 rounded text-xs font-semibold`}
                    >
                      {errand.category}
                    </span>

                    {(errand.postal_code || errand.postalCode) && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                        {errand.postal_code || errand.postalCode}
                      </span>
                    )}

                    {errand.budget && (
                      <span className="text-errandify-orange font-bold text-xs">
                        SGD ${errand.budget}
                      </span>
                    )}

                    {errand.deadline && (
                      <span className="text-gray-600 text-xs">
                        🗓️ {new Date(errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    {(errand.bidCount ?? 0) > 0 ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                        📋 {errand.bidCount} {errand.bidCount === 1 ? 'Offer' : 'Offers'}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                        📋 No Offers
                      </span>
                    )}

                    {pendingAction && (
                      <span className={`text-xs ${pendingAction.color} text-white px-2 py-0.5 rounded-full font-bold`}>
                        {pendingAction.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-8"></div>
    </div>
  );
}
