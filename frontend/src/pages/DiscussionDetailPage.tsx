import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Discussion {
  id: number;
  title: string;
  author: string;
  category: 'general' | 'tips' | 'issues' | 'feedback';
  replies: number;
  views: number;
  lastUpdated: string;
  content?: string;
}

// Mock discussions data - in production this would come from API
const mockDiscussions: Discussion[] = [
  {
    id: 1,
    title: 'Best practices for pricing errands in 2026',
    author: 'Sarah Chen',
    category: 'tips',
    replies: 34,
    views: 512,
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Discussion about best pricing strategies for errands on Errandify. Share your experiences and tips!',
  },
  {
    id: 2,
    title: 'New feature feedback: Recurring Errands',
    author: 'Product Team',
    category: 'feedback',
    replies: 156,
    views: 2341,
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: 'We\'ve introduced recurring errands! Share your feedback on this new feature.',
  },
  {
    id: 3,
    title: 'Common issues with payment processing',
    author: 'Support Team',
    category: 'issues',
    replies: 67,
    views: 845,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Discussing common payment processing issues and solutions.',
  },
  {
    id: 4,
    title: 'General discussion: Growing the Errandify community',
    author: 'Community Manager',
    category: 'general',
    replies: 89,
    views: 1203,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    content: 'Let\'s talk about how we can grow and strengthen the Errandify community together.',
  },
];

export default function DiscussionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const discussion = mockDiscussions.find(d => d.id === parseInt(id || '0'));

  const handleBack = () => {
    navigate('/my-kampung', { state: { tab: 'discussions' } });
  };

  if (!discussion) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
            ‹ Back to Discussions
          </button>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <p className="text-gray-600">Discussion not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tips':
        return 'bg-orange-100 text-orange-700';
      case 'feedback':
        return 'bg-blue-100 text-blue-700';
      case 'issues':
        return 'bg-red-100 text-red-700';
      case 'general':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back to Discussions
        </button>

        <article className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8 border-b border-gray-200 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getCategoryColor(discussion.category)}`}>
                {discussion.category.charAt(0).toUpperCase() + discussion.category.slice(1)}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-errandify-brown mb-4">{discussion.title}</h1>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Started by {discussion.author}</span>
              <span>•</span>
              <span>{new Date(discussion.lastUpdated).toLocaleDateString('en-SG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-gray-600 text-sm">Replies</p>
              <p className="text-2xl font-bold text-errandify-orange">{discussion.replies}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Views</p>
              <p className="text-2xl font-bold text-errandify-brown">{discussion.views}</p>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none text-gray-700 mb-8">
            <p>{discussion.content}</p>
          </div>

          {/* Reply Section */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-bold text-errandify-brown mb-4">Join the Discussion</h3>
            <textarea
              placeholder="Share your thoughts and join this discussion..."
              className="w-full border border-gray-200 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-errandify-orange"
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium text-sm">
                Cancel
              </button>
              <button className="px-4 py-2 bg-errandify-orange text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm">
                Post Reply
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
