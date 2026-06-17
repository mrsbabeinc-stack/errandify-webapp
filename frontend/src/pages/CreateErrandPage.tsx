import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Tooltip {
  [key: string]: string;
}

export default function CreateErrandPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: categoryId || '',
    title: '',
    description: '',
    startDate: '',
    duration: '',
    durationUnit: 'Hr' as 'Min' | 'Hr' | 'Week' | 'Month',
    budget: '',
    isRecurring: false,
    recurringSchedule: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

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

  const tooltips: Tooltip = {
    startDate: 'When do you need this task done?',
    duration: 'How long will this task take?',
    isRecurring: 'Does this task repeat regularly?',
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
          category: formData.category,
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

  const InfoTooltip = ({ field }: { field: string }) => (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setHoveredTooltip(field)}
        onMouseLeave={() => setHoveredTooltip(null)}
        className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
        title={tooltips[field]}
      >
        ?
      </button>
      {hoveredTooltip === field && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg whitespace-nowrap z-50">
          {tooltips[field]}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-errandify-bg pt-4">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-3 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-errandify-brown mb-2">
            Create Your Errand
          </h1>
          <div className="flex gap-1 mt-3">
            <div className="flex-1 h-1 bg-errandify-orange rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            <div className="flex-1 h-1 bg-gray-300 rounded"></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Errand Title */}
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-1">
              Errand Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter Errand Title"
              required
              className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
            >
              <option value="">Select a category...</option>
              {Object.entries(categoryNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Errand Description */}
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your task..."
              rows={2}
              className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm resize-none"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1 flex items-center">
                Start Date
                <InfoTooltip field="startDate" />
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1">
                Budget (SGD)
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1 flex items-center">
                Duration
                <InfoTooltip field="duration" />
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="flex-1 px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
                />
                <select
                  name="durationUnit"
                  value={formData.durationUnit}
                  onChange={handleChange}
                  className="px-2 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
                >
                  {durationUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurring */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-errandify-brown">
                  Recurring
                </span>
                <InfoTooltip field="isRecurring" />
              </label>
            </div>
          </div>

          {/* Recurring Schedule (conditional) */}
          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1">
                Schedule
              </label>
              <select
                name="recurringSchedule"
                value={formData.recurringSchedule}
                onChange={handleChange}
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
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
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-200 text-errandify-brown py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.startDate}
              className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? '⏳ Creating...' : '✨ Post Errand'}
            </button>
          </div>
        </form>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
