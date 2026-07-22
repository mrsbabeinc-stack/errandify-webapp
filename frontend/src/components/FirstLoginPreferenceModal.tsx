import { useState } from 'react';
import axios from 'axios';

interface FirstLoginPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const categories = [
  { id: 'home-maintenance', name: '🏠 Home Maintenance', color: 'from-orange-100 to-orange-50' },
  { id: 'cleaning-household', name: '🧹 Cleaning & Household', color: 'from-yellow-100 to-yellow-50' },
  { id: 'shopping-errands', name: '🛍️ Shopping & Errands', color: 'from-pink-100 to-pink-50' },
  { id: 'delivery-moving', name: '📦 Delivery & Moving', color: 'from-blue-100 to-blue-50' },
  { id: 'childcare-education', name: '🧒 Childcare & Education', color: 'from-green-100 to-green-50' },
  { id: 'pet-care', name: '🐕 Pet Care', color: 'from-purple-100 to-purple-50' },
  { id: 'tech-support', name: '💻 Tech Support', color: 'from-indigo-100 to-indigo-50' },
  { id: 'personal-care', name: '💆 Personal Care', color: 'from-rose-100 to-rose-50' },
];

export default function FirstLoginPreferenceModal({ isOpen, onClose, onComplete }: FirstLoginPreferenceModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/category-preferences`,
        { preferredCategories: selectedCategories },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem('preferences_set', 'true');
      onComplete();
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('preferences_skipped', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-errandify-brown mb-2">
          🎯 Help Us Recommend Errands For You
        </h2>
        <p className="text-gray-600 mb-6">
          Select the types of errands you're interested in. We'll use this to recommend relevant jobs and help you find work faster!
        </p>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left font-medium ${
                selectedCategories.includes(category.id)
                  ? 'border-errandify-orange bg-errandify-orange bg-opacity-10'
                  : 'border-gray-200 bg-gray-50 hover:border-errandify-orange'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span>{category.name}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Count */}
        {selectedCategories.length > 0 && (
          <p className="text-sm text-errandify-orange font-semibold mb-4">
            ✓ {selectedCategories.length} category{selectedCategories.length !== 1 ? 'ies' : ''} selected
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || selectedCategories.length === 0}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : '✓ Save & Continue'}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          You can update your preferences anytime in MyAccount → Errand Preferences
        </p>
      </div>
    </div>
  );
}
