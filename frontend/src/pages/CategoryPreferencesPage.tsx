import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CategoryPreference {
  id: string;
  name: string;
  icon: string;
  canHelp: boolean;
  needHelp: boolean;
  aiSuggested?: boolean;
  relevanceScore?: number;
}

export default function CategoryPreferencesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [doerSpecializations, setDoerSpecializations] = useState<string[]>([]);

  const ALL_16_CATEGORIES: CategoryPreference[] = [
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', canHelp: false, needHelp: false },
    { id: 'cleaning-household', name: 'Cleaning & Laundry', icon: '🧹', canHelp: false, needHelp: false },
    { id: 'food-beverage', name: 'Food & Beverage', icon: '🍕', canHelp: false, needHelp: false },
    { id: 'furniture-assembly', name: 'Furniture Assembly', icon: '🛋️', canHelp: false, needHelp: false },
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', canHelp: false, needHelp: false },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', canHelp: false, needHelp: false },
    { id: 'travel-mobility', name: 'Travel & Mobility', icon: '✈️', canHelp: false, needHelp: false },
    { id: 'event-planning', name: 'Event Planning & Setup', icon: '🎉', canHelp: false, needHelp: false },
    { id: 'childcare-education', name: 'Childcare & Education', icon: '👶', canHelp: false, needHelp: false },
    { id: 'eldercare-healthcare', name: 'Eldercare & Healthcare', icon: '🏥', canHelp: false, needHelp: false },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', canHelp: false, needHelp: false },
    { id: 'personal-care', name: 'Personal Care', icon: '💆', canHelp: false, needHelp: false },
    { id: 'tech-support', name: 'Tech Support', icon: '💻', canHelp: false, needHelp: false },
    { id: 'creative-arts', name: 'Creative & Arts', icon: '🎨', canHelp: false, needHelp: false },
    { id: 'admin-business', name: 'Admin & Business', icon: '📊', canHelp: false, needHelp: false },
    { id: 'charity-community', name: 'Charity & Community', icon: '❤️', canHelp: false, needHelp: false },
  ];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch saved preferences
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        const prefs = response.data.data;
        const updated = ALL_16_CATEGORIES.map(cat => ({
          ...cat,
          canHelp: prefs.canHelp?.includes(cat.id) || false,
          needHelp: prefs.needHelp?.includes(cat.id) || false,
        }));
        setCategories(updated);
        setDoerSpecializations(prefs.canHelp || []);
      } else {
        // No preferences saved yet - use AI to suggest
        await getAiSuggestions();
        setCategories(ALL_16_CATEGORIES);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      setCategories(ALL_16_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const getAiSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) return;

      // Call AI to analyze user's job history and suggest specializations
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/suggest-categories`,
        { userId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const suggestions = response.data.data;
        setAiInsights(suggestions.insight);

        // Auto-set suggested categories
        const updated = ALL_16_CATEGORIES.map(cat => ({
          ...cat,
          canHelp: suggestions.doerCategories?.includes(cat.id) || false,
          needHelp: suggestions.askerCategories?.includes(cat.id) || false,
          aiSuggested: suggestions.doerCategories?.includes(cat.id) || suggestions.askerCategories?.includes(cat.id),
          relevanceScore: suggestions.scores?.[cat.id] || 0,
        }));
        setCategories(updated);
        setDoerSpecializations(suggestions.doerCategories || []);
      }
    } catch (error) {
      console.warn('AI suggestions failed:', error);
    }
  };

  const toggleCanHelp = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, canHelp: !cat.canHelp, aiSuggested: false }
          : cat
      )
    );
  };

  const toggleNeedHelp = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, needHelp: !cat.needHelp, aiSuggested: false }
          : cat
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) return;

      const canHelpCategories = categories.filter(c => c.canHelp).map(c => c.id);
      const needHelpCategories = categories.filter(c => c.needHelp).map(c => c.id);

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/preferences`,
        {
          canHelp: canHelpCategories,
          needHelp: needHelpCategories,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Dispatch event to notify other components
      window.dispatchEvent(new Event('preferencesUpdated'));

      alert('✅ Preferences saved! Your matches will improve now.');
      navigate('/my-account');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('❌ Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canHelpCount = categories.filter(c => c.canHelp).length;
  const needHelpCount = categories.filter(c => c.needHelp).length;

  if (loading) return <div className="p-6 text-center">Loading preferences...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-orange-600 font-semibold mb-3">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">
            🎯 Your Category Preferences
          </h1>
          <p className="text-gray-600">
            Select what you can help with (as a doer) and what you need help with (as an asker). This helps us match you with the right errands!
          </p>
        </div>

        {/* AI Insights Banner */}
        {aiInsights && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-500 p-4 rounded-lg mb-6">
            <p className="text-purple-900 font-semibold">🤖 AI Insights</p>
            <p className="text-purple-800 text-sm mt-1">{aiInsights}</p>
          </div>
        )}

        {/* Toggle Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <p className="text-lg font-bold text-green-700">💪 I Can Help</p>
            <p className="text-sm text-green-600">{canHelpCount} specializations</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <p className="text-lg font-bold text-blue-700">🙋 I Need Help</p>
            <p className="text-sm text-blue-600">{needHelpCount} categories</p>
          </div>
        </div>

        {/* 16 Categories Grid */}
        <div className="space-y-3 mb-8">
          {categories.map(category => (
            <div
              key={category.id}
              className={`bg-white rounded-lg p-4 border-2 transition-all ${
                category.canHelp || category.needHelp ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Category Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{category.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{category.name}</p>
                      {category.aiSuggested && (
                        <p className="text-xs text-purple-600">🤖 AI suggested based on your history</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-3">
                  {/* Can Help Toggle */}
                  <button
                    onClick={() => toggleCanHelp(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                      category.canHelp
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                    }`}
                  >
                    <span>{category.canHelp ? '✓' : '○'}</span>
                    <span className="text-sm">Help</span>
                  </button>

                  {/* Need Help Toggle */}
                  <button
                    onClick={() => toggleNeedHelp(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                      category.needHelp
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                    }`}
                  >
                    <span>{category.needHelp ? '✓' : '○'}</span>
                    <span className="text-sm">Need</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>💡 How this works:</strong>
          </p>
          <ul className="text-sm text-blue-800 space-y-1 mt-2">
            <li>✓ <strong>I Can Help:</strong> Mark categories you specialize in as a doer. When someone posts in these categories, you'll see them first!</li>
            <li>✓ <strong>I Need Help:</strong> Mark categories you need help with as an asker. We'll recommend doers who specialize in these!</li>
            <li>✓ <strong>AI Learning:</strong> The more errands you complete, the smarter our suggestions get.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/my-account')}
            className="py-3 rounded-lg font-bold text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (canHelpCount === 0 && needHelpCount === 0)}
            className={`py-3 rounded-lg font-bold text-white transition ${
              saving || (canHelpCount === 0 && needHelpCount === 0)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg'
            }`}
          >
            {saving ? '💭 Saving...' : '✅ Save Preferences'}
          </button>
        </div>

        {/* Empty State Warning */}
        {canHelpCount === 0 && needHelpCount === 0 && (
          <p className="text-center text-orange-600 font-semibold mt-3 text-sm">
            ⚠️ Select at least one category to save
          </p>
        )}
      </div>
    </div>
  );
}
