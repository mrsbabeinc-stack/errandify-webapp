import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Errand {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  bidCount: number;
  askerId: number;
  askerName: string;
  askerRating: number;
  askerReviews: number;
  createdAt: string;
}

interface Category {
  name: string;
  taskCount: number;
  openTasks: number;
  averageBudget: number;
  restricted: boolean;
}

export default function SearchBrowsePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minBudget, setMinBudget] = useState(parseInt(searchParams.get('minBudget') || '0', 10));
  const [maxBudget, setMaxBudget] = useState(parseInt(searchParams.get('maxBudget') || '10000', 10));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
    performSearch();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/categories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(response.data.data.accessible);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ...(searchQuery && { q: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        minBudget: minBudget.toString(),
        maxBudget: maxBudget.toString(),
        sortBy,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/search?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setErrands(response.data.data.errands);

      // Update URL with filters
      setSearchParams({
        ...(searchQuery && { q: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        minBudget: minBudget.toString(),
        maxBudget: maxBudget.toString(),
        sortBy,
      });
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/search/suggestions?q=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinBudget(0);
    setMaxBudget(10000);
    setSortBy('newest');
    setShowFilters(false);
    performSearch();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔍 Browse Tasks</h1>
          <p className="text-gray-600">Find tasks that match your skills and earn money</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">🎛️ Filters</h2>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Reset
                </button>
              </div>

              {/* Budget Range */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Budget Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">Min: SGD ${minBudget}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={minBudget}
                      onChange={(e) => setMinBudget(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max: SGD ${maxBudget}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Category</p>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.openTasks} tasks)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Sort By</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="budget-low">Budget (Low to High)</option>
                  <option value="budget-high">Budget (High to Low)</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={performSearch}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                🔍 Apply Filters
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  placeholder="Search tasks... (e.g., 'cleaning', 'delivery')"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300"
                >
                  ⚙️ Filters
                </button>
              </div>

              {/* Suggestions */}
              {suggestions && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-semibold mb-2">💡 {suggestions.aiInsight}</p>
                  {suggestions.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.categories.map((cat: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedCategory(cat.category);
                            performSearch();
                          }}
                          className="px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-xs font-semibold hover:bg-blue-300"
                        >
                          {cat.category} (~${cat.avgBudget}/task)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Results Count */}
            <div className="mb-4 text-gray-600">
              Found <strong>{errands.length}</strong> tasks
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory && ` in ${selectedCategory}`}
            </div>

            {/* Errands List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading tasks...</p>
              </div>
            ) : errands.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 text-lg mb-4">No tasks found</p>
                <p className="text-gray-400 text-sm mb-4">Try different filters or search terms</p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {errands.map((errand) => (
                  <div
                    key={errand.id}
                    onClick={() => navigate(`/errand/${errand.id}`)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{errand.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">{errand.description.substring(0, 100)}...</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            {errand.category}
                          </span>
                          <span>📍 Posted {formatDate(errand.createdAt)}</span>
                          <span>💬 {errand.bidCount} bids</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">SGD ${errand.budget}</p>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">By {errand.askerName}</p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-semibold">
                              {errand.askerRating ? errand.askerRating.toFixed(1) : 'New'}
                            </span>
                            <span className="text-xs text-gray-500">({errand.askerReviews})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
