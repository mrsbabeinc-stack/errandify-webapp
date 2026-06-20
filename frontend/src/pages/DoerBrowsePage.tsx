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

export default function DoerBrowsePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRecommended, setShowRecommended] = useState(false);

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
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(errand.category);
    const matchesSearch =
      !searchQuery ||
      errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryNames[errand.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header - Compact */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-semibold mb-2 text-sm"
          >
            ← Back to Home
          </button>
          <h1 className="text-2xl font-bold text-errandify-brown">Browse ToHelp</h1>
          <p className="text-gray-600 text-sm">Find errands you can help with and earn money</p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowRecommended(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
              !showRecommended
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Browse All
          </button>
          <button
            onClick={() => setShowRecommended(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
              showRecommended
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            For You
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search errands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange text-sm"
          />
        </div>

        {/* Category Selection Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 mb-6">
          <h3 className="text-xs font-semibold text-errandify-brown mb-3 uppercase tracking-wide">
            Quick Categories (To Select)
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all hover:shadow-md ${
                    isSelected
                      ? 'bg-errandify-orange text-white shadow-md ring-2 ring-orange-300'
                      : `bg-gradient-to-r ${category.color}`
                  }`}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                  {isSelected && ' ✓'}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedCategories([])}
            className="text-xs text-errandify-orange font-semibold hover:underline"
          >
            Clear all
          </button>
        </div>

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
          <div className="space-y-3">
            {filteredErrands.map((errand) => (
              <div
                key={errand.id}
                className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/errand/${errand.id}`)}
              >
                {/* Title */}
                <h3 className="text-sm font-semibold text-errandify-brown mb-1">
                  {errand.title}
                </h3>

                {/* Category Badge */}
                <div className="mb-2">
                  <span className="inline-block bg-orange-100 text-errandify-orange text-xs px-2 py-0.5 rounded-full font-semibold">
                    {categoryNames[errand.category] || errand.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                  {errand.description}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  {errand.budget && (
                    <div className="text-errandify-orange font-semibold">
                      SGD ${typeof errand.budget === 'string' ? errand.budget : errand.budget.toFixed(2)}
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

                {/* Asker */}
                <div className="border-t pt-2 mb-3">
                  <p className="text-xs text-gray-600">By: <span className="font-semibold">{errand.askerName}</span></p>
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
