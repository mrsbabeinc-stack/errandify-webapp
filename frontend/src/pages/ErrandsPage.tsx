import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';
import { capitalizeStatus } from '../utils/format';
import { checkErrandExpiration, getAskerPreExpirationNotification } from '../utils/errandNotifications';

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
  unviewedBidCount?: number; // Number of unviewed offers
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Phone-only compaction of the header blocks (desktop unchanged)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<string>('all'); // 'all', 'has-offers', 'no-offers'

  console.log('[ErrandsPage] Mounted, userRole:', userRole);

  useEffect(() => {
    // Redirect doers to MyOffer page
    if (userRole === 'doer') {
      console.log('[ErrandsPage] Redirecting doer to /my-offer');
      navigate('/my-offer', { replace: true });
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
    // Show "Rate Now" badge ONLY if status is 'completed' (awaiting user's rating)
    // Status flow: open → confirmed → in_progress → completed → rated (final)
    // Once asker rates: status becomes 'rated' (task is closed and complete)
    if (errand.status === 'completed') {
      return { type: 'awaiting_rating', label: '💛 Rate Now', color: 'bg-amber-400' };
    }
    // If status is 'rated' or 'closed', task is complete - asker already rated
    if (errand.status === 'rated' || errand.status === 'closed') {
      return null; // No action needed - task is complete
    }
    // Show "Respond to Offers" reminder if status is open and has unviewed offers
    if (errand.status === 'open' && (errand.unviewedBidCount ?? 0) > 0) {
      return { type: 'respond_offers', label: '📬 Respond to Offers', color: 'bg-blue-500' };
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

      // Offer filter
      let matchesOffers = true;
      if (offerFilter === 'has-offers') {
        matchesOffers = (errand.bidCount ?? 0) > 0;
      } else if (offerFilter === 'no-offers') {
        matchesOffers = (errand.bidCount ?? 0) === 0;
      }

      return matchesSearch && matchesStatus && matchesOffers;
    })
    .sort((a, b) => {
      // Sort by status priority first (in_progress → confirmed → open → completed → rated/closed)
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by nearest deadline (soonest first)
      const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (deadlineA !== deadlineB) return deadlineA - deadlineB;

      // Finally by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Calculate summary stats
  const getSummary = () => {
    if (userRole !== 'asker') return null;

    const openErrands = filteredErrands.filter(e => e.status === 'open');
    const needsAction = filteredErrands.filter(e => ['open', 'confirmed', 'in_progress'].includes(e.status));
    const waitingRating = filteredErrands.filter(e => e.status === 'completed');

    // Count total undecided offers (bids on open errands)
    const totalUndecidedOffers = openErrands.reduce((sum, e) => sum + (e.bidCount ?? 0), 0);
    const offersErrandCount = openErrands.filter(e => (e.bidCount ?? 0) > 0).length;

    const soonestDeadline = needsAction.length > 0
      ? needsAction.sort((a, b) => new Date(a.deadline || '9999').getTime() - new Date(b.deadline || '9999').getTime())[0]
      : null;

    return {
      needsAction: needsAction.length,
      waitingRating: waitingRating.length,
      soonestDeadline,
      undecidedOffers: totalUndecidedOffers,
      offersErrandCount: offersErrandCount
    };
  };

  const summary = getSummary();

  return (
    <AdminThemeWrapper title="📋 MyErrands" showBackButton onBack={() => navigate('/home')}>
      <div className="max-w-3xl mx-auto">
        {/* Header Subtitle */}
        <div style={{marginBottom: isMobile ? '8px' : '16px', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF5F0 100%)', borderRadius: '12px', padding: isMobile ? '8px 12px' : '16px', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)'}}>
          <p style={{color: '#555', fontSize: isMobile ? '12px' : '14px', margin: 0, fontWeight: '500', lineHeight: '1.4'}}>
            {userRole === 'asker' ? '✨ Manage your posted errands and track all activity' : '✨ View and manage your active errands'} 🎯
          </p>
        </div>

        {/* Summary Section for Askers - URGENT ITEMS */}
        {userRole === 'asker' && summary && (summary.needsAction > 0 || summary.waitingRating > 0 || summary.undecidedOffers > 0) && (
          <div style={{marginBottom: isMobile ? '8px' : '16px', background: 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)', borderRadius: '12px', padding: isMobile ? '10px 12px' : '16px', border: '2px solid #FF6B35', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.2)'}}>
            <p style={{fontSize: '13px', fontWeight: '700', color: '#FF6B35', margin: isMobile ? '0 0 6px 0' : '0 0 12px 0'}}>🚨 REQUIRES IMMEDIATE ATTENTION</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: isMobile ? '5px' : '10px'}}>
              {summary.undecidedOffers > 0 && (
                <div
                  style={{background: 'rgba(255,255,255,0.6)', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'}}
                  onClick={() => setStatusFilter('open')}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                >
                  <p style={{fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 4px 0'}}>
                    💰 {summary.undecidedOffers} offer{summary.undecidedOffers > 1 ? 's' : ''} waiting
                  </p>
                  <p style={{fontSize: '12px', color: '#555', margin: 0}}>
                    From {summary.offersErrandCount} errand{summary.offersErrandCount > 1 ? 's' : ''} - Review before deadline!
                  </p>
                  {summary.soonestDeadline && summary.soonestDeadline.deadline && (
                    <p style={{fontSize: '11px', color: '#999', margin: '4px 0 0 0', fontWeight: '500'}}>
                      ⏰ Expires: {new Date(summary.soonestDeadline.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              {summary.needsAction > 0 && (
                <div
                  className="cursor-pointer hover:bg-orange-200 p-2 rounded transition-colors"
                  onClick={() => summary.soonestDeadline && navigate(`/errand/${summary.soonestDeadline.id}`)}
                >
                  <p className="text-sm font-semibold text-errandify-brown">
                    📋 {summary.needsAction} errand{summary.needsAction > 1 ? 's' : ''} need attention
                  </p>
                  {summary.soonestDeadline && (
                    <p className="text-xs text-gray-700 mt-1">
                      Next deadline: <strong>{summary.soonestDeadline.title}</strong>
                      {summary.soonestDeadline.deadline && ` (${new Date(summary.soonestDeadline.deadline).toLocaleDateString()})`}
                    </p>
                  )}
                </div>
              )}
              {summary.waitingRating > 0 && (
                <div
                  className="cursor-pointer hover:bg-orange-200 p-2 rounded transition-colors"
                  onClick={() => setStatusFilter('completed')}
                >
                  <p className="text-sm font-semibold text-errandify-brown">
                    ⭐ {summary.waitingRating} errand{summary.waitingRating > 1 ? 's' : ''} waiting for your rating
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div style={{marginBottom: '16px'}}>
          <input
            type="text"
            placeholder="🔍 Search by title or category..."
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

        {/* Filters Section */}
        <div className="mb-3 space-y-2">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-1 pb-1">
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
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔄 In Progress
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'confirmed'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✓ Confirmed
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'open'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔓 Open
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✅ Completed
            </button>
            <button
              onClick={() => setStatusFilter('rated')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'rated'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⭐ Rated & Closed
            </button>
          </div>

          {/* Offer Filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setOfferFilter('all')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                offerFilter === 'all'
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📬 All Offers
            </button>
            <button
              onClick={() => setOfferFilter('has-offers')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                offerFilter === 'has-offers'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📬 Has Offers
            </button>
            <button
              onClick={() => setOfferFilter('no-offers')}
              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                offerFilter === 'no-offers'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📬 No Offers
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {error ? (
            <div style={{padding: '16px', background: '#FFE0D6', border: '2px solid #FF6B35', borderRadius: '12px', color: '#333', fontSize: '13px', fontWeight: '500'}}>
              ⚠️ {error}
            </div>
          ) : errands.length === 0 ? (
            <div style={{textAlign: 'center', padding: '32px 24px', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFEFEA 100%)', borderRadius: '16px', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)'}}>
              <p style={{fontSize: '32px', marginBottom: '8px'}}>📋</p>
              <p style={{fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '8px'}}>No errands yet</p>
              <p style={{fontSize: '13px', color: '#555', marginBottom: '16px', fontWeight: '500'}}>
                {userRole === 'asker' ? 'Start by posting your first errand!' : 'Browse and accept errands to earn!'}
              </p>
              <button
                onClick={() => navigate(userRole === 'asker' ? '/create-errand-hana' : '/browse')}
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
                {userRole === 'asker' ? '✍️ Post an Errand' : '🔍 Browse Errands'}
              </button>
            </div>
          ) : filteredErrands.length === 0 ? (
            <div style={{textAlign: 'center', padding: '24px', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF5F0 100%)', borderRadius: '12px', border: '2px solid #FFE0D6', fontSize: '13px', color: '#666'}}>
              🔍 No errands found - Try adjusting your filters
            </div>
          ) : (
            filteredErrands.map((errand) => {
              const pendingAction = getPendingAction(errand);
              return (
              <div
                key={errand.id}
                style={{
                  background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)',
                  borderRadius: '14px',
                  border: '2px solid #FFE0D6',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.15)',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
                  e.currentTarget.style.borderColor = '#FF6B35';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = '#FFE0D6';
                }}
              >
                {/* Balanced 2-Row Card Layout */}
                <div style={{width: '100%', padding: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {/* ROW 1: Status | Title + ID | Actions on Right */}
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap'}}>
                    {/* Left Section: Status + Title + ID */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: isMobile ? '1 1 100%' : 1}}>
                      {/* Status Badge */}
                      <span style={{fontSize: '11px', background: 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)', color: '#FF6B35', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', flexShrink: 0}}>
                        {capitalizeStatus(errand.status)}
                      </span>

                      {/* Title + ID */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-bold text-errandify-brown truncate text-sm">
                            {errand.title}
                          </h3>
                          {!isMobile && (
                            <span className="font-mono text-xs text-gray-400 flex-shrink-0">
                              {errand.errandId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {userRole === 'asker' && (errand.status === 'confirmed' || errand.status === 'in_progress') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chat?errandId=${errand.id}`);
                          }}
                          className="text-lg hover:scale-110 transition-transform"
                          title="Chat"
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
                        title="View"
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
                          title="Copy"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: Category, Postal, Budget, Date, Offers, Rating */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category */}
                    <span
                      className={`${getCategoryColor(
                        errand.category
                      )} px-2 py-0.5 rounded text-xs font-semibold`}
                    >
                      {errand.category}
                    </span>

                    {/* Postal Code */}
                    {(errand.postal_code || errand.postalCode) && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-semibold">
                        📍 {errand.postal_code || errand.postalCode}
                      </span>
                    )}

                    {/* Budget */}
                    {errand.budget && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold">
                        💰 SGD ${errand.budget}
                      </span>
                    )}

                    {/* Date */}
                    {errand.deadline && (
                      <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                        🗓️ {new Date(errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    {/* Offers */}
                    {(errand.bidCount ?? 0) > 0 ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        📬 {errand.bidCount} {errand.bidCount === 1 ? 'Offer' : 'Offers'}
                        {(errand.unviewedBidCount ?? 0) > 0 && (
                          <span className="bg-red-500 text-white rounded-full px-1.5 py-0 text-xs font-bold">
                            {errand.unviewedBidCount}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">
                        📬 No Offers
                      </span>
                    )}

                    {/* Rating Reminder */}
                    {pendingAction && (
                      <span className={`text-xs ${pendingAction.color} text-white px-2 py-0.5 rounded font-bold`}>
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
    </AdminThemeWrapper>
  );
}
