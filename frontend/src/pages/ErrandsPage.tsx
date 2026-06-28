import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { capitalizeStatus } from '../utils/format';

interface ErrandsPageProps {
  userRole: 'asker' | 'doer';
}

interface Errand {
  id: number;
  errand_id?: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  location?: string;
  postal_code?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedErrandId, setExpandedErrandId] = useState<number | null>(null);
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
      console.log('[ErrandsPage] First errand:', errandsList[0]);
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
    // Only show "Rate Now" badge if status is exactly 'completed', not 'rated'
    if (errand.status === 'completed' && errand.status !== 'rated') {
      return { type: 'awaiting_rating', label: '⚠️ Rate Now', color: 'bg-red-500' };
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

  // Filter errands
  const filteredErrands = errands.filter((errand) => {
    const matchesSearch = !searchQuery ||
      errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || errand.status === statusFilter;
    return matchesSearch && matchesStatus;
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
                {/* Ultra-Compact Header */}
                <div
                  onClick={() =>
                    setExpandedErrandId(
                      expandedErrandId === errand.id ? null : errand.id
                    )
                  }
                  className="w-full p-2 text-left hover:bg-opacity-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Errand ID + Title & Quick Info */}
                    <div className="flex-1 min-w-0">
                      {/* Title with Errand ID inline */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-gray-500 flex-shrink-0">
                          {errand.errand_id}
                        </span>
                        <h3 className="font-bold text-errandify-brown truncate text-sm">
                          {errand.title}
                        </h3>
                      </div>

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

                        {errand.postal_code && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                            {errand.postal_code}
                          </span>
                        )}

                        {errand.budget && (
                          <span className="text-errandify-orange font-bold text-xs">
                            SGD ${errand.budget}
                          </span>
                        )}

                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">
                          {capitalizeStatus(errand.status)}
                        </span>

                        {pendingAction && (
                          <span className={`text-xs ${pendingAction.color} text-white px-2 py-0.5 rounded-full font-bold`}>
                            {pendingAction.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: MyChat Icon or Expand Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {userRole === 'asker' && errand.status === 'confirmed' && (
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
                      <div className="text-gray-400 text-sm">
                        {expandedErrandId === errand.id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details - Compact */}
                {expandedErrandId === errand.id && (
                  <div className="border-t border-gray-200 px-2 py-2 bg-gray-50 space-y-1.5 text-xs">
                    {errand.description && (
                      <div>
                        <p className="font-semibold text-gray-600">Details</p>
                        <p className="text-gray-700 line-clamp-2">
                          {errand.description}
                        </p>
                      </div>
                    )}

                    {errand.deadline && (
                      <div>
                        <p className="font-semibold text-gray-600">Deadline</p>
                        <p className="text-gray-700">
                          {new Date(errand.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => navigate(`/errand/${errand.id}`)}
                        className="flex-1 bg-errandify-orange text-white py-1.5 rounded font-semibold hover:bg-opacity-90 text-xs"
                      >
                        View
                      </button>
                      {userRole === 'asker' && (
                        <button
                          onClick={() => handleCopyErrand(errand)}
                          className="flex-1 bg-orange-500 text-white py-1.5 rounded font-semibold hover:bg-orange-600 text-xs"
                          title="Copy this errand"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
