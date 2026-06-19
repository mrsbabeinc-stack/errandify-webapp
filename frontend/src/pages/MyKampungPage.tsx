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

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'important' | 'feature' | 'maintenance' | 'tip';
  icon: string;
  createdAt: string;
  isPinned: boolean;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  type: 'workshop' | 'webinar' | 'meetup' | 'competition';
  isAttending: boolean;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  category: 'tips' | 'stories' | 'guide' | 'news';
  readTime: number;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

export default function MyKampungPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'discussions' | 'announcements' | 'events' | 'blog'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [postsRes, discussionsRes, announcementsRes, eventsRes, blogsRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/posts`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/discussions`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/blog`,
          { headers }
        ),
      ]);

      setPosts(postsRes.data.data || []);
      setDiscussions(discussionsRes.data.data || []);
      setAnnouncements(announcementsRes.data.data || []);
      setEvents(eventsRes.data.data || []);
      setBlogPosts(blogsRes.data.data || []);
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

    setAnnouncements([
      {
        id: 1,
        title: '🎉 New Feature: Recurring Tasks!',
        content: 'Schedule tasks to repeat daily, weekly, or monthly. Great for ongoing needs like house cleaning, pet care, and more!',
        type: 'feature',
        icon: '✨',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isPinned: true,
      },
      {
        id: 2,
        title: '⚠️ Scheduled Maintenance',
        content: 'Backend updates on Saturday 2-4am SGT. There may be brief interruptions. Thank you for your patience!',
        type: 'maintenance',
        icon: '🔧',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isPinned: true,
      },
      {
        id: 3,
        title: '💡 Pro Tip: Boost Your Doer Rating',
        content: 'Complete tasks on time and communicate well with askers. A 5-star rating opens more opportunities!',
        type: 'tip',
        icon: '💡',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isPinned: false,
      },
    ]);

    setEvents([
      {
        id: 1,
        title: 'Doer Success Workshop',
        description: 'Learn strategies to maximize earnings and build a strong reputation on Errandify.',
        date: '2026-06-25',
        time: '7:00 PM',
        location: 'Online (Zoom)',
        attendees: 234,
        type: 'workshop',
        isAttending: false,
      },
      {
        id: 2,
        title: 'Monthly Networking Meetup',
        description: 'Meet fellow Errandify users and share experiences over coffee.',
        date: '2026-06-27',
        time: '6:30 PM',
        location: 'East Coast Park',
        attendees: 45,
        type: 'meetup',
        isAttending: false,
      },
      {
        id: 3,
        title: 'Summer Task Challenge',
        description: 'Complete 10 tasks in July and win exciting prizes!',
        date: '2026-07-01',
        time: 'All Month',
        location: 'Platform-wide',
        attendees: 1250,
        type: 'competition',
        isAttending: true,
      },
    ]);

    setBlogPosts([
      {
        id: 1,
        title: 'How Sarah Earned $2,000 in Her First Month on Errandify',
        excerpt: 'Success story: A single mom who turned Errandify into a flexible side income.',
        author: 'Community Team',
        category: 'stories',
        readTime: 5,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 342,
        isLiked: false,
      },
      {
        id: 2,
        title: 'Complete Guide: Setting the Right Budget for Your Tasks',
        excerpt: 'Learn how to price tasks competitively while ensuring doers are motivated.',
        author: 'Sarah Chen',
        category: 'guide',
        readTime: 8,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 298,
        isLiked: false,
      },
      {
        id: 3,
        title: 'Top 5 Safety Tips for Doers Meeting New Askers',
        excerpt: 'Your safety matters. Here are essential tips to stay safe while working.',
        author: 'Safety Team',
        category: 'tips',
        readTime: 6,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 567,
        isLiked: false,
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

  const handleAttendEvent = (eventId: number) => {
    setEvents(events.map(e =>
      e.id === eventId ? { ...e, isAttending: !e.isAttending, attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1 } : e
    ));
  };

  const handleLikeBlog = (postId: number) => {
    setBlogPosts(blogPosts.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'success_story':
        return 'bg-green-100 text-green-700';
      case 'tip':
        return 'bg-orange-100 text-errandify-orange-700';
      case 'question':
        return 'bg-purple-100 text-purple-700';
      case 'help_needed':
        return 'bg-orange-100 text-orange-700';
      case 'general':
        return 'bg-gray-100 text-gray-700';
      case 'tips':
        return 'bg-orange-100 text-errandify-orange-700';
      case 'issues':
        return 'bg-red-100 text-red-700';
      case 'feedback':
        return 'bg-indigo-100 text-indigo-700';
      case 'stories':
        return 'bg-rose-100 text-rose-700';
      case 'guide':
        return 'bg-indigo-100 text-indigo-700';
      case 'news':
        return 'bg-cyan-100 text-cyan-700';
      case 'important':
        return 'bg-red-100 text-red-700';
      case 'feature':
        return 'bg-green-100 text-green-700';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700';
      case 'workshop':
        return 'bg-purple-100 text-purple-700';
      case 'webinar':
        return 'bg-orange-100 text-errandify-orange-700';
      case 'meetup':
        return 'bg-pink-100 text-pink-700';
      case 'competition':
        return 'bg-orange-100 text-orange-700';
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🏘️ MyKampung</h1>
          <p className="text-gray-600">Your neighbourhood community • Share stories, help neighbours, grow together</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`py-3 px-3 rounded-lg font-semibold text-xs lg:text-sm transition whitespace-nowrap ${
              activeTab === 'feed'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            💬 Feed
          </button>
          <button
            onClick={() => setActiveTab('discussions')}
            className={`py-3 px-3 rounded-lg font-semibold text-xs lg:text-sm transition whitespace-nowrap ${
              activeTab === 'discussions'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            💭 Discussions
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-3 px-3 rounded-lg font-semibold text-xs lg:text-sm transition whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📢 News
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-3 px-3 rounded-lg font-semibold text-xs lg:text-sm transition whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎯 Events
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`py-3 px-3 rounded-lg font-semibold text-xs lg:text-sm transition whitespace-nowrap ${
              activeTab === 'blog'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📖 Blog
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
                    <button className="flex items-center gap-1 hover:text-errandify-orange-600 font-medium transition">
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

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No announcements yet</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className={`${getCategoryColor(announcement.type)} rounded-lg p-4 border-l-4`}>
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">{announcement.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-800">{announcement.title}</h3>
                        {announcement.isPinned && <span className="text-xs bg-white px-2 py-1 rounded-full font-medium">📌 Pinned</span>}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{announcement.content}</p>
                      <p className="text-xs text-gray-500 mt-2">{formatDate(announcement.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No events scheduled</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{event.title}</h3>
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-1 ${getCategoryColor(event.type)}`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAttendEvent(event.id)}
                      className={`px-3 py-2 rounded-lg font-semibold text-xs transition whitespace-nowrap ${
                        event.isAttending
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-errandify-orange text-white hover:bg-opacity-90'
                      }`}
                    >
                      {event.isAttending ? 'Attending ✓' : 'Attend'}
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{event.description}</p>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{event.date} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>{event.attendees} attending</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BLOG TAB */}
        {activeTab === 'blog' && (
          <div className="space-y-3">
            {blogPosts.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No blog posts yet</p>
              </div>
            ) : (
              blogPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-gray-800 hover:text-errandify-orange">{post.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>

                  <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`font-semibold px-2 py-1 rounded-full ${getCategoryColor(post.category)}`}>
                        {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                      </span>
                      <span className="text-gray-500">By {post.author}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{post.readTime} min</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{formatDate(post.createdAt)}</span>
                    </div>
                    <button
                      onClick={() => handleLikeBlog(post.id)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${
                        post.isLiked
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {post.isLiked ? '❤️' : '🤍'} {post.likes}
                    </button>
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
