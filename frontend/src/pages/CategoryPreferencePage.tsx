import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaAssistant from '../components/HanaAssistant';

interface CategoryPreferencePageProps {
  userRole: 'asker' | 'doer';
  onComplete?: () => void;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { id: 'eldercare', name: 'ElderCare', emoji: '👵' },
  { id: 'childcare', name: 'ChildCare', emoji: '🧒' },
  { id: 'homehelp', name: 'HomeHelp', emoji: '🏠' },
  { id: 'delivery', name: 'Delivery', emoji: '📦' },
  { id: 'wellness', name: 'Wellness', emoji: '🌿' },
  { id: 'petcare', name: 'PetCare', emoji: '🐾' },
  { id: 'events', name: 'Events', emoji: '🎉' },
  { id: 'donate', name: 'Donate', emoji: '🤝' },
  { id: 'localbiz', name: 'LocalBiz', emoji: '🍜' },
  { id: 'tripcarry', name: 'TripCarry', emoji: '✈️' },
];

export default function CategoryPreferencePage({ userRole, onComplete }: CategoryPreferencePageProps) {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserCategories();
  }, []);

  const fetchUserCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data.categories) {
        setSelectedCategories(response.data.data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch user categories:', err);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/categories`,
        { categories: selectedCategories },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (onComplete) {
        onComplete();
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-errandify-brown mb-2">
            What Matters To You?
          </h1>
          <p className="text-gray-600">
            Select the categories you're interested in. We'll find the right neighbours to help!
          </p>
        </div>

        {/* Hana Bubble */}
        <div className="bg-orange-50 border-l-4 border-errandify-orange-400 p-4 mb-8 rounded">
          <p className="text-sm text-gray-700">
            <span className="text-lg mr-2">🌸</span>
            Pick what matters to you — I'll find the right neighbours to help! 🌸
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`p-6 rounded-lg border-2 transition-all text-center ${
                selectedCategories.includes(category.id)
                  ? 'bg-orange-50 border-errandify-orange'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">{category.emoji}</div>
              <div className="font-semibold text-errandify-brown text-sm">
                {category.name}
              </div>
            </button>
          ))}
        </div>

        {/* Selection Count */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            {selectedCategories.length} selected
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedCategories.length === 0}
            className="flex-1 px-4 py-3 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>

      {/* Hana Assistant */}
      <HanaAssistant />
    </div>
  );
}
