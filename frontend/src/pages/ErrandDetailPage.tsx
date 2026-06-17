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

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-6">
        <button onClick={() => navigate(-1)} className="text-errandify-orange font-semibold mb-4 text-sm">
          ← Back
        </button>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Errand not found'}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="text-errandify-orange font-semibold mb-4 text-sm">
          ← Back
        </button>

        {/* Task Card */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-errandify-brown mb-2">{errand.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${getCategoryColor(errand.category)} px-3 py-1 rounded-full text-xs font-semibold`}>
                  {errand.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  errand.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {errand.status}
                </span>
              </div>
            </div>
            {errand.budget && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-2xl font-bold text-errandify-orange">${errand.budget.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {errand.description && (
            <div>
              <h2 className="font-semibold text-errandify-brown mb-2">Description</h2>
              <p className="text-gray-700 text-sm leading-relaxed">{errand.description}</p>
            </div>
          )}

          {/* Deadline */}
          {errand.deadline && (
            <div>
              <h2 className="font-semibold text-errandify-brown mb-2">Deadline</h2>
              <p className="text-sm text-gray-700">
                {new Date(errand.deadline).toLocaleDateString('en-SG', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {/* Asker Info */}
          {errand.asker && (
            <div className="border-t border-gray-200 pt-4">
              <h2 className="font-semibold text-errandify-brown mb-2">Posted by</h2>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span> {errand.asker.name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Contact:</span> {errand.asker.mobile}
                </p>
              </div>
            </div>
          )}

          {/* Posted Date */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              Posted on {new Date(errand.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Button */}
          {errand.status === 'open' && (
            <button className="w-full bg-errandify-orange text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors text-sm">
              Accept Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
