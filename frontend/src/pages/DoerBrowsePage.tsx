import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface Errand {
  id: string;
  errandId?: string;
  title: string;
  description: string;
  budget: number | null;
  location: string;
  deadline: string | null;
  category: string;
  askerName: string;
  askerRating: number;
  isRecurring?: boolean;
}

interface Props {
  userRole?: 'asker' | 'doer';
}

export default function DoerBrowsePage({ userRole = 'doer' }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRecommended, setShowRecommended] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userBids, setUserBids] = useState<Record<string, number>>({}); // taskId -> bidAmount
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filterFavorites, setFilterFavorites] = useState(false);
  // Phone-only compaction so all 16 category filters fit without scrolling (desktop unchanged)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Redirect askers to their own errands page
  useEffect(() => {
    if (userRole === 'asker') {
      navigate('/errands', { replace: true });
    }
  }, [userRole, navigate]);

  const FALLBACK_CATEGORIES = [
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

  // Categories come from the DB (category_codes table) via /api/categories
  const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/categories`)
      .then((r) => r.json())
      .then((d) => { if (d?.data?.length) setCategories(d.data); })
      .catch(() => { /* keep fallback */ });
  }, []);

  // Group categories by their group field - same as HomePage
  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryNames: Record<string, string> = {
    // New category names
    'home-maintenance': 'Home Maintenance',
    'cleaning-household': 'Cleaning & Household',
    'food-beverage': 'Food & Beverage',
    'furniture-assembly': 'Furniture & Assembly',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'travel-mobility': 'Travel & Mobility',
    'event-planning': 'Event Planning',
    'childcare-education': 'Childcare & Education',
    'eldercare-healthcare': 'Eldercare & Healthcare',
    'pet-care': 'Pet Care',
    'personal-care': 'Personal Care & Wellness',
    'tech-support': 'Tech Support & IT',
    'creative-arts': 'Creative & Arts',
    'admin-business': 'Admin & Business',
    'charity-community': 'Charity & Community',
    // Legacy/old category names (for backward compatibility with existing errands)
    'cleaning-laundry': 'Cleaning & Household',
    'childcare-tutoring': 'Childcare & Education',
    'moving-help': 'Delivery & Moving',
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const saveBid = (taskId: string, amount: number) => {
    const bids = { ...userBids, [taskId]: amount };
    setUserBids(bids);
    localStorage.setItem('userBids', JSON.stringify(bids));
  };

  const getUserBid = (taskId: string) => {
    return userBids[taskId];
  };

  const toggleFavorite = (errandId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(errandId)) {
      newFavorites.delete(errandId);
    } else {
      newFavorites.add(errandId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('errandFavorites', JSON.stringify(Array.from(newFavorites)));
  };

  const getMaskedLocation = (location?: string) => {
    if (!location) return null;
    if (location.toLowerCase() === 'remote') return 'Remote';
    const postalMatch = location.match(/\d{6}/);
    if (postalMatch) {
      return `Singapore ${postalMatch[0]}`;
    }
    if (location.toLowerCase().includes('singapore')) {
      return location.split(',')[0];
    }
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  useEffect(() => {
    // Load user bids from localStorage
    const savedBids = localStorage.getItem('userBids');
    if (savedBids) {
      try {
        setUserBids(JSON.parse(savedBids));
      } catch (e) {
        console.error('Failed to parse user offers:', e);
      }
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('errandFavorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Load from URL params if available
    const urlCategories = searchParams.get('categories');
    if (urlCategories) {
      setSelectedCategories(urlCategories.split(','));
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }

        const params = showRecommended ? '?recommended=true' : '';
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands${params}`;
        console.log('[DoerBrowse] Fetching errands from:', apiUrl);
        console.log('[DoerBrowse] Token exists:', !!token);

        const response = await axios.get(
          apiUrl,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log('[DoerBrowse] Response received:', response.data);
        console.log('[DoerBrowse] Errands count:', response.data.data?.length || 0);
        setErrands(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load errands');
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [showRecommended]);

  const filteredErrands = errands.filter((errand) => {
    // Filter by role
    if (userRole === 'asker') {
      // Askers only see their own posted tasks
      if (errand.askerName !== undefined && currentUserId) {
        // Can't reliably check ownership by name, so show all for now
        // Backend should filter this
      }
    } else {
      // Doers can only see other people's tasks (not their own if they posted)
      // This is handled by backend already
    }

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(errand.category);
    const matchesSearch =
      !searchQuery ||
      errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryNames[errand.category]?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !filterFavorites || favorites.has(errand.id);
    return matchesCategory && matchesSearch && matchesFavorite;
  });

  return (
    <AdminThemeWrapper title="🔍 Browse Errands ToHelp" showBackButton onBack={() => navigate('/home')}>
      <div className="max-w-2xl mx-auto">
        {userRole === 'asker' && (
          <div style={{background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', border: '1px solid #90CAF9', padding: '10px', borderRadius: '8px', marginBottom: '10px', fontSize: '12px', color: '#1565C0', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <span>💡</span>
            <span>Switch to Doer role to browse and offer on errands.</span>
          </div>
        )}


        {/* Search Bar */}
        {userRole === 'doer' && (
          <div style={{marginBottom: '16px'}}>
            <input
              type="text"
              placeholder="🔍 Search errands by title, skills, or budget..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #FFE0D6',
                borderRadius: '12px',
                fontSize: '13px',
                outline: 'none',
                transition: 'all 0.3s',
                background: 'white',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(255, 107, 53, 0.08)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF6B35';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 53, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#FFE0D6';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.08)';
              }}
            />
          </div>
        )}

        {/* Category Selection Card - Warm & Compact - Grouped by Category Groups */}
        {userRole === 'doer' && (
          <div style={{background: 'linear-gradient(135deg, #FFF9F5 0%, #FFF5F0 100%)', borderRadius: '16px', padding: '16px', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.15)', marginBottom: '16px'}}>
          <h3 style={{fontSize: '14px', fontWeight: '800', color: '#333', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
            🎯 Categories <span style={{color: '#999', fontWeight: '400', fontSize: '12px'}}>(Select to filter)</span>
          </h3>
          <p style={{fontSize: '12px', color: '#555', marginBottom: '12px', lineHeight: '1.5', fontWeight: '500'}}>
            Find work that matches your skills. Pick one or more categories to get started! 🚀
          </p>

          {/* Show all categories */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? '5px' : '8px', marginBottom: '6px'}}>
            {Object.entries(groupedCategories).flatMap(([groupName, cats]) =>
              (cats as any[]).map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    style={{
                      padding: isMobile ? '5px 3px' : '12px 8px',
                      borderRadius: isMobile ? '10px' : '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      background: isSelected ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)' : 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)',
                      color: isSelected ? 'white' : '#333',
                      boxShadow: isSelected ? '0 8px 20px rgba(255, 107, 53, 0.35)' : '0 2px 8px rgba(255, 107, 53, 0.12)',
                      textAlign: 'center',
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFE8D6 0%, #FFD4B3 100%)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                      } else {
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 107, 53, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.12)';
                      } else {
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 107, 53, 0.35)';
                      }
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    }}
                    title={category.purpose}
                  >
                    <div style={{fontSize: isMobile ? '20px' : '24px', marginBottom: isMobile ? '1px' : '6px'}}>{category.icon}</div>
                    <div style={{fontSize: isMobile ? '10px' : '13px', fontWeight: '600', lineHeight: isMobile ? '1.1' : '1.3'}}>{category.name}</div>
                  </button>
                );
              })
            )}
          </div>

          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <button
              onClick={() => setSelectedCategories([])}
              style={{fontSize: '11px', color: '#FF6B35', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}
              onMouseOver={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Clear All
            </button>

            {/* Favorites Filter - Inline */}
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                filterFavorites
                  ? 'bg-red-500 text-white shadow-md ring-1 ring-red-300'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              ❤️ {filterFavorites ? 'Favorites' : 'Show Favorites'}
              {favorites.size > 0 && ` (${favorites.size})`}
            </button>
          </div>
          </div>
        )}

        {/* Errands List */}
        {error && (
          <div className="p-2 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs mb-2 font-medium">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-6">
            <p className="text-gray-600 text-xs">Loading errands...</p>
          </div>
        ) : filteredErrands.length === 0 ? (
          <div style={{textAlign: 'center', padding: '32px 24px', background: 'linear-gradient(135deg, #FFF9F5 0%, #FFEFEA 100%)', borderRadius: '16px', border: '2px solid #FFE0D6', boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)'}}>
            <p style={{fontSize: '32px', marginBottom: '8px'}}>
              {selectedCategories.length > 0 ? '🔍' : '📭'}
            </p>
            <p style={{fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '8px'}}>
              {selectedCategories.length > 0 ? 'No matches found' : 'No errands yet'}
            </p>
            <p style={{fontSize: '13px', color: '#555', marginBottom: '16px', lineHeight: '1.6', fontWeight: '500'}}>
              {selectedCategories.length > 0
                ? '😊 No errands in your selected categories yet. Try exploring other categories or check back soon!'
                : '🚀 The errand board is currently empty. Be the first to post one or check back soon as more opportunities arrive!'}
            </p>
            {(selectedCategories.length > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSearchQuery('');
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
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
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredErrands.map((errand) => (
              <div
                key={errand.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer border border-orange-50 overflow-hidden"
                onClick={() => navigate(`/errand/${errand.id}`, { state: { userRole } })}
              >
                <div className="p-2">
                {/* Title + Budget + Your Bid */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-xs font-bold text-errandify-brown leading-tight">
                        {errand.title}
                      </h3>
                      {(errand.errandId || errand.deadline) && (
                        <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                          {errand.errandId && (
                            <code className="text-xs font-mono text-gray-700 font-semibold">
                              {errand.errandId}
                            </code>
                          )}
                          {errand.deadline && (
                            <span className="text-xs text-gray-600">
                              📅 {new Date(errand.deadline).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="inline-block bg-gradient-to-r from-orange-100 to-orange-50 text-errandify-orange text-xs px-1.5 py-0.5 rounded-full font-semibold border border-orange-200">
                        {categoryNames[errand.category] || errand.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-errandify-orange">
                      ${Number(errand.budget || 0).toFixed(0)}
                    </span>
                    {getUserBid(errand.id) && (
                      <div className="bg-green-100 border border-green-300 rounded-full px-1.5 py-0.5 text-xs font-bold text-green-700 whitespace-nowrap">
                        ✓ ${getUserBid(errand.id)?.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location + Heart + Rating + Name */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 flex-wrap">
                  {errand.location && (
                    <span className="bg-orange-50 px-1.5 py-0.5 rounded-full text-gray-700 font-medium">
                      📍 {getMaskedLocation(errand.location)}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(errand.id);
                    }}
                    className="text-base transition-transform hover:scale-125"
                    title={favorites.has(errand.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.has(errand.id) ? '❤️' : '🤍'}
                  </button>
                  <span className="font-semibold">⭐ {errand.askerRating ? errand.askerRating.toFixed(1) : 'New'}</span>
                  <span className="text-gray-700 font-medium">{errand.askerName}</span>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filteredErrands.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-1">
              ✅ Showing {filteredErrands.length} errand{filteredErrands.length !== 1 ? 's' : ''}
            </p>
            <p className="text-gray-500">
              💡 Tap an errand card to view details and place your offer
            </p>
          </div>
        </div>
      </div>
    </AdminThemeWrapper>
  );
}
