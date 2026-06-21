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

  // Redirect askers to their own errands page
  if (userRole === 'asker') {
    navigate('/errands', { replace: true });
    return null;
  }

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

  const categories = [
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', color: 'from-orange-100 to-orange-50' },
    { id: 'cleaning-laundry', name: 'Cleaning & Laundry', icon: '🧺', color: 'from-errandify-orange-100 to-errandify-orange-50' },
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', color: 'from-pink-100 to-pink-50' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', color: 'from-yellow-100 to-yellow-50' },
    { id: 'childcare-tutoring', name: 'Childcare & Tutoring', icon: '🧒', color: 'from-green-100 to-green-50' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', color: 'from-purple-100 to-purple-50' },
    { id: 'tech-support', name: 'Tech Support', icon: '💻', color: 'from-indigo-100 to-indigo-50' },
    { id: 'moving-help', name: 'Moving Help', icon: '🚚', color: 'from-red-100 to-red-50' },
  ];

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
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
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
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header - Compact */}
        <div className="mb-3">
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-semibold mb-1 text-xs"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-errandify-brown">
            {userRole === 'asker' ? 'My Posted Tasks' : 'Browse ToHelp'}
          </h1>
          <p className="text-gray-600 text-xs">
            {userRole === 'asker' ? 'Tasks you have posted' : 'Find errands and earn money'}
          </p>
        </div>

        {userRole === 'asker' && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-xs text-blue-700">
            Switch to Doer role to browse and bid on other posted tasks.
          </div>
        )}

        {/* Tab Selection - Only for Doers */}
        {userRole === 'doer' && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowRecommended(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                !showRecommended
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setShowRecommended(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                showRecommended
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              For You
            </button>
          </div>
        )}

        {/* Search Bar - Only for Doers */}
        {userRole === 'doer' && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange text-xs"
            />
          </div>
        )}

        {/* Category Selection Card - Compact Grid - Only for Doers */}
        {userRole === 'doer' && (
          <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
          <h3 className="text-xs font-semibold text-errandify-brown mb-2 uppercase tracking-wide">
            Categories
          </h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-all hover:shadow-md ${
                    isSelected
                      ? 'bg-errandify-orange text-white shadow-md ring-1 ring-orange-300'
                      : `bg-gradient-to-r ${category.color}`
                  }`}
                >
                  <div className="text-lg mb-0.5">{category.icon}</div>
                  <div className="text-xs leading-tight">{category.name.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedCategories([])}
            className="text-xs text-errandify-orange font-semibold hover:underline"
          >
            Clear
          </button>

          {/* Favorites Filter */}
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              filterFavorites
                ? 'bg-red-500 text-white shadow-md ring-1 ring-red-300'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            ❤️ {filterFavorites ? 'Showing Favorites' : 'Show Favorites'}
            {favorites.size > 0 && ` (${favorites.size})`}
          </button>
          </div>
        )}

        {/* Errands List */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm">Loading errands...</p>
          </div>
        ) : filteredErrands.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm mb-2">
              No errands found{selectedCategories.length > 0 ? ` in selected categories` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}.
            </p>
            {(selectedCategories.length > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSearchQuery('');
                }}
                className="text-errandify-orange font-semibold text-xs hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredErrands.map((errand) => (
              <div
                key={errand.id}
                className="bg-white rounded-lg p-3 shadow hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => navigate(`/errand/${errand.id}`)}
              >
                {/* Bid Badge */}
                {getUserBid(errand.id) && (
                  <div className="absolute top-2 right-2 bg-green-100 border border-green-300 rounded px-2 py-1 text-xs font-semibold text-green-700">
                    Your bid: SGD ${getUserBid(errand.id)?.toFixed(2)}
                  </div>
                )}

                {/* Favorite Heart Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(errand.id);
                  }}
                  className="absolute top-2 left-2 text-xl transition-transform hover:scale-125"
                  title={favorites.has(errand.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favorites.has(errand.id) ? '❤️' : '🤍'}
                </button>

                {/* Title */}
                <h3 className="text-xs font-semibold text-errandify-brown mb-0.5">
                  {errand.title}
                </h3>

                {/* Category Badge */}
                <div className="mb-1">
                  <span className="inline-block bg-orange-100 text-errandify-orange text-xs px-2 py-0.5 rounded-full font-semibold">
                    {categoryNames[errand.category] || errand.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-xs mb-1 line-clamp-1">
                  {errand.description}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {errand.budget && (
                    <div className="text-errandify-orange font-semibold">
                      SGD ${Number(errand.budget).toFixed(2)}
                    </div>
                  )}
                  {errand.location && (
                    <div className="text-gray-600">
                      📍 {getMaskedLocation(errand.location)}
                    </div>
                  )}
                  {errand.deadline && (
                    <div className="text-gray-600">
                      📅 {new Date(errand.deadline).toLocaleDateString()}
                    </div>
                  )}
                  <div className="text-gray-600">
                    ⭐ {errand.askerRating ? errand.askerRating.toFixed(1) : 'New'}
                  </div>
                </div>

                {/* Asker (Alias) */}
                <div className="border-t pt-2 mb-3">
                  <p className="text-xs text-gray-600">Posted by: <span className="font-semibold">{errand.askerName}</span></p>
                </div>

                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/errand/${errand.id}`);
                  }}
                  className="w-full bg-errandify-orange text-white py-1.5 rounded text-xs font-semibold hover:bg-opacity-90 transition-colors"
                >
                  View Details & Bid
                </button>
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
