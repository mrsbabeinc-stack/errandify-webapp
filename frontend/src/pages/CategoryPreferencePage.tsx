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
    <div className="min-h-screen bg-errandify-bg px-2 py-2 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-lg font-bold text-errandify-brown">🎯 What Matters?</h1>
          <p className="text-xs text-gray-600">Pick categories we'll find helpers for</p>
        </div>

        {/* Hana Tip */}
        <div className="bg-orange-50 border-l-4 border-errandify-orange p-2 mb-2 rounded text-xs text-gray-700">
          🌸 Pick what matters — I'll find the right neighbours!
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs mb-2">
            {error}
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`p-3 rounded border-2 transition-all text-center text-xs ${
                selectedCategories.includes(category.id)
                  ? 'bg-orange-50 border-errandify-orange'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{category.emoji}</div>
              <div className="font-bold text-errandify-brown">{category.name}</div>
            </button>
          ))}
        </div>

        {/* Selection Count */}
        <p className="text-center text-xs text-gray-600 mb-2">
          {selectedCategories.length} selected
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedCategories.length === 0}
            className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded text-xs font-bold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? '...' : 'Continue'}
          </button>
        </div>
      </div>

      <HanaAssistant />
    </div>
  );
}
