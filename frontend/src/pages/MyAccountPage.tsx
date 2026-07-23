import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import MyCompanyInvites from '../components/company/MyCompanyInvites';
import EventBanner from '../components/EventBanner';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import ProfilePlaque from '../components/ProfilePlaque';
import BottomNav from '../components/BottomNav';
import HanaCustomerService from '../components/HanaCustomerService';
import AccountPauseModal from '../components/AccountPauseModal';
import StaffLeaveApplication from '../components/StaffLeaveApplication';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface UserProfile {
  id?: number;
  userId?: string;
  formattedUserId?: string;
  name: string;
  alias?: string;
  email: string;
  mobile: string;
  role: 'asker' | 'doer';
  rating?: number;
  reviewCount?: number;
  completedTasks?: number;
  totalEarnings?: number;
  errandifyPoints?: number;
  categories?: string[];
  bio?: string;
  profileImage?: string;
  monthlyHouseholdIncome?: number;
  chasCardColor?: string;
  chasSubsidyPercentage?: number;
}

interface Rating {
  score: number;
  comment: string;
  createdAt: string;
}

interface MyAccountPageProps {
  onLogout?: () => void;
  userRole?: 'asker' | 'doer';
}

/** The eight MyAccount sections, in the order they appear in the nav grid. */
const ACCOUNT_SECTIONS = [
  { id: 'dashboard', emoji: '📊', label: 'MyHub' },
  { id: 'profile', emoji: '👤', label: 'MyProfile' },
  { id: 'pocket', emoji: '💰', label: 'MyPocket' },
  { id: 'rewards', emoji: '💎', label: 'MyRewardSpace' },
  { id: 'safety', emoji: '🛡️', label: 'MySafetyCentre' },
  { id: 'notify', emoji: '🔔', label: 'Notifications' },
  { id: 'categories', emoji: '🎯', label: 'Categories' },
  { id: 'availability', emoji: '📅', label: 'My Availability' },
] as const;

export default function MyAccountPage({ onLogout, userRole = 'asker' }: MyAccountPageProps = {}) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'pocket' | 'rewards' | 'safety' | 'notify' | 'categories' | 'availability'>('dashboard');
  const [profileTab, setProfileTab] = useState<'shared' | 'private'>('shared');
  const [safetyTab, setSafetyTab] = useState<'blocked' | 'resources' | 'pause'>('resources');
  const [showAccountPauseModal, setShowAccountPauseModal] = useState(false);
  const [safetySearchTerm, setSafetySearchTerm] = useState('');
  const [safetyFilterCategory, setSafetyFilterCategory] = useState<'all' | 'trafficking' | 'abuse' | 'migrant' | 'elderly' | 'mental_health'>('all');
  const [trustedUsers, setTrustedUsers] = useState<Array<{ id: string; name: string; alias?: string; avatar?: string; markedDate: string }>>([]);
  const [rewardsTab, setRewardsTab] = useState<'overview' | 'shop' | 'gift' | 'myVoucher' | 'history'>('overview');
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [headerProfile, setHeaderProfile] = useState<{ name: string; profileImage?: string } | null>(() => {
    try {
      const user = localStorage.getItem('user');
      const profileImage = localStorage.getItem('profileImage');
      const parsed = user ? JSON.parse(user) : null;
      if (parsed && profileImage) {
        parsed.profileImage = profileImage;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  });
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    alias: '',
    bio: '',
    email: '',
    mobile: '',
    monthly_household_income: '',
    chas_card_color: '',
  });
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState<Array<{ id: string; name: string }>>([]);
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showGiftSuccessModal, setShowGiftSuccessModal] = useState(false);
  const [giftSuccessData, setGiftSuccessData] = useState<{
    pointsToSend: number;
    recipientCount: number;
    message: string;
    scheduledDate: string;
  } | null>(null);
  const [confirmRedeemData, setConfirmRedeemData] = useState<{ points: number; code: string; amount: number; name: string } | null>(null);
  const [aiAlerts, setAiAlerts] = useState<Array<{ type: string; emoji: string; title: string; message: string }>>([]);
  const [editingPayout, setEditingPayout] = useState(false);
  const [expandPayout, setExpandPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    bankName: 'DBS Bank Singapore',
    accountHolder: 'Sarah Tan',
    accountNumber: '****5678',
  });
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'completed' | 'posted' | 'referral' | 'rating' | 'accepted' | 'gift'>('all');
  const [userBalance, setUserBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('errandify_user_balance');
      return saved ? parseInt(saved, 10) : 10000;
    } catch (error) {
      return 10000;
    }
  });
  const [redemptionHistory, setRedemptionHistory] = useState<Array<{ id: string; date: string; item: string; code: string; amount: number; emoji: string }>>([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showGiftConfirmation, setShowGiftConfirmation] = useState(false);
  const [giftConfirmationData, setGiftConfirmationData] = useState<any>(null);
  const [giftForm, setGiftForm] = useState({
    points: '',
    recipients: [] as string[],
    giftCardMessage: 'Thank you for being a friend',
    customMessage: '',
    giftDate: new Date().toISOString().split('T')[0],
    groupName: '',
    useCustomMessage: false,
  });
  const [giftSearch, setGiftSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [savedGroups, setSavedGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'gifts' | 'redemptions'>('all');
  // Category preferences state
  const [selectedCategoriesHelp, setSelectedCategoriesHelp] = useState<string[]>([]);
  const [selectedCategoriesNeed, setSelectedCategoriesNeed] = useState<string[]>([]);
  const [categoriesSaving, setCategoriesSaving] = useState(false);
  const [categoriesAiInsight, setCategoriesAiInsight] = useState('');
  const categoriesCanHelpCount = selectedCategoriesHelp.length;
  const categoriesNeedHelpCount = selectedCategoriesNeed.length;

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('errandify_notification_prefs');
      return saved ? JSON.parse(saved) : {
        offerConfirmed: true,
        errandReopened: true,
        paymentReleased: true,
        newOffer: true,
        messageReceived: true,
        errandDone: true,
        profileViewed: true,
        referralActivity: true,
        platformUpdates: true,
      };
    } catch {
      return {
        offerConfirmed: true,
        errandReopened: true,
        paymentReleased: true,
        newOffer: true,
        messageReceived: true,
        errandDone: true,
        profileViewed: true,
        referralActivity: true,
        platformUpdates: true,
      };
    }
  });

  // Load notification preferences from backend on mount
  useEffect(() => {
    const loadNotificationPrefs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/preferences`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setNotificationPrefs(response.data.data);
          localStorage.setItem('errandify_notification_prefs', JSON.stringify(response.data.data));
        }
      } catch (error) {
        console.warn('Failed to load notification preferences:', error);
      }
    };
    loadNotificationPrefs();
  }, []);

  const toggleNotificationPref = async (key: keyof typeof notificationPrefs) => {
    const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(updated);
    localStorage.setItem('errandify_notification_prefs', JSON.stringify(updated));

    // Save to backend
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/preferences`,
        updated,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  };

  const ALL_16_CATEGORIES = [
    { id: 'home-maintenance', name: 'Home Maintenance', icon: '🏠' },
    { id: 'cleaning-household', name: 'Cleaning & Laundry', icon: '🧹' },
    { id: 'food-beverage', name: 'Food & Beverage', icon: '🍕' },
    { id: 'furniture-assembly', name: 'Furniture Assembly', icon: '🛋️' },
    { id: 'shopping-errands', name: 'Shopping & Errands', icon: '🛍️' },
    { id: 'delivery-moving', name: 'Delivery & Moving', icon: '📦' },
    { id: 'travel-mobility', name: 'Travel & Mobility', icon: '✈️' },
    { id: 'event-planning', name: 'Event Planning & Setup', icon: '🎉' },
    { id: 'childcare-education', name: 'Childcare & Education', icon: '👶' },
    { id: 'eldercare-healthcare', name: 'Eldercare & Healthcare', icon: '🏥' },
    { id: 'pet-care', name: 'Pet Care', icon: '🐕' },
    { id: 'personal-care', name: 'Personal Care', icon: '💆' },
    { id: 'tech-support', name: 'Tech Support', icon: '💻' },
    { id: 'creative-arts', name: 'Creative & Arts', icon: '🎨' },
    { id: 'admin-business', name: 'Admin & Business', icon: '📊' },
    { id: 'charity-community', name: 'Charity & Community', icon: '❤️' },
  ];

  const toggleCategoryHelp = (categoryId: string) => {
    if (selectedCategoriesHelp.includes(categoryId)) {
      setSelectedCategoriesHelp(selectedCategoriesHelp.filter(id => id !== categoryId));
    } else {
      setSelectedCategoriesHelp([...selectedCategoriesHelp, categoryId]);
    }
  };

  const toggleCategoryNeed = (categoryId: string) => {
    if (selectedCategoriesNeed.includes(categoryId)) {
      setSelectedCategoriesNeed(selectedCategoriesNeed.filter(id => id !== categoryId));
    } else {
      setSelectedCategoriesNeed([...selectedCategoriesNeed, categoryId]);
    }
  };

  const saveMyCategories = async () => {
    try {
      setCategoriesSaving(true);
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user) {
        alert('❌ Please log in first');
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/preferences`,
        {
          canHelp: selectedCategoriesHelp,
          needHelp: selectedCategoriesNeed,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        window.dispatchEvent(new Event('preferencesUpdated'));
        setShowSuccessModal(true);
        setModalMessage('✅ Category preferences saved! Better matches coming your way!');
      }
    } catch (error) {
      console.error('Failed to save categories:', error);
      setShowErrorModal(true);
      setModalMessage('❌ Failed to save preferences. Please try again.');
    } finally {
      setCategoriesSaving(false);
    }
  };

  const [giftCardTemplates] = useState([
    '🎂 Happy Birthday! Wishing you an amazing day!',
    '💍 Happy Anniversary! Celebrating your special love!',
    '🤝 Thank you for being a friend! You mean so much!',
    '🌟 I hope I\'ve made a difference in your life!',
    '🎉 Celebrating your wins with you!',
    '💝 You\'re appreciated more than you know!',
    '🌈 Life is better with you in it!',
    '✨ Thank you for the memories we share!',
    '🎯 You inspire me to be better!',
    '💪 I\'m grateful for your support!',
  ]);
  const [availableUsers] = useState([
    { id: 'USER0000089', name: 'Sarah Tan', alias: '@SarahT' },
    { id: 'USER0000109', name: 'John Lee', alias: '@JohnL' },
    { id: 'USER0000084', name: 'Sunny Love', alias: '@SunnyLove' },
    { id: 'USER0000071', name: 'Happy Helper', alias: '@HappyHelper' },
  ]);

  // Singapore banks list
  const singaporeBanks = [
    'DBS Bank Singapore',
    'OCBC Bank',
    'UOB Bank',
    'Standard Chartered',
    'Maybank Singapore',
    'CIMB Bank',
    'HSBC Singapore',
    'Citibank Singapore',
    'Bank of Singapore',
    'RHB Bank',
    'AEON Credit',
    'Barclays Singapore',
  ];

  // Sample activity data
  const [allActivities, setAllActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('errandify_activities');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
    return [
      { id: 1, type: 'completed', emoji: '✅', title: 'Completed: Clean apartment', errandId: 'ERR-2847', date: 'Today 10:28 AM', amount: '+$80', color: 'green' },
      { id: 2, type: 'posted', emoji: '📝', title: 'Posted: Home repairs', errandId: 'ERR-2846', date: 'Yesterday 10:25 PM', amount: '-$120', color: 'orange' },
      { id: 3, type: 'referral', emoji: '🎁', title: 'Referral: @SunnyLove', errandId: 'N/A', date: '2 days ago', amount: '+$50', color: 'purple' },
      { id: 4, type: 'rating', emoji: '⭐', title: 'Rating given: Clean apartment', errandId: 'ERR-2847', date: '3 days ago', amount: '5 stars', color: 'blue' },
      { id: 5, type: 'accepted', emoji: '✅', title: 'Accepted offer: Tutoring', errandId: 'ERR-2845', date: '4 days ago', amount: 'SGD $60', color: 'green' },
      { id: 6, type: 'posted', emoji: '📋', title: 'Posted: Office admin', errandId: 'ERR-2844', date: '5 days ago', amount: '-$75', color: 'orange' },
    ];
  });

  const filteredActivities = allActivities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(activitySearch.toLowerCase());
    const matchesFilter = activityFilter === 'all' || activity.type === activityFilter;
    const isNotGift = activity.type !== 'gift'; // Exclude gifts from MyPocket
    return matchesSearch && matchesFilter && isNotGift;
  });

  useEffect(() => {
    // Listen for profile updates from localStorage and update header display
    const handleProfileUpdate = () => {
      try {
        const user = localStorage.getItem('user');
        const profileImage = localStorage.getItem('profileImage');
        if (user) {
          const parsed = JSON.parse(user);
          if (profileImage) {
            parsed.profileImage = profileImage;
          }
          setHeaderProfile(parsed);
          console.log('[MyAccountPage] Header profile updated:', parsed);
        }
      } catch (e) {
        console.error('Failed to update header profile:', e);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    // Update header profile when profileData is loaded
    if (profileData?.name) {
      setHeaderProfile(prev => ({
        ...prev,
        name: profileData.name,
        profileImage: profileImage || undefined,
      }));
    }
  }, [profileData?.name, profileImage]);

  useEffect(() => {
    // Listen for profile update event
    const handleProfileDataUpdated = async () => {
      const token = localStorage.getItem('token');
      try {
        const profileRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProfileData(profileRes.data.data);
        console.log('[MyAccountPage] Profile data refreshed:', profileRes.data.data);
      } catch (error) {
        console.error('[MyAccountPage] Failed to refresh profile data:', error);
      }
    };

    // Listen for ratings update event from ErrandDetailPage
    const handleRatingsUpdated = async () => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      try {
        const ratingsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRatings(ratingsRes.data.data);
        console.log('[MyAccountPage] Ratings refreshed:', ratingsRes.data.data);
      } catch (error) {
        console.error('[MyAccountPage] Failed to refresh ratings:', error);
      }
    };

    window.addEventListener('profileDataUpdated', handleProfileDataUpdated);
    window.addEventListener('ratingsUpdated', handleRatingsUpdated);
    return () => {
      window.removeEventListener('profileDataUpdated', handleProfileDataUpdated);
      window.removeEventListener('ratingsUpdated', handleRatingsUpdated);
    };
  }, []);

  useEffect(() => {
    // Load saved category preferences
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user) return;

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/preferences`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success && response.data.data) {
          setSelectedCategoriesHelp(response.data.data.canHelp || []);
          setSelectedCategoriesNeed(response.data.data.needHelp || []);
        }
      } catch (error) {
        console.warn('Failed to load category preferences:', error);
      }
    };

    if (activeSection === 'categories') {
      loadCategories();
    }
  }, [activeSection]);

  useEffect(() => {
    // Fetch AI-generated alerts
    const fetchAiAlerts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/ai-alerts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.data?.alerts) {
          setAiAlerts(response.data.data.alerts);
        }
      } catch (error) {
        console.warn('Failed to fetch AI alerts:', error);
      }
    };

    // Fetch bank details
    const fetchBankDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/bank-details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.data) {
          setPayoutForm({
            bankName: response.data.data.bankName || 'DBS Bank Singapore',
            accountHolder: response.data.data.accountHolder || 'Sarah Tan',
            accountNumber: response.data.data.accountNumber || '****5678',
          });
        }
      } catch (error) {
        console.warn('Failed to fetch bank details:', error);
      }
    };

    fetchAiAlerts();
    fetchBankDetails();

    // Fetch redemption history from database
    const fetchRedemptionHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/my-vouchers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.data && Array.isArray(response.data.data)) {
          const history = response.data.data.map((voucher: any) => {
            // Extract code from description like "Redeemed reward #ERRAND5"
            let code = 'VOUCHER';
            let itemName = 'Redeemed Voucher';

            if (voucher.description && typeof voucher.description === 'string') {
              const match = voucher.description.match(/ERRAND\d+/);
              if (match) {
                code = match[0];
                // Map codes to names
                if (code === 'ERRAND5') itemName = '$5 Discount';
                else if (code === 'ERRAND10') itemName = '$10 Discount';
                else if (code === 'ERRAND20') itemName = '$20 Discount';
                else itemName = voucher.description;
              } else {
                itemName = voucher.description;
              }
            }

            return {
              id: voucher.id.toString(),
              date: new Date(voucher.created_at).toLocaleDateString('en-GB'),
              item: itemName,
              code: code,
              amount: -voucher.points,
              emoji: '💳',
            };
          });
          setRedemptionHistory(history);
        }
      } catch (error) {
        console.warn('Failed to fetch redemption history:', error);
      }
    };

    fetchRedemptionHistory();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Restore profileImage from localStorage first
        const savedProfileImage = localStorage.getItem('profileImage');
        if (savedProfileImage) {
          setProfileImage(savedProfileImage);
        }

        try {
          const profileRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setProfileData(profileRes.data.data);

          // Load profile image if available from server
          if (profileRes.data.data.profileImageUrl) {
            setProfileImage(profileRes.data.data.profileImageUrl);
          }

          // Update localStorage with latest profile data including formatted user ID and profile image
          const updatedUser = { ...user };
          if (profileRes.data.data.formattedUserId) {
            updatedUser.formattedUserId = profileRes.data.data.formattedUserId;
          }
          if (profileRes.data.data.profileImageUrl) {
            updatedUser.profile_image_url = profileRes.data.data.profileImageUrl;
          }
          localStorage.setItem('user', JSON.stringify(updatedUser));

          // Notify Layout component to update alias
          window.dispatchEvent(new Event('profileUpdated'));

          setEditForm({
            display_name: profileRes.data.data.name || '',
            email: profileRes.data.data.email || '',
            mobile: profileRes.data.data.mobile || '',
            monthly_household_income: profileRes.data.data.monthlyHouseholdIncome ? String(profileRes.data.data.monthlyHouseholdIncome) : '',
            chas_card_color: profileRes.data.data.chasCardColor || '',
            alias: profileRes.data.data.alias || '',
            bio: profileRes.data.data.bio || '',
          });

          // Load certificates from backend
          if (profileRes.data.data.certificates && Array.isArray(profileRes.data.data.certificates)) {
            setCertificates(profileRes.data.data.certificates);
          }
        } catch (error) {
          console.error('Profile API error:', error);
          // Use localStorage data as fallback
          const fallbackProfile: UserProfile = {
            id: user.id || 0,
            userId: user.userId || '',
            formattedUserId: user.formattedUserId || '',
            name: user.name || 'User',
            alias: user.alias || '',
            email: user.email || '',
            mobile: user.mobile || '',
            role: user.role || 'doer',
            bio: user.bio || '',
            reviewCount: 0,
            completedTasks: 0,
            totalEarnings: 0,
            errandifyPoints: 0,
            categories: [],
          };
          setProfileData(fallbackProfile);

          // Set fallback certificates if available
          if (user.certificates && Array.isArray(user.certificates)) {
            setCertificates(user.certificates);
          }

          // Load profile image from localStorage if available
          if (user.profile_image_url) {
            setProfileImage(user.profile_image_url);
          }

          setEditForm({
            display_name: fallbackProfile.name,
            email: fallbackProfile.email,
            mobile: fallbackProfile.mobile,
            monthly_household_income: '',
            alias: user.alias || '',
            bio: user.bio || '',
            chas_card_color: user.chas_card_color || '',
          });
        }

        try {
          const ratingsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setRatings(ratingsRes.data.data);
        } catch {
          setRatings({ averageRating: 0, reviewCount: 0, reviews: [] });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Try to restore from localStorage as fallback
        const savedProfileData = localStorage.getItem('profileData');
        if (savedProfileData) {
          try {
            const profile = JSON.parse(savedProfileData);
            setProfileData(profile);
            setEditForm({
              display_name: profile.name || '',
              email: profile.email || '',
              mobile: profile.mobile || '',
              monthly_household_income: '',
              alias: profile.alias || '',
              bio: profile.bio || '',
              chas_card_color: profile.chasCardColor || '',
            });
          } catch (parseError) {
            console.error('Error parsing saved profile data:', parseError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh stats only on initial load, not every 5 seconds
    // (5-second refresh was resetting editForm and causing text disappearance while editing)
  }, []);

  // Manual refresh function for stats
  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Fetch latest profile data
      const profileRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfileData(profileRes.data.data);

      // Fetch latest ratings
      try {
        const ratingsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRatings(ratingsRes.data.data);
      } catch {
        setRatings({ averageRating: 0, reviewCount: 0, reviews: [] });
      }

      setModalMessage('📊 Stats updated! Your latest data is loaded.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error refreshing stats:', error);
      setModalMessage('❌ Failed to refresh stats. Please try again.');
      setShowErrorModal(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Load saved groups from localStorage on mount
  useEffect(() => {
    console.log('🔄 Loading saved groups from localStorage on mount...');
    const loadedGroups = localStorage.getItem('errandify_saved_groups');
    console.log('📦 Raw localStorage value:', loadedGroups);
    if (loadedGroups) {
      try {
        const parsed = JSON.parse(loadedGroups);
        console.log('✅ Parsed groups:', parsed);
        setSavedGroups(parsed);
      } catch (error) {
        console.error('❌ Failed to load saved groups:', error);
      }
    } else {
      console.log('⚠️ No saved groups in localStorage');
    }
    setIsInitialized(true);
  }, []);

  // Save groups to localStorage whenever they change (only after initialization)
  useEffect(() => {
    if (!isInitialized) {
      console.log('⏳ Waiting for initialization before saving to localStorage...');
      return;
    }
    console.log('📦 Syncing savedGroups to localStorage:', savedGroups);
    localStorage.setItem('errandify_saved_groups', JSON.stringify(savedGroups));
    console.log('✅ Saved to localStorage:', localStorage.getItem('errandify_saved_groups'));
  }, [savedGroups, isInitialized]);

  // Load trusted users (favorites) from API on mount
  useEffect(() => {
    const loadTrustedUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/favorites`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success && response.data.data) {
          // Fetch user details for each favorite user ID
          const favoriteIds = response.data.data;
          const trustedUsersData = await Promise.all(
            favoriteIds.map(async (userId: number) => {
              try {
                const userRes = await axios.get(
                  `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${userId}/public-profile`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                const user = userRes.data.data;
                return {
                  id: user.id?.toString(),
                  name: user.displayName || user.display_name || 'Unknown',
                  alias: user.alias,
                  avatar: user.profileImage || user.profile_image_url,
                  markedDate: new Date().toLocaleDateString(),
                };
              } catch (err) {
                console.error('Failed to fetch user details:', err);
                return null;
              }
            })
          );
          setTrustedUsers(trustedUsersData.filter(Boolean));
        }
      } catch (error) {
        console.error('Failed to load favorite users:', error);
      }
    };

    loadTrustedUsers();
  }, []);

  // Save balance to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('errandify_user_balance', userBalance.toString());
  }, [userBalance]);

  // Save activities to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('errandify_activities', JSON.stringify(allActivities));
    } catch (error) {
      console.error('Failed to save activities:', error);
    }
  }, [allActivities]);

  // Helper function to mark/unmark user as trusted
  const toggleTrustedUser = (userId: string, userName: string, userAlias?: string) => {
    const isAlreadyTrusted = trustedUsers.some(u => u.id === userId);

    if (isAlreadyTrusted) {
      // Remove from trusted
      setTrustedUsers(trustedUsers.filter(u => u.id !== userId));
      setModalMessage(`❌ Removed ${userName} from trusted users`);
    } else {
      // Add to trusted
      const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      setTrustedUsers([
        ...trustedUsers,
        { id: userId, name: userName, alias: userAlias, markedDate: today }
      ]);
      setModalMessage(`❤️ Added ${userName} to trusted users`);
    }
    setShowSuccessModal(true);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      /**
       * Fallback when no onLogout was passed.
       *
       * This used `navigate('/auth')`, which is a client-side transition: it
       * clears localStorage but leaves App's `isAuthenticated` state true. The
       * /auth route reads that state and renders `<Navigate to="/home" />` for
       * anyone it believes is signed in — so logging out bounced you straight
       * back to the home page, still apparently logged in until the next full
       * reload.
       *
       * A full document load is what every other logout in the app does, and
       * it is the only version that cannot leave React state disagreeing with
       * localStorage.
       */
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('current_role');
      localStorage.removeItem('singpass_state');
      localStorage.removeItem('singpass_nonce');
      localStorage.removeItem('singpass_mode');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/auth';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ You are not logged in. Please log in first.');
        setSaving(false);
        return;
      }

      // Validate required fields
      if (!editForm.email || !editForm.email.trim()) {
        alert('❌ Email is required.');
        setSaving(false);
        return;
      }

      if (!editForm.mobile || !editForm.mobile.trim()) {
        alert('❌ Mobile is required.');
        setSaving(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        alert('❌ Please enter a valid email address.');
        setSaving(false);
        return;
      }

      // Skip text moderation for now - just proceed with save
      console.log('Skipping text moderation - proceeding with save');
      const profilePayload: any = {
        display_name: editForm.display_name,
        alias: editForm.alias,
        bio: editForm.bio,
        email: editForm.email,
        mobile: editForm.mobile,
        chas_card_color: editForm.chas_card_color,
      };

      // Profile image is stored locally only - not sent to server
      // (In production, would upload to cloud storage like S3)

      // Add certificates
      if (certificates.length > 0) {
        profilePayload.certificates = certificates;
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        profilePayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsEditing(false);

      // Update localStorage with new profile data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.alias = editForm.alias;
        user.bio = editForm.bio;
        user.email = editForm.email;
        user.mobile = editForm.mobile;
        if (profileImage) {
          user.profile_image_url = profileImage;
        }
        localStorage.setItem('user', JSON.stringify(user));

        // Notify all pages to update profile display
        window.dispatchEvent(new Event('profileUpdated'));
      }

      // Save profile image separately so it persists
      if (profileImage) {
        localStorage.setItem('profileImage', profileImage);
      }

      if (profileData) {
        const updatedProfile = {
          ...profileData,
          name: editForm.display_name,
          alias: editForm.alias,
          bio: editForm.bio,
          email: editForm.email,
          mobile: editForm.mobile,
          certificates: certificates,
          profileImageUrl: profileImage || profileData.profileImageUrl,
        };
        setProfileData(updatedProfile);

        // Also save to localStorage as backup
        localStorage.setItem('profileData', JSON.stringify(updatedProfile));
      }
      setModalMessage('Your profile shines brighter now! ✨');
      setShowSuccessModal(true);

      // Navigate to MyHub after showing success message
      setTimeout(() => {
        setShowSuccessModal(false);
        setActiveSection('dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const handleRedeemConfirm = async () => {
    if (!confirmRedeemData) return;

    try {
      const token = localStorage.getItem('token');

      // Call backend to redeem and deduct points from database
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/redeem`,
        { rewardId: confirmRedeemData.code, points: confirmRedeemData.points },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state after successful backend call
      setUserBalance(userBalance - confirmRedeemData.points);

      // Update profileData to reflect the new EP balance
      if (profileData) {
        const updatedProfileData = {
          ...profileData,
          errandifyPoints: (profileData.errandifyPoints || 0) - confirmRedeemData.points
        };
        setProfileData(updatedProfileData);
        localStorage.setItem('profileData', JSON.stringify(updatedProfileData));
      }

      const now = new Date();
      const dateStr = 'Today';
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setRedemptionHistory([
        ...redemptionHistory,
        {
          id: Date.now().toString(),
          date: dateStr,
          time: timeStr,
          item: confirmRedeemData.name,
          code: confirmRedeemData.code,
          amount: -confirmRedeemData.points,
          emoji: '💳',
        },
      ]);
      setModalMessage(`✅ Redeemed ${confirmRedeemData.name}!\n\nCode: ${confirmRedeemData.code}`);
      setShowSuccessModal(true);
      setConfirmRedeemData(null);
    } catch (error: any) {
      console.error('Redemption error:', error);
      setModalMessage(`❌ ${error.response?.data?.error || 'Failed to redeem'}`);
      setShowErrorModal(true);
      setConfirmRedeemData(null);
    }
  };

  const handleRedeemCancel = () => {
    setConfirmRedeemData(null);
  };

  // Text moderation runs on the BACKEND (server holds the API key and applies the
  // hardened content-moderation rules). Never call the AI provider from the browser.
  const moderateText = async (text: string): Promise<{ approved: boolean; message?: string }> => {
    if (!text || text.length === 0) return { approved: true };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/content-filter`,
        { title: text, description: '', notes: '' }
      );

      const data = response.data?.data;
      if (data && typeof data.is_safe === 'boolean') {
        return {
          approved: data.is_safe,
          message: data.is_safe ? undefined : (data.reason || 'This text contains content we can\'t accept.'),
        };
      }
      return { approved: true };
    } catch (error) {
      console.error('Text moderation error:', error);
      return { approved: true, message: '⚠️ Could not verify content' }; // Fail open if the service is down
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;

        // Moderate on the BACKEND *before* accepting the photo (the server holds
        // the API key). Only a clear rejection blocks the upload — if the service
        // is unavailable we fail open so a genuine photo is never lost.
        try {
          const token = localStorage.getItem('token');
          const modRes = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/moderate-image`,
            { image: base64Image },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 25000 }
          );
          const mod = modRes.data?.data;
          if (mod && mod.approved === false) {
            setModalMessage(mod.reason || "That photo isn't suitable for a profile picture. Please choose another one.");
            setShowErrorModal(true);
            return; // do NOT accept the image
          }
        } catch (error: any) {
          console.warn('Image moderation unavailable, allowing upload:', error?.message);
        }

        setProfileImage(base64Image);
        // Save to localStorage so it persists
        localStorage.setItem('profileImage', base64Image);
        setModalMessage('Your lovely face is all set! 📸');
        setShowSuccessModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading account...</div>;
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-errandify-bg p-6 pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">⚠️ Failed to load account</p>
          <p className="text-xs text-gray-600 mb-4">Please try again or log in again</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-errandify-orange text-white rounded font-semibold text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-errandify-orange text-errandify-orange rounded font-semibold text-sm"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completeness = Math.round((2 / 5) * 100);
  const badges = ratings.averageRating >= 4.8 ? [{ icon: '⭐' }] : [];

  return (
    <AdminThemeWrapper
      title="👤 MyAccount"
      subtitle="Profile, pocket, rewards and settings"
      showBackButton
      onBack={() => navigate(-1)}
      style={{background: 'linear-gradient(135deg, #FFFBF8 0%, #FFF6F0 50%, #FFE8D6 100%)'}}
    >
      {/* Main Content */}
      <div className="flex flex-col min-h-screen bg-errandify-bg">
      <main className="flex-1 pb-20">

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* AD CAROUSEL + EVENT BANNER */}
        <div className="mb-4">
          <MyCompanyInvites />
              <AdCarousel />
          <div className="mt-2">
            <EventBanner />
          </div>
        </div>

        {/*
          Section navigation.

          This was eight tabs in a horizontally scrolling strip: four of them
          sat off the right edge with nothing to say they were there, so half
          the account page was unreachable unless you happened to swipe. Same
          failure, and the same fix, as the MyKampung section grid — four
          columns, two rows, everything visible, identical tile shape so the
          two screens read as one product.
        */}
        <div
          className="sticky top-20 z-40 mb-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            background: '#FFFAF6',
            paddingBottom: '8px',
          }}
        >
          {ACCOUNT_SECTIONS.map(({ id, emoji, label }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                title={label}
                style={{
                  padding: '6px 2px',
                  borderRadius: '10px',
                  border: active ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,107,53,0.22)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  background: active
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)'
                    : 'rgba(255,255,255,0.85)',
                  color: active ? 'white' : '#D2521C',
                  boxShadow: active
                    ? '0 3px 12px rgba(255,107,53,0.28)'
                    : '0 1px 5px rgba(255,107,53,0.10)',
                }}
              >
                <div style={{ fontSize: '15px', lineHeight: 1, marginBottom: '2px' }}>{emoji}</div>
                <div style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
              </button>
            );
          })}
        </div>

        {/* DASHBOARD - Always show first */}
        {activeSection === 'dashboard' && (
          <div className="space-y-2 px-2">
            {/* COMPACT HERO - ID/Name on left, Rating on right */}
            <div className="grid grid-cols-2 gap-2">
              {/* LEFT - ID & NAME */}
              {profileData && (
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl p-3 border-2 border-orange-300 shadow-md">
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <p className="text-xs font-bold text-orange-700">🎫 YOUR ID</p>
                      <p className="text-sm font-mono font-bold text-orange-900">{profileData.formattedUserId || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <p className="text-xs font-bold text-orange-700">👤 NAME</p>
                      <p className="text-sm font-bold text-orange-900">@{profileData.alias || profileData.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* RIGHT - RATING */}
              <div className="bg-gradient-to-br from-errandify-orange-wash to-orange-100 rounded-xl p-3 border-2 border-errandify-orange/30 shadow-kampung-sm flex flex-col justify-center">
                <div className="text-center">
                  <p className="text-sm font-black text-errandify-brown mb-1">✨ People Love You!</p>
                  {/* Guarded: the API returned null here whenever the average
                      could not be computed, and .toFixed() on that crashed the
                      whole account page rather than degrading to a dash. */}
                  <p className="text-3xl font-black text-errandify-orange-deep">
                    {typeof ratings.averageRating === 'number' ? ratings.averageRating.toFixed(1) : '—'}
                  </p>
                  <div className="flex gap-1 justify-center mb-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-lg">{i < Math.floor(ratings.averageRating) ? '⭐' : '✨'}</span>
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-gray-600">({ratings.reviewCount} reviews)</p>
                </div>
              </div>
            </div>

            {/* STATS GRID - 5 CARDS IN ONE ROW, ORANGE THEME */}
            <div className="grid grid-cols-5 gap-1.5">
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-lg p-2 text-center border border-orange-600 shadow-md">
                <p className="text-2xl mb-1">👥</p>
                <p className="text-lg font-black text-white">{ratings.reviewCount}</p>
                <p className="text-xs font-bold text-orange-100">Reviews</p>
              </div>
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-lg p-2 text-center border border-orange-600 shadow-md">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-lg font-black text-white">{profileData.completedTasks || 0}</p>
                <p className="text-xs font-bold text-orange-100">Errands</p>
              </div>
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-lg p-2 text-center border border-orange-600 shadow-md">
                <p className="text-2xl mb-1">💰</p>
                <p className="text-lg font-black text-white">${profileData.totalEarnings || 0}</p>
                <p className="text-xs font-bold text-orange-100">Earnings</p>
              </div>
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-lg p-2 text-center border border-orange-600 shadow-md">
                <p className="text-2xl mb-1">⭐</p>
                <p className="text-lg font-black text-white">{profileData.errandifyPoints || 0}</p>
                <p className="text-xs font-bold text-orange-100">EP</p>
              </div>
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-lg p-2 text-center border border-orange-600 shadow-md">
                <p className="text-2xl mb-1">❤️</p>
                <p className="text-lg font-black text-white">{(profileData as any).timesFavorited || 0}</p>
                <p className="text-xs font-bold text-orange-100">Trusted</p>
              </div>
            </div>

            {/* REFERRAL BUTTON - ENGAGING & VIBRANT */}
            <div className="space-y-1.5">
              <button
                onClick={() => navigate('/referral')}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 rounded-xl p-4 shadow-lg hover:shadow-2xl transition transform hover:scale-102 active:scale-95 text-white text-center border-3 border-purple-700"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-3xl animate-bounce">🎁</div>
                  <div>
                    <p className="text-lg font-black leading-tight">Refer & Earn!</p>
                    <p className="text-xs font-bold">+50 EP per friend • Build your circle 🚀</p>
                  </div>
                </div>
              </button>
              <p className="text-xs text-center text-purple-700 font-bold">💡 Individual & Company Referrals Welcome!</p>
            </div>
          </div>
        )}

        {/* PROFILE SECTION */}
        {activeSection === 'profile' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* PROFILE SUBTABS */}
            <div className="flex gap-2 border-b border-gray-200 p-4">
              <button
                onClick={() => setProfileTab('shared')}
                className={`pb-2 font-bold text-xs transition ${
                  profileTab === 'shared'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🌐 MyShared Info
              </button>
              <button
                onClick={() => setProfileTab('private')}
                className={`pb-2 font-bold text-xs transition ${
                  profileTab === 'private'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🔒 MyPrivate Info
              </button>
            </div>

            {/* Content Area */}
            <div className="p-4">
              {/* SHARED INFO */}
              {profileTab === 'shared' && (
                <div className="space-y-4">
                {/* Beautiful Profile Plaque */}
                {profileData && (
                  <div className="mb-6">
                    <ProfilePlaque
                      name={profileData.name}
                      gender={profileData.gender}
                      bio={profileData.bio}
                      certificates={certificates}
                      profileImage={profileImage}
                      role={profileData.role}
                      trustedCount={3}
                      completedTasks={profileData.completedTasks || 0}
                      postedTasks={30}
                      alias={editForm.alias}
                      averageRating={4.8}
                      reviewCount={12}
                    />
                  </div>
                )}

              </div>
            )}

            {/* PRIVATE INFO */}
            {profileTab === 'private' && (
              <div className="space-y-3">
                {/* Profile Photo Upload - Compact */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-3">
                  <h3 className="text-xs font-bold text-blue-900 mb-2">📸 Your Photo</h3>
                  <div className="flex gap-2 items-start">
                    {profileImage && (
                      <img src={profileImage} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="w-full text-xs mb-1"
                      />
                      <p className="text-xs text-blue-700">JPG, PNG, WebP • Max 5MB • Shows in your profile ✨</p>
                    </div>
                  </div>
                </div>

                {/* Contact & Personal Info - Compact Grid */}
                <div className="bg-white rounded-lg shadow p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">👤 Contact Info</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs bg-errandify-orange text-white px-2 py-1 rounded font-semibold hover:bg-orange-600"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      {/* Name - Read Only */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Name 🔐</label>
                        <input
                          type="text"
                          value={profileData.name}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      {/* Alias - Editable */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Alias</label>
                        <input
                          type="text"
                          value={editForm.alias || ''}
                          onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                          placeholder="e.g., Sarah or SarahC"
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-400"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Email 📧</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-400"
                        />
                      </div>

                      {/* Mobile */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile 📱</label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-400"
                        />
                      </div>

                      {/* Gender - Read-only */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Gender 🔐</label>
                        <input
                          type="text"
                          value={profileData.gender === 'F' ? '👩 Female' : profileData.gender === 'M' ? '👨 Male' : 'Not set'}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-gray-600 font-semibold">Name</p>
                        <p className="text-blue-900 font-bold">{profileData.name}</p>
                      </div>
                      <div className="bg-purple-50 rounded p-2">
                        <p className="text-gray-600 font-semibold">Alias</p>
                        <p className="text-purple-900 font-bold">{editForm.alias || '—'}</p>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <p className="text-gray-600 font-semibold">Email</p>
                        <p className="text-green-900 font-bold break-all">{profileData.email || '—'}</p>
                      </div>
                      <div className="bg-orange-50 rounded p-2">
                        <p className="text-gray-600 font-semibold">Mobile</p>
                        <p className="text-orange-900 font-bold">{profileData.mobile || '—'}</p>
                      </div>
                      <div className="bg-pink-50 rounded p-2 col-span-2">
                        <p className="text-gray-600 font-semibold">Gender</p>
                        <p className="text-pink-900 font-bold">{profileData.gender === 'F' ? '👩 Female' : profileData.gender === 'M' ? '👨 Male' : '—'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-purple-900">✍️ Bio</h3>
                    <span className="text-xs text-purple-700">{editForm.bio?.length || 0}/200</span>
                  </div>

                  {/* Pro Tip for Bio */}
                  <div className="bg-white rounded p-2 mb-2 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-900 mb-1">💡 Pro Tip with AI Examples:</p>
                    <div className="text-xs text-purple-800 space-y-1">
                      <p>✅ <strong>Good:</strong> "Experienced cleaner with 5 years experience. Quick, reliable, detail-oriented."</p>
                      <p>✅ <strong>Better:</strong> "Professional cleaner (5 yrs) - homes, offices, deep clean. Trustworthy, punctual, eco-friendly products."</p>
                      <p>❌ <strong>Avoid:</strong> "I clean things" or generic descriptions</p>
                      <p className="text-xs italic">🤖 AI uses your bio to match you with perfect jobs!</p>
                    </div>
                  </div>

                  <textarea
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Describe yourself..."
                    maxLength={200}
                    className="w-full px-2 py-1 border border-purple-300 rounded text-xs resize-none focus:ring-1 focus:ring-purple-400 mb-2"
                    rows={2}
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-purple-500 text-white py-1.5 rounded font-semibold text-xs hover:bg-purple-600 transition"
                  >
                    {saving ? '⏳ Saving...' : '💾 Save Bio'}
                  </button>
                </div>

                {/* CHAS Card Status */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">🏥 CHAS Card Status (Optional)</h3>
                  <select
                    value={editForm.chas_card_color || ''}
                    onChange={(e) => setEditForm({ ...editForm, chas_card_color: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">No CHAS Card</option>
                    <option value="blue">🟦 Blue Card (Monthly income ≤ $1,900)</option>
                    <option value="green">🟩 Green Card (Monthly income ≤ $3,900)</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    🔒 Private: Only used to show you special discounts and support
                  </p>
                  {profileData.chasCardColor && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Your CHAS status: {profileData.chasCardColor === 'blue' ? '🟦 Blue Card' : profileData.chasCardColor === 'green' ? '🟩 Green Card' : 'None'}
                    </p>
                  )}
                </div>

                {/* Delete Account Confirmation Modal */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm mx-2">
                      <h2 className="text-lg font-bold text-red-600 mb-2">⚠️ Delete Account</h2>
                      <p className="text-xs text-gray-700 mb-4">
                        Are you sure? This action cannot be undone and will permanently delete your account and all data.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded font-bold text-sm hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          className="flex-1 bg-red-600 text-white py-2 rounded font-bold text-sm hover:bg-red-700 transition"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificates */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-teal-900">🎓 Your Skills ({certificates.length}/10)</h3>
                    {certificates.length > 0 && (
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="text-xs bg-errandify-orange text-white px-2 py-1 rounded font-semibold hover:bg-orange-600"
                      >
                        {saving ? '⏳ Saving...' : '💾 Save'}
                      </button>
                    )}
                  </div>
                  {certificates.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {certificates.map((cert, idx) => (
                        <div key={cert.id || idx} className="flex justify-between items-center bg-white rounded p-1.5 text-xs border border-teal-100">
                          <span className="font-semibold text-teal-800">🏆 {cert.title || cert.name}</span>
                          <button onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {certificates.length < 10 && (
                    <div className="space-y-1.5 bg-white rounded p-2 border border-teal-100">
                      <p className="text-xs text-teal-700 font-semibold mb-1">➕ Add a credential:</p>
                      <input
                        type="text"
                        value={certificateTitle}
                        onChange={(e) => setCertificateTitle(e.target.value)}
                        placeholder="e.g., CPR Certified - Red Cross"
                        className="w-full px-2 py-1 border border-teal-300 rounded text-xs focus:ring-1 focus:ring-teal-400"
                      />
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          console.log('File selected:', file);
                          setCertificateFile(file || null);
                        }}
                        className="w-full text-xs"
                      />
                      <button
                        onClick={async () => {
                          console.log('Certificate Title:', certificateTitle);
                          console.log('Certificate File:', certificateFile);

                          if (!certificateTitle.trim()) {
                            alert('⚠️ Please enter a certificate title');
                            return;
                          }

                          if (!certificateFile) {
                            alert('⚠️ Please select a file');
                            return;
                          }

                          // File size check (10MB max for certificates)
                          if (certificateFile.size > 10 * 1024 * 1024) {
                            alert('❌ Certificate file exceeds 10MB limit');
                            return;
                          }

                          // Try to moderate title
                          try {
                            const titleResult = await moderateText(certificateTitle);
                            if (!titleResult.approved) {
                              alert('❌ Certificate title contains inappropriate content. Please revise.');
                              return;
                            }
                          } catch (error) {
                            console.warn('Moderation check failed, continuing:', error);
                            // Continue anyway if moderation fails
                          }

                          // Add certificate
                          setCertificates([...certificates, { id: Date.now().toString(), name: certificateTitle }]);
                          setCertificateTitle('');
                          setCertificateFile(null);
                          setModalMessage('Amazing! Now hit Save to keep it safe! 🎓');
                          setShowSuccessModal(true);
                        }}
                        className="w-full bg-teal-500 text-white py-1.5 rounded font-semibold text-xs hover:bg-teal-600 transition"
                      >
                        🎓 Add Credential
                      </button>
                    </div>
                  )}
                </div>

                {/* Final Save/Cancel Buttons at Bottom */}
                <div className="bg-white rounded shadow p-3 flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? '💾 Saving...' : '💾 Save Profile'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setActiveSection('dashboard');
                    }}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded font-semibold text-sm hover:bg-gray-50"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* MYPOCKET SECTION */}
        {activeSection === 'pocket' && (
          <div className="space-y-3">
            {/* Happy Balance Card - Compact */}
            <div className="bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 text-white rounded-xl p-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 text-4xl opacity-20">💚</div>
              <div className="absolute bottom-0 left-0 text-4xl opacity-20">🎉</div>
              <div className="relative z-10">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-3xl font-bold">SGD $450.50</h2>
                  <p className="text-xs opacity-90">💰 MyPocket</p>
                </div>
                <p className="text-xs mb-2 font-semibold">🎊 You're doing amazing! ✨</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-white bg-opacity-20 rounded px-2 py-1.5 backdrop-blur group relative cursor-help hover:bg-opacity-30 transition">
                    <p className="text-xs opacity-90">💵 Earned</p>
                    <p className="font-bold text-xs">$1,250</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded w-32 text-center z-50">
                      Total earnings from completed errands
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded px-2 py-1.5 backdrop-blur group relative cursor-help hover:bg-opacity-30 transition">
                    <p className="text-xs opacity-90">🛍️ Spent</p>
                    <p className="font-bold text-xs">$320</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded w-32 text-center z-50">
                      Total spent on posted errands
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded px-2 py-1.5 backdrop-blur group relative cursor-help hover:bg-opacity-30 transition">
                    <p className="text-xs opacity-90">⏳ Pending</p>
                    <p className="font-bold text-xs">$150</p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded w-36 text-center z-50">
                      Paid after 48 hours
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Generated Alerts */}
            <div className="space-y-2">
              {aiAlerts.length > 0 ? (
                aiAlerts.map((alert, idx) => {
                  const bgColor = alert.type === 'success' ? 'bg-green-50' : alert.type === 'achievement' ? 'bg-blue-50' : 'bg-purple-50';
                  const borderColor = alert.type === 'success' ? 'border-green-500' : alert.type === 'achievement' ? 'border-blue-500' : 'border-purple-500';
                  const titleColor = alert.type === 'success' ? 'text-green-900' : alert.type === 'achievement' ? 'text-blue-900' : 'text-purple-900';
                  const textColor = alert.type === 'success' ? 'text-green-800' : alert.type === 'achievement' ? 'text-blue-800' : 'text-purple-800';
                  return (
                    <div key={idx} className={`${bgColor} border-l-4 ${borderColor} rounded-lg p-3`}>
                      <p className={`text-xs font-bold ${titleColor} mb-1`}>{alert.emoji} {alert.title}</p>
                      <p className={`text-xs ${textColor}`}>{alert.message}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3">
                    <p className="text-xs font-bold text-green-900 mb-1">✅ Great News!</p>
                    <p className="text-xs text-green-800">Loading your personalized alerts...</p>
                  </div>
                </>
              )}
            </div>

            {/* Recent Activity - With Search & Filter */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-2">
                <h3 className="text-xs font-bold">📊 Recent Activity</h3>
              </div>

              {/* Search Bar */}
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="🔍 Search activity..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-errandify-orange"
                />
              </div>

              {/* Filter Buttons */}
              <div className="p-2 border-b border-gray-100 flex gap-1 flex-wrap">
                {(['all', 'completed', 'posted', 'referral', 'rating', 'accepted'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition ${
                      activityFilter === filter
                        ? 'bg-errandify-orange text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? '📋 All' : filter === 'completed' ? '✅ Completed' : filter === 'posted' ? '📝 Posted' : filter === 'referral' ? '🎁 Referral' : filter === 'rating' ? '⭐ Rating' : '✅ Accepted'}
                  </button>
                ))}
              </div>

              {/* Activity List */}
              <div className="divide-y divide-gray-100 text-xs max-h-64 overflow-y-auto">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <div key={activity.id} className={`p-2 flex justify-between items-start hover:bg-${activity.color}-50 transition`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-bold text-gray-900 truncate">{activity.emoji} {activity.title}</p>
                          <span className="text-gray-400 text-xs px-1.5 py-0.5 bg-gray-100 rounded whitespace-nowrap flex-shrink-0">
                            #{activity.errandId}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {activity.date}
                          {activity.time && ` at ${activity.time}`}
                        </p>
                      </div>
                      <p className={`font-bold text-${activity.color}-600 text-xs ml-2 flex-shrink-0`}>{activity.amount}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-xs">🔍 No activities found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payout Details - Collapsible */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandPayout(!expandPayout)}
                    className="flex-1 flex items-center gap-2 text-xs font-bold hover:opacity-80 transition"
                  >
                    <span>{expandPayout ? '▼' : '▶'}</span>
                    <span>💳 Payout Details</span>
                  </button>
                  {expandPayout && (
                    <button
                      onClick={() => setEditingPayout(!editingPayout)}
                      className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition ml-2"
                    >
                      {editingPayout ? '✅ Done' : '✏️ Edit'}
                    </button>
                  )}
                </div>
              </div>
              {expandPayout && (
              <div className="p-3 space-y-2 text-xs">
                {editingPayout ? (
                  <>
                    <div>
                      <label className="text-gray-600 block mb-1">Bank Name:</label>
                      <select
                        value={payoutForm.bankName}
                        onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select a bank...</option>
                        {singaporeBanks.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1">Account Holder:</label>
                      <input
                        type="text"
                        value={payoutForm.accountHolder}
                        onChange={(e) => setPayoutForm({ ...payoutForm, accountHolder: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1">Account Number:</label>
                      <input
                        type="password"
                        value={payoutForm.accountNumber}
                        onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-gray-800"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setEditingPayout(false)}
                        className="flex-1 bg-gray-200 text-gray-800 py-1 rounded text-xs font-semibold hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');

                            // Step 1: Save bank details locally
                            await axios.post(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/save-bank-details`,
                              {
                                bankName: payoutForm.bankName,
                                accountHolder: payoutForm.accountHolder,
                                accountNumber: payoutForm.accountNumber,
                              },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );

                            // Step 2: Get Stripe onboarding link
                            const stripeResponse = await axios.post(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/link-bank`,
                              {
                                returnUrl: window.location.href, // Return here after Stripe onboarding
                              },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );

                            if (stripeResponse.data.success && stripeResponse.data.data.onboardingUrl) {
                              // Redirect to Stripe onboarding
                              window.location.href = stripeResponse.data.data.onboardingUrl;
                            }
                          } catch (error: any) {
                            setModalMessage(
                              '❌ ' + (error.response?.data?.error || 'Failed to start bank setup')
                            );
                            setShowErrorModal(true);
                          }
                        }}
                        className="flex-1 bg-green-500 text-white py-1 rounded text-xs font-semibold hover:bg-green-600"
                      >
                        Complete Setup on Stripe
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank Name:</span>
                      <span className="font-semibold text-gray-800">{payoutForm.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Holder:</span>
                      <span className="font-semibold text-gray-800">{payoutForm.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Number:</span>
                      <span className="font-semibold text-gray-800">{payoutForm.accountNumber}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-green-600">✅ Verified</span>
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        )}

        {/* MYREWARDSPACE SECTION */}
        {activeSection === 'rewards' && (
          <div className="space-y-2">
            {/* Reward Tabs */}
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-1">
              <button
                onClick={() => setRewardsTab('overview')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'overview'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setRewardsTab('shop')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'shop'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🛍️ Shop
              </button>
              <button
                onClick={() => setRewardsTab('gift')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'gift'
                    ? 'bg-pink-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                💝 Send A Gift
              </button>
              <button
                onClick={() => setRewardsTab('myVoucher')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'myVoucher'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🎟️ MyVoucher
              </button>
              <button
                onClick={() => setRewardsTab('history')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'history'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                📊 Reward History
              </button>
            </div>
            {/* OVERVIEW TAB */}
            {rewardsTab === 'overview' && (
              <div className="space-y-2">
                {/* Happy Header */}
                <div className="text-center py-2 bg-gradient-to-r from-yellow-100 via-orange-100 to-pink-100 rounded-lg border-2 border-yellow-300">
                  <p className="text-sm font-bold text-orange-600">🎊 You're doing AMAZING! 🎊</p>
                  <p className="text-xs text-gray-600 mt-1">Keep earning and redeeming rewards with Errandify!</p>
                </div>

                {/* Errandify Points Card - Big & Happy */}
                <div className="bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-400 text-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute top-1 right-1 text-2xl opacity-20">✨</div>
                  <div className="absolute bottom-1 left-1 text-2xl opacity-20">🎁</div>
                  <div className="relative z-10">
                    <p className="text-xs opacity-90 mb-1 font-semibold">💰 Your Available Points</p>
                    <p className="text-4xl font-bold mb-2">{profileData?.errandifyPoints ?? userBalance} EP</p>
                    <p className="text-xs opacity-80 bg-orange-600 bg-opacity-30 rounded p-2 font-semibold">
                      🌟 Expiring Soon: 25 pts will expire on 30/06/2027
                    </p>
                    <p className="text-xs mt-2 opacity-90 font-semibold">Earn more by completing errands! 🚀</p>
                  </div>
                </div>

                {/* Redeem & Gift Buttons - Big & Fun */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRewardsTab('shop');
                    }}
                    className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-lg font-bold text-sm hover:shadow-lg hover:scale-105 transition transform shadow-md"
                  >
                    🎁 Redeem Now
                  </button>
                  <button
                    onClick={() => {
                      setShowGiftModal(true);
                      setGiftForm({
                        points: '',
                        recipients: [],
                        giftCardMessage: 'Thank you for being a friend',
                        customMessage: '',
                        giftDate: new Date().toISOString().split('T')[0],
                        groupName: '',
                        useCustomMessage: false,
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-pink-400 to-rose-500 text-white py-3 rounded-lg font-bold text-sm hover:shadow-lg hover:scale-105 transition transform shadow-md"
                  >
                    💝 Send A Gift
                  </button>
                </div>

                {/* Fun Footer */}
                <div className="text-center py-3 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-lg border-2 border-purple-200">
                  <p className="text-xs font-bold text-purple-600">🌈 Keep earning rewards & spread happiness! 🌈</p>
                  <p className="text-xs text-gray-600 mt-1">Every errand completed = More points earned = More rewards unlocked! 🚀</p>
                </div>
              </div>
            )}

            {/* SHOP TAB - Redeem Rewards */}
            {rewardsTab === 'shop' && (
              <div className="space-y-2">
                <div className="text-center py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
                  <p className="text-sm font-bold text-green-600">🛍️ Shop Rewards 🛍️</p>
                  <p className="text-xs text-gray-600 mt-1">Current Balance: <span className="font-bold text-green-600">{profileData?.errandifyPoints ?? userBalance} EP</span></p>
                </div>

                {/* Buy EP Section */}
                <div className="bg-white rounded-xl border-2 border-orange-300 overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-3">
                    <h3 className="text-sm font-bold">💳 Buy More EP 💳</h3>
                    <p className="text-xs mt-1 opacity-90">Boost your rewards and redeem amazing offers!</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-2 hover:shadow-md transition cursor-pointer" onClick={() => {
                      setModalMessage('💳 1,000 EP for SGD $10.59 (incl. Stripe fees)\n\nNavigating to EP purchase...');
                      setShowSuccessModal(true);
                      setTimeout(() => window.location.href = '/rewards#buy-ep', 1500);
                    }}>
                      <p className="text-2xl mb-1">🚀</p>
                      <p className="font-bold text-xs text-gray-900">1,000 EP</p>
                      <p className="text-xs text-orange-600 font-bold mb-1">SGD $10.59</p>
                      <button className="w-full bg-orange-500 text-white py-1 rounded text-xs font-bold hover:bg-orange-600 transition">
                        Buy Now
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-2 hover:shadow-md transition cursor-pointer border-3 border-orange-500" onClick={() => {
                      setModalMessage('💳 5,000 EP for SGD $46.61 (incl. fees)\n⭐ Most Popular!\n\nNavigating to EP purchase...');
                      setShowSuccessModal(true);
                      setTimeout(() => window.location.href = '/rewards#buy-ep', 1500);
                    }}>
                      <div style={{position: 'absolute', top: '-8px', right: '8px', background: '#FF6B35', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold'}}>⭐ POPULAR</div>
                      <p className="text-2xl mb-1">⭐</p>
                      <p className="font-bold text-xs text-gray-900">5,000 EP</p>
                      <p className="text-xs text-orange-600 font-bold mb-1">SGD $46.61</p>
                      <button className="w-full bg-orange-500 text-white py-1 rounded text-xs font-bold hover:bg-orange-600 transition">
                        Buy Now
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-2 hover:shadow-md transition cursor-pointer" onClick={() => {
                      setModalMessage('💳 10,000 EP for SGD $82.62 (incl. fees)\n💚 Save 20%!\n\nNavigating to EP purchase...');
                      setShowSuccessModal(true);
                      setTimeout(() => window.location.href = '/rewards#buy-ep', 1500);
                    }}>
                      <p className="text-2xl mb-1">🎯</p>
                      <p className="font-bold text-xs text-gray-900">10,000 EP</p>
                      <p className="text-xs text-orange-600 font-bold mb-1">SGD $82.62</p>
                      <button className="w-full bg-orange-500 text-white py-1 rounded text-xs font-bold hover:bg-orange-600 transition">
                        Buy Now
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-2 hover:shadow-md transition cursor-pointer" onClick={() => {
                      setModalMessage('💳 25,000 EP for SGD $185.52 (incl. fees)\n💚 Save 28%!\n\nNavigating to EP purchase...');
                      setShowSuccessModal(true);
                      setTimeout(() => window.location.href = '/rewards#buy-ep', 1500);
                    }}>
                      <p className="text-2xl mb-1">💎</p>
                      <p className="font-bold text-xs text-gray-900">25,000 EP</p>
                      <p className="text-xs text-orange-600 font-bold mb-1">SGD $185.52</p>
                      <button className="w-full bg-orange-500 text-white py-1 rounded text-xs font-bold hover:bg-orange-600 transition">
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Available Rewards - Happy Cards */}
                <div className="bg-white rounded-xl border-2 border-yellow-200 overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-3">
                    <h3 className="text-sm font-bold">🎁 Pick Your Prize! 🎁</h3>
                    <p className="text-xs mt-1 opacity-90">Use your points to unlock amazing discounts!</p>
                  </div>
                  <div className="divide-y divide-yellow-100 text-xs">
                    <div className="p-3 flex justify-between items-center hover:bg-yellow-50 transition bg-gradient-to-r from-transparent to-yellow-50">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">💳 $5 Discount</p>
                        <p className="text-orange-600 font-bold">50 EP • Get SGD $5 off!</p>
                      </div>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 50) {
                            setConfirmRedeemData({ points: 50, code: 'ERRAND5', amount: 5, name: '$5 Discount' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 50 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:shadow-lg transition"
                      >
                        ✨ Redeem
                      </button>
                    </div>
                    <div className="p-3 flex justify-between items-center hover:bg-blue-50 transition bg-gradient-to-r from-transparent to-blue-50">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">💳 $10 Discount</p>
                        <p className="text-blue-600 font-bold">100 EP • Get SGD $10 off!</p>
                      </div>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 100) {
                            setConfirmRedeemData({ points: 100, code: 'ERRAND10', amount: 10, name: '$10 Discount' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 100 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:shadow-lg transition"
                      >
                        ✨ Redeem
                      </button>
                    </div>
                    <div className="p-3 flex justify-between items-center hover:bg-gray-50 transition bg-gradient-to-r from-transparent to-gray-50">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">💎 $20 Discount</p>
                        <p className="text-gray-500 font-bold">200 EP • Get SGD $20 off!</p>
                      </div>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 200) {
                            setConfirmRedeemData({ points: 200, code: 'ERRAND20', amount: 20, name: '$20 Discount' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 200 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        disabled={(profileData?.errandifyPoints ?? userBalance) < 200}
                        className={`text-white px-3 py-2 rounded-lg text-xs font-bold transition ${
                          (profileData?.errandifyPoints ?? userBalance) >= 200
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg cursor-pointer'
                            : 'bg-gray-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {(profileData?.errandifyPoints ?? userBalance) >= 200 ? '✨ Redeem' : '🎯 Need 200 EP'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recommended for You Section */}
                <div className="bg-white rounded-xl border-2 border-pink-200 overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-pink-400 to-rose-500 text-white p-3">
                    <h3 className="text-sm font-bold">✨ Recommended For You ✨</h3>
                    <p className="text-xs mt-1 opacity-90">Personalized vouchers based on your interests</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-2 hover:shadow-md transition">
                      <p className="text-2xl mb-1">☕</p>
                      <p className="font-bold text-xs text-gray-900">Starbucks $10</p>
                      <p className="text-xs text-orange-600 font-bold mb-1">500 EP</p>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 500) {
                            setConfirmRedeemData({ points: 500, code: 'STARBUCKS10', amount: 10, name: 'Starbucks $10' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 500 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="w-full bg-errandify-orange text-white py-1 rounded text-xs font-bold hover:bg-orange-600 transition"
                      >
                        Redeem
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-lg p-2 hover:shadow-md transition">
                      <p className="text-2xl mb-1">🍗</p>
                      <p className="font-bold text-xs text-gray-900">KFC Voucher</p>
                      <p className="text-xs text-red-600 font-bold mb-1">450 EP</p>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 450) {
                            setConfirmRedeemData({ points: 450, code: 'KFC450', amount: 15, name: 'KFC Voucher' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 450 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="w-full bg-red-500 text-white py-1 rounded text-xs font-bold hover:bg-red-600 transition"
                      >
                        Redeem
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-2 hover:shadow-md transition">
                      <p className="text-2xl mb-1">🎬</p>
                      <p className="font-bold text-xs text-gray-900">Cathay Cineplex</p>
                      <p className="text-xs text-purple-600 font-bold mb-1">350 EP</p>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 350) {
                            setConfirmRedeemData({ points: 350, code: 'CINEPLEX350', amount: 25, name: 'Cathay Cineplex Ticket' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 350 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="w-full bg-purple-500 text-white py-1 rounded text-xs font-bold hover:bg-purple-600 transition"
                      >
                        Redeem
                      </button>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-2 hover:shadow-md transition">
                      <p className="text-2xl mb-1">✈️</p>
                      <p className="font-bold text-xs text-gray-900">Changi Lounge</p>
                      <p className="text-xs text-blue-600 font-bold mb-1">1000 EP</p>
                      <button
                        onClick={() => {
                          const balance = profileData?.errandifyPoints ?? userBalance;
                          if (balance >= 1000) {
                            setConfirmRedeemData({ points: 1000, code: 'CHANGI1000', amount: 100, name: 'Changi Airport Lounge' });
                          } else {
                            setModalMessage('❌ Not enough points! You need 1000 EP');
                            setShowErrorModal(true);
                          }
                        }}
                        className="w-full bg-blue-500 text-white py-1 rounded text-xs font-bold hover:bg-blue-600 transition"
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GIFT TAB - Send A Gift (Direct Form, No Modal) */}
            {rewardsTab === 'gift' && (
              <div className="space-y-3">
                {/* Header */}
                <div className="text-center pb-2 border-b border-orange-200">
                  <p className="text-lg font-bold text-errandify-brown">💝 Send A Gift 🎁</p>
                  <p className="text-xs text-gray-600 mt-1">Share love and rewards with your friends!</p>
                </div>

                {/* Points Card */}
                <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-3 border-2 border-orange-300">
                  <p className="text-xs text-gray-600 mb-1">💰 Available Points</p>
                  <p className="text-3xl font-bold text-orange-600">{profileData?.errandifyPoints ?? userBalance} EP</p>
                </div>

                {/* Points to Send */}
                <div>
                  <label className="text-sm font-bold text-gray-700">💰 Points to Send</label>
                  <p className="text-xs text-gray-600 mb-2">Up to {profileData?.errandifyPoints ?? userBalance} EP</p>
                  <input
                    type="number"
                    min="1"
                    max={profileData?.errandifyPoints ?? userBalance}
                    value={giftForm.points}
                    onChange={(e) => setGiftForm({ ...giftForm, points: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
                    placeholder="Enter amount"
                  />
                </div>

                {/* Show saved groups count */}
                {savedGroups.length > 0 && (
                  <div className="bg-gradient-to-r from-green-100 to-green-50 border-2 border-green-400 rounded-lg p-3">
                    <p className="text-xs font-bold text-green-700">✅ You have {savedGroups.length} saved group{savedGroups.length !== 1 ? 's' : ''}:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {savedGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            setGiftForm({
                              ...giftForm,
                              recipients: group.members,
                            });
                          }}
                          className="bg-white text-xs px-3 py-1 rounded-full border border-green-400 text-green-700 font-bold hover:bg-green-50 transition"
                        >
                          {group.name} ({group.members.length}) →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live EP Calculation */}
                {(giftForm.recipients?.length ?? 0) > 0 && giftForm.points && (
                  <div className="space-y-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border-2 border-orange-200">
                    <p className="text-xs font-bold text-gray-700 mb-2">📊 EP Breakdown</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded p-2 border border-orange-100">
                        <p className="text-xs text-gray-600">Recipients</p>
                        <p className="text-lg font-bold text-orange-600">{giftForm.recipients?.length ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Per Person</p>
                        <p className="text-lg font-bold text-blue-600">{giftForm.points} EP</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-pink-100">
                        <p className="text-xs text-gray-600">Total Cost</p>
                        <p className="text-lg font-bold text-pink-600">{Math.max(0, (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0))} EP</p>
                      </div>
                    </div>
                    <div className={`rounded p-2 border-2 ${
                      (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0) > userBalance
                        ? 'bg-red-50 border-red-300'
                        : 'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Current Balance:</p>
                        <p className="text-sm font-bold text-gray-800">{userBalance} EP</p>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-600">After Gift:</p>
                        <p className={`text-sm font-bold ${
                          (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0) > userBalance
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {Math.max(0, userBalance - ((parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0)))} EP
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Recipients Display */}
                {(giftForm.recipients?.length ?? 0) > 0 && (
                  <div className="space-y-2 bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                    <p className="text-xs font-bold text-blue-700">👥 Selected Recipients ({giftForm.recipients?.length ?? 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {giftForm.recipients?.map((recipientId) => {
                        const user = availableUsers.find((u) => u.id === recipientId);
                        return user ? (
                          <div key={recipientId} className="bg-white px-2 py-1 rounded-full border border-blue-300 text-xs font-bold text-blue-700 flex items-center gap-1">
                            {user.name}
                            <button
                              onClick={() => {
                                setGiftForm({
                                  ...giftForm,
                                  recipients: giftForm.recipients?.filter((id) => id !== recipientId) ?? [],
                                });
                              }}
                              className="text-blue-500 hover:text-red-500 transition"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Select All / Clear All */}
                {availableUsers.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const canSelectAll = availableUsers.every(
                          (user) =>
                            (parseInt(giftForm.points || '0') || 0) * (availableUsers.length) <= userBalance ||
                            giftForm.recipients?.includes(user.id)
                        );
                        if (
                          giftForm.recipients?.length === availableUsers.length ||
                          (giftForm.recipients?.length ?? 0) === 0
                        ) {
                          setGiftForm({
                            ...giftForm,
                            recipients:
                              (giftForm.recipients?.length ?? 0) > 0
                                ? []
                                : availableUsers.filter(
                                    (user) =>
                                      (parseInt(giftForm.points || '0') || 0) *
                                        (availableUsers.length) <=
                                      userBalance ||
                                      (giftForm.recipients?.includes(user.id) ?? false)
                                  ).map((u) => u.id),
                          });
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                        (giftForm.recipients?.length ?? 0) > 0
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-green-100 text-green-700 border border-green-300'
                      }`}
                    >
                      {(giftForm.recipients?.length ?? 0) > 0 ? '❌ Clear All' : '✅ Select All'}
                    </button>
                  </div>
                )}

                {/* Search and Select Recipients/Groups */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">🔍 Select Recipients/Groups</label>
                  <input
                    type="text"
                    value={giftSearch}
                    onChange={(e) => setGiftSearch(e.target.value)}
                    placeholder="Search users or groups..."
                    className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="bg-white rounded-lg border-2 border-purple-200 overflow-hidden max-h-48 overflow-y-auto">
                    {/* Users */}
                    {availableUsers
                      .filter(
                        (user) =>
                          user.name.toLowerCase().includes(giftSearch.toLowerCase())
                      )
                      .map((user) => {
                        const isSelected = giftForm.recipients?.includes(user.id) ?? false;
                        const totalCost =
                          (parseInt(giftForm.points || '0') || 0) *
                          ((giftForm.recipients?.length ?? 0) +
                            (isSelected ? 0 : 1));
                        const canSelect = totalCost <= userBalance || isSelected;
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center gap-2 p-2 border-b border-purple-100 cursor-pointer transition ${
                              canSelect
                                ? 'hover:bg-purple-50'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const totalCost =
                                    (parseInt(giftForm.points || '0') || 0) *
                                    ((giftForm.recipients?.length ?? 0) + 1);
                                  if (totalCost <= userBalance) {
                                    setGiftForm({
                                      ...giftForm,
                                      recipients: [
                                        ...(giftForm.recipients ?? []),
                                        user.id,
                                      ],
                                    });
                                  }
                                } else {
                                  setGiftForm({
                                    ...giftForm,
                                    recipients:
                                      giftForm.recipients?.filter(
                                        (id) => id !== user.id
                                      ) ?? [],
                                  });
                                }
                              }}
                              disabled={!canSelect}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-bold text-gray-900">
                              {user.name}
                            </span>
                          </label>
                        );
                      })}

                    {/* Groups */}
                    {savedGroups
                      .filter((group) =>
                        group.name
                          .toLowerCase()
                          .includes(giftSearch.toLowerCase())
                      )
                      .map((group) => (
                        <button
                          key={`group-${group.id}`}
                          onClick={() => {
                            setGiftForm({
                              ...giftForm,
                              recipients: group.members,
                            });
                            setGiftSearch('');
                          }}
                          className="w-full text-left flex items-center gap-2 p-2 hover:bg-purple-100 rounded transition bg-gradient-to-r from-purple-50 to-transparent border-b border-purple-100"
                        >
                          <span className="text-lg">👥</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-purple-900 truncate">
                              {group.name}
                            </p>
                            <p className="text-xs text-purple-600">
                              {group.members.length} members
                            </p>
                          </div>
                          <span className="text-purple-600 font-bold">→</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Gift Message Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">🎀 Gift Card Message</label>
                    <span className="text-xs text-gray-500">(Optional)</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-orange-100 rounded-lg p-2 bg-orange-50 space-y-1">
                    {giftCardTemplates.map((template, idx) => (
                      <label
                        key={idx}
                        className="flex items-start gap-2 p-1.5 hover:bg-orange-100 rounded cursor-pointer transition"
                      >
                        <input
                          type="radio"
                          name="giftMessage"
                          checked={
                            giftForm.giftCardMessage === template &&
                            !giftForm.useCustomMessage
                          }
                          onChange={() =>
                            setGiftForm({
                              ...giftForm,
                              giftCardMessage: template,
                              useCustomMessage: false,
                            })
                          }
                          className="mt-0.5"
                        />
                        <span className="text-xs text-gray-700">{template}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setGiftForm({
                        ...giftForm,
                        useCustomMessage: !giftForm.useCustomMessage,
                      })
                    }
                    className="w-full mt-2 px-3 py-2 border-2 border-dashed border-orange-300 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50"
                  >
                    ✏️ {giftForm.useCustomMessage ? 'Use Template' : 'Write Custom Message'}
                  </button>

                  {giftForm.useCustomMessage && (
                    <textarea
                      value={giftForm.customMessage}
                      onChange={(e) =>
                        setGiftForm({ ...giftForm, customMessage: e.target.value })
                      }
                      placeholder="Write your custom message..."
                      className="w-full mt-2 px-3 py-2 border-2 border-orange-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                    />
                  )}
                </div>

                {/* Date Section */}
                <div>
                  <label className="text-sm font-bold text-gray-700">📅 Gift Date</label>
                  <p className="text-xs text-gray-600 mb-2">
                    Choose when to send (defaults to today)
                  </p>
                  <input
                    type="date"
                    value={giftForm.giftDate}
                    onChange={(e) => setGiftForm({ ...giftForm, giftDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={() => {
                    const pointsToSend = parseInt(giftForm.points || '0') || 0;
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const currentUserId = currentUser?.id?.toString();
                    const sendingToSelf = giftForm.recipients?.some(
                      (id) => id === currentUserId
                    );
                    if (!giftForm.points || pointsToSend <= 0) {
                      setModalMessage('❌ Please enter a valid amount of EP to send\n\nHint: How many points do you want to give each friend?');
                      setShowErrorModal(true);
                    } else if (giftForm.recipients.length === 0) {
                      setModalMessage('❌ Please select at least one recipient');
                      setShowErrorModal(true);
                    } else if (sendingToSelf) {
                      setModalMessage('❌ You cannot send points to yourself!');
                      setShowErrorModal(true);
                    } else if (pointsToSend * giftForm.recipients.length > userBalance) {
                      setModalMessage('❌ Not enough points for all recipients');
                      setShowErrorModal(true);
                    } else {
                      const recipientNames = giftForm.recipients
                        .map((id) => availableUsers.find((u) => u.id === id)?.name)
                        .join(', ');
                      const totalPointsDeducted = pointsToSend * giftForm.recipients.length;
                      setGiftConfirmationData({
                        pointsToSend,
                        totalPointsDeducted,
                        recipientCount: giftForm.recipients.length,
                        recipientNames,
                        message: giftForm.useCustomMessage ? giftForm.customMessage : giftForm.giftCardMessage,
                        giftDate: giftForm.giftDate,
                      });
                      setShowGiftConfirmation(true);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-2.5 rounded-lg font-bold text-sm hover:shadow-lg transition"
                >
                  💝 Send Gift
                </button>
              </div>
            )}

            {/* MYVOUCHER TAB - Redeemed Vouchers */}
            {rewardsTab === 'myVoucher' && (
              <div className="space-y-2">
                <div className="text-center py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-300">
                  <p className="text-sm font-bold text-purple-600">🎟️ MyVoucher 🎟️</p>
                  <p className="text-xs text-gray-600 mt-1">All your redeemed discount codes</p>
                </div>

                {/* Vouchers List */}
                {redemptionHistory.length > 0 ? (
                  <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden shadow-md">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3">
                      <h3 className="text-sm font-bold">🎁 MyVoucher ({redemptionHistory.length}) 🎁</h3>
                      <p className="text-xs mt-1 opacity-90">Click to copy code</p>
                    </div>
                    <div className="divide-y divide-purple-100">
                      {redemptionHistory.map((record) => (
                        <div
                          key={`redemption-${record.id}`}
                          className="p-4 hover:bg-purple-50 transition bg-gradient-to-r from-transparent to-purple-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{record.emoji} {record.item}</p>
                              <p className="text-xs text-gray-600 mt-1">{record.date}{record.time && ` at ${record.time}`}</p>
                            </div>
                            <span className="text-orange-600 font-bold text-sm">{record.amount} EP</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(record.code);
                              setModalMessage(`✅ Code copied: ${record.code}`);
                              setShowSuccessModal(true);
                            }}
                            className="w-full bg-gradient-to-r from-purple-400 to-pink-400 text-white py-2 rounded-lg font-bold text-xs hover:shadow-lg transition mt-2"
                          >
                            📋 Copy Code: {record.code}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-6 text-center">
                    <p className="text-sm font-bold text-purple-600 mb-2">🎟️ No MyVoucher Yet</p>
                    <p className="text-xs text-gray-600 mb-4">Redeem discounts in the Shop to collect vouchers</p>
                    <button
                      onClick={() => setRewardsTab('shop')}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-bold text-xs hover:shadow-lg transition"
                    >
                      🛍️ Go to Shop
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB - Transaction History (Redemptions + Gifts) */}
            {rewardsTab === 'history' && (
              <div className="space-y-2">
                <div className="text-center py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border-2 border-blue-300">
                  <p className="text-sm font-bold text-blue-600">📊 Reward History 📊</p>
                  <p className="text-xs text-gray-600 mt-1">Your EP transactions (rewards & gifts)</p>
                </div>

                {/* Search Bar */}
                <div>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="🔍 Search transactions..."
                    className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                      historyFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    📋 All
                  </button>
                  <button
                    onClick={() => setHistoryFilter('gifts')}
                    className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                      historyFilter === 'gifts'
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                    }`}
                  >
                    💝 Gifts ({allActivities.filter(a => a.type === 'gift').length})
                  </button>
                  <button
                    onClick={() => setHistoryFilter('redemptions')}
                    className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                      historyFilter === 'redemptions'
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    🎟️ Redemptions ({redemptionHistory.length})
                  </button>
                </div>

                {/* Combined History List */}
                <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-3">
                    <h3 className="text-sm font-bold">📋 All Transactions 📋</h3>
                    <p className="text-xs mt-1 opacity-90">Track all your EP activity</p>
                  </div>
                  <div className="divide-y divide-purple-100 text-xs max-h-48 overflow-y-auto">
                    {redemptionHistory.length > 0 || allActivities.filter(a => a.type === 'gift').length > 0 ? (
                      <>
                        {/* Combined & Sorted History - Latest First */}
                        {(() => {
                          const allRecords: any[] = [];

                          // Add filtered redemptions
                          if (historyFilter === 'all' || historyFilter === 'redemptions') {
                            redemptionHistory
                              .filter(record =>
                                record.item.toLowerCase().includes(historySearch.toLowerCase()) ||
                                record.code.toLowerCase().includes(historySearch.toLowerCase())
                              )
                              .forEach(record => {
                                allRecords.push({
                                  ...record,
                                  sortKey: record.date === 'Today' ? new Date().getTime() : new Date(record.date).getTime(),
                                  type: 'redemption'
                                });
                              });
                          }

                          // Add filtered gifts
                          if (historyFilter === 'all' || historyFilter === 'gifts') {
                            allActivities
                              .filter(a => a.type === 'gift' && (
                                a.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                                a.emoji.includes(historySearch)
                              ))
                              .forEach(gift => {
                                allRecords.push({
                                  ...gift,
                                  sortKey: gift.date === 'Today' ? new Date().getTime() : new Date(gift.date).getTime(),
                                  type: 'gift'
                                });
                              });
                          }

                          // Sort by date - latest first
                          allRecords.sort((a, b) => b.sortKey - a.sortKey);

                          return allRecords.map((record) => (
                            record.type === 'redemption' ? (
                              <div key={`redemption-${record.id}`} className="p-3 flex justify-between hover:bg-purple-50 transition bg-gradient-to-r from-transparent to-purple-50">
                                <div>
                                  <p className="font-bold text-gray-900">{record.emoji} {record.item}</p>
                                  <p className="text-gray-500 text-xs">{record.date}{record.time && ` at ${record.time}`} • Code: {record.code}</p>
                                </div>
                                <p className="font-bold text-orange-600 text-sm">{record.amount} EP</p>
                              </div>
                            ) : (
                              <div key={`gift-${record.id}`} className="p-3 flex justify-between hover:bg-pink-50 transition bg-gradient-to-r from-transparent to-pink-50">
                                <div>
                                  <p className="font-bold text-gray-900">{record.emoji} {record.title}</p>
                                  <p className="text-gray-500 text-xs">{record.date}{record.time && ` at ${record.time}`}</p>
                                </div>
                                <p className="font-bold text-pink-600 text-sm">{record.amount}</p>
                              </div>
                            )
                          ));
                        })()}
                      </>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p>No transactions yet! 💝</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAFETY CENTRE SECTION */}
        {activeSection === 'safety' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Sub-tabs for Safety Centre */}
            <div className="flex gap-2 border-b border-gray-200 p-3 overflow-x-auto">
              <button
                onClick={() => setSafetyTab('resources')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  safetyTab === 'resources'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🆘 Safety & Support
              </button>
              <button
                onClick={() => setSafetyTab('pause')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  safetyTab === 'pause'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🛡️ Account Pause
              </button>
              <button
                onClick={() => setSafetyTab('blocked')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  safetyTab === 'blocked'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                👥 Blocked/Trusted
              </button>
            </div>

            {/* Blocked/Trusted Users Tab */}
            {safetyTab === 'blocked' && (
              <div className="space-y-3">
                <div className="text-center py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border-2 border-blue-300">
                  <p className="text-sm font-bold text-blue-600">❤️ Your Trusted Network ❤️</p>
                  <p className="text-xs text-gray-600 mt-1">Users you've marked as trusted</p>
                </div>

                {trustedUsers.length > 0 ? (
                  <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden shadow-md">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3">
                      <h3 className="text-sm font-bold">❤️ Trusted Users ({trustedUsers.length}) ❤️</h3>
                      <p className="text-xs mt-1 opacity-90">People you trust</p>
                    </div>
                    <div className="divide-y divide-blue-100">
                      {trustedUsers.map((user) => (
                        <div key={user.id} className="p-3 flex justify-between items-center hover:bg-blue-50 transition bg-gradient-to-r from-transparent to-blue-50">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">⭐ {user.name}</p>
                            {user.alias && <p className="text-xs text-gray-600">@{user.alias}</p>}
                            <p className="text-xs text-gray-500 mt-1">Marked: {user.markedDate}</p>
                          </div>
                          <button
                            onClick={() => {
                              setTrustedUsers(trustedUsers.filter(u => u.id !== user.id));
                              setModalMessage(`❌ Removed ${user.name} from trusted users`);
                              setShowSuccessModal(true);
                            }}
                            className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-bold transition"
                          >
                            💔 Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-6 text-center">
                    <p className="text-sm font-bold text-blue-600 mb-2">❤️ No Trusted Users Yet</p>
                    <p className="text-xs text-gray-600 mb-4">Mark users as trusted by clicking the heart icon in chat or after completing errands</p>
                    <div className="bg-white rounded p-3 text-left text-xs text-blue-800 space-y-1">
                      <p className="font-semibold mb-2">How to mark as Trusted:</p>
                      <li>💬 Click ❤️ in chat messages</li>
                      <li>✅ Click ❤️ after errand completion</li>
                      <li>👤 Click ❤️ on their profile</li>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Safety & Support Resources Tab */}
            {safetyTab === 'resources' && (
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4">
                  <h3 className="font-bold text-red-900 mb-1">🆘 Get Help Anytime</h3>
                  <p className="text-xs text-red-800">All services are 24/7, confidential, and free.</p>
                </div>

                {/* Search & Filter */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="🔍 Search resources (e.g., 'trafficking', 'abuse')..."
                    value={safetySearchTerm}
                    onChange={(e) => setSafetySearchTerm(e.target.value.toLowerCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'all', label: 'All Services' },
                      { value: 'trafficking', label: '🚨 Trafficking' },
                      { value: 'abuse', label: '💙 Abuse' },
                      { value: 'migrant', label: '💼 Migrant' },
                      { value: 'elderly', label: '👵 Elderly' },
                      { value: 'mental_health', label: '🧠 Mental Health' },
                    ].map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSafetyFilterCategory(cat.value as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${
                          safetyFilterCategory === cat.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resources List */}
                <SafetyResourcesList
                  searchTerm={safetySearchTerm}
                  filterCategory={safetyFilterCategory}
                />
              </div>
            )}

            {/* Account Pause Tab */}
            {safetyTab === 'pause' && (
              <div className="p-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6">
                  <div className="text-4xl text-center mb-3">🛡️</div>
                  <h3 className="font-bold text-blue-900 text-center mb-2">Pause Your Account</h3>
                  <p className="text-sm text-blue-800 text-center mb-4">
                    Hide your profile instantly. No one will know you paused.
                  </p>

                  <div className="bg-white rounded-lg p-3 mb-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">What happens:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-xs text-gray-700">✓ Profile hidden</div>
                      <div className="text-xs text-gray-700">✓ No messages</div>
                      <div className="text-xs text-gray-700">✓ Jobs disappear</div>
                      <div className="text-xs text-gray-700">✓ Data stays safe</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAccountPauseModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    Manage Pause
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATION PREFERENCES SECTION */}
        {activeSection === 'notify' && (
          <div>
            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🔔 Notification Preferences</h2>

              {/* Critical Section */}
              <div className="border border-red-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-red-500 text-white">
                  <h3 className="text-xs font-bold">🔴 Critical (Always On)</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Offer Confirmed</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Errand Reopened</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Payment Released</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                </div>
              </div>

              {/* Important Section */}
              <div className="border border-yellow-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-yellow-500 text-white">
                  <h3 className="text-xs font-bold">🟡 Important</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>New Offer</span>
                    <button
                      onClick={() => toggleNotificationPref('newOffer')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.newOffer
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.newOffer ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Message Received</span>
                    <button
                      onClick={() => toggleNotificationPref('messageReceived')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.messageReceived
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.messageReceived ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Errand Done</span>
                    <button
                      onClick={() => toggleNotificationPref('errandDone')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.errandDone
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.errandDone ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Section */}
              <div className="border border-green-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-green-500 text-white">
                  <h3 className="text-xs font-bold">🟢 Optional</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>Profile Viewed</span>
                    <button
                      onClick={() => toggleNotificationPref('profileViewed')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.profileViewed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.profileViewed ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Referral Activity</span>
                    <button
                      onClick={() => toggleNotificationPref('referralActivity')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.referralActivity
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.referralActivity ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Platform Updates</span>
                    <button
                      onClick={() => toggleNotificationPref('platformUpdates')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        notificationPrefs.platformUpdates
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {notificationPrefs.platformUpdates ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-xs text-green-700 font-semibold">✅ Preferences saved automatically</p>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES SECTION */}
        {activeSection === 'categories' && (
          <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 rounded-lg shadow-md p-4 space-y-3">
            {/* Header with stats */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-purple-900">🎯 My Categories</h2>
              <div className="flex gap-2 text-sm font-bold">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full">💪 {categoriesCanHelpCount}</span>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full">🙋 {categoriesNeedHelpCount}</span>
              </div>
            </div>

            {/* AI Info Banner */}
            <div className="bg-white bg-opacity-80 rounded-lg p-3 border-2 border-purple-300 mb-2">
              <p className="text-sm font-bold text-purple-900 mb-2">🤖 How AI Uses This:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-800">
                <div className="bg-green-50 p-2 rounded">
                  <p className="font-bold text-green-700">💪 I Can Help</p>
                  <p>AI shows you errands in these categories first. Build your reputation here!</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-bold text-blue-700">🙋 I Need Help</p>
                  <p>AI finds best doers in these categories for you. Smart matching!</p>
                </div>
              </div>
            </div>

            {/* Two-column layout: Help & Need - BIG BUTTONS FOR ELDERLY */}
            <div className="grid grid-cols-2 gap-3">
              {/* I CAN HELP COLUMN */}
              <div className="bg-green-50 rounded-lg p-3 border-4 border-green-400">
                <p className="text-lg font-bold text-green-700 mb-3">💪 I Can Help</p>
                <div className="space-y-2 mb-3">
                  {ALL_16_CATEGORIES.map(category => (
                    selectedCategoriesHelp.includes(category.id) && (
                      <button
                        key={category.id}
                        onClick={() => toggleCategoryHelp(category.id)}
                        className="w-full text-left text-base bg-green-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-600 transition flex items-center gap-2 active:scale-95"
                      >
                        <span className="text-2xl">{category.icon}</span>
                        <span>{category.name}</span>
                      </button>
                    )
                  ))}
                </div>
                {selectedCategoriesHelp.length === 0 && (
                  <p className="text-base text-gray-600 font-semibold mb-3 px-2">👇 Tap emoji below to add</p>
                )}
                {/* Big emoji buttons for unselected */}
                <div className="grid grid-cols-4 gap-2">
                  {ALL_16_CATEGORIES.map(category => (
                    !selectedCategoriesHelp.includes(category.id) && (
                      <div key={category.id} className="relative group">
                        <button
                          onClick={() => toggleCategoryHelp(category.id)}
                          className="text-5xl p-2 hover:scale-110 transition active:scale-95 rounded-lg hover:bg-green-200 w-full"
                        >
                          {category.icon}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {category.name}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* I NEED HELP COLUMN */}
              <div className="bg-blue-50 rounded-lg p-3 border-4 border-blue-400">
                <p className="text-lg font-bold text-blue-700 mb-3">🙋 I Need Help</p>
                <div className="space-y-2 mb-3">
                  {ALL_16_CATEGORIES.map(category => (
                    selectedCategoriesNeed.includes(category.id) && (
                      <button
                        key={category.id}
                        onClick={() => toggleCategoryNeed(category.id)}
                        className="w-full text-left text-base bg-blue-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-600 transition flex items-center gap-2 active:scale-95"
                      >
                        <span className="text-2xl">{category.icon}</span>
                        <span>{category.name}</span>
                      </button>
                    )
                  ))}
                </div>
                {selectedCategoriesNeed.length === 0 && (
                  <p className="text-base text-gray-600 font-semibold mb-3 px-2">👇 Tap emoji below to add</p>
                )}
                {/* Big emoji buttons for unselected */}
                <div className="grid grid-cols-4 gap-2">
                  {ALL_16_CATEGORIES.map(category => (
                    !selectedCategoriesNeed.includes(category.id) && (
                      <div key={category.id} className="relative group">
                        <button
                          onClick={() => toggleCategoryNeed(category.id)}
                          className="text-5xl p-2 hover:scale-110 transition active:scale-95 rounded-lg hover:bg-blue-200 w-full"
                        >
                          {category.icon}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {category.name}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* BIG Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedCategoriesHelp([]);
                  setSelectedCategoriesNeed([]);
                }}
                className="py-3 rounded-lg font-bold text-lg text-gray-700 border-4 border-gray-400 hover:bg-gray-100 transition active:scale-95"
              >
                🔄 Clear All
              </button>
              <button
                onClick={saveMyCategories}
                disabled={categoriesSaving || (categoriesCanHelpCount === 0 && categoriesNeedHelpCount === 0)}
                className={`py-3 rounded-lg font-bold text-white text-lg transition active:scale-95 ${
                  categoriesSaving || (categoriesCanHelpCount === 0 && categoriesNeedHelpCount === 0)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg border-4 border-orange-700'
                }`}
              >
                {categoriesSaving ? '⏳ Saving...' : '✅ Save'}
              </button>
            </div>
          </div>
        )}

        {/* AVAILABILITY SECTION - Staff apply for unavailability */}
        {activeSection === 'availability' && (
          <StaffLeaveApplication />
        )}

        {/* FAQ SECTION */}
        {/* BOTTOM QUICK LINKS - ONLY SHOW ON DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex gap-1 overflow-x-auto pb-2 flex-wrap">
              {/* Quick links section if needed in future */}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {/* Gift Success Modal - Happy Celebration */}
      {showGiftSuccessModal && giftSuccessData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Success Header - Rainbow Gradient - Compact */}
            <div className="bg-gradient-to-r from-pink-400 via-purple-400 to-green-400 p-4 text-white text-center">
              <div className="text-4xl mb-1 animate-pulse">🎁</div>
              <h2 className="text-2xl font-black">WOOHOO! 🥳</h2>
            </div>

            {/* Content - Compact */}
            <div className="p-4 space-y-3">
              {/* Amount & Recipients */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                <p className="text-xl font-black text-blue-700">{giftSuccessData.pointsToSend} EP 💰</p>
                <p className="text-xs text-blue-600 font-bold">to {giftSuccessData.recipientCount} friend{giftSuccessData.recipientCount !== 1 ? 's' : ''}! 🌟</p>
              </div>

              {/* Message */}
              <div className="bg-pink-50 rounded-lg p-3 border border-pink-300">
                <p className="text-xs text-pink-900 italic line-clamp-2">"{giftSuccessData.message}"</p>
              </div>

              {/* Schedule + Recorded */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-300 text-center">
                <p className="text-xs text-green-700 font-black">✅ {giftSuccessData.scheduledDate}</p>
              </div>
            </div>

            {/* Buttons - Two Options */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  setShowGiftSuccessModal(false);
                  setShowGiftModal(false);
                  setActiveSection('rewards');
                }}
                className="w-full bg-green-500 text-white font-bold py-2 text-sm rounded-lg hover:bg-green-600 transition"
              >
                📊 View Rewards
              </button>
              <button
                onClick={() => {
                  setShowGiftSuccessModal(false);
                  setShowGiftModal(false);
                  setGiftForm({
                    points: '',
                    recipients: [],
                    giftCardMessage: 'Thank you for being a friend',
                    customMessage: '',
                    giftDate: new Date().toISOString().split('T')[0],
                    groupName: '',
                    useCustomMessage: false,
                  });
                  setShowGiftModal(true);
                }}
                className="w-full bg-pink-500 text-white font-bold py-2 text-sm rounded-lg hover:bg-pink-600 transition"
              >
                💝 Send Another
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        title={modalMessage}
        icon="✨"
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        title={modalMessage}
        icon="⚠️"
        onClose={() => setShowErrorModal(false)}
      />

      {/* Advanced Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 space-y-3">
            {/* Header */}
            <div className="text-center pb-2 border-b border-orange-200">
              <p className="text-lg font-bold text-errandify-brown">💝 Send A Gift 🎁</p>
              <p className="text-xs text-gray-600 mt-1">Share love and rewards with your friends!</p>
            </div>

            {/* Points Card */}
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-3 border-2 border-orange-300">
              <p className="text-xs text-gray-600 mb-1">💰 Available Points</p>
              <p className="text-3xl font-bold text-orange-600">{userBalance} EP</p>
            </div>

            {/* Points to Send */}
            <div>
              <label className="text-sm font-bold text-gray-700">💰 Points to Send</label>
              <p className="text-xs text-gray-600 mb-2">Up to {userBalance} EP</p>
              <input
                type="number"
                min="1"
                max={userBalance}
                value={giftForm.points}
                onChange={(e) => setGiftForm({ ...giftForm, points: e.target.value })}
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
                placeholder="Enter amount"
              />
            </div>

            {/* Show saved groups count */}
            {savedGroups.length > 0 && (
              <div className="bg-gradient-to-r from-green-100 to-green-50 border-2 border-green-400 rounded-lg p-3">
                <p className="text-xs font-bold text-green-700">✅ You have {savedGroups.length} saved group{savedGroups.length !== 1 ? 's' : ''}:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {savedGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setGiftForm({
                          ...giftForm,
                          recipients: group.members,
                        });
                      }}
                      className="bg-white text-xs px-3 py-1 rounded-full border border-green-400 text-green-700 font-bold hover:bg-green-50 transition"
                    >
                      {group.name} ({group.members.length}) →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live EP Calculation - Shows when recipients selected + points entered */}
            {(giftForm.recipients?.length ?? 0) > 0 && giftForm.points && (
              <div className="space-y-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border-2 border-orange-200">
                <p className="text-xs font-bold text-gray-700 mb-2">📊 EP Breakdown</p>

                {/* Three Column Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded p-2 border border-orange-100">
                    <p className="text-xs text-gray-600">Recipients</p>
                    <p className="text-lg font-bold text-orange-600">{giftForm.recipients?.length ?? 0}</p>
                  </div>
                  <div className="bg-white rounded p-2 border border-blue-100">
                    <p className="text-xs text-gray-600">Per Person</p>
                    <p className="text-lg font-bold text-blue-600">{giftForm.points} EP</p>
                  </div>
                  <div className="bg-white rounded p-2 border border-pink-100">
                    <p className="text-xs text-gray-600">Total Cost</p>
                    <p className="text-lg font-bold text-pink-600">{Math.max(0, (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0))} EP</p>
                  </div>
                </div>

                {/* Balance Display */}
                <div className={`rounded p-2 border-2 ${
                  (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0) > userBalance
                    ? 'bg-red-50 border-red-300'
                    : 'bg-green-50 border-green-300'
                }`}>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">Current Balance:</p>
                    <p className="text-sm font-bold text-gray-800">{userBalance} EP</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-600">After Gift:</p>
                    <p className={`text-sm font-bold ${
                      (parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0) > userBalance
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {Math.max(0, userBalance - ((parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0)))} EP
                    </p>
                  </div>
                  {(parseInt(giftForm.points || '0') || 0) * (giftForm.recipients?.length ?? 0) > userBalance && (
                    <p className="text-xs text-red-600 font-bold mt-2">❌ Not enough points!</p>
                  )}
                </div>
              </div>
            )}

            {/* Search & Select Recipients with Group Integration */}
            <div className="space-y-2">
              {/* Header with selection count and quick actions */}
              <div className="flex justify-between items-center gap-2">
                <label className="text-sm font-bold text-gray-700">🔍 Select Recipients/Groups</label>
                <div className="flex gap-2 items-center">
                  {giftForm.recipients && giftForm.recipients.length > 0 && (
                    <>
                      <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        {giftForm.recipients.length} selected
                      </span>
                      {giftForm.recipients.length < availableUsers.length && (
                        <button
                          onClick={() => {
                            setGiftForm({
                              ...giftForm,
                              recipients: availableUsers.map(u => u.id),
                            });
                          }}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          Select All
                        </button>
                      )}
                      {giftForm.recipients.length === availableUsers.length && (
                        <button
                          onClick={() => {
                            setGiftForm({
                              ...giftForm,
                              recipients: [],
                            });
                          }}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          Clear All
                        </button>
                      )}
                    </>
                  )}
                  {(!giftForm.recipients || giftForm.recipients.length === 0) && (
                    <button
                      onClick={() => {
                        setGiftForm({
                          ...giftForm,
                          recipients: availableUsers.map(u => u.id),
                        });
                      }}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Select All
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Recipients Display - Show who is selected */}
              {giftForm.recipients && giftForm.recipients.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs font-bold text-orange-700 mb-2">✅ Selected Recipients:</p>
                  <div className="flex flex-wrap gap-2">
                    {giftForm.recipients.map((recipientId) => {
                      const user = availableUsers.find(u => u.id === recipientId);
                      return user ? (
                        <div key={recipientId} className="bg-white rounded-full px-3 py-1 text-xs border border-orange-300 flex items-center gap-2">
                          <span>{user.name}</span>
                          <button
                            onClick={() => {
                              setGiftForm({
                                ...giftForm,
                                recipients: giftForm.recipients.filter(r => r !== recipientId),
                              });
                            }}
                            className="text-orange-600 hover:text-orange-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Group Name - Appears at Top When Selecting */}
              {giftForm.recipients && giftForm.recipients.length > 0 && (
                <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                  <label className="text-xs font-bold text-purple-700 block mb-2">💾 Group Name (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., 'Close Friends', 'Family', 'Coworkers'"
                      value={giftForm.groupName}
                      onChange={(e) => setGiftForm({ ...giftForm, groupName: e.target.value })}
                      className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      onClick={() => {
                        console.log('🔵 Save button clicked');
                        console.log('Group name value:', giftForm.groupName);
                        console.log('Group name trimmed:', giftForm.groupName.trim());
                        console.log('Recipients:', giftForm.recipients);

                        if (giftForm.groupName.trim()) {
                          const groupNameToSave = giftForm.groupName;
                          const newGroup = {
                            id: Date.now().toString(),
                            name: groupNameToSave,
                            members: giftForm.recipients,
                          };
                          console.log('💾 Creating new group:', newGroup);
                          console.log('Current savedGroups before:', savedGroups);

                          const updatedGroups = [...savedGroups, newGroup];
                          console.log('Updated groups after:', updatedGroups);

                          setSavedGroups(updatedGroups);
                          console.log('✅ setSavedGroups called with:', updatedGroups);

                          setGiftForm({
                            points: '',
                            recipients: [],
                            giftCardMessage: 'Thank you for being a friend',
                            customMessage: '',
                            giftDate: new Date().toISOString().split('T')[0],
                            groupName: '',
                            useCustomMessage: false,
                          });
                          setGiftSearch('');
                          setTimeout(() => {
                            // Auto-focus the quick load search
                            const quickLoadInput = document.querySelector('input[placeholder="Search group name..."]');
                            if (quickLoadInput) {
                              (quickLoadInput as HTMLInputElement).focus();
                              (quickLoadInput as HTMLInputElement).value = '';
                            }
                            setModalMessage(`✅ Group "${groupNameToSave}" saved with ${newGroup.members.length} members!\n\nFind it above in "⚡ Quick Load Saved Group" - it's already loaded!`);
                            setShowSuccessModal(true);
                          }, 100);
                        } else {
                          console.warn('⚠️ Group name is empty or whitespace only');
                        }
                      }}
                      className="px-3 py-2 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Search Input - Search Users, Alias, ID, or Group Names */}
              <input
                type="text"
                value={giftSearch}
                onChange={(e) => setGiftSearch(e.target.value)}
                placeholder="Search users, groups, alias, or ID (e.g., @SunnyLove, Close Friends, USER0000089)"
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />

              {/* User List with Checkboxes + Group Search Results */}
              <div className="max-h-40 overflow-y-auto space-y-1 border border-orange-100 rounded-lg p-2 bg-orange-50">
                {/* Saved Groups Section - Searchable */}
                {savedGroups.length > 0 ? (
                  <>
                    {savedGroups.filter((group) =>
                      giftSearch === '' ||
                      group.name.toLowerCase().includes(giftSearch.toLowerCase())
                    ).length > 0 && (
                      <div className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded mb-1 sticky top-0">
                        👥 Saved Groups
                      </div>
                    )}
                    {savedGroups
                      .filter((group) =>
                        giftSearch === '' ||
                        group.name.toLowerCase().includes(giftSearch.toLowerCase())
                      )
                      .map((group) => (
                        <button
                          key={`group-${group.id}`}
                          onClick={() => {
                            setGiftForm({
                              ...giftForm,
                              recipients: group.members,
                            });
                            setGiftSearch('');
                          }}
                          className="w-full text-left flex items-center gap-2 p-2 hover:bg-purple-100 rounded transition bg-gradient-to-r from-purple-50 to-transparent border border-purple-200"
                        >
                          <span className="text-lg">👥</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-purple-900 truncate">{group.name}</p>
                            <p className="text-xs text-purple-600 truncate">{group.members.length} members</p>
                          </div>
                          <span className="text-xs text-purple-600 font-bold">→</span>
                        </button>
                      ))}
                    {giftSearch !== '' && savedGroups.filter((group) =>
                      group.name.toLowerCase().includes(giftSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-gray-500 text-center p-2">No groups matching "{giftSearch}"</p>
                    )}
                  </>
                ) : null}

                {/* Users Section */}
                {availableUsers.filter((u) =>
                  giftSearch === '' ||
                  u.alias.toLowerCase().includes(giftSearch.toLowerCase()) ||
                  u.id.toLowerCase().includes(giftSearch.toLowerCase()) ||
                  u.name.toLowerCase().includes(giftSearch.toLowerCase())
                ).length > 0 && savedGroups.length > 0 && (
                  <div className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded mt-2 mb-1 sticky top-0">
                    👤 Users
                  </div>
                )}
                {availableUsers
                  .filter((u) =>
                    giftSearch === '' ||
                    u.alias.toLowerCase().includes(giftSearch.toLowerCase()) ||
                    u.id.toLowerCase().includes(giftSearch.toLowerCase()) ||
                    u.name.toLowerCase().includes(giftSearch.toLowerCase())
                  )
                  .map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-orange-100 rounded cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={giftForm.recipients?.includes(user.id) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGiftForm({
                              ...giftForm,
                              recipients: [...(giftForm.recipients || []), user.id],
                            });
                          } else {
                            setGiftForm({
                              ...giftForm,
                              recipients: (giftForm.recipients || []).filter((r) => r !== user.id),
                            });
                          }
                        }}
                        className="w-4 h-4 accent-orange-600"
                      />
                      <span className="text-lg">👤</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-600 truncate">{user.id}</p>
                      </div>
                      <span className="text-xs text-orange-600 whitespace-nowrap">{user.alias}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Gift Card Message - Scrollable */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-700">🎀 Gift Card Message</label>
                <span className="text-xs text-gray-500">(Optional)</span>
              </div>
              <div className="max-h-32 overflow-y-auto border border-orange-100 rounded-lg p-2 bg-orange-50 space-y-1">
                {giftCardTemplates.map((template, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2 p-1.5 hover:bg-orange-100 rounded cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={giftForm.giftCardMessage === template && !giftForm.useCustomMessage}
                      onChange={() =>
                        setGiftForm({
                          ...giftForm,
                          giftCardMessage: template,
                          useCustomMessage: false,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span className="text-xs text-gray-700">{template}</span>
                  </label>
                ))}
              </div>

              {/* Custom Message Toggle */}
              <button
                onClick={() =>
                  setGiftForm({
                    ...giftForm,
                    useCustomMessage: !giftForm.useCustomMessage,
                  })
                }
                className="w-full mt-2 px-3 py-2 border-2 border-dashed border-orange-300 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50"
              >
                ✏️ {giftForm.useCustomMessage ? 'Use Template' : 'Write Custom Message'}
              </button>

              {giftForm.useCustomMessage && (
                <textarea
                  value={giftForm.customMessage}
                  onChange={(e) =>
                    setGiftForm({ ...giftForm, customMessage: e.target.value })
                  }
                  placeholder="Write your custom message..."
                  className="w-full mt-2 px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
                  rows={3}
                />
              )}
            </div>

            {/* Gift Date - Current or Future Only */}
            <div>
              <label className="text-sm font-bold text-gray-700">📅 Send Gift On (Today or Later)</label>
              <input
                type="date"
                value={giftForm.giftDate}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  if (selectedDate >= today) {
                    setGiftForm({ ...giftForm, giftDate: e.target.value });
                  } else {
                    setModalMessage('❌ Please select today or a future date');
                    setShowErrorModal(true);
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>


            {/* Points Left */}
            <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center border border-yellow-200">
              <p className="text-xs font-bold text-gray-700">💰 Points Left</p>
              <p className="text-sm font-bold text-orange-600">{Math.max(0, userBalance - (parseInt(giftForm.points || '0', 10) * (giftForm.recipients?.length || 0)))} EP</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  console.log('🎁 Send Gift button clicked');
                  const pointsToSend = parseInt(giftForm.points || '0', 10);
                  console.log('🔍 Points to send:', pointsToSend);
                  console.log('🔍 Recipients:', giftForm.recipients);
                  console.log('🔍 Recipients count:', giftForm.recipients.length);
                  console.log('🔍 User balance:', userBalance);

                  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                  const currentUserId = currentUser?.id?.toString();
                  const sendingToSelf = giftForm.recipients.some((recipientId) => recipientId === currentUserId);

                  let errorMsg = '';

                  if (!giftForm.points || pointsToSend <= 0) {
                    errorMsg = '❌ Please enter amount\n\nHow many EP per friend?';
                    console.warn('Invalid amount:', giftForm.points);
                  } else if (giftForm.recipients.length === 0) {
                    errorMsg = '❌ Select at least 1 friend';
                    console.warn('No recipients selected');
                  } else if (sendingToSelf) {
                    errorMsg = '❌ Cannot send to yourself!';
                    console.warn('Trying to send to self');
                  } else if (pointsToSend * giftForm.recipients.length > userBalance) {
                    const needed = pointsToSend * giftForm.recipients.length;
                    const current = userBalance;
                    errorMsg = `❌ Not enough EP!\n\nNeed: ${needed}\nHave: ${current}`;
                    console.warn('Not enough points:', { needed, current });
                  }

                  if (errorMsg) {
                    console.warn('❌ Validation failed:', errorMsg);
                    setModalMessage(errorMsg);
                    setShowErrorModal(true);
                  } else {
                    console.log('✅ All validations passed!');
                    // Show confirmation modal
                    const recipientNames = giftForm.recipients
                      .map((id) => availableUsers.find((u) => u.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');
                    const totalPointsDeducted = pointsToSend * giftForm.recipients.length;

                    // Use selected message or default
                    const selectedMessage = giftForm.useCustomMessage ? giftForm.customMessage : giftForm.giftCardMessage;

                    const confirmationData = {
                      pointsToSend,
                      totalPointsDeducted,
                      recipientCount: giftForm.recipients.length,
                      recipientNames,
                      message: selectedMessage,
                      giftDate: giftForm.giftDate,
                    };
                    console.log('✅ Confirmation ready:', confirmationData);
                    setGiftConfirmationData(confirmationData);
                    setShowGiftConfirmation(true);
                    console.log('✅ Confirmation modal opened!');
                  }
                }}
                className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-3 rounded-lg font-bold text-base hover:shadow-lg transition active:scale-95"
              >
                💝 Send Gift
              </button>
              <button
                onClick={() => {
                  setShowGiftModal(false);
                  setShowGroupForm(false);
                  setGiftSearch('');
                }}
                className="w-full border-2 border-orange-300 text-orange-600 py-2.5 rounded-lg font-bold text-sm hover:bg-orange-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Confirmation Modal */}
      {showGiftConfirmation && giftConfirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 space-y-4">
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-pink-200">
              <p className="text-lg font-bold text-pink-600">🎁 Confirm Gift</p>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="bg-pink-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Recipients:</p>
                <p className="text-sm font-bold text-gray-900">{giftConfirmationData.recipientNames}</p>
                <p className="text-xs text-gray-600 mt-1">({giftConfirmationData.recipientCount} friend{giftConfirmationData.recipientCount > 1 ? 's' : ''})</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Per person:</p>
                  <p className="text-sm font-bold text-orange-600">{giftConfirmationData.pointsToSend} EP</p>
                </div>
                <div className="bg-pink-100 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Total:</p>
                  <p className="text-sm font-bold text-pink-600">{giftConfirmationData.totalPointsDeducted} EP</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Message:</p>
                <p className="text-xs font-semibold text-gray-900 mt-1 break-words">"{giftConfirmationData.message}"</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Scheduled for:</p>
                <p className="text-sm font-bold text-blue-600">
                  {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (giftConfirmationData.giftDate === today) {
                      return '🚀 Sent Immediately';
                    }
                    const dateObj = new Date(giftConfirmationData.giftDate + 'T00:00:00');
                    return dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                  })()}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  // Proceed with sending
                  if (showGroupForm && giftForm.groupName) {
                    setSavedGroups([
                      ...savedGroups,
                      {
                        id: Date.now().toString(),
                        name: giftForm.groupName,
                        members: giftForm.recipients,
                      },
                    ]);
                  }

                  const newBalance = userBalance - giftConfirmationData.totalPointsDeducted;
                  setUserBalance(newBalance);

                  // Record in activity history
                  const now = new Date();
                  const dateString = 'Today';
                  const timeString = now.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  const newActivity = {
                    id: Date.now(),
                    type: 'gift',
                    emoji: '🎁',
                    title: `Gift sent to ${giftConfirmationData.recipientNames}`,
                    errandId: 'N/A',
                    date: dateString,
                    time: timeString,
                    amount: `-${giftConfirmationData.totalPointsDeducted} EP`,
                    color: 'pink',
                  };
                  console.log('🎁 New gift transaction:', newActivity);
                  setAllActivities([newActivity, ...allActivities]);

                  // Send points to each recipient (API call)
                  giftForm.recipients.forEach((recipientId) => {
                    // TODO: Call backend API to add points to recipient
                    // axios.post(`/api/gifts/send`, { recipientId, points: giftConfirmationData.pointsToSend })
                    console.log(`Sending ${giftConfirmationData.pointsToSend} EP to user ${recipientId}`);
                  });

                  // Reset form and close
                  setGiftForm({
                    points: '',
                    recipients: [],
                    giftCardMessage: 'Thank you for being a friend',
                    customMessage: '',
                    giftDate: new Date().toISOString().split('T')[0],
                    groupName: '',
                    useCustomMessage: false,
                  });
                  setShowGiftModal(false);
                  setShowGiftConfirmation(false);
                  setShowGroupForm(false);
                  setGiftSearch('');

                  const today = new Date();
                  const todayStr = new Date().toISOString().split('T')[0];
                  let scheduledDateText = '';

                  if (giftConfirmationData.giftDate === todayStr) {
                    scheduledDateText = '🚀 Sent Immediately';
                  } else {
                    const dateObj = new Date(giftConfirmationData.giftDate + 'T00:00:00');
                    scheduledDateText = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                  }

                  setGiftSuccessData({
                    pointsToSend: giftConfirmationData.pointsToSend,
                    recipientCount: giftConfirmationData.recipientCount,
                    message: giftConfirmationData.message,
                    scheduledDate: scheduledDateText,
                  });
                  setShowGiftSuccessModal(true);
                }}
                className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-2.5 rounded-lg font-bold text-sm hover:shadow-lg transition"
              >
                ✅ Confirm & Send
              </button>
              <button
                onClick={() => {
                  setShowGiftConfirmation(false);
                  setGiftConfirmationData(null);
                }}
                className="w-full border-2 border-gray-300 text-gray-600 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redemption Confirmation Modal */}
      {confirmRedeemData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 rounded-2xl p-5 max-w-xs w-full shadow-2xl border-3 border-yellow-300">
            {/* Decorative sparkles */}
            <div className="absolute top-2 left-3 text-xl animate-bounce">✨</div>
            <div className="absolute top-2 right-3 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</div>

            <div className="text-center mb-4 relative z-10">
              <p className="text-4xl mb-2">🎊</p>
              <h2 className="text-xl font-bold bg-gradient-to-r from-errandify-orange to-yellow-500 bg-clip-text text-transparent">
                Yay! Claim Your Prize! 🎉
              </h2>
            </div>

            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg p-4 mb-4 shadow-md">
              <div className="mb-3">
                <p className="text-xs text-errandify-brown font-bold">{confirmRedeemData.name}</p>
                <p className="text-2xl font-bold text-errandify-orange">{confirmRedeemData.points} EP</p>
              </div>
              <div className="bg-white rounded py-2 px-2 text-center">
                <p className="text-xs text-gray-600 mb-1">Code:</p>
                <p className="text-sm font-mono font-bold text-errandify-orange">{confirmRedeemData.code}</p>
              </div>
            </div>

            <div className="flex gap-2 relative z-10">
              <button
                onClick={handleRedeemCancel}
                className="flex-1 bg-white text-errandify-brown py-2 px-3 rounded-lg font-bold text-sm hover:bg-gray-100 transition border-2 border-gray-400"
              >
                ❌ Not Now
              </button>
              <button
                onClick={handleRedeemConfirm}
                className="flex-1 bg-gradient-to-r from-errandify-orange to-yellow-500 text-white py-2 px-3 rounded-lg font-bold text-sm hover:shadow-lg transition border-2 border-orange-600 active:scale-95"
              >
                ✅ Redeem!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Pause Modal */}
      <AccountPauseModal
        isOpen={showAccountPauseModal}
        onClose={() => setShowAccountPauseModal(false)}
      />

      {/* Floating Hana */}
      <HanaCustomerService />

      {/* Bottom Navigation Footer */}
      <BottomNav
        onLogout={handleLogout}
        userRole={userRole}
      />
      </main>
      </div>
    </AdminThemeWrapper>
  );
}

// Safety Resources Component
interface SafetyResource {
  id: string;
  title: string;
  category: 'trafficking' | 'abuse' | 'migrant' | 'elderly' | 'mental_health';
  phone: string;
  email?: string;
  url?: string;
  description: string;
  hours: string;
}

const SAFETY_RESOURCES: SafetyResource[] = [
  {
    id: '1',
    title: 'Singapore Anti-Trafficking Hotline',
    category: 'trafficking',
    phone: '+65 1800-838-8877',
    description: 'Report trafficking, get emergency support',
    hours: '24/7',
  },
  {
    id: '2',
    title: 'Ministry of Social & Family Development',
    category: 'trafficking',
    phone: '+65 6354-5303',
    url: 'https://www.msf.gov.sg/',
    description: 'Government support for trafficking victims',
    hours: '9am-5pm',
  },
  {
    id: '3',
    title: 'HOME Singapore',
    category: 'migrant',
    phone: '+65 6297-9059',
    email: 'contact@home.org.sg',
    url: 'https://www.home.org.sg/',
    description: 'Support for migrant workers in distress',
    hours: '24/7',
  },
  {
    id: '4',
    title: 'Transient Workers Count Too (TWC2)',
    category: 'migrant',
    phone: '+65 6883-6800',
    url: 'https://twc2.org.sg/',
    description: 'Migrant worker advocacy and support',
    hours: 'Business hours',
  },
  {
    id: '5',
    title: "Women's Crisis Centre",
    category: 'abuse',
    phone: '+65 6392-7650',
    url: 'https://www.wcc.org.sg/',
    description: 'Support for abuse survivors',
    hours: '10am-6pm',
  },
  {
    id: '6',
    title: 'AWARE Singapore',
    category: 'abuse',
    phone: '+65 6778-0220',
    url: 'https://www.aware.org.sg/',
    description: "Gender equality and women's rights",
    hours: '10am-6pm',
  },
  {
    id: '7',
    title: 'Elders Support Services',
    category: 'elderly',
    phone: '+65 6210-2888',
    url: 'https://www.healthhub.sg/',
    description: 'Support for elderly citizens',
    hours: '8am-6pm',
  },
  {
    id: '8',
    title: 'Institute of Mental Health',
    category: 'mental_health',
    phone: '+65 6389-2222',
    url: 'https://www.imh.com.sg/',
    description: 'Mental health crisis support',
    hours: '24/7',
  },
  {
    id: '9',
    title: 'Singapore Suicide Prevention Hotline',
    category: 'mental_health',
    phone: '+65 1800-221-4444',
    description: 'Suicide prevention and mental health crisis',
    hours: '24/7',
  },
  {
    id: '10',
    title: 'YMCA Sexual Harassment Hotline',
    category: 'abuse',
    phone: '+65 6338-3003',
    description: 'Support for sexual harassment survivors',
    hours: '24/7',
  },
];

function SafetyResourcesList({
  searchTerm,
  filterCategory,
}: {
  searchTerm: string;
  filterCategory: 'all' | 'trafficking' | 'abuse' | 'migrant' | 'elderly' | 'mental_health';
}) {
  const filtered = SAFETY_RESOURCES.filter((resource) => {
    const matchesFilter = filterCategory === 'all' || resource.category === filterCategory;
    const matchesSearch =
      searchTerm === '' ||
      resource.title.toLowerCase().includes(searchTerm) ||
      resource.description.toLowerCase().includes(searchTerm) ||
      resource.phone.includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {filtered.length > 0 ? (
        filtered.map((resource) => (
          <div key={resource.id} className="bg-white border-l-4 border-blue-400 rounded-lg p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-900 text-sm">{resource.title}</h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold whitespace-nowrap ml-2">
                {resource.hours}
              </span>
            </div>

            <p className="text-xs text-gray-600 mb-3">{resource.description}</p>

            <div className="space-y-2">
              {/* Phone */}
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div>
                  <p className="text-xs text-gray-600">Phone</p>
                  <p className="font-bold text-gray-900 text-sm">{resource.phone}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(resource.phone)}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition font-medium"
                >
                  Copy
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`tel:${resource.phone}`}
                  className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded transition font-medium text-center"
                >
                  📞 Call
                </a>
                {resource.email && (
                  <a
                    href={`mailto:${resource.email}`}
                    className="flex-1 text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded transition font-medium text-center"
                  >
                    📧 Email
                  </a>
                )}
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition font-medium text-center"
                  >
                    🌐 Visit
                  </a>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">No resources found matching your search.</p>
        </div>
      )}
    </div>
  );
}
