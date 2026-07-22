import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  { id: 'home-maintenance', name: 'Home Maintenance', emoji: '🏠' },
  { id: 'cleaning-household', name: 'Cleaning & Household', emoji: '🧹' },
  { id: 'shopping-errands', name: 'Shopping & Errands', emoji: '🛍️' },
  { id: 'delivery-moving', name: 'Delivery & Moving', emoji: '📦' },
  { id: 'childcare-education', name: 'Childcare & Education', emoji: '🧒' },
  { id: 'pet-care', name: 'Pet Care', emoji: '🐕' },
  { id: 'tech-support', name: 'Tech Support', emoji: '💻' },
  { id: 'personal-care', name: 'Personal Care', emoji: '💆' },
  { id: 'elderly-care', name: 'Elderly Care', emoji: '👴' },
  { id: 'fitness-wellness', name: 'Fitness & Wellness', emoji: '💪' },
  { id: 'tutoring-learning', name: 'Tutoring & Learning', emoji: '📚' },
  { id: 'event-planning', name: 'Event Planning', emoji: '🎉' },
  { id: 'gardening-landscaping', name: 'Gardening & Landscaping', emoji: '🌱' },
  { id: 'handyman-repairs', name: 'Handyman & Repairs', emoji: '🔧' },
  { id: 'moving-packing', name: 'Moving & Packing', emoji: '📦' },
  { id: 'other', name: 'Other Services', emoji: '⭐' },
];

export default function CategoryPreferencePage({ userRole, onComplete }: CategoryPreferencePageProps) {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<'asker' | 'doer'>('doer');
  const [doerPreferences, setDoerPreferences] = useState<string[]>([]);
  const [askerNeeds, setAskerNeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserCategories();
  }, []);

  const fetchUserCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data.doer_preferences) {
        setDoerPreferences(response.data.data.doer_preferences);
      }
      if (response.data.data.asker_needs) {
        setAskerNeeds(response.data.data.asker_needs);
      }
    } catch (err) {
      console.error('Failed to fetch user categories:', err);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (activeRole === 'doer') {
      setDoerPreferences((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      setAskerNeeds((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    }
  };

  const getCurrentSelected = () => activeRole === 'doer' ? doerPreferences : askerNeeds;

  const handleSave = async () => {
    if (doerPreferences.length === 0 && askerNeeds.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Save preferences
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/preferences`,
        {
          doer_preferences: doerPreferences,
          asker_needs: askerNeeds,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Analyze preferences with AI (non-blocking)
      try {
        const analysisResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/analyze-preferences`,
          {
            doer_preferences: doerPreferences,
            asker_needs: askerNeeds,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          }
        );

        console.log('AI Analysis:', analysisResponse.data);
        // Show analysis toast or notification
        if (analysisResponse.data.success) {
          console.log('✅ Profile analyzed:', analysisResponse.data.data);
        }
      } catch (aiErr) {
        // AI analysis is optional - don't fail if it errors
        console.warn('AI analysis skipped:', aiErr);
      }

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
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="text-lg text-gray-600 font-bold">‹</button>
          <h1 className="text-lg font-bold text-errandify-brown">🎯 What Matters?</h1>
          <div className="w-6"></div>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-2 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveRole('doer')}
            className={`flex-1 py-2 text-xs font-bold rounded transition ${
              activeRole === 'doer'
                ? 'bg-errandify-orange text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            💼 I Can Help
          </button>
          <button
            onClick={() => setActiveRole('asker')}
            className={`flex-1 py-2 text-xs font-bold rounded transition ${
              activeRole === 'asker'
                ? 'bg-errandify-orange text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🙋 I Need Help
          </button>
        </div>

        {/* Role-Specific Header */}
        <p className="text-xs text-gray-600 mb-2">
          {activeRole === 'doer' ? 'Services you can provide' : 'Services you need'}
        </p>

        {/* Hana Tip */}
        <div className="bg-orange-50 border-l-4 border-errandify-orange p-2 mb-2 rounded text-xs text-gray-700">
          🌸 {activeRole === 'doer' ? "Tell us what you're good at!" : "Tell us what you need help with!"}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs mb-2">
            {error}
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-4 gap-1 mb-2 overflow-y-auto max-h-96">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`p-2 rounded border-2 transition-all text-center text-xs ${
                getCurrentSelected().includes(category.id)
                  ? 'bg-orange-50 border-errandify-orange'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-0.5">{category.emoji}</div>
              <div className="font-bold text-errandify-brown text-xs">{category.name}</div>
            </button>
          ))}
        </div>

        {/* Selection Count */}
        <p className="text-center text-xs text-gray-600 mb-2">
          {getCurrentSelected().length} selected ({doerPreferences.length + askerNeeds.length} total)
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
            disabled={loading || (doerPreferences.length === 0 && askerNeeds.length === 0)}
            className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded text-xs font-bold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? '...' : 'Continue'}
          </button>
        </div>
      </div>

    </div>
  );
}
