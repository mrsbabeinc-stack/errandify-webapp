import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  userRole: 'asker' | 'doer';
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');

  const categories = [
    // GROUP 1: HOME & HOUSEHOLD
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', color: 'from-orange-100 to-orange-50', purpose: 'Repairs, renovations, plumbing, electrical' },
    { id: 'cleaning-household', name: 'Cleaning & Household', icon: '🧹', color: 'from-blue-100 to-blue-50', purpose: 'House cleaning, laundry, organizing' },
    { id: 'food-beverage', name: 'Food & Beverage', icon: '🍕', color: 'from-red-100 to-red-50', purpose: 'Cooking, grocery shopping, meal prep' },
    { id: 'furniture-assembly', name: 'Furniture & Assembly', icon: '🛋️', color: 'from-amber-100 to-amber-50', purpose: 'Furniture assembly, arrangement, moving' },

    // GROUP 2: ERRANDS & LOGISTICS
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', color: 'from-pink-100 to-pink-50', purpose: 'Shopping, deliveries, postal services' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', color: 'from-yellow-100 to-yellow-50', purpose: 'Package delivery, moving assistance' },
    { id: 'travel-mobility', name: 'Travel & Mobility', icon: '✈️', color: 'from-sky-100 to-sky-50', purpose: 'Airport rides, travel planning, relocation' },
    { id: 'event-planning', name: 'Event Planning', icon: '✨', color: 'from-violet-100 to-violet-50', purpose: 'Weddings, parties, corporate events' },

    // GROUP 3: CARE & WELLBEING
    { id: 'childcare-education', name: 'Childcare & Education', icon: '🧒', color: 'from-green-100 to-green-50', purpose: 'Babysitting, tutoring, homework help' },
    { id: 'eldercare-healthcare', name: 'Eldercare & Healthcare', icon: '👵', color: 'from-gray-100 to-gray-50', purpose: 'Senior care, medication, health support' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', color: 'from-purple-100 to-purple-50', purpose: 'Dog walking, pet sitting, grooming' },
    { id: 'personal-care', name: 'Personal Care & Wellness', icon: '💆', color: 'from-rose-100 to-rose-50', purpose: 'Hair styling, massage, fitness coaching' },

    // GROUP 4: SKILLS & SERVICES
    { id: 'tech-support', name: 'Tech Support & IT', icon: '💻', color: 'from-indigo-100 to-indigo-50', purpose: 'Computer repair, setup, tech help' },
    { id: 'creative-arts', name: 'Creative & Arts', icon: '🎨', color: 'from-fuchsia-100 to-fuchsia-50', purpose: 'Design, photography, art services' },
    { id: 'admin-business', name: 'Admin & Business', icon: '📚', color: 'from-slate-100 to-slate-50', purpose: 'Bookkeeping, document prep, data entry' },
    { id: 'charity-community', name: 'Charity & Community', icon: '❤️', color: 'from-red-100 to-red-50', purpose: 'Volunteer work, community service' },
  ];

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

  const handleCategoryClick = (categoryId: string) => {
    if (userRole === 'asker') {
      // Askers: Go to create errand with category
      navigate(`/create-errand?category=${categoryId}`);
    } else {
      // Doers: Go to browse with category filter
      navigate(`/browse?category=${categoryId}`);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-errandify-brown mb-2">
            Welcome, {userName}! 👋
          </h1>
          <p className="text-gray-600">
            {userRole === 'asker'
              ? 'Post errands and find reliable doers to complete them'
              : 'Browse available errands and earn by helping others'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/create-errand')}
            className="bg-errandify-orange text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">📝</span>
            <span className="font-semibold text-sm">Post an Errand</span>
          </button>

          <button
            onClick={() => navigate('/errands')}
            className="bg-blue-500 text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">
              {userRole === 'asker' ? '📋' : '✓'}
            </span>
            <span className="font-semibold text-sm">
              {userRole === 'asker' ? 'My Errands' : 'My Work'}
            </span>
          </button>
        </div>

        {/* Quick Categories Section */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <h2 className="font-bold text-errandify-brown mb-4">
            {userRole === 'asker' ? '📋 Quick Categories' : '🔍 Browse by Category'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <div key={category.id} className="group relative">
                <button
                  onClick={() => handleCategoryClick(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md bg-gradient-to-r ${category.color}`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {category.purpose}
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 transform rotate-45 -mt-1"></div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {userRole === 'asker'
              ? 'Hover to see category details • Click to post'
              : 'Hover to see category details • Click to browse'}
          </p>
        </div>

        {/* Role-Specific Feature List */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <h2 className="font-bold text-errandify-brown mb-4">How Errandify Works</h2>
          {userRole === 'asker' ? (
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-lg">📝</span>
                <span><strong>Post an Errand:</strong> Describe what you need done</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">👥</span>
                <span><strong>Find a Doer:</strong> Browse qualified neighbours who can help</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">✓</span>
                <span><strong>Review & Approve:</strong> Get it done and rate your doer</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-lg">🔍</span>
                <span><strong>Browse Errands:</strong> See what's available in your area</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">💪</span>
                <span><strong>Apply & Accept:</strong> Pick errands that match your skills</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">💰</span>
                <span><strong>Get Paid:</strong> Earn money by helping others</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
