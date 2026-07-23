import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { moderatePost, getModerationStatus, getModerationMessage } from '../services/moderationService';
import { blogPosts as blogPostsData } from '../data/blogPosts';
import JoinUsPage from './JoinUsPage';

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
  moderationStatus?: {
    flagged: boolean;
    category?: string;
    confidence?: number;
  };
  deletedAt?: string;
  deletedBy?: string;
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

/** The eight MyKampung sections, in the order they appear in the nav grid. */
const KAMPUNG_SECTIONS = [
  { id: 'feed', emoji: '💬', label: 'Feed' },
  { id: 'discussions', emoji: '💭', label: 'Discussions' },
  { id: 'announcements', emoji: '📢', label: 'Notices' },
  { id: 'news', emoji: '📰', label: 'News' },
  { id: 'events', emoji: '🎯', label: 'Events' },
  { id: 'blog', emoji: '📖', label: 'Blog' },
  { id: 'recognition', emoji: '⭐', label: 'Recognition' },
  { id: 'join-us', emoji: '👋', label: 'Join Us' },
] as const;

export default function MyKampungPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'feed' | 'news' | 'discussions' | 'announcements' | 'events' | 'blog' | 'recognition' | 'join-us'>(
    (location.state as any)?.tab || 'news'
  );
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [newsTypeFilter, setNewsTypeFilter] = useState<'all' | 'community' | 'singapore' | 'errandify'>('singapore');
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('all');
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [moderationMessage, setModerationMessage] = useState<string>('');
  const [isCheckingModeration, setIsCheckingModeration] = useState(false);
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [userVotes, setUserVotes] = useState<number[]>([]);
  const [selectedBlogPost, setSelectedBlogPost] = useState<any>(null);
  const [readBlogPosts, setReadBlogPosts] = useState<Set<number>>(new Set());

  // Check if user is admin
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch news first (doesn't require auth)
      try {
        const newsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/news`,
          { timeout: 5000 }
        );
        console.log('News API response:', newsRes.data);
        console.log('Setting news items, count:', newsRes.data.data?.length);
        const apiNews = newsRes.data.data || [];
        setNewsItems(apiNews);
        console.log('After setNewsItems, api had:', apiNews.length, 'items');
      } catch (err) {
        console.error('Could not load news:', err);
        setNewsItems([]);
      }

      // Signed-out visitors see the public feeds only; the rest needs a token.
      if (!token) return;

      // Try to fetch from API endpoints
      try {
        const postsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/posts`,
          { headers, timeout: 3000 }
        );
        setPosts(postsRes.data.data || []);
      } catch (err) {
        console.log('Community posts API not available, using mock data');
      }

      try {
        const discussionsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/discussions`,
          { headers, timeout: 3000 }
        );
        setDiscussions(discussionsRes.data.data || []);
      } catch (err) {
        console.log('Discussions API not available');
      }

      try {
        const announcementsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements`,
          { headers, timeout: 3000 }
        );
        setAnnouncements(announcementsRes.data.data || []);
      } catch (err) {
        console.log('Announcements API not available');
      }

      try {
        const eventsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events`,
          { headers, timeout: 3000 }
        );
        setEvents(eventsRes.data.data || []);
      } catch (err) {
        console.log('Events API not available');
      }

      try {
        const blogsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/blog`,
          { headers, timeout: 3000 }
        );
        setBlogPosts(blogsRes.data.data || []);
      } catch (err) {
        console.log('Blog API not available');
      }

      // The Hall of Stars rendered from a `recognitions` array that nothing
      // ever populated, so the tab has read "No recognitions yet" since it was
      // built. Awards are made in admin → Communications → Recognition.
      try {
        const recRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recognitions`,
          { headers, timeout: 3000 }
        );
        const rows = recRes.data.data || [];
        setRecognitions(rows);
        setUserVotes(rows.filter((r: any) => r.hasVoted).map((r: any) => r.id));
      } catch (err) {
        console.log('Recognitions API not available');
      }

      // Empty is a real answer here. This used to fall back to invented posts,
      // discussions, events and award nominations attributed to named people —
      // so the page always looked busy and nothing on it was true.
    } catch (err) {
      console.error('Failed to fetch community data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    // Optimistic, then reconciled with the server's count. This used to update
    // local state only, so a like vanished on refresh and nobody else ever saw
    // it — POST /api/community/posts/:id/like existed the whole time.
    const previous = posts;
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { likes, isLiked } = res.data.data;
      setPosts(current => current.map(p => (p.id === postId ? { ...p, likes, isLiked } : p)));
    } catch (err) {
      // Put it back rather than leaving a like the server never recorded.
      console.error('Could not save that like:', err);
      setPosts(previous);
    }
  };

  const handlePostComment = async (postId: number) => {
    if (!newPostText.trim()) return;

    setIsCheckingModeration(true);
    setModerationMessage('');

    try {
      const result = await moderatePost(newPostText);

      if (result.flagged) {
        const message = getModerationMessage(result);
        setModerationMessage(message);
        setIsCheckingModeration(false);
        return;
      }

      // Post approved - add to feed
      const newPost: CommunityPost = {
        id: Math.max(...posts.map(p => p.id), 0) + 1,
        author: 'You',
        authorRole: 'doer',
        // No invented rating here. This used to hardcode 4.8 for whoever was
        // posting, which showed the author a score they had not earned.
        authorRating: undefined as unknown as number,
        content: newPostText,
        category: 'tip',
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        isLiked: false,
      };

      setPosts([newPost, ...posts]);
      setNewPostText('');
      setModerationMessage('');
    } catch (error) {
      console.error('Error checking moderation:', error);
      setModerationMessage('Error checking post. Please try again.');
    } finally {
      setIsCheckingModeration(false);
    }
  };

  const handleAttendEvent = async (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const isJoining = !event.isAttending;

    // Update local state
    setEvents(events.map(e =>
      e.id === eventId ? { ...e, isAttending: !e.isAttending, attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1 } : e
    ));

    // Send notification and email if joining
    if (isJoining) {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;

        // Send in-app notification
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
          {
            recipientId: user?.id,
            type: 'event_signup',
            title: '✅ Event Confirmed!',
            message: `You're all set! Your spot for "${event.title}" on ${event.date} at ${event.time} is confirmed. See you there!`,
            eventId: event.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Send email notification
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email/send-event-confirmation`,
          {
            userId: user?.id,
            email: user?.email,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            eventDescription: event.description,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Show in-app toast
        alert(`🎉 You're signed up for "${event.title}"!\n\n📧 Confirmation email sent to your inbox.`);
      } catch (err) {
        console.warn('Failed to send notification/email:', err);
        // Still show success even if notification fails
        alert(`✅ You're signed up for "${event.title}"!`);
      }
    } else {
      // Unattending
      alert(`You've been removed from "${event.title}".`);
    }
  };

  const handleFavoriteRecognition = (recognitionId: number) => {
    if (favorites.includes(recognitionId)) {
      setFavorites(favorites.filter(id => id !== recognitionId));
    } else {
      setFavorites([...favorites, recognitionId]);
    }
  };

  /**
   * Applause is one per person and it persists. This used to move a number in
   * local state only, so it reset on refresh and nobody else ever saw it — and
   * one person could clap a hundred times.
   */
  const handleVoteRecognition = async (recognitionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const previousVotes = userVotes;
    const previousRecognitions = recognitions;
    const wasVoted = userVotes.includes(recognitionId);
    setUserVotes(wasVoted ? userVotes.filter(id => id !== recognitionId) : [...userVotes, recognitionId]);
    setRecognitions(recognitions.map(r =>
      r.id === recognitionId ? { ...r, votes: r.votes + (wasVoted ? -1 : 1) } : r
    ));

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recognitions/${recognitionId}/vote`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { votes, hasVoted } = res.data.data;
      setRecognitions(prev => prev.map(r => (r.id === recognitionId ? { ...r, votes } : r)));
      setUserVotes(prev =>
        hasVoted ? Array.from(new Set([...prev, recognitionId])) : prev.filter(id => id !== recognitionId)
      );
    } catch (err) {
      console.error('Could not register applause:', err);
      setUserVotes(previousVotes);
      setRecognitions(previousRecognitions);
    }
  };

  const handleDeletePost = async (postId: number, postAuthor: string, moderationReason?: string) => {
    if (!isAdmin) return;

    const reason = moderationReason || 'Manual deletion by admin';
    const confirmed = confirm(`Delete post by ${postAuthor}?\n\nReason: ${reason}`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/moderation/posts/${postId}`,
        {
          data: { reason },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Remove from feed
      setPosts(posts.filter(p => p.id !== postId));
      console.log('[Admin] Post deleted:', postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Could not delete post. Please try again.');
    }
  };

  const handleLikeBlog = (postId: number) => {
    setBlogPosts(blogPosts.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handleBlogPostRead = (postId: number) => {
    setReadBlogPosts(prev => new Set(prev).add(postId));
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
    <div style={{background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE8D1 25%, #FFD9B8 50%, #FFC99F 75%, #FFB386 100%)', minHeight: '100vh', paddingBottom: '100px', paddingTop: '12px', paddingLeft: '12px', paddingRight: '12px', position: 'relative', zIndex: 0}}>
      {/* Decorative background elements */}
      <div style={{position: 'fixed', top: '60px', right: '20px', fontSize: '100px', opacity: 0.08, pointerEvents: 'none', zIndex: -1}}>🏘️</div>
      <div style={{position: 'fixed', bottom: '150px', left: '10px', fontSize: '80px', opacity: 0.08, pointerEvents: 'none', zIndex: -1}}>🌸</div>

      {/*
        Page head, matched to components/AdminThemeWrapper.

        This page did not use the shared wrapper, so it had grown its own
        header: a standalone "← Back" link, a 56px/900 title and a 21px/800
        subtitle over a 5px rule, together spending roughly 200px before any
        content. Every other screen in the app looked different from this one.

        Same markup and the same `.app-page-head` class as the wrapper now, so
        the four screens read as one product.
      */}
      <div
        className="app-page-head"
        style={{display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', position: 'relative', zIndex: 1}}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Go back"
          style={{flexShrink: 0, width: 30, height: 30, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFEDE2', border: 'none', borderRadius: '50%', color: '#D2521C', fontSize: '16px', fontWeight: 700, lineHeight: 1, cursor: 'pointer'}}
        >
          ←
        </button>
        <div style={{minWidth: 0}}>
          <h1>🏘️ MyKampung</h1>
          <p>Your Neighbourhood Community</p>
        </div>
      </div>

      <div className="w-full" style={{maxWidth: '1200px', margin: '0 auto'}}>
        {/*
          Section navigation.

          This was eight pills wrapping to four stacked rows, which owned half
          the screen. Collapsing them to one horizontally scrolling row fixed
          the height and broke something worse: five of the eight sat off-screen
          with no affordance that anything scrolled, so a filter you could not
          see was a filter you did not have.

          A four-column grid shows all eight, in two rows, at any phone width —
          and it is the same tile shape as the category grid on the home screen,
          so the two read as the same product. Eight near-identical buttons with
          copy-pasted inline styles became one map.
        */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '12px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {KAMPUNG_SECTIONS.map(({ id, emoji, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={label}
                style={{
                  padding: '6px 2px',
                  borderRadius: '10px',
                  border: active ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,107,53,0.22)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  background: active
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)'
                    : 'rgba(255,255,255,0.8)',
                  color: active ? 'white' : '#D2521C',
                  boxShadow: active
                    ? '0 3px 12px rgba(255,107,53,0.28)'
                    : '0 1px 5px rgba(255,107,53,0.10)',
                }}
              >
                <div style={{ fontSize: '15px', lineHeight: 1, marginBottom: '2px' }}>{emoji}</div>
                <div style={{ fontSize: '9.5px', fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
              </button>
            );
          })}
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
                  {moderationMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700">{moderationMessage}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setNewPostText('');
                        setModerationMessage('');
                      }}
                      className="text-gray-600 hover:text-gray-800 font-semibold text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePostComment(0)}
                      className="bg-errandify-orange text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                      disabled={!newPostText.trim() || isCheckingModeration}
                    >
                      {isCheckingModeration ? '⏳ Checking...' : '📤 Post'}
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
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xs">
                      {post.author.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold text-gray-800 text-sm">{post.author}</h3>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded-full ${getCategoryColor(post.category)}`}>
                          {post.category === 'success_story' ? '🏆' : post.category === 'tip' ? '💡' : post.category === 'question' ? '❓' : '🤝'}
                        </span>
                      </div>
                      {/* Posts written in admin have no author rating, and the
                          API returns null for them. Calling .toFixed() on that
                          threw and took the whole page down with it — show the
                          star only when there is a real rating behind it. */}
                      <p className="text-xs text-gray-600">
                        {typeof post.authorRating === 'number' ? `⭐ ${post.authorRating.toFixed(1)} • ` : ''}
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {post.moderationStatus?.flagged && (
                    <div className="mb-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700">
                        ⚠️ <span className="font-semibold">{post.moderationStatus.category}</span>
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-700 mb-2 line-clamp-2">{post.content}</p>

                  <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-gray-100 pt-2">
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
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePost(
                          post.id,
                          post.author,
                          post.moderationStatus?.flagged
                            ? `Qwen flagged: ${post.moderationStatus.category}`
                            : undefined
                        )}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition"
                        title="Delete post (admin only)"
                      >
                        🗑️ Delete
                      </button>
                    )}
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
                <div
                  key={discussion.id}
                  onClick={() => navigate(`/discussion/${discussion.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-semibold text-gray-800 hover:text-errandify-orange text-sm line-clamp-2">{discussion.title}</h3>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${getCategoryColor(discussion.category)}`}>
                          {discussion.category.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">by {discussion.author}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-gray-100 pt-1.5 mt-1.5">
                    <span>💬 {discussion.replies}</span>
                    <span>👁️ {discussion.views}</span>
                    <span className="ml-auto">{formatDate(discussion.lastUpdated)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <div>
            {/* News Search */}
            <div className="mb-2">
              <input
                type="text"
                placeholder="Search news..."
                value={newsSearchQuery}
                onChange={(e) => setNewsSearchQuery(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            {/* News Type Filter */}
            <div className="flex gap-1 mb-2 flex-wrap pb-1">
              {[
                { key: 'all', label: 'All', icon: '📰' },
                { key: 'community', label: 'Community', icon: '🏘️' },
                { key: 'singapore', label: 'Singapore', icon: '🇸🇬' },
                { key: 'errandify', label: 'Errandify', icon: '🚀' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setNewsTypeFilter(tab.key as any)}
                  className={`py-1 px-2 rounded text-sm font-bold whitespace-nowrap transition ${
                    newsTypeFilter === tab.key
                      ? 'bg-errandify-orange text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* News Category Filter */}
            {(() => {
              const categories = Array.from(
                new Set(newsItems.map((item: any) => item.category).filter(Boolean))
              ).sort();
              return categories.length > 0 ? (
                <div className="flex gap-1 mb-2 flex-wrap pb-1">
                  <button
                    onClick={() => setNewsCategoryFilter('all')}
                    className={`py-1 px-2 rounded text-sm font-bold whitespace-nowrap transition ${
                      newsCategoryFilter === 'all'
                        ? 'bg-errandify-orange text-white'
                        : 'bg-orange-100 text-errandify-orange'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat}
                      onClick={() => setNewsCategoryFilter(cat)}
                      className={`py-1 px-2 rounded text-sm font-bold whitespace-nowrap transition ${
                        newsCategoryFilter === cat
                          ? 'bg-errandify-orange text-white'
                          : 'bg-orange-100 text-errandify-orange'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Filtered News Items */}
            {(() => {
              const filteredNews = newsItems
                .filter((item: any) => {
                  if (newsTypeFilter !== 'all' && item.type !== newsTypeFilter) return false;
                  if (newsCategoryFilter !== 'all' && item.category !== newsCategoryFilter) return false;
                  if (newsSearchQuery.trim()) {
                    const query = newsSearchQuery.toLowerCase();
                    return (
                      item.title.toLowerCase().includes(query) ||
                      item.content.toLowerCase().includes(query) ||
                      item.location?.toLowerCase().includes(query)
                    );
                  }
                  return true;
                });

              console.log('Filtered news count:', filteredNews.length, 'Filter:', newsTypeFilter, 'Items:', newsItems.length);

              return (
                <div className="space-y-2">
                  {filteredNews.length === 0 ? (
                    <div className="bg-white rounded p-4 text-center border border-gray-200 text-xs text-gray-500">
                      {/* This read "No news found (Total items: 0, Filter: singapore)" —
                          internal counters and filter keys are debugging output, not
                          something to show a neighbour reading the app. */}
                      No news here yet. Check back soon!
                    </div>
                  ) : (
                    filteredNews.map((item: any) => {
                const typeColors: Record<string, string> = {
                  community: 'bg-green-50 border-green-300',
                  singapore: 'bg-orange-50 border-orange-300',
                  errandify: 'bg-orange-50 border-orange-300',
                };
                const typeIcons: Record<string, string> = {
                  community: '🏘️',
                  singapore: '🇸🇬',
                  errandify: '🚀',
                };

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border-2 p-3 ${typeColors[item.type] || 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{typeIcons[item.type]}</span>
                          <span className="text-xs font-bold text-gray-600">
                            {item.type === 'community' ? 'Community' : item.type === 'singapore' ? 'Singapore' : 'Errandify'}
                          </span>
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

                    <p className="text-xs text-gray-700 line-clamp-2 mb-2">{item.content}</p>

                    {item.image && (
                      <div className="mb-2 rounded overflow-hidden h-24 bg-gray-200">
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

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex flex-wrap gap-2">
                        {item.source && <span className="bg-white px-2 py-0.5 rounded">📌 {item.source}</span>}
                        {item.location && <span className="bg-white px-2 py-0.5 rounded">📍 {item.location}</span>}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-500">
                          📅 {item.created_at ? new Date(item.created_at).toLocaleDateString('en-SG', {
                            month: 'short',
                            day: 'numeric'
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
                            className="text-errandify-orange font-semibold hover:underline flex items-center gap-1 text-xs"
                            title={`Read on ${item.source}`}
                          >
                            🔗 {item.source}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
                    })
                  )}
                </div>
              );
            })()}
          </div>
        )}

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
          <div>
            {events.length === 0 ? (
              <div className="bg-white rounded p-4 text-center border border-gray-200 text-xs text-gray-500">
                No events scheduled
              </div>
            ) : (
              <>
                {/* Upcoming Events Timeline */}
                <div className="space-y-2">
                  {events.map((event, index) => {
                    const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
                      workshop: { bg: 'bg-purple-50', border: 'border-purple-300', icon: '🛠️' },
                      webinar: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '🎥' },
                      meetup: { bg: 'bg-pink-50', border: 'border-pink-300', icon: '👥' },
                      competition: { bg: 'bg-orange-50', border: 'border-orange-300', icon: '🏆' },
                    };

                    const eventStyle = typeColors[event.type] || typeColors.workshop;

                    return (
                      <div
                        key={event.id}
                        className={`${eventStyle.bg} rounded-lg border-2 ${eventStyle.border} p-3 hover:shadow-md transition cursor-pointer group`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Timeline Dot */}
                          <div className="flex flex-col items-center mt-0.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-errandify-orange"></div>
                            {index < events.length - 1 && (
                              <div className="w-0.5 h-8 bg-gray-200 -my-1"></div>
                            )}
                          </div>

                          {/* Event Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{eventStyle.icon}</span>
                                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-errandify-orange">{event.title}</h3>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-1">{event.description}</p>
                              </div>
                              <button
                                onClick={() => handleAttendEvent(event.id)}
                                className={`px-2 py-1 rounded text-sm font-bold whitespace-nowrap transition ${
                                  event.isAttending
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-errandify-orange text-white hover:bg-opacity-90'
                                }`}
                              >
                                {event.isAttending ? '✓' : '+'}
                              </button>
                            </div>

                            {/* Event Details */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-700">
                              <span className="font-semibold px-2 py-0.5 bg-white rounded">
                                📅 {event.date}
                              </span>
                              <span className="font-semibold px-2 py-0.5 bg-white rounded">
                                ⏰ {event.time}
                              </span>
                              <span className="font-semibold px-2 py-0.5 bg-white rounded">
                                📍 {event.location}
                              </span>
                              <span className="font-semibold px-2 py-0.5 bg-white rounded">
                                👥 {event.attendees}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                {events.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <div className="bg-orange-50 rounded p-2 text-center border border-orange-200">
                      <p className="text-sm font-bold text-errandify-orange">{events.length}</p>
                      <p className="text-xs text-gray-600">Total Events</p>
                    </div>
                    <div className="bg-green-50 rounded p-2 text-center border border-green-200">
                      <p className="text-sm font-bold text-green-700">{events.filter(e => e.isAttending).length}</p>
                      <p className="text-xs text-gray-600">Attending</p>
                    </div>
                    <div className="bg-orange-50 rounded p-2 text-center border border-orange-200">
                      <p className="text-sm font-bold text-errandify-orange">{events.reduce((sum, e) => sum + e.attendees, 0)}</p>
                      <p className="text-xs text-gray-600">Total Attendees</p>
                    </div>
                    <div className="bg-purple-50 rounded p-2 text-center border border-purple-200">
                      <p className="text-sm font-bold text-purple-700">{events.filter(e => !e.isAttending).length}</p>
                      <p className="text-xs text-gray-600">Can Join</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BLOG TAB */}
        {activeTab === 'blog' && (
          <div>
            {blogPosts.length === 0 ? (
              <div className="bg-white rounded p-4 text-center border border-gray-200 text-xs text-gray-500">
                No blog posts yet
              </div>
            ) : (
              <>
                {/* Featured Post (First) */}
                {blogPosts.length > 0 && (
                  <div
                    key={blogPosts[0].id}
                    onClick={() => setSelectedBlogPost(blogPosts[0])}
                    className={`rounded-lg p-4 mb-3 shadow-md hover:shadow-lg transition cursor-pointer ${
                      readBlogPosts.has(blogPosts[0].id)
                        ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800'
                        : 'bg-gradient-to-br from-errandify-orange to-orange-500 text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            readBlogPosts.has(blogPosts[0].id)
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-white text-errandify-orange'
                          }`}>
                            {readBlogPosts.has(blogPosts[0].id) ? '✓ Read' : '⭐ Featured'}
                          </span>
                        </div>
                        <h3 className={`font-bold text-sm mb-1 ${readBlogPosts.has(blogPosts[0].id) ? 'opacity-70' : ''}`}>
                          {blogPosts[0].title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs opacity-90 line-clamp-2 mb-2">{blogPosts[0].excerpt}</p>
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <span>📖 {blogPosts[0].category === 'guide' ? 'Guide' : blogPosts[0].category === 'stories' ? 'Story' : blogPosts[0].category === 'tips' ? 'Tips' : 'News'}</span>
                      <span>•</span>
                      <span>{blogPosts[0].readTime} min</span>
                      <span>•</span>
                      <span>{blogPosts[0].author}</span>
                    </div>
                  </div>
                )}

                {/* Other Posts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {blogPosts.slice(1).map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedBlogPost(post)}
                      className={`rounded-lg border p-3 hover:shadow-md transition cursor-pointer ${
                        readBlogPosts.has(post.id)
                          ? 'bg-gray-50 border-gray-300 hover:border-gray-400'
                          : 'bg-white border-gray-200 hover:border-errandify-orange'
                      }`}
                    >
                      {/* Category Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${getCategoryColor(post.category)}`}>
                            {post.category === 'guide' ? '📚' : post.category === 'stories' ? '📖' : post.category === 'tips' ? '💡' : '📰'}
                          </span>
                          {readBlogPosts.has(post.id) && (
                            <span className="text-sm font-bold text-gray-600">✓</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeBlog(post.id);
                          }}
                          className={`text-sm font-bold px-2 py-0.5 rounded transition ${
                            post.isLiked
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {post.isLiked ? '❤️' : '🤍'}
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className={`text-xs font-bold line-clamp-2 mb-1 ${
                        readBlogPosts.has(post.id)
                          ? 'text-gray-600 hover:text-gray-800'
                          : 'text-gray-800 hover:text-errandify-orange'
                      }`}>
                        {post.title}
                      </h4>

                      {/* Excerpt */}
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{post.excerpt}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{post.readTime} min</span>
                        <span>{post.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* BLOG POST MODAL */}
        {selectedBlogPost && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4"
            onMouseEnter={() => handleBlogPostRead(selectedBlogPost.id)}
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex-1">
                  <span className="inline-block bg-errandify-orange text-white px-3 py-1 rounded-full text-xs font-bold mb-2">
                    {selectedBlogPost.category === 'guide' ? '📚 Guide' : selectedBlogPost.category === 'stories' ? '📖 Story' : selectedBlogPost.category === 'tips' ? '💡 Tips' : '📰 News'}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">{selectedBlogPost.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedBlogPost(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-4 prose prose-sm max-w-none">
                <p className="text-gray-600 text-sm mb-4">{selectedBlogPost.excerpt}</p>

                <div className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
                  <span>By {selectedBlogPost.author}</span>
                  <span className="mx-2">•</span>
                  <span>{selectedBlogPost.readTime} min read</span>
                  {selectedBlogPost.createdAt && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{new Date(selectedBlogPost.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {/* Article Content */}
                <div className="text-gray-700 leading-relaxed text-sm space-y-4">
                  {selectedBlogPost.content.split('\n\n').map((block: string, idx: number) => {
                    // Check if block contains image markdown ![alt](url)
                    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                    const imageMatches = [...block.matchAll(imageRegex)];

                    if (imageMatches.length > 0) {
                      return (
                        <div key={idx}>
                          {imageMatches.map((match, imgIdx) => (
                            <div key={`${idx}-${imgIdx}`} className="my-4">
                              <img
                                src={match[2]}
                                alt={match[1]}
                                className="w-full h-auto rounded-lg object-cover"
                                onError={(e) => {
                                  console.error('Image failed to load:', match[2]);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              {match[1] && (
                                <p className="text-xs text-gray-500 mt-2 italic">{match[1]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Check if block is empty
                    if (!block.trim()) {
                      return null;
                    }

                    // Check if line is a heading (wrapped in **)
                    if (block.trim().startsWith('**') && block.trim().endsWith('**')) {
                      return (
                        <h3 key={idx} className="text-base font-bold mt-6 mb-3 text-gray-900">
                          {block.trim().replace(/\*\*/g, '')}
                        </h3>
                      );
                    }

                    // Regular paragraph - plain text (links will be clickable in simplified version)
                    const cleanBlock = block.trim().replace(/\*\*/g, '');

                    // For now, just render as plain text
                    // Links in markdown format will display as plain text
                    return (
                      <p key={idx} className="mb-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {cleanBlock}
                      </p>
                    );
                  })}
                </div>

                {/* Related Articles */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3">📖 Read Next</h4>
                  <div className="space-y-2">
                    {blogPostsData
                      .filter(post => post.id !== selectedBlogPost.id)
                      .slice(0, 3)
                      .map(post => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedBlogPost(post);
                          }}
                          className="w-full text-left p-2 rounded bg-orange-50 hover:bg-orange-100 transition border border-orange-200"
                        >
                          <p className="text-sm font-semibold text-errandify-orange line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{post.excerpt}</p>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedBlogPost(null);
                      handleLikeBlog(selectedBlogPost.id);
                    }}
                    className={`flex-1 px-4 py-2 rounded font-semibold text-sm transition ${
                      selectedBlogPost.isLiked
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {selectedBlogPost.isLiked ? '❤️ Liked' : '🤍 Like'}
                  </button>
                  <button
                    onClick={() => setSelectedBlogPost(null)}
                    className="flex-1 px-4 py-2 rounded font-semibold text-sm bg-errandify-orange text-white hover:bg-orange-600 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RECOGNITION TAB */}
        {activeTab === 'recognition' && (
          <div className="space-y-1">
            <div className="text-center mb-2 bg-orange-50 rounded p-2 border border-orange-200">
              <h2 className="text-sm font-bold text-errandify-brown">🌟 Hall of Stars</h2>
              <p className="text-xs text-gray-600">Amazing doers in our community</p>
            </div>

            {recognitions.length === 0 ? (
              <div className="bg-white rounded p-2 text-center border border-gray-200 text-xs text-gray-500">
                No recognitions yet
              </div>
            ) : (
              recognitions
                .sort((a, b) => b.votes - a.votes)
                .map((recognition) => (
                <div key={recognition.id} className="bg-white rounded border border-yellow-200 p-2 hover:shadow transition">
                  <div className="flex items-start gap-2">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                      {recognition.name.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="text-xs font-bold text-gray-800 truncate">{recognition.name}</h3>
                            <span className="text-xs">{recognition.title}</span>
                          </div>
                          <p className="text-xs text-gray-600">⭐ {recognition.rating.toFixed(1)}</p>
                        </div>
                        <button
                          onClick={() => handleFavoriteRecognition(recognition.id)}
                          className="flex-shrink-0 text-lg hover:scale-110 transition"
                          title={favorites.includes(recognition.id) ? 'Remove' : 'Add'}
                        >
                          {favorites.includes(recognition.id) ? '❤️' : '🤍'}
                        </button>
                      </div>

                      <p className="text-xs text-gray-700 line-clamp-1 mt-0.5">{recognition.description}</p>

                      <div className="bg-yellow-50 rounded p-1.5 border border-yellow-100 my-1">
                        <p className="text-xs text-gray-700 italic line-clamp-1">"{recognition.testimonial}"</p>
                        <p className="text-xs text-gray-500">— {recognition.nominatedBy}</p>
                      </div>

                      {/* Vote Button */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{new Date(recognition.nominationDate).toLocaleDateString()}</span>

                        <button
                          onClick={() => handleVoteRecognition(recognition.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm font-bold transition ${
                            userVotes.includes(recognition.id)
                              ? 'bg-errandify-orange text-white'
                              : 'bg-orange-100 text-errandify-orange'
                          }`}
                        >
                          <span>{userVotes.includes(recognition.id) ? '👍' : '👏'}</span>
                          <span>{recognition.votes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="bg-orange-50 rounded border border-orange-200 p-2 text-center">
              <h3 className="text-xs font-bold text-errandify-brown">Know someone amazing?</h3>
              <p className="text-xs text-gray-700 my-0.5">Nominate a doer!</p>
              <button className="px-3 py-1 bg-errandify-orange text-white rounded text-sm font-bold hover:bg-opacity-90">
                🌟 Nominate
              </button>
            </div>
          </div>
        )}

        {/* JOIN US TAB */}
        {activeTab === 'join-us' && <JoinUsPage />}
      </div>
    </div>
  );
}
