import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Errand {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string;
  deadline: string | null;
  category: string;
  askerName: string;
  askerRating: number;
}

interface Props {
  userRole?: 'asker' | 'doer';
}

export default function DoerBrowsePage({ userRole = 'doer' }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRecommended, setShowRecommended] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userBids, setUserBids] = useState<Record<string, number>>({}); // taskId -> bidAmount
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Redirect askers to their own errands page
  useEffect(() => {
    if (userRole === 'asker') {
      navigate('/errands', { replace: true });
    }
  }, [userRole, navigate]);

  const categories = [
    // GROUP 1: HOME & HOUSEHOLD
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', color: 'from-orange-100 to-orange-50', group: '🏠 Home & Household' },
    { id: 'cleaning-household', name: 'Cleaning & Household', icon: '🧹', color: 'from-errandify-orange-100 to-errandify-orange-50', group: '🏠 Home & Household' },
    { id: 'food-beverage', name: 'Food & Beverage', icon: '🍕', color: 'from-red-100 to-red-50', group: '🏠 Home & Household' },
    { id: 'furniture-assembly', name: 'Furniture & Assembly', icon: '🛋️', color: 'from-amber-100 to-amber-50', group: '🏠 Home & Household' },

    // GROUP 2: ERRANDS & LOGISTICS
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', color: 'from-pink-100 to-pink-50', group: '🚚 Errands & Logistics' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', color: 'from-yellow-100 to-yellow-50', group: '🚚 Errands & Logistics' },
    { id: 'travel-mobility', name: 'Travel & Mobility', icon: '✈️', color: 'from-sky-100 to-sky-50', group: '🚚 Errands & Logistics' },
    { id: 'event-planning', name: 'Event Planning', icon: '✨', color: 'from-violet-100 to-violet-50', group: '🚚 Errands & Logistics' },

    // GROUP 3: CARE & WELLBEING
    { id: 'childcare-education', name: 'Childcare & Education', icon: '🧒', color: 'from-green-100 to-green-50', group: '❤️ Care & Wellbeing' },
    { id: 'eldercare-healthcare', name: 'Eldercare & Healthcare', icon: '👵', color: 'from-gray-100 to-gray-50', group: '❤️ Care & Wellbeing' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', color: 'from-purple-100 to-purple-50', group: '❤️ Care & Wellbeing' },
    { id: 'personal-care', name: 'Personal Care & Wellness', icon: '💆', color: 'from-rose-100 to-rose-50', group: '❤️ Care & Wellbeing' },

    // GROUP 4: SKILLS & SERVICES
    { id: 'tech-support', name: 'Tech Support & IT', icon: '💻', color: 'from-indigo-100 to-indigo-50', group: '💡 Skills & Services' },
    { id: 'creative-arts', name: 'Creative & Arts', icon: '🎨', color: 'from-fuchsia-100 to-fuchsia-50', group: '💡 Skills & Services' },
    { id: 'admin-business', name: 'Admin & Business', icon: '📚', color: 'from-slate-100 to-slate-50', group: '💡 Skills & Services' },
    { id: 'charity-community', name: 'Charity & Community', icon: '❤️', color: 'from-red-100 to-red-50', group: '💡 Skills & Services' },
  ];

  const categoryNames: Record<string, string> = {
    // New category names
    'home-maintenance': 'Home Maintenance',
    'cleaning-household': 'Cleaning & Household',
    'food-beverage': 'Food & Beverage',
    'furniture-assembly': 'Furniture & Assembly',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'travel-mobility': 'Travel & Mobility',
    'event-planning': 'Event Planning',
    'childcare-education': 'Childcare & Education',
    'eldercare-healthcare': 'Eldercare & Healthcare',
    'pet-care': 'Pet Care',
    'personal-care': 'Personal Care & Wellness',
    'tech-support': 'Tech Support & IT',
    'creative-arts': 'Creative & Arts',
    'admin-business': 'Admin & Business',
    'charity-community': 'Charity & Community',
    // Legacy/old category names (for backward compatibility with existing errands)
    'cleaning-laundry': 'Cleaning & Household',
    'childcare-tutoring': 'Childcare & Education',
    'moving-help': 'Delivery & Moving',
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const saveBid = (taskId: string, amount: number) => {
    const bids = { ...userBids, [taskId]: amount };
    setUserBids(bids);
    localStorage.setItem('userBids', JSON.stringify(bids));
  };

  const getUserBid = (taskId: string) => {
    return userBids[taskId];
  };

  const toggleFavorite = (errandId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(errandId)) {
      newFavorites.delete(errandId);
    } else {
      newFavorites.add(errandId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('errandFavorites', JSON.stringify(Array.from(newFavorites)));
  };

  const getMaskedLocation = (location?: string) => {
    if (!location) return null;
    if (location.toLowerCase() === 'remote') return 'Remote';
    const postalMatch = location.match(/\d{6}/);
    if (postalMatch) {
      return `Singapore ${postalMatch[0]}`;
    }
    if (location.toLowerCase().includes('singapore')) {
      return location.split(',')[0];
    }
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  useEffect(() => {
    // Load user bids from localStorage
    const savedBids = localStorage.getItem('userBids');
    if (savedBids) {
      try {
        setUserBids(JSON.parse(savedBids));
      } catch (e) {
        console.error('Failed to parse user bids:', e);
      }
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('errandFavorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Load from URL params if available
    const urlCategories = searchParams.get('categories');
    if (urlCategories) {
      setSelectedCategories(urlCategories.split(','));
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }

        const params = showRecommended ? '?recommended=true' : '';
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands${params}`;
        console.log('[DoerBrowse] Fetching errands from:', apiUrl);
        console.log('[DoerBrowse] Token exists:', !!token);

        const response = await axios.get(
          apiUrl,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log('[DoerBrowse] Response received:', response.data);
        console.log('[DoerBrowse] Errands count:', response.data.data?.length || 0);
        setErrands(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load errands');
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [showRecommended]);

  const filteredErrands = errands.filter((errand) => {
    // Filter by role
    if (userRole === 'asker') {
      // Askers only see their own posted tasks
      if (errand.askerName !== undefined && currentUserId) {
        // Can't reliably check ownership by name, so show all for now
        // Backend should filter this
      }
    } else {
      // Doers can only see other people's tasks (not their own if they posted)
      // This is handled by backend already
    }

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(errand.category);
    const matchesSearch =
      !searchQuery ||
      errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryNames[errand.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !filterFavorites || favorites.has(errand.id);
    return matchesCategory && matchesSearch && matchesFavorite;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-errandify-bg pb-20">
      <div className="max-w-2xl mx-auto px-2 py-1">
        {/* Header - Warm & Compact */}
        <div className="mb-2">
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-bold text-xs hover:text-orange-600 transition mb-1"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-errandify-brown">
            {userRole === 'asker' ? 'My Posted Tasks' : 'Browse ToHelp'}
          </h1>
          <p className="text-gray-600 text-xs">
            {userRole === 'asker' ? 'Tasks you have posted' : 'Find errands and earn money'}
          </p>
        </div>

        {userRole === 'asker' && (
          <div className="bg-blue-100 border border-blue-300 p-2 rounded-lg mb-2 text-xs text-blue-800 font-medium">
            💡 Switch to Doer role to browse and bid on tasks.
          </div>
        )}

        {/* Tab Selection - Warm Style */}
        {userRole === 'doer' && (
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setShowRecommended(false)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs transition-all ${
                !showRecommended
                  ? 'bg-gradient-to-r from-errandify-orange to-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setShowRecommended(true)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs transition-all ${
                showRecommended
                  ? 'bg-gradient-to-r from-errandify-orange to-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              For You
            </button>
          </div>
        )}

        {/* Search Bar */}
        {userRole === 'doer' && (
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange focus:ring-1 focus:ring-orange-200 text-xs"
            />
          </div>
        )}

        {/* Category Selection Card - Warm & Compact */}
        {userRole === 'doer' && (
          <div className="bg-white rounded-xl p-2 border border-orange-100 shadow-sm mb-2">
          <h3 className="text-xs font-bold text-errandify-brown mb-1.5 uppercase tracking-wide">
            🎯 Categories <span className="text-gray-500 font-normal">(Click to Select)</span>
          </h3>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-1.5 py-1 rounded text-xs font-medium transition-all hover:shadow-md ${
                    isSelected
                      ? 'bg-errandify-orange text-white shadow-md ring-1 ring-orange-300'
                      : `bg-gradient-to-r ${category.color}`
                  }`}
                >
                  <div className="text-sm mb-0.5">{category.icon}</div>
                  <div className="text-xs leading-tight">{category.name.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategories([])}
              className="text-xs text-errandify-orange font-semibold hover:underline"
            >
              Clear
            </button>

            {/* Favorites Filter - Inline */}
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                filterFavorites
                  ? 'bg-red-500 text-white shadow-md ring-1 ring-red-300'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              ❤️ {filterFavorites ? 'Favorites' : 'Show Favorites'}
              {favorites.size > 0 && ` (${favorites.size})`}
            </button>
          </div>
          </div>
        )}

        {/* Errands List */}
        {error && (
          <div className="p-2 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs mb-2 font-medium">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-6">
            <p className="text-gray-600 text-xs">Loading errands...</p>
          </div>
        ) : filteredErrands.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-xl p-3 border border-orange-100 shadow-sm">
            <p className="text-gray-700 text-xs font-medium mb-1.5">
              😊 No errands found{selectedCategories.length > 0 ? ` in selected categories` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}.
            </p>
            {(selectedCategories.length > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSearchQuery('');
                }}
                className="text-errandify-orange font-semibold text-xs hover:text-orange-600 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredErrands.map((errand) => (
              <div
                key={errand.id}
                className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer border border-orange-50"
                onClick={() => navigate(`/errand/${errand.id}`)}
              >
                {/* Title + Budget + Your Bid */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-errandify-brown leading-tight line-clamp-1">
                      {errand.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="inline-block bg-gradient-to-r from-orange-100 to-orange-50 text-errandify-orange text-xs px-1.5 py-0.5 rounded-full font-semibold border border-orange-200">
                        {categoryNames[errand.category] || errand.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-errandify-orange">
                      ${Number(errand.budget || 0).toFixed(0)}
                    </span>
                    {getUserBid(errand.id) && (
                      <div className="bg-green-100 border border-green-300 rounded-full px-1.5 py-0.5 text-xs font-bold text-green-700 whitespace-nowrap">
                        ✓ ${getUserBid(errand.id)?.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location + Heart + Rating + Name */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 flex-wrap">
                  {errand.location && (
                    <span className="bg-orange-50 px-1.5 py-0.5 rounded-full text-gray-700 font-medium">
                      📍 {getMaskedLocation(errand.location)}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(errand.id);
                    }}
                    className="text-base transition-transform hover:scale-125"
                    title={favorites.has(errand.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.has(errand.id) ? '❤️' : '🤍'}
                  </button>
                  <span className="font-semibold">⭐ {errand.askerRating ? errand.askerRating.toFixed(1) : 'New'}</span>
                  <span className="text-gray-700 font-medium">{errand.askerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredErrands.length > 0 && (
          <div className="mt-4 text-center text-xs text-gray-600">
            Showing {filteredErrands.length} errand{filteredErrands.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
