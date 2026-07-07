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

interface CategoryExample {
  [key: string]: string[];
}

export default function HomePage({ userRole }: HomePageProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Friend');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showExamplesModal, setShowExamplesModal] = useState(false);

  const categoryExamples: CategoryExample = {
    'home-maintenance': [
      'Fix leaking bathroom tap on Saturday 10am, Tanjong Pagar 150101, Budget $80',
      'Install ceiling fan on Tuesday 2pm, Bedok 450100, Budget $150',
      'Repair kitchen cabinet on Wednesday 1pm, Clementi 120100, Budget $120',
    ],
    'cleaning-household': [
      'Clean my house on Tuesday 6pm, 2 hours, Tanjong Pagar 150101, Budget $150',
      'Deep clean office on Friday 3pm, 3 hours, Bugis 190100, Budget $200',
      'Laundry service on Monday 10am, Orchard 230100, Budget $60',
    ],
    'food-beverage': [
      'Cook dinner for 6 people on Saturday 5pm, Tiong Bahru 160100, Budget $200',
      'Grocery shopping on Thursday 2pm, Pasir Ris 510100, Budget $100',
      'Meal prep for the week on Sunday 11am, Ang Mo Kio 560100, Budget $150',
    ],
    'furniture-assembly': [
      'Assemble IKEA furniture on Saturday 2pm, 2 hours, Serangoon 550100, Budget $120',
      'Arrange living room furniture on Wednesday 1pm, Jurong 640100, Budget $100',
      'Move bed and wardrobe on Friday morning, Tampines 520100, Budget $180',
    ],
    'shopping-errands': [
      'Pick up document from office on Thursday 11am, Raffles Place 040100, Budget $25',
      'Shopping for groceries on Saturday 10am, Tanjong Pagar 150101, Budget $80',
      'Pick up packages from multiple locations on Monday 3pm, Downtown 010100, Budget $50',
    ],
    'delivery-moving': [
      'Send package to Jurong on Monday 9am, Tanjong Pagar 150101, Budget $40',
      'Help move to new apartment on Saturday, 4 hours, Bedok 450100, Budget $300',
      'Courier service to JB on Tuesday 8am, Woodland 730100, Budget $60',
    ],
    'travel-mobility': [
      'Airport pickup on Sunday 6am from Changi, Marina Bay 180100, Budget $50',
      'Travel planning for Japan trip, Online or Orchard 230100, Budget $150',
      'Arrange relocation services on Friday, multiple locations, Budget $400',
    ],
    'event-planning': [
      'Help set up birthday party on Saturday 2pm, 3 hours, Bishan 570100, Budget $120',
      'Assist with wedding reception setup on Friday 11am, Marina Bay 180100, Budget $250',
      'Event registration on Sunday 9am, 2 hours, Downtown 010100, Budget $80',
    ],
    'childcare-education': [
      'Pick up my kids from school on Wednesday 2:30pm, Marina Bay 180100, Budget $30',
      'Babysit on Saturday evening 6pm, 4 hours, Orchard 230100, Budget $100',
      'Tutor math on Tuesday 4pm, 1.5 hours, Ang Mo Kio 560100, Budget $60',
    ],
    'eldercare-healthcare': [
      'Accompany grandma to doctor on Tuesday 10am, Bedok 450100, Budget $50',
      'Help elderly neighbor with groceries on Thursday afternoon, Serangoon 550100, Budget $30',
      'Senior care companion on weekends, Tiong Bahru 160100, Budget $120',
    ],
    'pet-care': [
      'Walk my dog on weekday morning 7am, 30 mins, Clementi 120100, Budget $20',
      'Pet sit over weekend, Tiong Bahru 160100, Budget $80',
      'Dog grooming on Saturday 10am, Tanjong Pagar 150101, Budget $100',
    ],
    'personal-care': [
      'Personal training session on Monday 6pm, 1 hour, Punggol 820100, Budget $60',
      'Hair styling on Saturday afternoon 2pm, Orchard 230100, Budget $80',
      'Massage therapy on Friday evening 7pm, 1.5 hours, Marina Bay 180100, Budget $120',
    ],
    'tech-support': [
      'Fix laptop on Thursday 3pm, Pasir Ris 510100, Budget $80',
      'Setup new computer on Saturday 2pm, Ang Mo Kio 560100, Budget $100',
      'WiFi troubleshooting on Monday 7pm, Tiong Bahru 160100, Budget $50',
    ],
    'creative-arts': [
      'Photography for family event on Saturday 2pm, 3 hours, Bedok 450100, Budget $300',
      'Graphic design for business flyer, Online or Tanjong Pagar 150101, Budget $150',
      'Portrait drawing session on Sunday 11am, Clementi 120100, Budget $120',
    ],
    'admin-business': [
      'Pick up document from office on Thursday 11am, Raffles Place 040100, Budget $25',
      'Data entry for spreadsheet on Wednesday 2pm, 2 hours, Downtown 010100, Budget $80',
      'Bookkeeping assistance on Friday 10am, 3 hours, Marina Bay 180100, Budget $150',
    ],
    'charity-community': [
      'Volunteer for community cleanup on Saturday 8am, Tiong Bahru 160100, Flexible budget',
      'Help organize charity event on Sunday 10am, Marina Bay 180100, Budget $100',
      'Donate and distribute items on Wednesday afternoon, Tanjong Pagar 150101, Budget $50',
    ],
  };

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

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setShowExamplesModal(true);
  };

  const handleProceedWithCategory = (categoryId: string) => {
    setShowExamplesModal(false);
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
                      onClick={() => handleCategoryClick(category)}
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

      {/* Examples Modal */}
      {showExamplesModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-errandify-brown">
                {selectedCategory.icon} {selectedCategory.name}
              </h2>
              <button
                onClick={() => setShowExamplesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">{selectedCategory.purpose}</p>

            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold text-gray-700 mb-3">💡 Examples of tasks in this category:</p>
              {categoryExamples[selectedCategory.id]?.map((example, idx) => (
                <div key={idx} className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-2.5">
                  <p className="text-xs text-errandify-brown leading-relaxed">✓ {example}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExamplesModal(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 text-sm"
              >
                Close
              </button>
              <button
                onClick={() => handleProceedWithCategory(selectedCategory.id)}
                className="flex-1 bg-errandify-orange text-white py-2.5 rounded-lg font-bold hover:bg-opacity-90 text-sm"
              >
                {userRole === 'asker' ? '📝 Post' : '🔍 Browse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
