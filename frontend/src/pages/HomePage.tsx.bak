import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';

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
    <div className="min-h-screen bg-errandify-bg pb-32">
      {/* Page Container */}
      <div className="max-w-3xl mx-auto px-2 py-0.5">
        {/* AD CAROUSEL */}
        <div className="mb-1">
          <AdCarousel />
        </div>

        {/* EVENT BANNER */}
        <div className="mb-1">
          <EventBanner />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          {userRole === 'asker' ? (
            <>
              <button
                onClick={() => navigate('/create-errand-hana')}
                className="bg-errandify-orange text-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-lg block">📝</span>
                <span className="font-semibold text-xs">Post</span>
              </button>

              <button
                onClick={() => navigate('/errands')}
                className="bg-errandify-brown text-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-lg block">📋</span>
                <span className="font-semibold text-xs">MyErrands</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/browse')}
                className="bg-errandify-orange text-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-lg block">🔍</span>
                <span className="font-semibold text-xs">Browse</span>
              </button>

              <button
                onClick={() => navigate('/my-offer')}
                className="bg-errandify-brown text-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <span className="text-lg block">💼</span>
                <span className="font-semibold text-xs">MyOffer</span>
              </button>
            </>
          )}
        </div>

        {/* Quick Categories */}
        <div className="bg-white rounded-lg p-1 border border-gray-200">
          <h2 className="font-bold text-errandify-brown mb-0.5 text-xs pl-1">
            {userRole === 'asker' ? '🎯 Need help?' : '🤝 Help?'}
          </h2>

          <div className="space-y-0.5">
            {Object.entries(groupedCategories).map(([groupName, cats]) => (
              <div key={groupName}>
                <h3 className="text-xs font-bold text-gray-600 mb-0.5 pl-1">{groupName}</h3>
                <div className="grid grid-cols-4 gap-1 mb-1">
                  {cats.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`px-1 py-1 rounded text-xs font-medium transition-all hover:shadow-md bg-gradient-to-r ${category.color}`}
                      title={category.purpose}
                    >
                      <div className="text-xs">{category.icon}</div>
                      <div className="line-clamp-1 text-xs">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
