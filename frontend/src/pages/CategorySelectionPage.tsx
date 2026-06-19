import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CategorySelectionPageProps {
  userRole: 'asker' | 'doer';
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    icon: '🏠',
    description: 'Repairs, cleaning, maintenance',
    color: 'from-orange-100 to-orange-50',
  },
  {
    id: 'cleaning-laundry',
    name: 'Cleaning & Laundry',
    icon: '🧺',
    description: 'House cleaning, laundry services',
    color: 'from-errandify-orange-100 to-errandify-orange-50',
  },
  {
    id: 'shopping-errands',
    name: 'Shopping & Errands',
    icon: '🛍️',
    description: 'Grocery shopping, mall runs',
    color: 'from-pink-100 to-pink-50',
  },
  {
    id: 'delivery-moving',
    name: 'Delivery & Moving',
    icon: '📦',
    description: 'Item delivery, moving assistance',
    color: 'from-yellow-100 to-yellow-50',
  },
  {
    id: 'childcare-tutoring',
    name: 'Childcare & Tutoring',
    icon: '🧒',
    description: 'Babysitting, tutoring, lessons',
    color: 'from-green-100 to-green-50',
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    icon: '🐕',
    description: 'Dog walking, pet sitting',
    color: 'from-purple-100 to-purple-50',
  },
  {
    id: 'tech-support',
    name: 'Tech Support',
    icon: '💻',
    description: 'Device help, setup, troubleshooting',
    color: 'from-indigo-100 to-indigo-50',
  },
  {
    id: 'moving-help',
    name: 'Moving Help',
    icon: '🚚',
    description: 'Packing, heavy lifting, logistics',
    color: 'from-red-100 to-red-50',
  },
];

export default function CategorySelectionPage({ userRole }: CategorySelectionPageProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectCategory = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setLoading(true);

    // Simulate API call to save preference
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to appropriate page
    if (userRole === 'asker') {
      // Asker goes to create errand
      navigate(`/create-errand/${categoryId}`);
    } else {
      // Doer goes to browse errands
      navigate(`/browse-errands/${categoryId}`);
    }

    setLoading(false);
  };

  const handleSkip = () => {
    // Skip and go to home/dashboard
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-errandify-brown mb-2">
          {userRole === 'asker' ? 'What do you need help with?' : 'What errands interest you?'}
        </h1>
        <p className="text-gray-600">
          {userRole === 'asker'
            ? 'Select a category to post your errand'
            : 'Choose what kind of errands you want to help with'}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleSelectCategory(category.id)}
            disabled={loading}
            className={`relative overflow-hidden rounded-lg p-4 transition-all ${
              selectedCategory === category.id
                ? 'ring-2 ring-errandify-orange scale-95'
                : 'hover:shadow-lg hover:-translate-y-1'
            } ${!loading ? 'cursor-pointer' : 'opacity-50'}`}
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${category.color}`} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="text-4xl">{category.icon}</div>
              <h3 className="text-sm font-semibold text-errandify-brown text-center">
                {category.name}
              </h3>
              <p className="text-xs text-gray-600 text-center line-clamp-2">
                {category.description}
              </p>
            </div>

            {/* Selection Indicator */}
            {selectedCategory === category.id && (
              <div className="absolute top-2 right-2 bg-errandify-orange text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-24 left-0 right-0 px-4 bg-gradient-to-t from-errandify-bg via-errandify-bg to-transparent pt-4">
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 py-3 px-4 border-2 border-gray-300 text-errandify-brown rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => selectedCategory && handleSelectCategory(selectedCategory)}
            disabled={!selectedCategory || loading}
            className="flex-1 py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
