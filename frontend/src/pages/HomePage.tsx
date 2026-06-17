import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface HomePageProps {
  userRole: 'asker' | 'doer';
}

interface Errand {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  askerName?: string;
  createdAt: string;
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedErrandId, setExpandedErrandId] = useState<number | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || 'Friend');
      } catch {
        setUserName('Friend');
      }
    }

    fetchErrands();
  }, [userRole]);

  const fetchErrands = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setErrands(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch errands:', error);
      setErrands([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'pet-care': 'bg-amber-100 text-amber-700',
      'cleaning-laundry': 'bg-blue-100 text-blue-700',
      'shopping-errands': 'bg-green-100 text-green-700',
      'tech-support': 'bg-purple-100 text-purple-700',
      'childcare-tutoring': 'bg-pink-100 text-pink-700',
      'home-maintenance': 'bg-orange-100 text-orange-700',
      'delivery-moving': 'bg-indigo-100 text-indigo-700',
      'moving-help': 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Safe Area - prevents overlap with top icons */}
      <div className="h-12"></div>

      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-errandify-brown">
            Welcome, {userName}! 👋
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {userRole === 'asker'
              ? 'Your posted errands'
              : 'Available errands near you'}
          </p>
        </div>

        {/* Content Section */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading errands...
            </div>
          ) : errands.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4 text-sm">No errands yet</p>
              <button
                onClick={() => navigate(userRole === 'asker' ? '/create-errand' : '/errands')}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 text-sm inline-block"
              >
                {userRole === 'asker' ? 'Post an Errand' : 'Browse Tasks'}
              </button>
            </div>
          ) : (
            errands.map((errand) => (
              <div
                key={errand.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Compact Header */}
                <button
                  onClick={() =>
                    setExpandedErrandId(
                      expandedErrandId === errand.id ? null : errand.id
                    )
                  }
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Title & Quick Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-errandify-brown mb-2 truncate text-base">
                        {errand.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-500 text-xs">
                          ⏱ {formatDate(errand.createdAt)}
                        </span>

                        <span
                          className={`${getCategoryColor(
                            errand.category
                          )} px-2 py-0.5 rounded-full text-xs font-semibold`}
                        >
                          {errand.category}
                        </span>

                        {errand.budget && (
                          <span className="text-errandify-orange font-bold text-xs">
                            SGD ${errand.budget}
                          </span>
                        )}

                        <span className="text-blue-600 font-semibold text-xs">
                          {errand.status}
                        </span>
                      </div>
                    </div>

                    {/* Right: Expand Arrow */}
                    <div className="text-gray-400 text-lg flex-shrink-0 pt-1">
                      {expandedErrandId === errand.id ? '▼' : '▶'}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedErrandId === errand.id && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                    {errand.description && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Details
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {errand.description}
                        </p>
                      </div>
                    )}

                    {errand.deadline && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Deadline
                        </p>
                        <p className="text-sm text-gray-700">
                          {new Date(errand.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {userRole === 'doer' && errand.askerName && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Posted by
                        </p>
                        <p className="text-sm text-gray-700">
                          {errand.askerName}
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/errand/${errand.id}`)}
                      className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 text-sm mt-2"
                    >
                      {userRole === 'asker' ? 'View Details' : 'Accept Task'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-8"></div>
    </div>
  );
}
