import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ErrandDetail {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  asker?: { name: string; mobile: string };
  createdAt: string;
}

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchErrandDetail();
  }, [id]);

  const fetchErrandDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setErrand(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="min-h-screen bg-errandify-bg">
        <div className="h-12"></div>
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="text-center py-12">
            <p className="text-red-600 text-sm">{error || 'Errand not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back
        </button>

        {/* Main Task Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6">
            <h1 className="text-3xl font-bold mb-3">{errand.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`${getCategoryColor(
                  errand.category
                )} px-3 py-1 rounded-full text-sm font-semibold`}
              >
                {errand.category}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  errand.status === 'open'
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-400 text-white'
                }`}
              >
                {errand.status}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-6">
            {/* Budget Highlight */}
            {errand.budget && (
              <div className="bg-orange-50 border-l-4 border-errandify-orange p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">Budget</p>
                <p className="text-3xl font-bold text-errandify-orange">
                  SGD ${errand.budget.toFixed(2)}
                </p>
              </div>
            )}

            {/* Description */}
            {errand.description && (
              <div>
                <h2 className="font-semibold text-errandify-brown mb-3 text-lg">
                  About This Task
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {errand.description}
                </p>
              </div>
            )}

            {/* Deadline */}
            {errand.deadline && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h2 className="font-semibold text-errandify-brown mb-2">
                  Deadline
                </h2>
                <p className="text-gray-700">
                  {new Date(errand.deadline).toLocaleDateString('en-SG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(errand.deadline).toLocaleTimeString('en-SG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* Asker Info */}
            {errand.asker && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="font-semibold text-errandify-brown mb-4 text-lg">
                  Posted By
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">
                      Name
                    </p>
                    <p className="text-gray-700">{errand.asker.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">
                      Contact
                    </p>
                    <p className="text-gray-700">{errand.asker.mobile}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Posted Date */}
            <div className="text-center border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                Posted on{' '}
                {new Date(errand.createdAt).toLocaleDateString('en-SG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Action Button */}
            {errand.status === 'open' && (
              <button className="w-full bg-errandify-orange text-white py-4 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-lg">
                Accept This Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-8"></div>
    </div>
  );
}
