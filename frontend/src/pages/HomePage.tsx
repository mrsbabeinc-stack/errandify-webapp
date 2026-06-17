import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  userRole: 'asker' | 'doer';
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', color: 'from-orange-100 to-orange-50' },
    { id: 'cleaning-laundry', name: 'Cleaning & Laundry', icon: '🧺', color: 'from-blue-100 to-blue-50' },
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', color: 'from-pink-100 to-pink-50' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', color: 'from-yellow-100 to-yellow-50' },
    { id: 'childcare-tutoring', name: 'Childcare & Tutoring', icon: '🧒', color: 'from-green-100 to-green-50' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', color: 'from-purple-100 to-purple-50' },
    { id: 'tech-support', name: 'Tech Support', icon: '💻', color: 'from-indigo-100 to-indigo-50' },
    { id: 'moving-help', name: 'Moving Help', icon: '🚚', color: 'from-red-100 to-red-50' },
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleViewJobs = () => {
    if (selectedCategories.length > 0) {
      const categoryQuery = selectedCategories.join(',');
      navigate(`/browse?categories=${categoryQuery}`);
    } else {
      navigate('/browse');
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || 'Friend');
      } catch {
        setUserName('Friend');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Welcome Section - Compact */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-errandify-brown mb-1">
            Welcome, {userName}! 👋
          </h1>
          <p className="text-gray-600 text-sm">
            {userRole === 'asker'
              ? 'Post errands and find reliable doers to complete them'
              : 'Browse available errands and earn by helping others'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate(userRole === 'asker' ? '/create-errand-hana' : '/browse')}
            className="bg-errandify-orange text-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-1 block">
              {userRole === 'asker' ? '📝' : '🔍'}
            </span>
            <span className="font-semibold text-xs">
              {userRole === 'asker' ? 'Post an Errand' : 'Browse ToHelp'}
            </span>
          </button>

          <button
            onClick={() => navigate('/errands')}
            className="bg-errandify-brown text-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-1 block">
              {userRole === 'asker' ? '📋' : '✓'}
            </span>
            <span className="font-semibold text-xs">
              {userRole === 'asker' ? 'My Errands' : 'My Work'}
            </span>
          </button>
        </div>

        {/* Category Tabs & How It Works - Combined Section */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          {/* Category Tabs - For both Asker and Doer */}
          <div className="mb-5 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-errandify-brown mb-3 uppercase tracking-wide">
              Quick Categories {userRole === 'doer' && '(To Select)'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (userRole === 'asker') {
                        navigate(`/create-errand?category=${category.id}`);
                      } else {
                        handleCategoryToggle(category.id);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all hover:shadow-md ${
                      userRole === 'doer' && isSelected
                        ? 'bg-errandify-orange text-white shadow-md ring-2 ring-orange-300'
                        : `bg-gradient-to-r ${category.color}`
                    }`}
                    title={category.name}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                    {userRole === 'doer' && isSelected && ' ✓'}
                  </button>
                );
              })}
            </div>
            {userRole === 'doer' && (
              <button
                onClick={handleViewJobs}
                className="mt-4 w-full bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition-colors"
              >
                View Jobs {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              </button>
            )}
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-sm font-bold text-errandify-brown mb-3 uppercase tracking-wide">How Errandify Works</h2>
            {userRole === 'asker' ? (
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">📝</span>
                  <span><strong>Post an Errand:</strong> Describe what you need done</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">👥</span>
                  <span><strong>Find a Doer:</strong> Browse qualified neighbours who can help</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">✓</span>
                  <span><strong>Review & Approve:</strong> Get it done and rate your doer</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">🔍</span>
                  <span><strong>Browse Errands:</strong> See what's available in your area</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">💪</span>
                  <span><strong>Apply & Accept:</strong> Pick errands that match your skills</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">💰</span>
                  <span><strong>Get Paid:</strong> Earn money by helping others</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
