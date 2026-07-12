import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastNotification } from '../../utils/toastNotification';

interface CompanyData {
  companyName: string;
  ownerName: string;
  uen: string;
}

interface CompanySettingsStepProps {
  companyData: CompanyData;
  onComplete: () => void;
  onBack: () => void;
}

const INDUSTRY_OPTIONS = [
  'Cleaning & Facilities',
  'Delivery & Logistics',
  'Security Services',
  'Maintenance & Repairs',
  'Catering & Food',
  'Transportation',
  'Beauty & Wellness',
  'Fitness & Training',
  'Tech Support',
  'Education & Training',
  'Construction',
  'Plumbing',
  'Electrical',
  'Other'
];

const CATEGORY_OPTIONS = [
  'Cleaning',
  'Delivery',
  'Security',
  'Maintenance',
  'Catering',
  'Transportation',
  'Beauty',
  'Fitness',
  'Tech Support',
  'Tutoring',
  'Event Management',
  'Photography'
];

export default function CompanySettingsStep({
  companyData,
  onComplete,
  onBack
}: CompanySettingsStepProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [formData, setFormData] = useState({
    industry: '',
    description: '',
    categories: [] as string[],
    contactEmail: '',
    contactPhone: '',
    logo: null as File | null,
  });

  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File too large', 'Logo must be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        logo: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.trim().length < 20) newErrors.description = 'Description must be at least 20 characters';
    if (formData.categories.length === 0) newErrors.categories = 'Select at least one service category';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Email is required';
    if (!formData.contactEmail.includes('@')) newErrors.contactEmail = 'Valid email is required';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Phone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Form errors', 'Please fix the errors below');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      formDataToSend.append('name', companyData.companyName);
      formDataToSend.append('uen', companyData.uen);
      formDataToSend.append('industry', formData.industry);
      formDataToSend.append('bio', formData.description);
      formDataToSend.append('email', formData.contactEmail);
      formDataToSend.append('phone', formData.contactPhone);
      formDataToSend.append('service_categories', JSON.stringify(formData.categories));

      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      const response = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }

      const data = await response.json();
      showSuccess('🎉 Company Created!', 'Your company is ready to go');

      setTimeout(() => {
        onComplete();
        navigate('/company/dashboard-new');
      }, 1500);
    } catch (err: any) {
      console.error('Company creation error:', err);
      showError('Company Creation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-errandify-brown mb-2">
              Complete Company Settings
            </h1>
            <p className="text-gray-600">
              Set up your company profile to start posting tasks and managing teams
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Info (Read-only from ACRA) */}
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-bold text-errandify-brown mb-4">
                Company Information (from ACRA)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Company Name</label>
                  <p className="text-lg font-bold text-errandify-brown mt-1">
                    {companyData.companyName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">UEN</label>
                  <p className="text-lg font-mono font-bold text-errandify-brown mt-1">
                    {companyData.uen}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Registered Owner</label>
                  <p className="text-lg font-bold text-errandify-brown mt-1">
                    {companyData.ownerName}
                  </p>
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <h3 className="text-lg font-bold text-errandify-brown mb-4">
                Company Logo
              </h3>
              <div className="flex items-start gap-6">
                {logoPreview ? (
                  <div className="w-32 h-32 rounded-lg border-2 border-errandify-orange overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🏢</div>
                      <p className="text-xs text-gray-500">Logo</p>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      disabled={loading}
                      className="hidden"
                    />
                    <span className="inline-block px-4 py-2 bg-errandify-orange text-white rounded-lg font-bold cursor-pointer hover:bg-opacity-90 transition-all">
                      📤 Upload Logo
                    </span>
                  </label>
                  <p className="text-sm text-gray-600 mt-2">
                    PNG, JPG, or GIF (Max 5MB) - Optional
                  </p>
                </div>
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-bold text-errandify-brown mb-2">
                Primary Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                  errors.industry
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-errandify-orange'
                }`}
              >
                <option value="">Select your industry</option>
                {INDUSTRY_OPTIONS.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              {errors.industry && (
                <p className="text-red-600 text-sm mt-1">⚠️ {errors.industry}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-errandify-brown mb-2">
                Company Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your company, services, and what makes you unique"
                rows={4}
                disabled={loading}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all resize-none ${
                  errors.description
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-errandify-orange'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Minimum 20 characters
                </p>
                <p className={`text-sm font-semibold ${
                  formData.description.length >= 20 ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {formData.description.length}/20
                </p>
              </div>
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">⚠️ {errors.description}</p>
              )}
            </div>

            {/* Service Categories */}
            <div>
              <label className="block text-sm font-bold text-errandify-brown mb-3">
                Service Categories (Select at least one) *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    disabled={loading}
                    className={`p-3 rounded-lg border-2 font-semibold transition-all text-sm ${
                      formData.categories.includes(cat)
                        ? 'border-errandify-orange bg-orange-50 text-errandify-orange'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-errandify-orange'
                    }`}
                  >
                    {formData.categories.includes(cat) ? '✓ ' : ''}{cat}
                  </button>
                ))}
              </div>
              {errors.categories && (
                <p className="text-red-600 text-sm mt-2">⚠️ {errors.categories}</p>
              )}
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-errandify-brown mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="contact@company.sg"
                  disabled={loading}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                    errors.contactEmail
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:border-errandify-orange'
                  }`}
                />
                {errors.contactEmail && (
                  <p className="text-red-600 text-sm mt-1">⚠️ {errors.contactEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-errandify-brown mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+65 6123 4567"
                  disabled={loading}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                    errors.contactPhone
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:border-errandify-orange'
                  }`}
                />
                {errors.contactPhone && (
                  <p className="text-red-600 text-sm mt-1">⚠️ {errors.contactPhone}</p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Next Steps</strong><br />
                After completing setup, you can add managers and staff from your company dashboard.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Creating Company...' : '✓ Complete Setup'}
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
