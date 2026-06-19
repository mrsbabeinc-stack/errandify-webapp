import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  userRole: 'asker' | 'doer';
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  purpose: string;
  group: string;
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');

  const categories: Category[] = [
    // GROUP 1: HOME & HOUSEHOLD
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠', color: 'from-orange-100 to-orange-50', purpose: 'Repairs, renovations, plumbing, electrical', group: '🏠 Home & Household' },
    { id: 'cleaning-household', name: 'Cleaning & Household', icon: '🧹', color: 'from-errandify-orange-100 to-errandify-orange-50', purpose: 'House cleaning, laundry, organizing', group: '🏠 Home & Household' },
    { id: 'food-beverage', name: 'Food & Beverage', icon: '🍕', color: 'from-red-100 to-red-50', purpose: 'Cooking, grocery shopping, meal prep', group: '🏠 Home & Household' },
    { id: 'furniture-assembly', name: 'Furniture & Assembly', icon: '🛋️', color: 'from-amber-100 to-amber-50', purpose: 'Furniture assembly, arrangement, moving', group: '🏠 Home & Household' },

    // GROUP 2: ERRANDS & LOGISTICS
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️', color: 'from-pink-100 to-pink-50', purpose: 'Shopping, deliveries, postal services', group: '🚚 Errands & Logistics' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦', color: 'from-yellow-100 to-yellow-50', purpose: 'Package delivery, moving assistance', group: '🚚 Errands & Logistics' },
    { id: 'travel-mobility', name: 'Travel & Mobility', icon: '✈️', color: 'from-sky-100 to-sky-50', purpose: 'Airport rides, travel planning, relocation', group: '🚚 Errands & Logistics' },
    { id: 'event-planning', name: 'Event Planning', icon: '✨', color: 'from-violet-100 to-violet-50', purpose: 'Weddings, parties, corporate events', group: '🚚 Errands & Logistics' },

    // GROUP 3: CARE & WELLBEING
    { id: 'childcare-education', name: 'Childcare & Education', icon: '🧒', color: 'from-green-100 to-green-50', purpose: 'Babysitting, tutoring, homework help', group: '❤️ Care & Wellbeing' },
    { id: 'eldercare-healthcare', name: 'Eldercare & Healthcare', icon: '👵', color: 'from-gray-100 to-gray-50', purpose: 'Senior care, medication, health support', group: '❤️ Care & Wellbeing' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕', color: 'from-purple-100 to-purple-50', purpose: 'Dog walking, pet sitting, grooming', group: '❤️ Care & Wellbeing' },
    { id: 'personal-care', name: 'Personal Care & Wellness', icon: '💆', color: 'from-rose-100 to-rose-50', purpose: 'Hair styling, massage, fitness coaching', group: '❤️ Care & Wellbeing' },

    // GROUP 4: SKILLS & SERVICES
    { id: 'tech-support', name: 'Tech Support & IT', icon: '💻', color: 'from-indigo-100 to-indigo-50', purpose: 'Computer repair, setup, tech help', group: '💡 Skills & Services' },
    { id: 'creative-arts', name: 'Creative & Arts', icon: '🎨', color: 'from-fuchsia-100 to-fuchsia-50', purpose: 'Design, photography, art services', group: '💡 Skills & Services' },
    { id: 'admin-business', name: 'Admin & Business', icon: '📚', color: 'from-slate-100 to-slate-50', purpose: 'Bookkeeping, document prep, data entry', group: '💡 Skills & Services' },
    { id: 'charity-community', name: 'Charity & Community', icon: '❤️', color: 'from-red-100 to-red-50', purpose: 'Volunteer work, community service', group: '💡 Skills & Services' },
  ];

  // Group categories by their group field
  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

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
      // Askers: Go to Hana with category pre-filled
      navigate(`/create-errand-hana?category=${categoryId}`);
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
            Welcome home, {userName}! 👋
          </h1>
          <p className="text-gray-600">
            {userRole === 'asker'
              ? 'Need help with something? Post an errand and let your kampung help you out'
              : 'Looking to help your neighbours? Browse ToHelp and earn some rewards'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {userRole === 'asker' ? (
            <>
              <button
                onClick={() => navigate('/create-errand')}
                className="bg-errandify-orange text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-3xl mb-2 block">📝</span>
                <span className="font-semibold text-sm">Post an Errand</span>
              </button>

              <button
                onClick={() => navigate('/errands')}
                className="bg-errandify-brown text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-3xl mb-2 block">📋</span>
                <span className="font-semibold text-sm">MyErrands</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/search')}
                className="bg-errandify-orange text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-3xl mb-2 block">🔍</span>
                <span className="font-semibold text-sm">Browse ToHelp</span>
              </button>

              <button
                onClick={() => navigate('/errands')}
                className="bg-errandify-brown text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-3xl mb-2 block">✓</span>
                <span className="font-semibold text-sm">Confirmed ToHelp</span>
              </button>
            </>
          )}
        </div>

        {/* Quick Categories Section - Grouped with Section Headers */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <h2 className="font-bold text-errandify-brown mb-4">
            {userRole === 'asker' ? '🎯 What do you need help with?' : '🤝 How can you help your kampung today?'}
          </h2>

          <div className="space-y-4">
            {Object.entries(groupedCategories).map(([groupName, cats]) => (
              <div key={groupName}>
                {/* Group Section Header */}
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 pl-1">
                  {groupName}
                </h3>

                {/* Group Categories Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {cats.map((category) => (
                    <div key={category.id} className="group relative">
                      <button
                        onClick={() => handleCategoryClick(category.id)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-md bg-gradient-to-r ${category.color}`}
                      >
                        <div className="text-lg mb-0.5">{category.icon}</div>
                        <div className="line-clamp-2">{category.name}</div>
                      </button>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg max-w-xs whitespace-normal">
                        {category.purpose}
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 transform rotate-45 -mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            {userRole === 'asker'
              ? '✨ Hover to learn more • Click to post your errand'
              : '✨ Hover to learn more • Click to help your neighbours'}
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
