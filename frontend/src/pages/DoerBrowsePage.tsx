import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Errand {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string;
  deadline: string | null;
  category: string;
  askerName: string;
  askerRating: number;
}

export default function DoerBrowsePage() {
  const navigate = useNavigate();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  const getMaskedLocation = (location?: string) => {
    if (!location) return null;

    if (location.toLowerCase() === 'remote') return 'Remote';

    const postalMatch = location.match(/\d{6}/);
    if (postalMatch) {
      return `Singapore ${postalMatch[0]}`;
    }

    if (location.toLowerCase().includes('singapore')) {
      return location.split(',')[0];
    }

    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = selectedCategory
          ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?category=${selectedCategory}`
          : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`;

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setErrands(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load errands');
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [selectedCategory]);

  const filteredErrands = selectedCategory
    ? errands.filter((e) => e.category === selectedCategory)
    : errands;

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/home')}
          className="text-errandify-orange font-semibold mb-3"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-2">
          Browse ToHelp
        </h1>
        <p className="text-gray-600">
          Find errands you can help with and earn money
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-errandify-brown mb-2">
          Filter by Category (Optional)
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange text-base"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading errands...</p>
        </div>
      ) : filteredErrands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No errands available{selectedCategory ? ' in this category' : ''} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {filteredErrands.map((errand) => (
            <div
              key={errand.id}
              className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/errand/${errand.id}`)}
            >
              {/* Title */}
              <h3 className="text-lg font-semibold text-errandify-brown mb-2">
                {errand.title}
              </h3>

              {/* Category Badge */}
              <div className="mb-2">
                <span className="inline-block bg-orange-100 text-errandify-orange text-xs px-2 py-1 rounded-full font-semibold">
                  {categoryNames[errand.category] || errand.category}
                </span>
              </div>

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
                      SGD ${errand.budget.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Location */}
                {errand.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍 {getMaskedLocation(errand.location)}</span>
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
                  <span>⭐ {errand.askerRating ? errand.askerRating.toFixed(1) : 'New'}</span>
                </div>
              </div>

              {/* Asker */}
              <div className="border-t pt-3 mb-4">
                <p className="text-xs text-gray-600">Posted by: <span className="font-semibold">{errand.askerName}</span></p>
              </div>

              {/* View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/errand/${errand.id}`);
                }}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
              >
                View Details & Bid
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
