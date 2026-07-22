import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SuccessModal from '../components/SuccessModal';
import ProfilePlaque from '../components/ProfilePlaque';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface UserProfile {
  id: number;
  userId?: string;
  formattedUserId?: string;
  name: string;
  mobile: string;
  gender?: string;
  role: 'asker' | 'doer';
  categories: string[];
  chasCardColor?: string;
  bio?: string;
  completedTasks?: number;
  totalEarnings?: number;
  profilePhoto?: string;
  certificates?: Array<{ title: string; url?: string }>;
  averageRating?: number;
  totalRatings?: number;
  criminalConviction?: boolean;
}

interface Rating {
  score: number;
  comment: string;
  createdAt: string;
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shared' | 'private'>('shared');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    mobile: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [addingCertificate, setAddingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState('');

  const validatePhoto = (file: File): boolean => {
    setPhotoError('');

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size must be less than 5MB');
      return false;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Only JPG, PNG, and WebP formats are allowed');
      return false;
    }

    // Check image dimensions (basic validation)
    const img = new Image();
    img.onload = () => {
      if (img.width < 200 || img.height < 200) {
        setPhotoError('Image must be at least 200x200 pixels');
      }
    };
    img.src = URL.createObjectURL(file);

    return true;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validatePhoto(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoPreview) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Convert data URL to blob
      const response = await fetch(photoPreview);
      const blob = await response.blob();
      formData.append('profilePhoto', blob, 'profile-photo.jpg');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile-photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Update local profile
      setProfile(prev => prev ? { ...prev, profilePhoto: photoPreview } : null);
      setPhotoPreview(null);
      setSuccessMessage('Your smile is ready to shine! 📸');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setPhotoError('Failed to upload photo. Please try again.');
    }
  };

  const handleAddCertificate = async () => {
    setCertificateError('');
    if (!certificateTitle.trim()) {
      setCertificateError('Please enter a certificate title');
      return;
    }
    if (!certificateFile) {
      setCertificateError('Please select a file');
      return;
    }
    if (certificateFile.size > 10 * 1024 * 1024) {
      setCertificateError('File size must be less than 10MB');
      return;
    }
    setAddingCertificate(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', certificateTitle);
      formData.append('certificate', certificateFile);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/certificates`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setProfile(prev => prev ? {
        ...prev,
        certificates: response.data.data.certificates
      } : null);
      setCertificateTitle('');
      setCertificateFile(null);
      setSuccessMessage('Certificate added successfully! 🎓');
      setShowSuccessModal(true);
    } catch (err: any) {
      setCertificateError(err.response?.data?.error || 'Failed to add certificate');
    } finally {
      setAddingCertificate(false);
    }
  };

  const handleDeleteCertificate = async (idx: number) => {
    try {
      const token = localStorage.getItem('token');
      const certTitle = profile?.certificates?.[idx]?.title;
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/certificates/${encodeURIComponent(certTitle || '')}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setProfile(prev => prev ? {
        ...prev,
        certificates: prev.certificates?.filter((_, i) => i !== idx) || []
      } : null);
      setSuccessMessage('Certificate removed! 🗑️');
      setShowSuccessModal(true);
    } catch (err: any) {
      setCertificateError(err.response?.data?.error || 'Failed to delete certificate');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user?.id) {
          setError('User not found');
          setLoading(false);
          return;
        }

        // Fetch profile
        const profileRes = await axios.get(
          `${import.meta.env.VITE_API_URL || window.location.origin}/api/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProfile(profileRes.data.data);
        setEditForm({
          display_name: profileRes.data.data.name || '',
          mobile: profileRes.data.data.mobile || '',
          bio: profileRes.data.data.bio || '',
        });

        // Fetch ratings
        try {
          const ratingsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`
          );
          setRatings(ratingsRes.data.data);
        } catch (ratingsErr) {
          console.warn('Could not fetch ratings:', ratingsErr);
          // Don't block page load if ratings fail - use defaults
        }
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const updateData: any = {
        display_name: editForm.display_name,
        mobile: editForm.mobile,
        bio: editForm.bio,
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/users/profile`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile({
        ...profile,
        ...response.data.data,
      });
      setIsEditing(false);
      setShowSuccessModal(true);
      setSuccessMessage('Your profile shines brighter now! ✨');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-lg">
            {star <= Math.round(rating) ? '⭐' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center">Loading profile...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!profile) return <div className="p-6 text-center">Profile not found</div>;

  const getProfileCompleteness = () => {
    let complete = 0;
    if (profile.name) complete++;
    if (profile.mobile) complete++;
    if (profile.bio) complete++;
    if (profile.categories.length > 0) complete++;
    return Math.round((complete / 4) * 100);
  };

  const getBadges = () => {
    const badges = [];
    if (ratings.averageRating >= 4.8) badges.push({ icon: '⭐', label: 'Trusted Expert', color: 'bg-blue-50 border-blue-200' });
    if (ratings.reviewCount >= 50) badges.push({ icon: '🏆', label: 'Top Performer', color: 'bg-yellow-50 border-yellow-200' });
    if (ratings.averageRating === 5 && ratings.reviewCount >= 10) badges.push({ icon: '✨', label: 'Perfect Rating', color: 'bg-purple-50 border-purple-200' });
    if (profile.completedTasks && profile.completedTasks >= 100) badges.push({ icon: '🚀', label: 'Century Club', color: 'bg-green-50 border-green-200' });
    return badges;
  };

  const completeness = getProfileCompleteness();
  const badges = getBadges();

  return (
    <AdminThemeWrapper title="👤 My Profile" showBackButton onBack={() => navigate(-1)}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-4 text-sm hover:underline"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-errandify-brown mb-6">My Profile</h1>

        {/* TAB NAVIGATION */}
        <div className="flex gap-6 mb-6 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('shared')}
            className={`pb-3 font-bold text-sm transition ${
              activeTab === 'shared'
                ? 'border-b-4 border-errandify-orange text-errandify-orange'
                : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
            }`}
          >
            🌐 MyShared Info
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`pb-3 font-bold text-sm transition ${
              activeTab === 'private'
                ? 'border-b-4 border-errandify-orange text-errandify-orange'
                : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
            }`}
          >
            🔒 MyPrivate Info
          </button>
        </div>

        {/* ===== SHARED INFO TAB (Public) ===== */}
        {activeTab === 'shared' && (
          <div>
            {/* PREVIEW BANNER - Clear messaging */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-2xl p-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl animate-bounce">👁️</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">This is YOUR PUBLIC PROFILE</p>
                    <p className="text-xs text-blue-800 mt-1">✨ This is exactly what other users see! Make sure everything looks amazing!</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('private')}
                  className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition whitespace-nowrap"
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>

            {/* Beautiful Profile Plaque */}
            {profile && (
              <>
                {/* Debug info */}
                <div className="bg-blue-100 border border-blue-300 rounded p-3 mb-4 text-xs">
                  <p>Profile loaded: {profile.name} | Gender: {profile.gender} | Bio: {profile.bio ? 'YES' : 'NO'} | Certs: {profile.certificates?.length || 0}</p>
                </div>

                <div className="mb-8">
                  <ProfilePlaque
                    name={profile.name}
                    gender={profile.gender}
                    bio={profile.bio}
                    certificates={profile.certificates}
                    profileImage={profile.profilePhoto}
                    role={profile.role}
                  />
                </div>
              </>
            )}

            {/* Profile Header Card - What Public Sees */}
            <div className="bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex gap-4 mb-4">
            <div className="text-6xl drop-shadow-lg">👤</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-orange-50 text-sm mb-2">{profile.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>

              {/* Badges Row */}
              {badges.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {badges.map((badge, idx) => (
                    <div key={idx} className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full backdrop-blur">
                      {badge.icon} {badge.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">Profile Completeness</span>
              <span className="text-sm font-bold">{completeness}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
            <p className="text-xs text-gray-600 font-semibold">⭐ Rating</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{ratings.reviewCount}</p>
            <p className="text-xs text-gray-600 font-semibold">👥 Reviews</p>
          </div>
          {profile.gender && (
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl">{profile.gender === 'M' ? '👨' : '👩'}</p>
              <p className="text-xs text-gray-600 font-semibold">{profile.gender === 'M' ? 'Male' : 'Female'}</p>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{profile.completedTasks || 0}</p>
            <p className="text-xs text-gray-600 font-semibold">✅ Errands</p>
          </div>
        </div>

        {/* Profile Card - Enhanced */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Formatted User ID */}
          {profile.formattedUserId && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-semibold">Your User ID</p>
                <code className="text-sm font-mono font-bold text-errandify-brown">{profile.formattedUserId}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.formattedUserId || '');
                  setSuccessMessage('Your special code is ready to share! 🎁');
                  setShowSuccessModal(true);
                }}
                className="text-xs text-errandify-orange hover:text-orange-600 font-semibold transition px-2 py-1 hover:bg-orange-50 rounded"
              >
                Copy
              </button>
            </div>
          )}

          {/* Edit Profile Form or View */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell others about yourself"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                <p className="text-gray-800">{profile.mobile || 'Not provided'}</p>
              </div>
              {profile.categories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {profile.categories.map((cat) => (
                      <span key={cat} className="bg-orange-100 text-errandify-orange text-xs px-2 py-1 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 bg-errandify-orange text-white py-2 rounded font-semibold hover:bg-opacity-90 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Ratings Section */}
        {ratings.reviewCount > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-errandify-brown mb-4">Reviews ({ratings.reviewCount})</h3>

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</span>
                <div>
                  {renderStars(ratings.averageRating)}
                  <p className="text-xs text-gray-600 mt-1">Based on {ratings.reviewCount} review{ratings.reviewCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {ratings.reviews.map((review, idx) => (
                <div key={idx} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.score)}
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ratings.reviewCount === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-3">No reviews yet. Complete some errands to get reviews!</p>
            <button
              onClick={() => navigate(profile.role === 'asker' ? '/create-errand' : '/browse')}
              className="bg-errandify-orange text-white px-4 py-2 rounded font-semibold text-sm hover:bg-opacity-90"
            >
              {profile.role === 'asker' ? 'Post an Errand' : 'Browse Errands'}
            </button>
          </div>
        )}

            {/* Engagement Sections - SHARED */}
            <div className="space-y-6">
              {/* Top Skills Section */}
          {profile.categories.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-errandify-brown mb-4">🎯 Your Skills</h3>
              <div className="grid grid-cols-2 gap-2">
                {profile.categories.slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                    <p className="text-sm font-bold text-errandify-brown">{cat}</p>
                    <p className="text-xs text-gray-600">Ready to help</p>
                  </div>
                ))}
              </div>
              {profile.categories.length > 4 && (
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full mt-3 text-sm text-errandify-orange font-semibold hover:underline"
                >
                  View all {profile.categories.length} skills →
                </button>
              )}
            </div>
          )}

          {/* Certificates Section - PUBLIC */}
          {profile.certificates && profile.certificates.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-errandify-brown mb-4">🎓 Qualifications</h3>
              <div className="space-y-2">
                {profile.certificates.map((cert, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-900">{cert.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-2xl p-6">
            <div className="flex gap-4">
              <span className="text-4xl animate-bounce">🚀</span>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-1 text-lg">
                  {completeness === 100 ? '🎉 Profile Complete!' : '⭐ Complete Your Profile'}
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  {completeness === 100
                    ? '✨ Your profile looks amazing! Keep building your reputation with quality work.'
                    : `✨ Add more details to attract more ${profile.role === 'asker' ? 'doers' : 'askers'}!`}
                </p>
                {completeness < 100 && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition"
                  >
                    Complete Profile ({completeness}%)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Share Profile CTA */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-6">
            <div className="flex gap-4">
              <span className="text-4xl animate-bounce">📱</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 mb-1 text-lg">📢 Share Your Profile</h3>
                <p className="text-sm text-green-800 mb-3">
                  ✨ {profile.role === 'asker'
                    ? 'Spread the word and earn referral points!'
                    : 'Let friends know you\'re available for work.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/referral')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition flex-1"
                  >
                    🎁 Referral
                  </button>
                  <button
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${profile.id}`;
                      navigator.clipboard.writeText(profileUrl);
                      setSuccessMessage('Your profile link is ready to share! 🌟');
                      setShowSuccessModal(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition flex-1"
                  >
                    🔗 Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="font-bold text-gray-800 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">Check our FAQ or contact support</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/faq')}
                className="flex-1 border border-errandify-orange text-errandify-orange py-2 rounded font-semibold text-sm hover:bg-orange-50 transition"
              >
                📖 FAQ
              </button>
              <a
                href="mailto:togather@errandify.ai"
                className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition text-center"
              >
                📧 Support
              </a>
            </div>

            {/* CATEGORIES SECTION */}
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-300 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-purple-900">🏷️ Categories I Work In</h3>
                <button
                  onClick={() => setActiveTab('private')}
                  className="text-xs bg-purple-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-purple-600 transition"
                >
                  ✏️ Edit
                </button>
              </div>
              {profile.categories && profile.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.categories.map((category) => (
                    <span
                      key={category}
                      className="bg-white border-2 border-purple-300 text-purple-700 px-3 py-2 rounded-full text-sm font-bold"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No categories added yet. Edit your profile to add them!</p>
              )}
            </div>

            {/* RELATIONSHIPS SECTION */}
            <div className="mt-8 space-y-4">
              {/* Blocked Users */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-300 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-red-900">🚫 Blocked Users</h3>
                  <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-xs font-bold">0</span>
                </div>
                <p className="text-sm text-gray-700">People you've blocked won't be able to contact you or see your profile.</p>
                <button
                  onClick={() => alert('Go to My Account → Blocked section')}
                  className="mt-3 text-xs bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition"
                >
                  Manage Blocked Users
                </button>
              </div>

              {/* Trusted Users */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-300 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-blue-900">❤️ Trusted Users</h3>
                  <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">0</span>
                </div>
                <p className="text-sm text-gray-700">Users you've marked as trusted appear in your trusted network for quick access.</p>
                <button
                  onClick={() => alert('Go to My Account → Blocked section → Trusted Users tab')}
                  className="mt-3 text-xs bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition"
                >
                  Manage Trusted Users
                </button>
              </div>
            </div>

          </div>
            </div>
          </div>
        )}

        {/* ===== PRIVATE INFO TAB (Only You) ===== */}
        {activeTab === 'private' && (
          <div>
            {/* PRIVATE BANNER - Clear messaging */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl animate-bounce">🔒</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">YOUR PRIVATE INFORMATION</p>
                    <p className="text-xs text-green-800 mt-1">✨ Only you can see this! Edit details, manage certificates & more.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('shared')}
                  className="text-xs bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition whitespace-nowrap"
                >
                  👁️ Preview
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Private: Edit Profile Form */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-errandify-brown">📝 Edit Your Profile</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-errandify-orange font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Bio</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        placeholder="Tell others about yourself"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 border border-gray-300 text-gray-700 py-2 rounded font-semibold text-sm hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Name</p>
                      <p className="text-sm text-gray-800">{profile.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Mobile</p>
                      <p className="text-sm text-gray-800">{profile.mobile || 'Not set'}</p>
                    </div>
                    {profile.gender && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Gender</p>
                        <p className="text-sm text-gray-800 flex items-center gap-2">
                          <span>{profile.gender === 'M' ? '👨 Male' : '👩 Female'}</span>
                          <span className="text-xs text-gray-500">(from SingPass - cannot edit)</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Private: User ID & CHAS Card */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                {profile.formattedUserId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Your User ID</p>
                      <code className="text-sm font-mono font-bold text-errandify-brown">{profile.formattedUserId}</code>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(profile.formattedUserId || '')}
                      className="text-xs text-errandify-orange hover:text-orange-600 font-semibold transition px-2 py-1 hover:bg-orange-50 rounded"
                    >
                      Copy
                    </button>
                  </div>
                )}

                {profile.chasCardColor && profile.chasCardColor !== 'none' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${
                      profile.chasCardColor === 'blue' ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      CHAS {profile.chasCardColor.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Private: Profile Photo Upload */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-errandify-brown mb-4">📸 Profile Photo</h3>

                {/* Current Photo Display */}
                <div className="mb-4">
                  {profile.profilePhoto || photoPreview ? (
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <img
                        src={photoPreview || profile.profilePhoto}
                        alt="Profile"
                        className="w-full h-full rounded-lg object-cover shadow"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition">
                        <span className="text-white text-sm font-bold">Change Photo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center text-4xl text-gray-400">
                      👤
                    </div>
                  )}
                </div>

                {/* Photo Error */}
                {photoError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700 font-semibold">⚠️ {photoError}</p>
                  </div>
                )}

                {/* Upload Input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Choose Photo</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-errandify-orange file:text-white hover:file:bg-orange-600"
                  />
                  <p className="text-xs text-gray-500 mt-2">✓ JPG, PNG, WebP • ✓ Min 200x200px • ✓ Max 5MB</p>
                </div>

                {/* Upload Button */}
                {photoPreview && (
                  <div className="flex gap-2">
                    <button
                      onClick={handlePhotoUpload}
                      className="flex-1 bg-errandify-orange text-white py-2 rounded-lg font-bold text-sm hover:bg-opacity-90 transition"
                    >
                      ✓ Upload Photo
                    </button>
                    <button
                      onClick={() => setPhotoPreview(null)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Private: Certificate Management */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-errandify-brown mb-4">📜 Qualifications & Certificates</h3>
                <p className="text-sm text-gray-600 mb-4">Store up to 10 certificates to show your qualifications</p>

                {/* AI Matching Tip */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">💡</span>
                    <div>
                      <p className="text-sm font-bold text-blue-900 mb-2">Pro Tip: Write Descriptive Titles</p>
                      <p className="text-xs text-blue-800 mb-2">
                        Our AI learns best when you add clear details! Instead of just "Certificate", try:
                      </p>
                      <ul className="text-xs text-blue-800 space-y-1 ml-3">
                        <li>✓ "First Aid & CPR Certification - Red Cross 2024"</li>
                        <li>✓ "Professional Cleaning License - Singapore Authority"</li>
                        <li>✓ "Childcare Provider Qualification - ECDA Certified"</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2 italic">More details = Better job matching! 🎯</p>
                    </div>
                  </div>
                </div>

                {/* Display existing certificates */}
                {profile.certificates && profile.certificates.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {profile.certificates.map((cert, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">{cert.title || `Certificate ${idx + 1}`}</span>
                        <button
                          onClick={() => handleDeleteCertificate(idx)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {profile.certificates.length < 10 && (
                      <p className="text-xs text-gray-500 mt-2">{10 - profile.certificates.length} slots remaining</p>
                    )}
                  </div>
                )}

                {(!profile.certificates || profile.certificates.length < 10) && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Certificate title (e.g., First Aid CPR, Cleaning License)"
                      value={certificateTitle}
                      onChange={(e) => setCertificateTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                    />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                    {certificateError && (
                      <p className="text-xs text-red-600">{certificateError}</p>
                    )}
                    <button
                      onClick={handleAddCertificate}
                      disabled={addingCertificate || !certificateTitle || !certificateFile}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-errandify-orange hover:bg-orange-50 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {addingCertificate ? 'Adding...' : 'Add Certificate'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, or PDF</p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={successMessage}
        icon="✨"
        onClose={() => setShowSuccessModal(false)}
      />
    </AdminThemeWrapper>
  );
}
