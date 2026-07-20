import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

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
  // Phone-only compaction so all 16 categories fit one screen (desktop unchanged)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    <AdminThemeWrapper title="" showBackButton={false}>
      {/* Page Container */}
      <div className="max-w-3xl mx-auto">
        {/* AD CAROUSEL - 4 Banner Hero Section */}
        <div style={{marginBottom: isMobile ? '6px' : '10px'}}>
          <AdCarousel />
        </div>

        {/* Quick Actions */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: isMobile ? '6px' : '10px'}}>
          {userRole === 'asker' ? (
            <>
              <button
                onClick={() => navigate('/create-errand-hana')}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                  color: 'white',
                  padding: isMobile ? '8px' : '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
                }}
              >
                <div style={{fontSize: isMobile ? '17px' : '20px', marginBottom: isMobile ? '2px' : '4px'}}>📝</div>
                <div style={{fontWeight: '600', fontSize: '12px'}}>Post Errand</div>
              </button>

              <button
                onClick={() => navigate('/errands')}
                style={{
                  background: 'linear-gradient(135deg, #8B6F47 0%, #A0826D 100%)',
                  color: 'white',
                  padding: isMobile ? '8px' : '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 111, 71, 0.3)',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 111, 71, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 111, 71, 0.3)';
                }}
              >
                <div style={{fontSize: isMobile ? '17px' : '20px', marginBottom: isMobile ? '2px' : '4px'}}>📋</div>
                <div style={{fontWeight: '600', fontSize: '12px'}}>My Errands</div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/browse')}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                  color: 'white',
                  padding: isMobile ? '8px' : '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
                }}
              >
                <div style={{fontSize: isMobile ? '17px' : '20px', marginBottom: isMobile ? '2px' : '4px'}}>🔍</div>
                <div style={{fontWeight: '600', fontSize: '12px'}}>Browse</div>
              </button>

              <button
                onClick={() => navigate('/my-offer')}
                style={{
                  background: 'linear-gradient(135deg, #8B6F47 0%, #A0826D 100%)',
                  color: 'white',
                  padding: isMobile ? '8px' : '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 111, 71, 0.3)',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 111, 71, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 111, 71, 0.3)';
                }}
              >
                <div style={{fontSize: isMobile ? '17px' : '20px', marginBottom: isMobile ? '2px' : '4px'}}>💼</div>
                <div style={{fontWeight: '600', fontSize: '12px'}}>My Offers</div>
              </button>
            </>
          )}
        </div>

        {/* Quick Categories - 2 Row Grid */}
        <div style={{backgroundColor: 'white', borderRadius: '12px', padding: isMobile ? '6px' : '10px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
          <h2 style={{fontWeight: '700', color: '#333', marginBottom: isMobile ? '5px' : '8px', fontSize: isMobile ? '13px' : '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            {userRole === 'asker' ? '🎯 Need help?' : '🤝 Help?'}
          </h2>

          {/* Show all categories grouped with headers */}
          <div style={{display: 'flex', flexDirection: 'column', gap: isMobile ? '3px' : '5px'}}>
            {Object.entries(groupedCategories).map(([groupName, cats]) => (
              <div key={groupName}>
                <h3 style={{fontSize: isMobile ? '11px' : '12px', fontWeight: '600', color: '#666', marginBottom: isMobile ? '2px' : '3px', paddingLeft: '2px'}}>{groupName}</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? '5px' : '8px'}}>
                  {cats.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      style={{
                        padding: isMobile ? '4px 2px' : '6px 8px',
                        borderRadius: isMobile ? '10px' : '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.12)',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.12)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      }}
                      title={category.purpose}
                    >
                      <div style={{fontSize: isMobile ? '20px' : '24px', marginBottom: isMobile ? '1px' : '3px'}}>{category.icon}</div>
                      <div style={{fontSize: isMobile ? '10px' : '13px', color: '#333', fontWeight: '600', lineHeight: isMobile ? '1.1' : '1.3'}}>{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminThemeWrapper>
  );
}
