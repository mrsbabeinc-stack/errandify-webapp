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
    repeatEvery: '1',
    repeatUnit: 'day' as 'day' | 'week' | 'month',
    occurrences: '1',
  });

  const [sessions, setSessions] = useState<Array<{ sessionNumber: number; startDate: string; budget: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState({
    suggestedCategory: '',
    suggestedDescription: '',
    correctedTitle: '',
    hasCorrections: false,
    missingDetails: [] as string[],
    blocked: false,
    error: '',
  });
  const [aiLoading, setAiLoading] = useState(false);

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

  const getAiSuggestions = async (title: string) => {
    if (!title.trim() || title.length < 5) return;

    setAiLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
        { title }
      );

      if (response.data.blocked) {
        setAiSuggestions({
          suggestedCategory: '',
          suggestedDescription: '',
          correctedTitle: '',
          hasCorrections: false,
          missingDetails: [],
          blocked: true,
          error: response.data.error,
        });
      } else if (response.data.success) {
        setAiSuggestions({
          suggestedCategory: response.data.data.category,
          suggestedDescription: response.data.data.description,
          correctedTitle: response.data.data.correctedTitle || '',
          hasCorrections: response.data.data.hasCorrections,
          missingDetails: response.data.data.missingDetails || [],
          blocked: false,
          error: '',
        });

        // Auto-apply category if not already set
        if (!formData.category && response.data.data.category) {
          setFormData((prev) => ({
            ...prev,
            category: response.data.data.category,
          }));
        }
      }
    } catch (err: any) {
      console.error('AI suggestion error:', err);
      if (err.response?.data?.blocked) {
        setAiSuggestions((prev) => ({
          ...prev,
          blocked: true,
          error: err.response.data.error,
        }));
      }
    } finally {
      setAiLoading(false);
    }
  };

  const acceptDescriptionSuggestion = () => {
    if (aiSuggestions.suggestedDescription) {
      setFormData((prev) => ({
        ...prev,
        description: aiSuggestions.suggestedDescription,
      }));
    }
  };

  const acceptCorrectedTitle = () => {
    if (aiSuggestions.correctedTitle) {
      setFormData((prev) => ({
        ...prev,
        title: aiSuggestions.correctedTitle,
      }));
    }
  };

  const calculateSessions = (startDate: string, repeatEvery: number, repeatUnit: string, occurrences: number, budget: number) => {
    if (!startDate || occurrences < 1) return [];

    const sessions = [];
    const budgetPerSession = occurrences > 0 ? (budget / occurrences).toFixed(2) : '0.00';

    for (let i = 1; i <= occurrences; i++) {
      const sessionDate = new Date(startDate);

      switch (repeatUnit) {
        case 'day':
          sessionDate.setDate(sessionDate.getDate() + (i - 1) * repeatEvery);
          break;
        case 'week':
          sessionDate.setDate(sessionDate.getDate() + (i - 1) * repeatEvery * 7);
          break;
        case 'month':
          sessionDate.setMonth(sessionDate.getMonth() + (i - 1) * repeatEvery);
          break;
      }

      sessions.push({
        sessionNumber: i,
        startDate: sessionDate.toLocaleDateString('en-SG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        budget: budgetPerSession,
      });
    }

    return sessions;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    };

    setFormData(newFormData);

    // Trigger AI suggestions when title is entered
    if (name === 'title' && value.length >= 5) {
      getAiSuggestions(value);
    }

    // Recalculate sessions if recurring fields change
    if (newFormData.isRecurring && newFormData.startDate && newFormData.budget) {
      const sessions = calculateSessions(
        newFormData.startDate,
        parseInt(newFormData.repeatEvery) || 1,
        newFormData.repeatUnit,
        parseInt(newFormData.occurrences) || 1,
        parseFloat(newFormData.budget) || 0
      );
      setSessions(sessions);
    } else if (!newFormData.isRecurring) {
      setSessions([]);
    }
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
          repeatEvery: formData.isRecurring ? parseInt(formData.repeatEvery) : null,
          repeatUnit: formData.isRecurring ? formData.repeatUnit : null,
          occurrences: formData.isRecurring ? parseInt(formData.occurrences) : null,
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
    <div className="min-h-screen bg-errandify-bg">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-2 text-xs"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-errandify-brown mb-2">
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

        <form onSubmit={handleSubmit} className="space-y-2">
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
              className={`w-full px-3 py-2 border-b-2 bg-transparent focus:outline-none text-sm ${
                aiSuggestions.blocked
                  ? 'border-red-400 focus:border-red-500'
                  : aiSuggestions.hasCorrections
                  ? 'border-blue-400 focus:border-blue-500'
                  : 'border-gray-300 focus:border-errandify-orange'
              }`}
            />
            {aiSuggestions.blocked && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                🚫 {aiSuggestions.error}
              </p>
            )}
            {aiSuggestions.hasCorrections && !aiSuggestions.blocked && (
              <div className="mt-2 text-xs">
                <p className="text-blue-600 flex items-center gap-1">
                  ✏️ Spelling/Punctuation: <span className="font-semibold">{aiSuggestions.correctedTitle}</span>
                  <button
                    type="button"
                    onClick={acceptCorrectedTitle}
                    className="ml-1 text-blue-700 hover:text-blue-800 font-bold"
                  >
                    Use
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-1">
              Category {aiLoading && <span className="text-xs text-errandify-orange">🤖 detecting...</span>}
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

          {/* Errand Description with AI Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-errandify-brown">
                Description
              </label>
              {aiSuggestions.suggestedDescription && !formData.description && (
                <button
                  type="button"
                  onClick={acceptDescriptionSuggestion}
                  className="text-xs text-errandify-orange hover:text-orange-600 font-semibold"
                >
                  ✨ Use AI suggestion
                </button>
              )}
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={aiSuggestions.suggestedDescription || 'Describe your task...'}
              rows={2}
              className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm resize-none"
            />
            {aiSuggestions.suggestedDescription && !formData.description && (
              <p className="text-xs text-gray-500 mt-1">💡 Suggested: {aiSuggestions.suggestedDescription}</p>
            )}

            {/* Missing Details Suggestions */}
            {aiSuggestions.missingDetails.length > 0 && !aiSuggestions.blocked && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-2">📋 Things to clarify:</p>
                <ul className="space-y-1">
                  {aiSuggestions.missingDetails.map((detail, idx) => (
                    <li key={idx} className="text-xs text-yellow-700 flex items-start gap-2">
                      <span>•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
          </div>

          {/* Recurring Checkbox - Full Width */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold text-errandify-brown">
                Do you want this errand to repeat on a regular schedule?
              </span>
              <InfoTooltip field="isRecurring" />
            </label>
          </div>

          {/* Recurring Schedule (conditional) */}
          {formData.isRecurring && (
            <>
              {/* Repeat Every */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1">
                    Repeat Every
                  </label>
                  <input
                    type="number"
                    name="repeatEvery"
                    value={formData.repeatEvery}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1">
                    Unit
                  </label>
                  <select
                    name="repeatUnit"
                    value={formData.repeatUnit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
                  >
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                  </select>
                </div>

                {/* For X Occurrences */}
                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1">
                    For
                  </label>
                  <input
                    type="number"
                    name="occurrences"
                    value={formData.occurrences}
                    onChange={handleChange}
                    min="1"
                    max="52"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1">
                    &nbsp;
                  </label>
                  <select
                    disabled
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent text-gray-500 text-sm"
                  >
                    <option>Session(s)</option>
                  </select>
                </div>
              </div>

              {/* Errand Schedule Preview */}
              {sessions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-errandify-brown mb-3">
                    Errand Schedule ({sessions.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sessions.map((session) => (
                      <div
                        key={session.sessionNumber}
                        className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between border border-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500 font-semibold">□</span>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Session {session.sessionNumber}
                            </p>
                            <p className="text-xs text-gray-600">
                              📅 {session.startDate}
                            </p>
                          </div>
                        </div>
                        <span className="text-errandify-orange font-bold text-sm">
                          SGD ${session.budget}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
