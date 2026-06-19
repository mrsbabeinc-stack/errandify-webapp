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

interface Discussion {
  id: number;
  title: string;
  author: string;
  category: 'general' | 'tips' | 'issues' | 'feedback';
  replies: number;
  views: number;
  lastUpdated: string;
}

export default function MyKampungPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'discussions'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [postsRes, discussionsRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/posts`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/discussions`,
          { headers }
        ),
      ]);

      setPosts(postsRes.data.data || []);
      setDiscussions(discussionsRes.data.data || []);
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
        content: 'Just hit 100 completed tasks! Thanks to everyone in the Errandify community for the support. The tips here really helped me grow my doer rating.',
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
        content: '💡 Pro tip: When posting tasks, be as specific as possible about what you need. Clear instructions lead to better outcomes and happier doers!',
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
        content: 'Has anyone here used the recurring tasks feature? Would love to hear about your experience and how it helped your workflow!',
        category: 'question',
        likes: 76,
        comments: 24,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
      },
      {
        id: 4,
        author: 'Ahmad Hassan',
        authorRole: 'doer',
        authorRating: 4.7,
        content: 'Looking for doers with experience in home maintenance. I have several tasks but my current team is fully booked. Any recommendations?',
        category: 'help_needed',
        likes: 45,
        comments: 8,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
      },
    ]);

    setDiscussions([
      {
        id: 1,
        title: 'Best practices for pricing tasks in 2026',
        author: 'Sarah Chen',
        category: 'tips',
        replies: 34,
        views: 512,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        title: 'New feature feedback: Recurring Tasks',
        author: 'Product Team',
        category: 'feedback',
        replies: 156,
        views: 2341,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        title: 'Common issues with payment processing',
        author: 'Support Team',
        category: 'issues',
        replies: 67,
        views: 845,
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        title: 'General discussion: Growing the Errandify community',
        author: 'Community Manager',
        category: 'general',
        replies: 89,
        views: 1203,
        lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  };

  const handleLikePost = (postId: number) => {
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handlePostComment = (postId: number) => {
    if (newPostText.trim()) {
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      ));
      setNewPostText('');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'success_story':
        return 'bg-green-100 text-green-700';
      case 'tip':
        return 'bg-blue-100 text-blue-700';
      case 'question':
        return 'bg-purple-100 text-purple-700';
      case 'help_needed':
        return 'bg-orange-100 text-orange-700';
      case 'general':
        return 'bg-gray-100 text-gray-700';
      case 'tips':
        return 'bg-blue-100 text-blue-700';
      case 'issues':
        return 'bg-red-100 text-red-700';
      case 'feedback':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading kampung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>

        {/* Header with CTAs */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🏘️ MyKampung</h1>
          <p className="text-gray-600">Connect with the community, share stories, and learn together</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate('/community-hub')}
              className="bg-errandify-orange text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
            >
              📢 Community Hub
            </button>
            <button
              onClick={() => navigate('/my-account')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
            >
              👥 Manage Trust
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'feed'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            💬 Community Feed
          </button>
          <button
            onClick={() => setActiveTab('discussions')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'discussions'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            💭 Discussions
          </button>
        </div>

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* New Post Box */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-errandify-orange flex items-center justify-center text-white font-bold">You</div>
                <div className="flex-1">
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Share a success story, tip, question, or ask for help..."
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-errandify-orange"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button className="text-gray-600 hover:text-gray-800 font-semibold text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePostComment(0)}
                      className="bg-errandify-orange text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                      disabled={!newPostText.trim()}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No posts yet. Be the first to share!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      {post.author.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{post.author}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(post.category)}`}>
                          {post.category === 'success_story' ? '🏆 Success' : post.category === 'tip' ? '💡 Tip' : post.category === 'question' ? '❓ Q&A' : '🤝 Help'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">⭐ {post.authorRating.toFixed(1)} • {formatDate(post.createdAt)}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4">{post.content}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 font-medium transition ${
                        post.isLiked
                          ? 'text-red-600'
                          : 'hover:text-red-600'
                      }`}
                    >
                      {post.isLiked ? '❤️' : '🤍'} {post.likes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-600 font-medium transition">
                      💬 {post.comments}
                    </button>
                    <button className="flex items-center gap-1 hover:text-gray-800 font-medium transition ml-auto">
                      📤 Share
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DISCUSSIONS TAB */}
        {activeTab === 'discussions' && (
          <div className="space-y-3">
            {discussions.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No discussions yet</p>
              </div>
            ) : (
              discussions.map((discussion) => (
                <div key={discussion.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800 hover:text-errandify-orange">{discussion.title}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(discussion.category)}`}>
                          {discussion.category.charAt(0).toUpperCase() + discussion.category.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Started by {discussion.author}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center gap-1">
                      💬 {discussion.replies} replies
                    </div>
                    <div className="flex items-center gap-1">
                      👁️ {discussion.views} views
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      {formatDate(discussion.lastUpdated)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
