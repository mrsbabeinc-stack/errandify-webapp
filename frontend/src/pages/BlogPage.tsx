import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  featured_image_url: string;
  category: string;
  author: string;
  published_at: string;
  read_time_minutes: number;
  view_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPosts(1, selectedCategory);
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/blog/categories`
      );
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async (page: number, category?: string) => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL || window.location.origin}/api/blog?page=${page}&limit=6`;
      if (category) {
        url += `&category=${category}`;
      }

      const response = await axios.get(url);
      setPosts(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/blog/search?q=${encodeURIComponent(searchQuery)}`
      );
      setPosts(response.data.data);
      setPagination(null);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePostClick = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">📚 Errandify Blog</h1>
          <p className="text-gray-600">Stories, strategies, and support for working families in Singapore</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-errandify-orange focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 top-3 text-errandify-orange hover:text-orange-600"
            >
              🔍
            </button>
          </div>
        </form>

        {/* Categories Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              selectedCategory === ''
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Articles
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => handleCategoryChange(cat.category)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                selectedCategory === cat.category
                  ? 'bg-errandify-orange text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat.category} ({cat.post_count})
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading articles...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No articles found</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.slug)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
                >
                  {post.featured_image_url && (
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-errandify-orange text-white px-2 py-1 rounded">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500">{post.read_time_minutes} min read</span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{post.subtitle || post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(post.published_at).toLocaleDateString()}</span>
                      <span>👁️ {post.view_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mb-8">
                <button
                  onClick={() => fetchPosts(Math.max(1, currentPage - 1), selectedCategory)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                >
                  ← Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => fetchPosts(page, selectedCategory)}
                    className={`px-3 py-2 rounded ${
                      page === currentPage
                        ? 'bg-errandify-orange text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => fetchPosts(Math.min(pagination.pages, currentPage + 1), selectedCategory)}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
