import { useState, useEffect } from 'react';
import axios from 'axios';

interface NewsItem {
  id: string;
  type: 'community' | 'singapore' | 'errandify';
  title: string;
  content: string;
  category?: string;
  image?: string;
  source?: string;
  location?: string;
  postal_code?: string;
  posted_by?: string;
  author?: string;
  created_at?: string;
  url?: string;
}

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'community' | 'singapore' | 'errandify'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [activeTypeFilter]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/news`,
        {
          params: {
            type: activeTypeFilter === 'all' ? undefined : activeTypeFilter,
            limit: 50,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNewsItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setNewsItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique categories from current news items
  const categories = Array.from(
    new Set(newsItems.map((item) => item.category).filter(Boolean))
  ).sort();

  // Filter news based on all active filters
  const filteredNews = newsItems
    .filter((item) => {
      // Type filter
      if (activeTypeFilter !== 'all' && item.type !== activeTypeFilter) {
        return false;
      }

      // Category filter
      if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.source?.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime();
      const dateB = new Date(b.created_at || '').getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'community':
        return 'bg-green-50 border-green-200';
      case 'singapore':
        return 'bg-blue-50 border-blue-200';
      case 'errandify':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'community':
        return '🏘️';
      case 'singapore':
        return '🇸🇬';
      case 'errandify':
        return '🚀';
      default:
        return '📰';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'community':
        return 'Community News';
      case 'singapore':
        return 'Singapore News';
      case 'errandify':
        return 'Errandify News';
      default:
        return 'News';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  const filteredNews = activeFilter === 'all'
    ? newsItems
    : newsItems.filter(item => item.type === activeFilter);

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-2xl mx-auto px-2 py-2">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-lg font-bold text-errandify-brown">📰 MyKampung News</h1>
          <p className="text-xs text-gray-600">Community updates, Singapore news & features</p>
        </div>

        {/* Search Bar */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search news by title, location, source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-errandify-orange"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All News', icon: '📰' },
            { key: 'community', label: 'Community', icon: '🏘️' },
            { key: 'singapore', label: 'Singapore', icon: '🇸🇬' },
            { key: 'errandify', label: 'Errandify', icon: '🚀' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTypeFilter(tab.key as any)}
              className={`py-1 px-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                activeTypeFilter === tab.key
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter & Sort */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {/* Category chips */}
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`py-1 px-2 rounded text-xs font-semibold whitespace-nowrap transition ${
              activeCategoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategoryFilter(category || 'all')}
              className={`py-1 px-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                activeCategoryFilter === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {category}
            </button>
          ))}

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="py-1 px-2 rounded text-xs font-semibold border border-gray-300 focus:outline-none focus:ring-2 focus:ring-errandify-orange ml-auto"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="mb-2 text-xs text-gray-600">
            {filteredNews.length} of {newsItems.length} news items
            {searchQuery && ` matching "${searchQuery}"`}
            {activeCategoryFilter !== 'all' && ` in ${activeCategoryFilter}`}
          </div>
        )}

        {/* News Items */}
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs">Loading news...</div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            <p>No news found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border-2 p-3 hover:shadow-md transition cursor-pointer ${getTypeColor(item.type)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <span className="text-xs font-bold text-gray-600">{getTypeLabel(item.type)}</span>
                      {item.category && (
                        <span className="text-xs bg-white px-2 py-0.5 rounded font-semibold text-gray-700">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-2">{item.title}</h3>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(item.created_at)}</span>
                </div>

                {/* Content */}
                <p className="text-xs text-gray-700 line-clamp-2 mb-2">{item.content}</p>

                {/* Image */}
                {item.image && (
                  <div className="mb-2 rounded overflow-hidden h-32 bg-gray-200">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex flex-wrap gap-2">
                    {item.source && <span className="bg-white px-2 py-0.5 rounded font-semibold">📌 {item.source}</span>}
                    {item.location && <span className="bg-white px-2 py-0.5 rounded font-semibold">📍 {item.location}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500 font-semibold">
                      📅 {item.created_at ? new Date(item.created_at).toLocaleDateString('en-SG', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit'
                      }) : ''} {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : ''}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-errandify-orange font-semibold hover:underline flex items-center gap-1"
                      >
                        Read full story ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
