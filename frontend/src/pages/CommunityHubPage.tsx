import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  image?: string;
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
  image?: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

export default function CommunityHubPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'announcements' | 'events' | 'blog'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      const [announcementsRes, eventsRes, blogsRes] = await Promise.all([
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

      setAnnouncements(announcementsRes.data.data || []);
      setEvents(eventsRes.data.data || []);
      setBlogPosts(blogsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch community data:', err);
      // Set mock data for demo
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
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
      {
        id: 4,
        title: '🎊 Milestone Reached: 50,000 Tasks Completed!',
        content: 'Thank you to our amazing community for making Errandify the go-to platform in Singapore!',
        type: 'important',
        icon: '🏆',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        isPinned: false,
      },
    ]);

    setEvents([
      {
        id: 1,
        title: 'Doer Success Workshop',
        description: 'Learn strategies to maximize earnings and build a strong reputation on Errandify. Expert tips from top doers!',
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
        description: 'Meet fellow Errandify users, share experiences, and build connections over coffee.',
        date: '2026-06-27',
        time: '6:30 PM',
        location: 'East Coast Park, Singapore',
        attendees: 45,
        type: 'meetup',
        isAttending: false,
      },
      {
        id: 3,
        title: 'Summer Task Challenge',
        description: 'Complete 10 tasks in July and win exciting prizes! Top earners get bonus Errandify Points.',
        date: '2026-07-01',
        time: 'All Month',
        location: 'Platform-wide',
        attendees: 1250,
        type: 'competition',
        isAttending: true,
      },
      {
        id: 4,
        title: 'Asker Strategy Webinar',
        description: 'Find the right doers for your tasks and manage projects effectively. Live Q&A session included!',
        date: '2026-07-05',
        time: '2:00 PM',
        location: 'Online (Zoom)',
        attendees: 156,
        type: 'webinar',
        isAttending: false,
      },
    ]);

    setBlogPosts([
      {
        id: 1,
        title: 'How Sarah Earned $2,000 in Her First Month on Errandify',
        excerpt: 'Success story: A single mom who turned Errandify into a flexible side income. Read her tips and strategies.',
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
        excerpt: 'Learn how to price tasks competitively while ensuring doers are motivated. Data-driven tips included.',
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
        excerpt: 'Your safety matters. Here are essential tips to stay safe while working on Errandify tasks.',
        author: 'Safety Team',
        category: 'tips',
        readTime: 6,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 567,
        isLiked: false,
      },
      {
        id: 4,
        title: 'Errandify Introduces AI-Powered Task Matching',
        excerpt: 'Our new algorithm matches doers with tasks based on skills, availability, and preferences. Better matches = happier users!',
        author: 'Product Team',
        category: 'news',
        readTime: 4,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 421,
        isLiked: false,
      },
    ]);
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

  const getAnnouncementColor = (type: string) => {
    switch (type) {
      case 'important':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'feature':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'maintenance':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'tip':
        return 'bg-blue-50 border-l-4 border-blue-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'workshop':
        return 'bg-purple-100 text-purple-700';
      case 'webinar':
        return 'bg-blue-100 text-blue-700';
      case 'meetup':
        return 'bg-pink-100 text-pink-700';
      case 'competition':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stories':
        return 'bg-rose-100 text-rose-700';
      case 'guide':
        return 'bg-indigo-100 text-indigo-700';
      case 'tips':
        return 'bg-emerald-100 text-emerald-700';
      case 'news':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-600">Loading community hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🏘️ Community Hub</h1>
          <p className="text-gray-600">Stay connected, learn, and grow with the Errandify community</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'announcements'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📢 Announcements
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'events'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎯 Events
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition ${
              activeTab === 'blog'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📖 Blog
          </button>
        </div>

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No announcements yet</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`${getAnnouncementColor(announcement.type)} rounded-lg p-4 shadow-sm`}
                >
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
                <div key={event.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{event.title}</h3>
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-2 ${getEventTypeColor(event.type)}`}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAttendEvent(event.id)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition whitespace-nowrap ${
                          event.isAttending
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-errandify-orange text-white hover:bg-opacity-90'
                        }`}
                      >
                        {event.isAttending ? 'Attending ✓' : 'Attend'}
                      </button>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{event.description}</p>

                    <div className="space-y-2 text-sm text-gray-600">
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
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg hover:text-errandify-orange">{post.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCategoryColor(post.category)}`}>
                          {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">By {post.author}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{post.readTime} min read</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{formatDate(post.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => handleLikeBlog(post.id)}
                        className={`text-sm font-semibold px-3 py-1 rounded-lg transition ${
                          post.isLiked
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {post.isLiked ? '❤️' : '🤍'} {post.likes}
                      </button>
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
