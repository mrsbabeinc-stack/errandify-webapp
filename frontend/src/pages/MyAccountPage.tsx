import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import ProfilePlaque from '../components/ProfilePlaque';

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

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'pocket' | 'rewards' | 'blocked' | 'notify' | 'categories' | 'faq'>('dashboard');
  const [profileTab, setProfileTab] = useState<'shared' | 'private'>('shared');
  const [blockedTab, setBlockedTab] = useState<'blocked' | 'trusted'>('blocked');
  const [rewardsTab, setRewardsTab] = useState<'overview' | 'shop' | 'history'>('overview');
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
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
  const [aiAlerts, setAiAlerts] = useState<Array<{ type: string; emoji: string; title: string; message: string }>>([]);
  const [editingPayout, setEditingPayout] = useState(false);
  const [expandPayout, setExpandPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    bankName: 'DBS Bank Singapore',
    accountHolder: 'Sarah Tan',
    accountNumber: '****5678',
  });
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'completed' | 'posted' | 'referral' | 'rating' | 'accepted'>('all');
  const [userBalance, setUserBalance] = useState(10000);
  const [redemptionHistory, setRedemptionHistory] = useState<Array<{ id: string; date: string; item: string; code: string; amount: number; emoji: string }>>([
    { id: '1', date: '10-06-2026', item: '$5 Discount', code: 'ERRAND5', amount: -50, emoji: '💳' },
  ]);
  const [showGiftModal, setShowGiftModal] = useState(false);
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
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [savedGroups, setSavedGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([]);
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
  const allActivities = [
    { id: 1, type: 'completed', emoji: '✅', title: 'Completed: Clean apartment', errandId: 'ERR-2847', date: 'Today 10:28 AM', amount: '+$80', color: 'green' },
    { id: 2, type: 'posted', emoji: '📝', title: 'Posted: Home repairs', errandId: 'ERR-2846', date: 'Yesterday 10:25 PM', amount: '-$120', color: 'orange' },
    { id: 3, type: 'referral', emoji: '🎁', title: 'Referral: @SunnyLove', errandId: 'N/A', date: '2 days ago', amount: '+$50', color: 'purple' },
    { id: 4, type: 'rating', emoji: '⭐', title: 'Rating given: Clean apartment', errandId: 'ERR-2847', date: '3 days ago', amount: '5 stars', color: 'blue' },
    { id: 5, type: 'accepted', emoji: '✅', title: 'Accepted bid: Tutoring', errandId: 'ERR-2845', date: '4 days ago', amount: 'SGD $60', color: 'green' },
    { id: 6, type: 'posted', emoji: '📋', title: 'Posted: Office admin', errandId: 'ERR-2844', date: '5 days ago', amount: '-$75', color: 'orange' },
  ];

  const filteredActivities = allActivities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(activitySearch.toLowerCase());
    const matchesFilter = activityFilter === 'all' || activity.type === activityFilter;
    return matchesSearch && matchesFilter;
  });

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
            email: user.email || '',
            mobile: user.mobile || '',
            role: user.role || 'doer',
            reviewCount: 0,
            completedTasks: 0,
            totalEarnings: 0,
            errandifyPoints: 0,
            categories: [],
          };
          setProfileData(fallbackProfile);

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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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

  const moderateText = async (text: string): Promise<{ approved: boolean; message?: string }> => {
    if (!text || text.length === 0) return { approved: true };

    try {
      const qwenApiKey = import.meta.env.VITE_QWEN_API_KEY;
      if (!qwenApiKey) {
        console.warn('Qwen API key not configured - skipping text moderation');
        return { approved: true, message: '⚠️ Text moderation not configured' };
      }

      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-plus',
          input: {
            messages: [
              {
                role: 'user',
                content: `Review this user-generated text for appropriateness on a marketplace. Check for: hate speech, violence, explicit content, spam, scams, or offensive language. Text: "${text}". Reply with only "APPROVED" if appropriate, or "REJECTED: [reason]" if not.`,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data.output?.choices?.[0]?.message?.content;
      const approved = result && result.includes('APPROVED');
      return { approved };
    } catch (error) {
      console.error('Text moderation error:', error);
      return { approved: true, message: '⚠️ Could not verify content' }; // Fallback: allow if API fails
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

        // Accept image - moderation is optional
        setProfileImage(base64Image);
        // Save to localStorage so it persists
        localStorage.setItem('profileImage', base64Image);
        setModalMessage('Your lovely face is all set! 📸');
        setShowSuccessModal(true);

        // Optional: Run async moderation in background (don't block upload)
        const qwenApiKey = import.meta.env.VITE_QWEN_API_KEY;
        if (qwenApiKey) {
          try {
            const base64Data = base64Image.split(',')[1];
            const response = await axios.post(
              'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
              {
                model: 'qwen-vl-plus',
                input: {
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'image',
                          image: `data:image/jpeg;base64,${base64Data}`,
                        },
                        {
                          type: 'text',
                          text: 'Is this image appropriate for a professional profile photo? Check for: nudity, violence, hate symbols, weapons, or drugs. Reply with only "APPROVED" or "REJECTED: [reason]".',
                        },
                      ],
                    },
                  ],
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${qwenApiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: 30000,
              }
            );

            const result = response.data.output?.text || '';
            console.log('Qwen moderation result:', result);

            if (result.includes('REJECTED')) {
              console.warn('Image moderation warning:', result);
            }
          } catch (error: any) {
            console.warn('Background moderation check failed (image still uploaded):', error.message);
          }
        }
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
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-white pb-24">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-white font-bold text-xl hover:opacity-80 transition"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">✨ MyAccount</h1>
          <div className="relative group">
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition">
              ⚙️
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 font-semibold first:rounded-t-lg flex items-center gap-2"
              >
                🚪 Logout
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-semibold last:rounded-b-lg flex items-center gap-2"
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* AD CAROUSEL + EVENT BANNER */}
        <div className="mb-4">
          <AdCarousel />
          <div className="mt-2">
            <EventBanner />
          </div>
        </div>

        {/* STICKY TABS - Below banner */}
        <div className="sticky top-20 z-40 bg-white border-b border-gray-200 mb-4 -mx-4 px-3 py-1 overflow-x-auto">
          <div className="flex gap-2 whitespace-nowrap">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'dashboard'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📊 MyHub
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'profile'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              👤 MyProfile
            </button>
            <button
              onClick={() => setActiveSection('pocket')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'pocket'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              💰 MyPocket
            </button>
            <button
              onClick={() => setActiveSection('rewards')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'rewards'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              💎 MyRewardSpace
            </button>
            <button
              onClick={() => setActiveSection('blocked')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'blocked'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              🚫 Blocked
            </button>
            <button
              onClick={() => setActiveSection('notify')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'notify'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              🔔 Notify
            </button>
            <button
              onClick={() => setActiveSection('categories')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'categories'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              🎯 Categories
            </button>
            <button
              onClick={() => setActiveSection('faq')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'faq'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              ❓ FAQ
            </button>
          </div>
        </div>

        {/* DASHBOARD - Always show first */}
        {activeSection === 'dashboard' && (
          <div className="space-y-1.5">
            {/* DASHBOARD CONTENT */}
            {/* USER ID CARD - TOP */}
            {profileData && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2.5 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Your Unique User ID</p>
                    <p className="text-base font-bold text-blue-700 font-mono">
                      {profileData.formattedUserId || '⏳ Loading...'}
                    </p>
                  </div>
                  {profileData.formattedUserId && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profileData.formattedUserId || '');
                        setModalMessage('Your special code is copied! Ready to share? 🎁');
                        setShowSuccessModal(true);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition font-semibold"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PROFILE HERO CARD */}
            <div className="relative bg-white rounded-lg shadow p-3 border-l-4 border-errandify-orange overflow-hidden mb-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-errandify-brown truncate">{profileData.name}</h2>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-600">⭐</p>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-1">
                  {badges.map((badge, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      {badge.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-1">
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-amber-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{ratings.reviewCount}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">👥 Reviews</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-green-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{profileData.completedTasks || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">✅ Errands Completed</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-blue-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">${profileData.totalEarnings || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">💰 Earnings</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-purple-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{profileData.errandifyPoints || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">⭐ EP</p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
              <button
                onClick={() => navigate('/errandify-points')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">💎</p>
                <p className="font-bold text-xs text-gray-800">Rewards</p>
              </button>
              <button
                onClick={() => navigate('/referral')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">🎁</p>
                <p className="font-bold text-xs text-gray-800">Referral</p>
              </button>
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
                      certificates={profileData.certificates}
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
                        <p className="text-gray-500 text-xs">{activity.date}</p>
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
                onClick={() => setRewardsTab('history')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded whitespace-nowrap ${
                  rewardsTab === 'history'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                📜 History
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
                    <p className="text-4xl font-bold mb-2">{userBalance} EP</p>
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
                      setGiftForm({ points: '', recipient: '' });
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
                  <p className="text-xs text-gray-600 mt-1">Current Balance: <span className="font-bold text-green-600">{userBalance} EP</span></p>
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
                          if (userBalance >= 50) {
                            setUserBalance(userBalance - 50);
                            setRedemptionHistory([...redemptionHistory, { id: Date.now().toString(), date: new Date().toLocaleDateString('en-GB'), item: '$5 Discount', code: 'ERRAND5', amount: -50, emoji: '💳' }]);
                            setModalMessage('🎉 YES! You just redeemed $5 Discount!\n\n🎟️ Code: ERRAND5\n\nHappy saving! 💰');
                            setShowSuccessModal(true);
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
                          if (userBalance >= 100) {
                            setUserBalance(userBalance - 100);
                            setRedemptionHistory([...redemptionHistory, { id: Date.now().toString(), date: new Date().toLocaleDateString('en-GB'), item: '$10 Discount', code: 'ERRAND10', amount: -100, emoji: '💳' }]);
                            setModalMessage('🎉 AWESOME! You just redeemed $10 Discount!\n\n🎟️ Code: ERRAND10\n\nWow, great saving! 💰');
                            setShowSuccessModal(true);
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
                        disabled
                        className="bg-gray-400 text-white px-3 py-2 rounded-lg text-xs font-bold cursor-not-allowed opacity-50"
                      >
                        🎯 Need 200 EP
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TAB - Redemption History */}
            {rewardsTab === 'history' && (
              <div className="space-y-2">
                <div className="text-center py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border-2 border-blue-300">
                  <p className="text-sm font-bold text-blue-600">📜 Redemption History 📜</p>
                  <p className="text-xs text-gray-600 mt-1">Your reward transactions</p>
                </div>

                {/* Redemption History List */}
                <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-3">
                    <h3 className="text-sm font-bold">🎟️ Your Redemptions 🎟️</h3>
                    <p className="text-xs mt-1 opacity-90">Track all your redeemed rewards</p>
                  </div>
                  <div className="divide-y divide-purple-100 text-xs">
                    {redemptionHistory.length > 0 ? (
                      redemptionHistory.map((record) => (
                        <div key={record.id} className="p-3 flex justify-between hover:bg-purple-50 transition bg-gradient-to-r from-transparent to-purple-50">
                          <div>
                            <p className="font-bold text-gray-900">{record.emoji} {record.item}</p>
                            <p className="text-gray-500 text-xs">{record.date} • Code: {record.code}</p>
                          </div>
                          <p className="font-bold text-orange-600 text-sm">{record.amount} EP</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p>No redemptions yet! Start shopping! 🛍️</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLOCKED SECTION */}
        {activeSection === 'blocked' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Sub-tabs for Blocked & Trusted */}
            <div className="flex gap-2 border-b border-gray-200 p-3">
              <button
                onClick={() => setBlockedTab('blocked')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded ${
                  blockedTab === 'blocked' || !blockedTab
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                🚫 Blocked Users
              </button>
              <button
                onClick={() => setBlockedTab('trusted')}
                className={`px-3 py-1.5 text-xs font-bold transition rounded ${
                  blockedTab === 'trusted'
                    ? 'bg-errandify-orange text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                ❤️ Trusted Users
              </button>
            </div>

            {/* Blocked Users Tab */}
            {(!blockedTab || blockedTab === 'blocked') && (
              <div className="text-center text-gray-600 py-6 px-4">
                <p className="mb-2 text-sm">No blocked users yet</p>
                <p className="text-xs">Users you block won't be able to contact you or see your profile</p>
              </div>
            )}

            {/* Trusted Users Tab */}
            {blockedTab === 'trusted' && (
              <div className="text-center text-gray-600 py-6 px-4">
                <p className="mb-2 text-sm">❤️ Your Trusted Network</p>
                <p className="text-xs mb-3">Users who've rated you 5 stars appear here</p>
                <div className="bg-blue-50 rounded p-3 text-left">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Who gets marked as Trusted?</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>✅ Users who rate you 5 stars</li>
                    <li>✅ Completed multiple errands with you</li>
                    <li>✅ No disputes or complaints</li>
                    <li>✅ Consistent positive feedback</li>
                  </ul>
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
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Message Received</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Errand Done</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
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
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Referral Activity</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Platform Updates</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES SECTION */}
        {activeSection === 'categories' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-errandify-orange text-white p-3">
              <h2 className="text-lg font-bold">🎯 My Categories</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">Select categories you're interested in as an asker or specialized in as a doer.</p>

              {/* Role Tabs */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button className="flex-1 py-2 px-3 text-xs font-bold rounded bg-errandify-orange text-white">💼 I Can Help</button>
                <button className="flex-1 py-2 px-3 text-xs font-bold rounded hover:bg-gray-200">🙋 I Need Help</button>
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded border-2 border-errandify-orange bg-orange-50 text-center cursor-pointer">
                  <p className="text-2xl mb-1">🧹</p>
                  <p className="text-xs font-bold text-errandify-brown">Cleaning</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">🏠</p>
                  <p className="text-xs font-bold text-errandify-brown">Home Maintenance</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">🛍️</p>
                  <p className="text-xs font-bold text-errandify-brown">Shopping</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">📦</p>
                  <p className="text-xs font-bold text-errandify-brown">Delivery</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">🧒</p>
                  <p className="text-xs font-bold text-errandify-brown">Childcare</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">🐕</p>
                  <p className="text-xs font-bold text-errandify-brown">Pet Care</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">💻</p>
                  <p className="text-xs font-bold text-errandify-brown">Tech Support</p>
                </div>
                <div className="p-3 rounded border-2 border-gray-200 hover:border-gray-300 text-center cursor-pointer">
                  <p className="text-2xl mb-1">⭐</p>
                  <p className="text-xs font-bold text-errandify-brown">Other</p>
                </div>
              </div>

              <div className="text-center text-xs text-gray-600 mt-4">
                <p>1 selected (1 total)</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50">Skip</button>
                <button className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded text-xs font-bold hover:bg-orange-600">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ SECTION */}
        {activeSection === 'faq' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-errandify-orange text-white p-3">
              <h2 className="text-lg font-bold">❓ Frequently Asked Questions</h2>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">What is Errandify?</p>
                <p className="text-xs text-gray-600">Errandify is Singapore's AI-powered neighbourhood marketplace where neighbours help each other with daily tasks. Connect with trusted community members to post or complete errands.</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">How do I post an errand?</p>
                <p className="text-xs text-gray-600">Click MyHome → Create Errand. Select a category, describe what you need, set your budget, and post. Doers will submit bids within hours. Review and pick the best fit!</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">How do I earn money as a doer?</p>
                <p className="text-xs text-gray-600">Browse errands, submit bids at your chosen rate, get accepted, complete the work, and receive payment. Higher ratings build reputation and unlock better opportunities!</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">How much can I earn?</p>
                <p className="text-xs text-gray-600">You set your own rates! Earnings depend on category, complexity, time, and location. Most doers earn SGD 20-100+ per errand. Top-rated doers get priority!</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">Can I cancel an errand?</p>
                <p className="text-xs text-gray-600">Yes! Before a doer accepts, you can cancel free. After acceptance, a small cancellation fee applies. If the doer cancels, you get fully refunded.</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">What if I'm not happy with the work?</p>
                <p className="text-xs text-gray-600">Payment is held until you mark work complete. If there are issues, raise a dispute with evidence. Our team reviews and resolves fairly.</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">How are fees calculated?</p>
                <p className="text-xs text-gray-600">Doers pay 20% platform fee from earnings. Askers pay Stripe processing fees (2-3%). Example: SGD 100 errand = Doer earns SGD 80 (after 20%), Asker pays ~SGD 102-103.</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">What are Errandify Points?</p>
                <p className="text-xs text-gray-600">EP are earned through task completion and ratings. Convert them to SGD and withdraw in 24-48 hours. Use them for rewards and discounts too!</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">Who can join Errandify?</p>
                <p className="text-xs text-gray-600">Anyone 18+ can join! We verify users via SingPass (for Singapore citizens/residents). Some categories may require additional background checks.</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
                <p className="font-semibold text-sm mb-1 text-errandify-brown">What's a Trusted User?</p>
                <p className="text-xs text-gray-600">Users with 5-star ratings, completed multiple errands, and no disputes get marked as Trusted. It builds confidence in the community!</p>
              </div>
            </div>
          </div>
        )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 space-y-3 my-8">
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

            {/* Search Recipients */}
            <div>
              <label className="text-sm font-bold text-gray-700">🔍 Search User by Alias or ID</label>
              <input
                type="text"
                value={giftSearch}
                onChange={(e) => setGiftSearch(e.target.value)}
                placeholder="e.g., @SunnyLove or USER0000089"
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange mb-2"
              />

              {/* User List */}
              <div className="max-h-40 overflow-y-auto space-y-1 border border-orange-100 rounded-lg p-2 bg-orange-50">
                {availableUsers
                  .filter((u) =>
                    giftSearch === '' ||
                    u.alias.toLowerCase().includes(giftSearch.toLowerCase()) ||
                    u.id.toLowerCase().includes(giftSearch.toLowerCase())
                  )
                  .map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (!giftForm.recipients.includes(user.id)) {
                          setGiftForm({
                            ...giftForm,
                            recipients: [...giftForm.recipients, user.id],
                          });
                        }
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-orange-100 rounded cursor-pointer transition"
                    >
                      <span className="text-lg">👤</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600">{user.id}</p>
                      </div>
                      <span className="text-xs text-orange-600">{user.alias}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Selected Recipients */}
            {giftForm.recipients.length > 0 && (
              <div>
                <label className="text-sm font-bold text-gray-700">👥 Selected Recipients ({giftForm.recipients.length})</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {giftForm.recipients.map((recipientId) => {
                    const user = availableUsers.find((u) => u.id === recipientId);
                    return (
                      <div
                        key={recipientId}
                        className="bg-orange-200 text-orange-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      >
                        {user?.name}
                        <button
                          onClick={() =>
                            setGiftForm({
                              ...giftForm,
                              recipients: giftForm.recipients.filter((r) => r !== recipientId),
                            })
                          }
                          className="hover:text-orange-700"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gift Card Message */}
            <div>
              <label className="text-sm font-bold text-gray-700">🎀 Gift Card Message</label>
              <div className="space-y-2">
                {giftCardTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setGiftForm({
                        ...giftForm,
                        giftCardMessage: template,
                        useCustomMessage: false,
                      })
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                      giftForm.giftCardMessage === template && !giftForm.useCustomMessage
                        ? 'bg-orange-200 text-orange-900 border-2 border-orange-400'
                        : 'border border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    {template}
                  </button>
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

            {/* Gift Date */}
            <div>
              <label className="text-sm font-bold text-gray-700">📅 Send Gift On (Optional)</label>
              <input
                type="date"
                value={giftForm.giftDate}
                onChange={(e) => setGiftForm({ ...giftForm, giftDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            {/* Save as Group */}
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="w-full px-3 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition"
            >
              💾 {showGroupForm ? 'Cancel' : 'Save Recipients as Group'}
            </button>

            {showGroupForm && (
              <input
                type="text"
                placeholder="Group name (e.g., 'Close Friends')"
                value={giftForm.groupName}
                onChange={(e) => setGiftForm({ ...giftForm, groupName: e.target.value })}
                className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            )}

            {/* Points Left */}
            <div className="bg-yellow-50 rounded-lg p-2 flex justify-between items-center border border-yellow-200">
              <p className="text-xs font-bold text-gray-700">💰 Points Left</p>
              <p className="text-sm font-bold text-orange-600">{Math.max(0, userBalance - (parseInt(giftForm.points || '0', 10) * giftForm.recipients.length))} EP</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  const pointsToSend = parseInt(giftForm.points || '0', 10);
                  if (!giftForm.points || pointsToSend <= 0) {
                    setModalMessage('❌ Please enter a valid amount');
                    setShowErrorModal(true);
                  } else if (giftForm.recipients.length === 0) {
                    setModalMessage('❌ Please select at least one recipient');
                    setShowErrorModal(true);
                  } else if (pointsToSend * giftForm.recipients.length > userBalance) {
                    setModalMessage('❌ Not enough points for all recipients');
                    setShowErrorModal(true);
                  } else {
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
                    const newBalance = userBalance - pointsToSend * giftForm.recipients.length;
                    setUserBalance(newBalance);
                    setShowGiftModal(false);
                    const recipientNames = giftForm.recipients
                      .map((id) => availableUsers.find((u) => u.id === id)?.name)
                      .join(', ');
                    setModalMessage(
                      `🎁 Gift sent! You sent ${pointsToSend} EP to ${giftForm.recipients.length} friend(s)!\n\n🎀 Message: "${
                        giftForm.useCustomMessage ? giftForm.customMessage : giftForm.giftCardMessage
                      }"\n\n📅 Scheduled for: ${new Date(giftForm.giftDate).toLocaleDateString()}\n\nThey're so lucky! 🌟`
                    );
                    setShowSuccessModal(true);
                  }
                }}
                className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white py-2.5 rounded-lg font-bold text-sm hover:shadow-lg transition"
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
    </div>
  );
}
