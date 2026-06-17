import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ErrandsPageProps {
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
  location?: string;
  createdAt: string;
}

export default function ErrandsPage({ userRole }: ErrandsPageProps) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedErrandId, setExpandedErrandId] = useState<number | null>(null);

  useEffect(() => {
    fetchErrands();
  }, [userRole]);

  const fetchErrands = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`;

      if (userRole === 'asker') {
        // Askers see their posted errands
        url += '?myOnly=true';
      } else {
        // Doers see their accepted errands
        url += '?accepted=true';
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setErrands(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch errands:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch errands');
      }
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

  const pageTitle = userRole === 'asker' ? 'MyPosted Errands' : 'ToHelp Errands';
  const pageSubtitle = userRole === 'asker' ? 'Errands you have posted' : 'Errands you have accepted';

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="text-center py-12 text-gray-500">
            Loading errands...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg">
      <div className="max-w-3xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-errandify-brown">
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {pageSubtitle}
          </p>
        </div>

        {/* Content Section */}
        <div className="space-y-2">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          ) : errands.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4 text-sm">No errands yet</p>
              <button
                onClick={() => navigate(userRole === 'asker' ? '/create-errand' : '/')}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 text-sm inline-block"
              >
                {userRole === 'asker' ? 'Post an Errand' : 'Browse Errands'}
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

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/errand/${errand.id}`)}
                      className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 text-sm mt-2"
                    >
                      View Details
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
