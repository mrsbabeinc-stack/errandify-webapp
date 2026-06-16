import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Errand {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string;
  deadline: string | null;
  askerName: string;
  askerRating: number;
}

export default function BrowseErrandsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryNames: Record<string, string> = {
    'home-maintenance': 'Home Maintenance',
    'cleaning-laundry': 'Cleaning & Laundry',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'childcare-tutoring': 'Childcare & Tutoring',
    'pet-care': 'Pet Care',
    'tech-support': 'Tech Support',
    'moving-help': 'Moving Help',
  };

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?category=${categoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setErrands(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load errands');
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [categoryId]);

  const handleAcceptErrand = (errandId: string) => {
    navigate(`/errand/${errandId}/accept`);
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-3"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-2">
          Available Tasks
        </h1>
        <p className="text-gray-600">
          Category: <span className="font-semibold">{categoryNames[categoryId || ''] || categoryId}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : errands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No tasks available in this category yet.</p>
          <button
            onClick={() => navigate('/browse-errands')}
            className="text-errandify-orange font-semibold"
          >
            Browse other categories
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {errands.map((errand) => (
            <div
              key={errand.id}
              className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition-shadow"
            >
              {/* Title */}
              <h3 className="text-lg font-semibold text-errandify-brown mb-2">
                {errand.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {errand.description}
              </p>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                {/* Budget */}
                {errand.budget && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-errandify-orange">
                      ${errand.budget.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Location */}
                {errand.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍 {errand.location}</span>
                  </div>
                )}

                {/* Deadline */}
                {errand.deadline && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📅 {new Date(errand.deadline).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Asker Rating */}
                <div className="flex items-center gap-2 text-gray-600">
                  <span>⭐ {errand.askerRating || 'New'}</span>
                </div>
              </div>

              {/* Asker */}
              <div className="border-t pt-3 mb-4">
                <p className="text-xs text-gray-600">Posted by: <span className="font-semibold">{errand.askerName}</span></p>
              </div>

              {/* Accept Button */}
              <button
                onClick={() => handleAcceptErrand(errand.id)}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
              >
                View & Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
