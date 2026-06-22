import { useState, useEffect } from 'react';
import './MyAccountPage.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';

interface UserProfile {
  id?: number;
  userId?: string;
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
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'pocket' | 'rewards' | 'blocked' | 'notify' | null>('dashboard');
  const [profileTab, setProfileTab] = useState<'shared' | 'private'>('shared');
  const [pocketTab, setPocketTab] = useState<'txns' | 'history' | 'payout'>('txns');
  const [rewardTab, setRewardTab] = useState<'overview' | 'pointHistory' | 'gift' | 'myVouchers'>('overview');
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: 'STRIPE TEST BANK',
    accountHolder: 'John Lee',
    accountNumber: '•••• •••• •••• 3456',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedVoucherCategory, setSelectedVoucherCategory] = useState('all');
  const [giftPoints, setGiftPoints] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [walletData, setWalletData] = useState<any>({ errandifyPoints: 0 });
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [pendingRedeem, setPendingRedeem] = useState<{ rewardId: string; points: number; name: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successReward, setSuccessReward] = useState<{ name: string; points: number } | null>(null);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
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
  });
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState<Array<{ id: string; name: string; fileData?: string; fileName?: string }>>([]);
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [storedAlias, setStoredAlias] = useState<string>('');
  const [storedBio, setStoredBio] = useState<string>('');

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && (editForm.display_name || editForm.alias || editForm.bio || profileImage)) {
      setHasUnsavedChanges(true);
    }
  }, [editForm, profileImage, isEditing]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Load stored alias, bio, and profile photo from localStorage
        const savedAlias = localStorage.getItem('userAlias') || '';
        const savedBio = localStorage.getItem('userBio') || '';
        const savedProfileImage = localStorage.getItem('userProfileImage');
        console.log('Loading from localStorage - Profile Image size:', savedProfileImage ? savedProfileImage.length : 0);
        setStoredAlias(savedAlias);
        setStoredBio(savedBio);
        if (savedProfileImage) {
          console.log('Setting profile image from localStorage');
          setProfileImage(savedProfileImage);
        }

        // Fetch wallet data for Errandify Points
        try {
          const walletRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setWalletData(walletRes.data.data || {});
          console.log('Wallet data:', walletRes.data.data);
        } catch (walletError) {
          console.error('Wallet fetch error:', walletError);
        }

        // Fetch point transaction history
        try {
          const historyRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/point-history`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPointHistory(historyRes.data.data || []);
          console.log('Point history:', historyRes.data.data);
        } catch (historyError) {
          console.error('Point history fetch error:', historyError);
        }

        // Fetch my redeemed vouchers
        try {
          const vouchersRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/my-vouchers`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMyVouchers(vouchersRes.data.data || []);
          console.log('My vouchers:', vouchersRes.data.data);
        } catch (vouchersError) {
          console.error('My vouchers fetch error:', vouchersError);
        }

        // Fetch available rewards
        try {
          const rewardsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/rewards`
          );
          setRewards(rewardsRes.data.data || []);
          console.log('Rewards:', rewardsRes.data.data);
        } catch (rewardsError) {
          console.error('Rewards fetch error:', rewardsError);
        }

        try {
          const profileRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setProfileData(profileRes.data.data);

          setEditForm({
            display_name: profileRes.data.data.name || '',
            email: profileRes.data.data.email || '',
            mobile: profileRes.data.data.mobile || '',
            alias: savedAlias || '',
            bio: savedBio || '',
          });
        } catch (error) {
          console.error('Profile API error:', error);
          // Use localStorage data as fallback
          const fallbackProfile: UserProfile = {
            id: user.id || 0,
            userId: user.userId || '',
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
          setEditForm({
            display_name: fallbackProfile.name,
            email: fallbackProfile.email,
            mobile: fallbackProfile.mobile,
            alias: savedAlias || '',
            bio: savedBio || '',
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
      // Moderate alias and bio before saving
      const aliasResult = await moderateText(editForm.alias || '');
      const bioResult = await moderateText(editForm.bio || '');

      if (!aliasResult.approved) {
        alert('❌ Alias contains inappropriate content. Please revise.');
        setSaving(false);
        return;
      }

      if (!bioResult.approved) {
        alert('❌ Bio contains inappropriate content. Please revise.');
        setSaving(false);
        return;
      }

      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.id;

      console.log('User ID:', userId);
      console.log('Token exists:', !!token);

      if (!token) {
        alert('❌ No authentication token found. Please log in again.');
        return;
      }

      if (!userId) {
        alert('❌ User ID not found. Please log in again.');
        return;
      }

      // Only send fields that backend accepts
      const updateData: any = {};

      // Only include mobile if it's different from current
      if (editForm.mobile && editForm.mobile !== profileData?.mobile) {
        updateData.mobile = editForm.mobile;
      }

      console.log('Saving profile with data:', updateData);

      // Alias and bio need separate endpoints or future backend support
      // For now, store in localStorage if needed
      if (editForm.alias) {
        localStorage.setItem('userAlias', editForm.alias);
        setStoredAlias(editForm.alias);
      }
      if (editForm.bio) {
        localStorage.setItem('userBio', editForm.bio);
        setStoredBio(editForm.bio);
      }

      // Only call API if there are fields to update
      if (Object.keys(updateData).length > 0) {
        const response = await axios.put(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Profile save response:', response.data);
      } else {
        console.log('No profile fields to update, only saved local data (alias, bio)');
      }
      setIsEditing(false);
      setHasUnsavedChanges(false);
      if (profileData) {
        setProfileData({
          ...profileData,
          name: editForm.display_name,
          alias: editForm.alias,
          bio: editForm.bio,
          email: editForm.email,
          mobile: editForm.mobile,
        });
      }
      alert('✅ Profile saved successfully!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Update data being sent:', updateData);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save profile';
      alert(`❌ ${errorMsg}`);
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

  const handleSearchRecipient = async (query: string) => {
    setRecipientSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/search-users?query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleGiftPoints = async () => {
    if (!selectedRecipient || !giftPoints) {
      alert('⚠️ Please select recipient and enter points');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/gift-points`,
        {
          recipientId: selectedRecipient,
          points: parseInt(giftPoints),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccessMessage(`🎉 ${response.data.message}`);
        setGiftPoints('');
        setSelectedRecipient('');
        setRecipientSearch('');
        setSearchResults([]);
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.error || 'Failed to send points'}`);
    }
  };

  const handleRedeemReward = (rewardId: string, points: number, name: string) => {
    // Check if user has enough points
    if ((walletData.errandifyPoints || 0) < points) {
      alert(`❌ Insufficient points! You need ${points} EP but only have ${walletData.errandifyPoints || 0} EP`);
      return;
    }
    // Show confirmation modal
    setPendingRedeem({ rewardId, points, name });
    setShowRedeemModal(true);
  };

  const handleConfirmRedeem = async () => {
    if (!pendingRedeem) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/redeem`,
        {
          rewardId: pendingRedeem.rewardId,
          points: pendingRedeem.points,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Show success modal
        setSuccessReward({ name: pendingRedeem.name, points: pendingRedeem.points });
        setShowSuccessModal(true);
        setShowRedeemModal(false);

        // Refresh wallet data after redeem
        try {
          const walletRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setWalletData(walletRes.data.data || {});
          console.log('Wallet refreshed after redeem:', walletRes.data.data);
        } catch (walletError) {
          console.error('Failed to refresh wallet:', walletError);
        }

        // Refresh point history after redeem
        try {
          const historyRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/point-history`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPointHistory(historyRes.data.data || []);
          console.log('Point history refreshed after redeem:', historyRes.data.data);
        } catch (historyError) {
          console.error('Failed to refresh point history:', historyError);
        }

        // Refresh my vouchers after redeem
        try {
          const vouchersRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/my-vouchers`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMyVouchers(vouchersRes.data.data || []);
          console.log('My vouchers refreshed after redeem:', vouchersRes.data.data);
        } catch (vouchersError) {
          console.error('Failed to refresh my vouchers:', vouchersError);
        }

        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setPendingRedeem(null);
          setSuccessReward(null);
        }, 3000);
      }
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.error || 'Failed to redeem reward'}`);
      setShowRedeemModal(false);
      setPendingRedeem(null);
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

        // Moderate image with AI
        try {
          const qwenApiKey = import.meta.env.VITE_QWEN_API_KEY;
          if (!qwenApiKey) {
            console.warn('Qwen API key not configured - accepting image without moderation');
            setProfileImage(base64Image);
            try {
              localStorage.setItem('userProfileImage', base64Image);
              console.log('Profile image saved to localStorage, size:', base64Image.length);
            } catch (e) {
              console.error('Failed to save profile image to localStorage:', e);
              alert('⚠️ Profile image too large to save. Storing in memory only.');
            }
            return;
          }

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
                        text: 'Is this image appropriate for a professional profile photo on a marketplace? Check for: nudity, violence, hate symbols, weapons, drugs, or anything offensive. Reply with only "APPROVED" if appropriate, or "REJECTED: [reason]" if not.',
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
            }
          );

          const result = response.data.output?.choices?.[0]?.message?.content;

          if (result && result.includes('APPROVED')) {
            setProfileImage(base64Image);
            try {
              localStorage.setItem('userProfileImage', base64Image);
              console.log('Profile image saved to localStorage, size:', base64Image.length);
            } catch (e) {
              console.error('Failed to save profile image to localStorage:', e);
              alert('⚠️ Profile image too large to save. Storing in memory only.');
            }
          } else {
            const reason = result?.replace('REJECTED: ', '') || 'Image does not meet community standards';
            alert(`❌ Photo rejected: ${reason}`);
          }
        } catch (error) {
          console.error('Image moderation error:', error);
          // Fallback: accept image if moderation fails
          setProfileImage(base64Image);
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
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-orange-50 to-pink-50 pb-24">
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
              📊 Dashboard
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
          </div>
        </div>

        {/* DASHBOARD - Always show first */}
        {activeSection === 'dashboard' && (
          <div className="space-y-1.5">
            {/* DASHBOARD CONTENT */}
            {/* PROFILE HERO CARD - HAPPY */}
            <div className="relative bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-lg shadow-lg p-3 border-l-4 border-yellow-300 overflow-hidden mb-1.5">
              <div className="flex items-center justify-between gap-3">
                {/* Profile Photo + Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-12 h-12 rounded-full object-cover border-4 border-white flex-shrink-0 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl flex-shrink-0 shadow-md">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white truncate drop-shadow">✨ {storedAlias || profileData.name} ✨</h2>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 bg-white bg-opacity-20 px-2 py-1 rounded-lg backdrop-blur">
                  <p className="text-2xl font-bold text-white drop-shadow">⭐ {ratings.averageRating.toFixed(1)}</p>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-2">
                  {badges.map((badge, idx) => (
                    <span key={idx} className="bg-white bg-opacity-30 text-white px-2 py-1 rounded-full text-sm font-bold shadow-md backdrop-blur">
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
                onClick={() => navigate('/category-preferences')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">🎯</p>
                <p className="font-bold text-xs text-gray-800">Categories</p>
              </button>
              <button
                onClick={() => navigate('/payout-settings')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">💳</p>
                <p className="font-bold text-xs text-gray-800">Payout</p>
              </button>
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
              <button
                onClick={() => navigate('/trusted-users')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">❤️</p>
                <p className="font-bold text-xs text-gray-800">Trusted</p>
              </button>
              <button
                onClick={() => navigate('/faq')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">❓</p>
                <p className="font-bold text-xs text-gray-800">FAQ</p>
              </button>
            </div>
          </div>
        )}

        {/* PROFILE SECTION */}
        {activeSection === 'profile' && (
          <div>
            {/* PROFILE SUBTABS */}
            <div className="flex gap-2 mb-2 border-b border-gray-200">
              <button
                onClick={() => setProfileTab('shared')}
                className={`pb-1.5 font-bold text-xs transition ${
                  profileTab === 'shared'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🌐 MyShared Info
              </button>
              <button
                onClick={() => setProfileTab('private')}
                className={`pb-1.5 font-bold text-xs transition ${
                  profileTab === 'private'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🔒 MyPrivate Info
              </button>
            </div>

            {/* SHARED INFO */}
            {profileTab === 'shared' && (
              <div className="space-y-2">
                {/* Profile Photo + Alias Header - HAPPY */}
                <div className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg shadow-md p-4 flex items-center gap-4">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white flex-shrink-0 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl flex-shrink-0 shadow-lg">👤</div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white drop-shadow">💎 {storedAlias || editForm.alias || profileData.name}</h2>
                    <p className="text-sm text-white mt-1 opacity-90">💭 {storedBio || editForm.bio || 'No bio yet'}</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-300 shadow-md p-3">
                  <h3 className="text-sm font-bold text-green-700 mb-2">👤 Personal Information</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Alias:</span>
                      <span className="font-semibold text-gray-900">{storedAlias || editForm.alias || profileData.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender:</span>
                      <span className="font-semibold text-gray-900">Not set</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">3</p>
                    <p className="text-xs text-gray-600 mt-1">❤️ Trusted User</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">{profileData.completedTasks || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">💪 Errand Completed</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">30</p>
                    <p className="text-xs text-gray-600 mt-1">📋 Errand Posted</p>
                  </div>
                </div>

                {/* Certified Badges */}
                <div className="bg-white rounded border border-gray-200 p-2">
                  <button className="flex items-center justify-between w-full mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">🎖️ Certified Badges</h3>
                    <span className="text-xs">▼</span>
                  </button>
                  <div className="space-y-1">
                    <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      <p className="text-xs">🏆 wellness & health coach</p>
                    </div>
                  </div>
                </div>

                {/* Award Badges */}
                <div className="bg-white rounded border border-gray-200 p-2">
                  <button className="flex items-center justify-between w-full mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">🎗️ Award Badges</h3>
                    <span className="text-xs">▼</span>
                  </button>
                  <div className="text-xs text-gray-600 text-center py-2">
                    No badges yet
                  </div>
                </div>
              </div>
            )}

            {/* PRIVATE INFO */}
            {profileTab === 'private' && (
              <div className="space-y-2">
                <div className="bg-green-50 border-l-4 border-green-500 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-green-900">🔒 PRIVATE</p>
                  <p className="text-xs text-green-800 mt-0.5">Only you see this</p>
                </div>

                {/* CHAS Card (Top Priority) */}
                {(() => {
                  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                  console.log('Stored user data:', storedUser);
                  console.log('CHAS Color:', storedUser?.chasCardColor);

                  if (storedUser?.chasCardColor && storedUser.chasCardColor !== 'none') {
                    const bgColor = storedUser.chasCardColor === 'blue' ? 'bg-blue-100' : 'bg-green-100';
                    const textColor = storedUser.chasCardColor === 'blue' ? 'text-blue-700' : 'text-green-700';
                    return (
                      <div className={`rounded shadow p-3 ${bgColor}`}>
                        <p className="text-xs font-bold text-gray-600 mb-1">CHAS Card</p>
                        <p className={`text-2xl font-bold ${textColor}`}>
                          {storedUser.chasCardColor.toUpperCase()}
                        </p>
                      </div>
                    );
                  }

                  // Fallback - show that CHAS data is missing
                  return (
                    <div className="rounded shadow p-3 bg-gray-100">
                      <p className="text-xs font-bold text-gray-600">CHAS Card</p>
                      <p className="text-sm text-gray-500">No CHAS data available</p>
                    </div>
                  );
                })()}

                {/* Edit Form */}
                <div className="bg-white rounded shadow p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">📝 Edit Profile</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-errandify-orange font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      {hasUnsavedChanges && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded p-2">
                          <p className="text-xs text-yellow-900 font-semibold">
                            ⚠️ You have unsaved changes. Click "Save All Changes" at the end to save.
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Name <span className="text-gray-400">(from SingPass - cannot change)</span></label>
                        <input
                          type="text"
                          value={editForm.display_name}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <p className="text-gray-600 font-semibold">Name</p>
                        <p className="text-gray-800">{profileData.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold">Email</p>
                        <p className="text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold">Mobile</p>
                        <p className="text-gray-800">{profileData.mobile || 'Not set'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Photo Upload */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">📸 Profile Photo</h3>
                  <div className="flex gap-3 items-start">
                    {profileImage && (
                      <img src={profileImage} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-errandify-orange" />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="w-full text-xs mb-1"
                      />
                      <p className="text-xs text-gray-600">JPG, PNG or WebP. Max 5MB. Will auto-adjust.</p>
                    </div>
                  </div>
                </div>

                {/* Alias Setup */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">🎭 Set Alias</h3>
                  <input
                    type="text"
                    value={editForm.alias || ''}
                    onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                    placeholder="Enter your alias (instead of name)"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <p className="text-xs text-gray-600 mt-1">This is how others will see you in the app</p>
                </div>

                {/* Bio */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">✍️ Bio</h3>
                  <textarea
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a short bio about yourself"
                    maxLength={200}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 mt-1 mb-2">{editForm.bio?.length || 0}/200</p>
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
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-1.5">📜 Certificates ({certificates.length}/10)</h3>
                  {certificates.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {certificates.map((cert, idx) => (
                        <div key={cert.id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded text-xs hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{idx + 1}. {cert.name}</p>
                            {cert.fileName && <p className="text-gray-500 text-xs">{cert.fileName}</p>}
                          </div>
                          <div className="flex gap-1">
                            {cert.fileData && (
                              <a
                                href={cert.fileData}
                                download={cert.fileName || `certificate-${idx + 1}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                📥
                              </a>
                            )}
                            <button
                              onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 font-semibold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {certificates.length < 10 && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={certificateTitle}
                        onChange={(e) => setCertificateTitle(e.target.value)}
                        placeholder="Certificate title"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setCertificateFile(file);
                          console.log('File selected:', file?.name);
                        }}
                        className="w-full text-xs"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      {certificateFile && (
                        <p className="text-xs text-green-600 font-semibold">✓ File selected: {certificateFile.name}</p>
                      )}
                      <button
                        onClick={async () => {
                          if (!certificateTitle) {
                            alert('Please enter a certificate title');
                            return;
                          }
                          if (!certificateFile) {
                            alert('Please select a certificate file');
                            return;
                          }

                          // Moderate certificate title
                          const titleResult = await moderateText(certificateTitle);
                          if (!titleResult.approved) {
                            alert('❌ Certificate title contains inappropriate content. Please revise.');
                            return;
                          }

                          // File size check (10MB max for certificates)
                          if (certificateFile.size > 10 * 1024 * 1024) {
                            alert('Certificate file exceeds 10MB limit');
                            return;
                          }

                          // Read file as data URL for preview
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const fileData = e.target?.result as string;
                            setCertificates([...certificates, {
                              id: Date.now().toString(),
                              name: certificateTitle,
                              fileData,
                              fileName: certificateFile.name
                            }]);
                            setCertificateTitle('');
                            setCertificateFile(null);
                            alert('✅ Certificate added successfully!');
                          };
                          reader.readAsDataURL(certificateFile);
                        }}
                        disabled={!certificateTitle || !certificateFile}
                        className="w-full bg-errandify-orange text-white py-1.5 rounded font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 disabled:hover:bg-errandify-orange"
                      >
                        {certificateTitle && certificateFile ? '✅ Add Certificate' : '⊙ Add Certificate'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Save All Changes Button - At The End */}
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-errandify-orange text-white py-2.5 rounded font-bold text-xs hover:bg-orange-600 disabled:opacity-50 transition mt-2"
                >
                  {saving ? '⏳ Saving All Changes...' : '💾 Save All Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* MYPOCKET SECTION */}
        {activeSection === 'pocket' && (
          <div className="space-y-2">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-gradient-to-r from-green-400 to-green-500 text-white p-2 rounded-lg text-center font-bold text-sm shadow-lg">
                {successMessage}
              </div>
            )}

            {/* Balance Card - Happy Celebration */}
            <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white rounded-lg p-3 shadow-lg">
              <p className="text-xs opacity-90">✨ Your Balance ✨</p>
              <h2 className="text-4xl font-bold mb-1">💰 $450.50</h2>
              <p className="text-xs font-semibold">🎉 Great work! You've earned $1,250 so far!</p>
              <div className="flex gap-2 text-xs">
                <div className="bg-gradient-to-br from-green-300 to-green-500 text-white rounded-lg px-3 py-2 group relative cursor-help shadow-md">
                  <p className="font-bold">💚 Earned</p>
                  <p className="text-lg font-bold">$1,250.00</p>
                  <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-0 whitespace-nowrap z-10">
                    Total from completed errands
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-300 to-blue-500 text-white rounded-lg px-3 py-2 group relative cursor-help shadow-md">
                  <p className="font-bold">💙 Spent</p>
                  <p className="text-lg font-bold">$320.50</p>
                  <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-0 whitespace-nowrap z-10">
                    Total paid for posted errands
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-300 to-purple-500 text-white rounded-lg px-3 py-2 group relative cursor-help shadow-md">
                  <p className="font-bold">💜 Pending</p>
                  <p className="text-lg font-bold">$150.00</p>
                  <div className="invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-12 left-0 whitespace-nowrap z-10">
                    Waiting 48h after completion
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 mb-2">
              <div className="flex text-xs font-semibold border-b border-gray-100">
                <button
                  onClick={() => setPocketTab('txns')}
                  className={`flex-1 p-1.5 text-center transition whitespace-nowrap text-xs ${pocketTab === 'txns' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
                >
                  📋 Transactions
                </button>
                <button
                  onClick={() => setPocketTab('history')}
                  className={`flex-1 p-1.5 text-center transition border-l border-gray-100 whitespace-nowrap text-xs ${pocketTab === 'history' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
                >
                  ⭐ Errandify Points (EP)
                </button>
                <button
                  onClick={() => setPocketTab('payout')}
                  className={`flex-1 p-1.5 text-center transition border-l border-gray-100 whitespace-nowrap text-xs ${pocketTab === 'payout' ? 'bg-errandify-orange text-white' : 'hover:bg-gray-50'}`}
                >
                  💳 Payout
                </button>
              </div>

              {/* Tab Content */}
              <div className="text-xs">
                {/* Transactions Tab */}
                {pocketTab === 'txns' && (
                  <div className="p-2 space-y-2">
                    {/* Transactions Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-2 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">📋✨ Recent Transactions ✨</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Completed Errand (#5): Clean apartment</p>
                        <p className="text-gray-500">Today 10:28 AM</p>
                      </div>
                      <p className="font-bold text-green-600">+$80</p>
                    </div>
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Posted Errand (#8): Home repairs</p>
                        <p className="text-gray-500">Yesterday 10:25 PM</p>
                      </div>
                      <p className="font-bold text-red-600">-$120</p>
                    </div>
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Referral: @SunnyLove joined</p>
                        <p className="text-gray-500">2 days ago</p>
                      </div>
                      <p className="font-bold text-green-600">+$50</p>
                    </div>
                    </div>
                  </div>
                )}

                {/* Points Tab */}
                {pocketTab === 'history' && (
                  <div className="p-2 space-y-2">
                    {/* Points Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-2 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">⭐✨ Errandify Points History ✨⭐</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Completed Errand</p>
                        <p className="text-gray-500">2026-06-20</p>
                      </div>
                      <p className="font-bold text-green-600">+10 EP</p>
                    </div>
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Referred Friend</p>
                        <p className="text-gray-500">@SunnyLove - 2026-06-15</p>
                      </div>
                      <p className="font-bold text-green-600">+50 EP</p>
                    </div>
                    <div className="p-2 flex justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">Redeemed Discount</p>
                        <p className="text-gray-500">2026-06-10</p>
                      </div>
                      <p className="font-bold text-red-600">-50 EP</p>
                    </div>
                    </div>
                  </div>
                )}

                {/* Payout Tab */}
                {pocketTab === 'payout' && (
                  <div className="p-2 space-y-2">
                    {/* Payout Transactions */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">📊✨ Payout Transactions ✨</h3>
                    </div>
                    <div className="divide-y divide-gray-100 text-xs mb-2">
                      <div className="p-2 flex justify-between hover:bg-gray-50">
                        <div>
                          <p className="font-bold text-gray-900">Errand Payout</p>
                          <p className="text-gray-500">17-06-2026 10:28 PM</p>
                        </div>
                        <p className="font-bold text-green-600">+$0.8 SGD</p>
                      </div>
                      <div className="p-2 flex justify-between hover:bg-gray-50">
                        <div>
                          <p className="font-bold text-gray-900">Errand Payment</p>
                          <p className="text-gray-500">15-06-2026 10:25 PM</p>
                        </div>
                        <p className="font-bold text-red-600">-$12.16 SGD</p>
                      </div>
                    </div>

                    {/* Bank Details Section */}
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <button
                        onClick={() => setIsEditingBankDetails(!isEditingBankDetails)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition"
                      >
                        <h3 className="text-xs font-bold text-gray-800">🏦 Bank Account Details</h3>
                        <span className="text-lg">{isEditingBankDetails ? '▼' : '▶'}</span>
                      </button>

                      {!isEditingBankDetails && (
                        <div className="border-t border-gray-200 p-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bank</span>
                            <span className="font-bold">{bankDetails.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Holder</span>
                            <span className="font-bold">{bankDetails.accountHolder}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Account</span>
                            <span className="font-bold">{bankDetails.accountNumber}</span>
                          </div>
                          <button
                            onClick={() => setIsEditingBankDetails(true)}
                            className="w-full mt-1 text-errandify-orange font-bold text-xs hover:underline"
                          >
                            ✏️ Edit Details
                          </button>
                        </div>
                      )}

                    {isEditingBankDetails && (
                      <div className="border border-gray-200 p-2 space-y-1.5 rounded">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-0.5">Bank Name</label>
                          <input
                            type="text"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-0.5">Account Holder</label>
                          <input
                            type="text"
                            value={bankDetails.accountHolder}
                            onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})}
                            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-0.5">Account Number</label>
                          <input
                            type="text"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-2 my-2 text-xs text-blue-900">
                          <p className="font-bold mb-1">ℹ️ Important</p>
                          <p>Bank account changes take effect within 24 hours. Earnings in transit will be sent to the previously added account.</p>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => {
                              setIsEditingBankDetails(false);
                              setSuccessMessage('🎉 Bank details saved!');
                              setTimeout(() => setSuccessMessage(''), 2000);
                            }}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-0.5 rounded text-xs font-bold hover:from-green-600 hover:to-green-700 shadow-md"
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={() => setIsEditingBankDetails(false)}
                            className="flex-1 border border-gray-300 text-gray-700 py-0.5 rounded text-xs font-bold hover:bg-gray-50"
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MYREWARDSPACE SECTION */}
        {activeSection === 'rewards' && (
          <div className="space-y-2">
            {/* Errandify Points Card - HAPPY */}
            <div className="bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-400 text-white rounded-lg shadow-lg p-4">
              <p className="text-sm opacity-90 mb-1">✨ Available Errandify Points ✨</p>
              <p className="text-4xl font-bold mb-2">🌟 {walletData.errandifyPoints || 0} EP 🌟</p>
              {walletData.errandifyPoints && walletData.errandifyPoints < 100 && (
                <p className="text-xs bg-orange-500 bg-opacity-60 rounded-lg p-2 backdrop-blur">
                  ⏰ Expiring Soon: {walletData.errandifyPoints} pts expire 30/06/2027 - Use them now!
                </p>
              )}
            </div>

            {/* Sub-tabs for Rewards */}
            <div className="bg-white rounded-lg border-2 border-purple-200 shadow-lg overflow-hidden">
              <div className="flex text-xs font-semibold border-b border-purple-100 overflow-x-auto">
                <button
                  onClick={() => setRewardTab('overview')}
                  className={`flex-1 p-2 text-center transition whitespace-nowrap ${rewardTab === 'overview' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'hover:bg-purple-50'}`}
                >
                  💎 Overview
                </button>
                <button
                  onClick={() => setRewardTab('pointHistory')}
                  className={`flex-1 p-2 text-center transition border-l border-purple-100 whitespace-nowrap ${rewardTab === 'pointHistory' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'hover:bg-purple-50'}`}
                >
                  📜 Point History
                </button>
                <button
                  onClick={() => setRewardTab('gift')}
                  className={`flex-1 p-2 text-center transition border-l border-purple-100 whitespace-nowrap ${rewardTab === 'gift' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'hover:bg-purple-50'}`}
                >
                  🎀 Gift
                </button>
                <button
                  onClick={() => setRewardTab('myVouchers')}
                  className={`flex-1 p-2 text-center transition border-l border-purple-100 whitespace-nowrap ${rewardTab === 'myVouchers' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'hover:bg-purple-50'}`}
                >
                  💳 My Vouchers
                </button>
              </div>

              {/* TAB CONTENT */}
              <div className="p-3 text-xs">
                {/* OVERVIEW TAB - Browse & Redeem Rewards */}
                {rewardTab === 'overview' && (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">🎁✨ MyRewards - Redeem Your Treasures ✨🎁</h3>
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-1 mb-2 overflow-x-auto">
                      {['All', 'Discount', 'Voucher', 'Services'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedVoucherCategory(cat.toLowerCase())}
                          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                            selectedVoucherCategory === cat.toLowerCase()
                              ? 'bg-purple-500 text-white'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Rewards List - Dynamic from Database */}
                    <div className="divide-y divide-purple-100 space-y-2">
                      {rewards.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p>No rewards available</p>
                        </div>
                      ) : (
                        rewards.map((reward: any) => {
                          const userPoints = walletData.errandifyPoints || 0;
                          const canRedeem = userPoints >= reward.cost_points;
                          const pointsNeeded = Math.max(0, reward.cost_points - userPoints);

                          return (
                            <div
                              key={reward.id}
                              className={`p-3 transition rounded-lg flex justify-between items-center ${
                                canRedeem
                                  ? 'bg-purple-50 hover:bg-purple-100'
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div>
                                <p className="font-bold text-gray-900">{reward.icon} {reward.name}</p>
                                {canRedeem ? (
                                  <p className="text-purple-600 font-bold">⭐ {reward.cost_points} EP ✅ You can redeem!</p>
                                ) : (
                                  <p className="text-gray-600 font-bold">⭐ {reward.cost_points} EP {pointsNeeded > 0 && `(Need ${pointsNeeded} more!)`}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleRedeemReward(`reward-${reward.id}`, reward.cost_points, reward.name)}
                                disabled={!canRedeem}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transform transition ${
                                  canRedeem
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md hover:scale-105'
                                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                }`}
                              >
                                {canRedeem ? '✅ Redeem' : '🔒 Need More'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* POINT HISTORY TAB */}
                {rewardTab === 'pointHistory' && (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-3 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">📜✨ Point History ✨</h3>
                    </div>
                    <div className="divide-y divide-amber-100 space-y-2">
                      {pointHistory.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p>No transaction history yet</p>
                        </div>
                      ) : (
                        pointHistory.map((transaction: any, idx: number) => {
                          const isDebit = transaction.type === 'redemption' || transaction.type === 'gift' || (transaction.points && transaction.points < 0);
                          const points = Math.abs(transaction.points || 0);
                          const date = new Date(transaction.created_at).toLocaleDateString('en-SG', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          let icon = '📊';
                          let label = transaction.description || transaction.type;

                          if (transaction.type === 'redemption') {
                            icon = '🎁';
                            label = transaction.description || 'Voucher redeemed';
                          } else if (transaction.type === 'gift') {
                            icon = '🎀';
                            label = `Gift to friend`;
                          } else if (transaction.type === 'earned') {
                            icon = '✅';
                            label = `Errand completed`;
                          } else if (transaction.type === 'referral') {
                            icon = '👥';
                            label = `Referral bonus`;
                          }

                          return (
                            <div key={idx} className={`p-3 ${isDebit ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'} transition rounded-lg flex justify-between`}>
                              <div>
                                <p className="font-bold text-gray-900">{icon} {label}</p>
                                <p className="text-gray-500 text-xs">{date}</p>
                              </div>
                              <p className={`font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                                {isDebit ? '-' : '+'}{points} EP
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* GIFT TAB */}
                {rewardTab === 'gift' && (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-3 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">🎀✨ Send Points as Gift ✨</h3>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-lg space-y-2">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Points to Send (Max 25)</label>
                        <input
                          type="number"
                          max="25"
                          min="1"
                          value={giftPoints}
                          onChange={(e) => setGiftPoints(e.target.value)}
                          className="w-full px-2 py-1.5 border-2 border-rose-300 rounded text-sm focus:border-rose-500 focus:outline-none"
                          placeholder="Enter amount"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Search Recipient by Name or ID</label>
                        <input
                          type="text"
                          value={recipientSearch}
                          onChange={(e) => handleSearchRecipient(e.target.value)}
                          className="w-full px-2 py-1.5 border-2 border-rose-300 rounded text-sm focus:border-rose-500 focus:outline-none"
                          placeholder="Type to search..."
                        />
                        {searching && <p className="text-xs text-gray-500 mt-1">🔍 Searching...</p>}
                        {searchResults.length > 0 && (
                          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto bg-white border border-rose-200 rounded p-2">
                            {searchResults.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  setSelectedRecipient(user.id);
                                  setRecipientSearch(user.displayName);
                                  setSearchResults([]);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs font-bold transition ${
                                  selectedRecipient === user.id
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                👤 {user.displayName} ({user.userId})
                              </button>
                            ))}
                          </div>
                        )}
                        {recipientSearch && searchResults.length === 0 && !searching && (
                          <p className="text-xs text-gray-500 mt-1">No users found</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-rose-200">
                        <button
                          onClick={handleGiftPoints}
                          className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-2 rounded-lg font-bold text-sm hover:shadow-md transform hover:scale-105 transition disabled:opacity-50"
                          disabled={!selectedRecipient || !giftPoints}
                        >
                          🎀 Send Gift
                        </button>
                        <button
                          onClick={() => {
                            setGiftPoints('');
                            setSelectedRecipient('');
                            setRecipientSearch('');
                            setSearchResults([]);
                          }}
                          className="flex-1 border-2 border-rose-300 text-rose-600 py-2 rounded-lg font-bold text-sm hover:bg-rose-50 transition"
                        >
                          ✕ Clear
                        </button>
                      </div>
                      {selectedRecipient && <p className="text-xs text-gray-600 text-center">✅ Recipient selected: {recipientSearch}</p>}
                    </div>
                  </div>
                )}

                {/* MY VOUCHERS TAB */}
                {rewardTab === 'myVouchers' && (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-3 rounded-lg shadow-md">
                      <h3 className="text-sm font-bold">💳✨ My Redeemed Vouchers ({myVouchers.length}) ✨</h3>
                    </div>
                    {myVouchers.length === 0 ? (
                      <div className="text-center py-8 bg-blue-50 rounded-lg">
                        <p className="text-gray-600 font-bold">No vouchers redeemed yet</p>
                        <p className="text-xs text-gray-500 mt-2">Redeem rewards from the Overview tab to see them here!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myVouchers.map((voucher: any, idx: number) => {
                          const date = new Date(voucher.created_at).toLocaleDateString('en-SG', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div key={idx} className="p-3 bg-blue-50 hover:bg-blue-100 transition rounded-lg border-l-4 border-blue-500">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-gray-900">💳 {voucher.voucherName || voucher.description || 'Voucher'}</p>
                                  <p className="text-xs text-gray-600 mt-1">{date}</p>
                                  <p className="text-xs text-blue-600 font-semibold mt-1">📦 Status: Ready to Use</p>
                                </div>
                                <p className="font-bold text-blue-600 text-sm">Cost: {voucher.points} EP</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BLOCKED SECTION */}
        {activeSection === 'blocked' && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-red-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-3">
              <h3 className="text-sm font-bold">🚫 Blocked Users - Your Safe Space</h3>
            </div>
            <div className="text-center text-gray-600 py-8 px-4">
              <p className="mb-2 text-lg">✨ You're All Clear! ✨</p>
              <p className="text-sm font-semibold">No blocked users yet</p>
              <p className="text-xs mt-2 text-gray-500">Users you block won't be able to contact you or see your profile</p>
            </div>
          </div>
        )}

        {/* NOTIFICATION PREFERENCES SECTION */}
        {activeSection === 'notify' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-4 space-y-3 border-2 border-blue-200">
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">🔔✨ Notification Preferences - Stay Connected! ✨🔔</h2>

              {/* Critical Section */}
              <div className="border-2 border-red-300 rounded-lg overflow-hidden shadow-md">
                <div className="px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white">
                  <h3 className="text-sm font-bold">🔴 Critical (Always On) - Most Important!</h3>
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

        {/* BOTTOM QUICK LINKS - ONLY SHOW ON DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex gap-1 overflow-x-auto pb-2 flex-wrap">
              {/* Quick links section if needed in future */}
            </div>
          </div>
        )}

        {/* REDEEM CONFIRMATION MODAL */}
        {showRedeemModal && pendingRedeem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-yellow-50 to-orange-50 rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
              {/* Loading spinner */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-errandify-brown">Almost Yours...</h2>
              <p className="text-center text-lg font-bold text-gray-700">{pendingRedeem.name}</p>

              {/* Points breakdown */}
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Points</span>
                  <span className="font-bold text-gray-900">{walletData.errandifyPoints || 0} EP</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Voucher Claim</span>
                  <span className="font-bold text-red-600">-{pendingRedeem.points} EP</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-800">Balance</span>
                  <span className="text-red-600">-{(walletData.errandifyPoints || 0) - pendingRedeem.points} EP</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmRedeem}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition"
                >
                  ✅ Confirm & Redeem
                </button>
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setPendingRedeem(null);
                  }}
                  className="flex-1 border-2 border-orange-300 text-orange-600 py-3 rounded-lg font-bold hover:bg-orange-50 transition"
                >
                  ✕ Not Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL */}
        {showSuccessModal && successReward && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gradient-to-b from-green-50 to-emerald-50 rounded-lg shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-bounce-in">
              {/* Celebration emoji */}
              <div className="flex justify-center gap-2 text-5xl mb-4">
                <span className="animate-bounce" style={{ animationDelay: '0s' }}>🎉</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎁</span>
              </div>

              {/* Success message */}
              <h2 className="text-3xl font-bold text-green-700">🎊 Congratulations! 🎊</h2>
              <p className="text-lg font-bold text-gray-800">Your reward is ready!</p>

              {/* Reward details */}
              <div className="bg-white rounded-lg p-4 border-2 border-green-300 space-y-2">
                <p className="text-sm text-gray-600">You redeemed</p>
                <p className="text-2xl font-bold text-gray-900">{successReward.name}</p>
                <p className="text-sm text-green-700 font-semibold">-{successReward.points} EP</p>
              </div>

              {/* Happy message */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-3 border-2 border-yellow-300">
                <p className="font-bold text-orange-900">🌟 Thank you for choosing Errandify!</p>
                <p className="text-sm text-orange-800 mt-1">Your voucher will be emailed to you shortly. Happy earning! 💪</p>
              </div>

              {/* Auto-close hint */}
              <p className="text-xs text-gray-500">This modal will close in 3 seconds...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
