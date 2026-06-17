import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateErrandPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    duration: '',
    durationUnit: 'Min' as 'Min' | 'Hr' | 'Week' | 'Month',
    budget: '',
    isRecurring: false,
    recurringSchedule: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categoryNames: Record<string, string> = {
    'home-maintenance': 'Home Maintenance',
    'cleaning-laundry': 'Cleaning & Laundry',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'childcare-tutoring': 'Childcare & Tutoring',
    'pet-care': 'Pet Care',
    'tech-support': 'Tech Support',
    'moving-help': 'Moving Help',
  };

  const durationUnits = ['Min', 'Hr', 'Week', 'Month'];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Convert duration to deadline date
      let deadline = null;
      if (formData.startDate) {
        const startDate = new Date(formData.startDate);
        const duration = parseInt(formData.duration) || 0;

        switch (formData.durationUnit) {
          case 'Min':
            startDate.setMinutes(startDate.getMinutes() + duration);
            break;
          case 'Hr':
            startDate.setHours(startDate.getHours() + duration);
            break;
          case 'Week':
            startDate.setDate(startDate.getDate() + duration * 7);
            break;
          case 'Month':
            startDate.setMonth(startDate.getMonth() + duration);
            break;
        }
        deadline = startDate.toISOString();
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          title: formData.title,
          description: formData.description,
          category: categoryId,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          deadline,
          isRecurring: formData.isRecurring,
          recurringSchedule: formData.recurringSchedule || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate(`/errand/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create errand');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-3"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">
            Create Your Errand
          </h1>

          {/* Progress Bar */}
          <div className="flex gap-1 mt-4">
            <div className="flex-1 h-1 bg-errandify-orange rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
          {/* Errand Title */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2">
              Errand Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter Errand Title"
              required
              className="w-full px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2 flex items-center gap-1">
              Category <span className="text-blue-500">●</span>
            </label>
            <select
              name="category"
              value={categoryId || ''}
              disabled
              className="w-full px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none text-gray-500 text-lg"
            >
              <option value="">Select Category</option>
              {Object.entries(categoryNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Errand Description */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2">
              Errand Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter Errand Description"
              rows={4}
              className="w-full px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg resize-none"
            />
          </div>

          {/* Start Errand Date */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2 flex items-center gap-1">
              Start Errand Date <span className="text-blue-500">●</span>
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
            />
          </div>

          {/* Expected Duration */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2">
              Expected Duration
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="Enter Value"
                min="0"
                className="flex-1 px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
              />
              <select
                name="durationUnit"
                value={formData.durationUnit}
                onChange={handleChange}
                className="px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
              >
                {durationUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total Fee */}
          <div>
            <label className="block text-lg font-semibold text-errandify-brown mb-2">
              Total Fee
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                className="flex-1 px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
              />
              <div className="px-4 py-3 border-b-2 border-gray-300 text-lg font-semibold text-errandify-brown">
                SGD
              </div>
            </div>
          </div>

          {/* Recurring Errand */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="text-lg font-semibold text-errandify-brown">
                Do you want this errand to repeat on a regular schedule?
              </span>
            </label>
          </div>

          {/* Recurring Schedule (conditional) */}
          {formData.isRecurring && (
            <div>
              <label className="block text-lg font-semibold text-errandify-brown mb-2">
                Recurring Schedule
              </label>
              <select
                name="recurringSchedule"
                value={formData.recurringSchedule}
                onChange={handleChange}
                className="w-full px-4 py-3 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-lg"
              >
                <option value="">Select schedule</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          <div className="fixed bottom-6 left-0 right-0 px-4 bg-gradient-to-t from-errandify-bg via-errandify-bg to-transparent pt-4">
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.startDate}
              className="w-full bg-errandify-orange text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? '⏳ Creating...' : '✨ Post Errand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
