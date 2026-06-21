import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CommunityPost {
  id: number;
  author: string;
  authorRole: 'asker' | 'doer';
  authorRating: number;
  content: string;
  category: 'success_story' | 'tip' | 'question' | 'help_needed';
  likes: number;
  comments: number;
  createdAt: string;
  isLiked: boolean;
}

export default function MyKampungPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'discussions' | 'announcements' | 'events' | 'blog' | 'recognition'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMockData();
        return;
      }

      try {
        const postsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/posts`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 3000 }
        );
        setPosts(postsRes.data.data || []);
      } catch (err) {
        console.log('Community posts API not available, using mock data');
        setMockData();
      }
    } catch (err) {
      console.error('Failed to fetch community data:', err);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setPosts([
      {
        id: 1,
        author: 'Sarah Johnson',
        authorRole: 'doer',
        authorRating: 4.8,
        content: 'Just hit 100 completed tasks! Thanks to everyone for the support.',
        category: 'success_story',
        likes: 245,
        comments: 18,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
      },
      {
        id: 2,
        author: 'David Lim',
        authorRole: 'asker',
        authorRating: 4.5,
        content: '💡 Pro tip: Be specific about what you need. Clear instructions lead to better outcomes!',
        category: 'tip',
        likes: 189,
        comments: 12,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
      },
      {
        id: 3,
        author: 'Maya Patel',
        authorRole: 'doer',
        authorRating: 4.9,
        content: 'Has anyone here used the recurring tasks feature? Would love to hear about your experience!',
        category: 'question',
        likes: 76,
        comments: 24,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      success_story: 'bg-orange-100 text-orange-700',
      tip: 'bg-orange-100 text-errandify-orange-700',
      question: 'bg-purple-100 text-purple-700',
      help_needed: 'bg-orange-100 text-orange-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-32">
        <div className="max-w-2xl mx-auto text-center py-8">
          <p className="text-xs text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-32">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-1 text-xs text-gray-600 font-bold">‹ Back</button>

        <div className="mb-2">
          <h1 className="text-base font-bold text-errandify-brown">MyKampung</h1>
          <p className="text-xs text-gray-600">Community • Share • Help</p>
        </div>

        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {['feed', 'discussions', 'announcements', 'events', 'blog', 'recognition'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-1 px-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab ? 'bg-errandify-orange text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tab === 'feed' && '💬'}
              {tab === 'discussions' && '💭'}
              {tab === 'announcements' && '📢'}
              {tab === 'events' && '🎯'}
              {tab === 'blog' && '📖'}
              {tab === 'recognition' && '⭐'}
            </button>
          ))}
        </div>

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="space-y-1">
            {posts.length === 0 ? (
              <div className="bg-white rounded p-2 text-center border border-gray-200 text-xs text-gray-500">
                No posts yet
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded border border-gray-200 p-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-gray-800">{post.author}</p>
                        <span className={`${getCategoryColor(post.category)} px-1 py-0.5 rounded text-xs font-semibold`}>
                          {post.category === 'success_story' ? '✨' : post.category === 'tip' ? '💡' : post.category === 'question' ? '❓' : '🆘'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{post.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(post.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <button className="hover:text-red-500">❤️ {post.likes}</button>
                    <button className="hover:text-blue-500">💬 {post.comments}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* OTHER TABS */}
        {activeTab !== 'feed' && (
          <div className="bg-white rounded border border-gray-200 p-4 text-center text-xs text-gray-500">
            Coming soon...
          </div>
        )}
      </div>
    </div>
  );
}
