import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

interface EditErrandPageProps {
  userRole: 'asker' | 'doer';
}

export default function EditErrandPage({ userRole }: EditErrandPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    deadline: '',
    duration: '',
    durationUnit: 'Hr',
  });

  useEffect(() => {
    if (!id) {
      setError('No errand ID in URL');
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    fetchErrandDetail();
  }, [id]);

  const fetchErrandDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token) {
        throw new Error('No authentication token');
      }

      if (!userStr) {
        throw new Error('User data not found');
      }

      const user = JSON.parse(userStr);
      const currentUserId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const errand = response.data.data;

      // Check ownership
      if (errand.askerId !== currentUserId) {
        throw new Error('You can only edit errands you posted');
      }

      // Check if open
      if (errand.status !== 'open') {
        throw new Error('You can only edit open errands');
      }

      // Check if there are any bids - if so, lock editing
      if (errand.acceptedBidId || errand.bidCount > 0) {
        throw new Error('You cannot edit this errand. It has received offers. Cancel the errand if you need to make changes.');
      }

      setFormData({
        title: errand.title || '',
        description: errand.description || '',
        category: errand.category || '',
        budget: errand.budget?.toString() || '',
        deadline: errand.deadline ? new Date(errand.deadline).toISOString().split('T')[0] : '',
        duration: '',
        durationUnit: 'Hr',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load errand');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token');
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          deadline: formData.deadline || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate(`/errand/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update errand');
    }
  };

  if (userRole !== 'asker') {
    return (
      <div className="min-h-screen bg-errandify-bg pb-32">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="text-center py-12">
            <p className="text-red-600 text-sm mb-4">Only askers can edit errands</p>
            <button
              onClick={() => navigate('/errands')}
              className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold"
            >
              Go to MyErrands
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-errandify-bg pb-32">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="text-center py-12">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminThemeWrapper title="✏️ Edit Errand" showBackButton onBack={() => navigate(-1)}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-4 text-sm"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-errandify-brown mb-6">Edit Errand</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Errand Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              >
                <option value="">Select Category</option>
                <option value="eldercare">Caregiving & Elder Companionship</option>
                <option value="childcare">Childcare & School Pickup/Drop-off</option>
                <option value="homehelp">Household Errands & Home Maintenance</option>
                <option value="wellness">Wellness Support (incl. Mental Wellness)</option>
                <option value="tripcarry">Cross-Border Errands</option>
                <option value="petcare">Pet Care (sitting, grooming, walking)</option>
                <option value="delivery">Delivery (local errands, parcels, food, documents)</option>
                <option value="eventhelp">Events (setup, shopping, planning)</option>
                <option value="data-entry">Data Entry & Administrative Work</option>
                <option value="donate">Donate / Giveback</option>
                <option value="localbiz">Microservices for Local SMEs</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-errandify-orange text-sm"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Budget (SGD)
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Needed By
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminThemeWrapper>
  );
}
