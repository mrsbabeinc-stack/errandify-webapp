import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserData {
  id: number;
  displayName: string;
  email: string;
  phone: string;
  role: string;
  profileImage: string;
  bio: string;
  skills: string[];
  averageRating: number;
  totalRatings: number;
  kycStatus: string;
  nricVerified: boolean;
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    phone: '',
    profileImageUrl: '',
    skills: [] as string[],
  });

  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userData = response.data.data;
      setUser(userData);
      setFormData({
        displayName: userData.displayName,
        bio: userData.bio || '',
        phone: userData.phone || '',
        profileImageUrl: userData.profileImage || '',
        skills: userData.skills || [],
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          profileImageUrl: base64,
        }));
        setSuccess('✅ Photo ready to save!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user-profile/me/update`,
        {
          displayName: formData.displayName,
          bio: formData.bio,
          phone: formData.phone,
          profileImageUrl: formData.profileImageUrl,
          skills: formData.skills,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('✅ Profile updated successfully!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-indigo-50 py-8 px-6 pb-32">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="mb-4 text-errandify-orange-600 hover:text-errandify-orange-800 transition text-sm"
          >
            ← Back to Profile
          </button>
          <h1 className="text-4xl font-bold text-gray-800">✏️ Edit Profile</h1>
          <p className="text-gray-600 mt-2">Update your information and preferences</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
            {success}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="How people will see you"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange-500 transition"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Bio (Optional)</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell others about yourself... (max 500 characters)"
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange-500 transition resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+65 XXXX XXXX"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange-500 transition"
              />
            </div>

            {/* Profile Photo Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">Profile Photo 📷</label>

              {/* Drag and Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 bg-gray-50 hover:border-errandify-orange'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  disabled={uploading}
                  className="hidden"
                  id="profile-photo-input"
                />
                <label htmlFor="profile-photo-input" className="cursor-pointer block">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm font-semibold text-gray-800">
                    {dragActive ? 'Drop your photo here!' : 'Drag & drop your photo here'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG • Max 5MB</p>
                </label>
              </div>

              {/* Preview */}
              {formData.profileImageUrl && (
                <div className="mt-4 flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <img
                      src={formData.profileImageUrl}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-errandify-orange"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '📷';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">✅ Photo ready!</p>
                    <p className="text-xs text-gray-600">Click \"Save Changes\" to upload</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        profileImageUrl: '',
                      }))
                    }
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Skills</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g., Photography, Gardening)"
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold"
                >
                  Add
                </button>
              </div>

              {/* Skills List */}
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-errandify-orange-800 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-errandify-orange-600 hover:text-errandify-orange-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Info (Read-only) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3">Account Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">Email:</span> {user?.email}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Role:</span> {user?.role}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">KYC Status:</span>{' '}
                  {user?.kycStatus === 'verified' ? '✅ Verified' : 'Pending'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-errandify-orange-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 transition transform hover:scale-105"
              >
                {saving ? '💾 Saving...' : '✅ Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
