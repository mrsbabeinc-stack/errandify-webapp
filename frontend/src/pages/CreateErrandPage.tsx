import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateErrandPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<'quick' | 'details' | 'review'>('quick');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    location: '',
    urgency: 'normal' as 'low' | 'normal' | 'urgent',
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
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

  // Smart suggestions based on category
  const categoryHints: Record<string, { hint: string; examples: string[] }> = {
    'pet-care': {
      hint: 'Need help with your pet?',
      examples: ['Dog walking', 'Pet sitting', 'Grooming', 'Vet visit help'],
    },
    'cleaning-laundry': {
      hint: 'Tell us what needs cleaning',
      examples: ['Apartment cleaning', 'Office cleaning', 'Laundry service', 'Deep clean'],
    },
    'shopping-errands': {
      hint: 'What groceries or items?',
      examples: ['Grocery shopping', 'Mall shopping', 'Pharmacy run', 'Market errands'],
    },
    'tech-support': {
      hint: 'What tech issue?',
      examples: ['Phone setup', 'Computer repair', 'Internet setup', 'App help'],
    },
    'childcare-tutoring': {
      hint: 'What kind of help?',
      examples: ['Babysitting', 'Tutoring', 'Homework help', 'After-school care'],
    },
    'home-maintenance': {
      hint: 'What needs fixing?',
      examples: ['Painting', 'Plumbing', 'Electrical', 'General repair'],
    },
    'delivery-moving': {
      hint: 'What needs delivery?',
      examples: ['Furniture delivery', 'Package pickup', 'Small moves', 'Item transport'],
    },
    'moving-help': {
      hint: 'Moving help needed?',
      examples: ['Packing help', 'Heavy lifting', 'Furniture moving', 'Loading boxes'],
    },
  };

  const getCurrentHint = () => categoryHints[categoryId || ''] || { hint: 'Describe your task', examples: [] };

  const handleQuickInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, title: value }));

    // Auto-generate suggestions based on input
    if (value.length > 2) {
      const hints = getCurrentHint().examples.filter((ex) =>
        ex.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(hints);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, title: suggestion }));
    setSuggestions([]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          title: formData.title,
          description: formData.description,
          category: categoryId,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          deadline: formData.deadline || null,
          location: formData.location,
          urgency: formData.urgency,
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

  // Step 1: Quick Input
  if (step === 'quick') {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-6">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-3"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">
            {getCurrentHint().hint}
          </h1>
          <p className="text-gray-600">
            {categoryNames[categoryId || '']} • Let's keep it quick!
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setStep('details'); }} className="space-y-6 pb-24">
          {/* Quick Task Title Input */}
          <div>
            <input
              type="text"
              placeholder="What do you need help with?"
              value={formData.title}
              onChange={handleQuickInput}
              autoFocus
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-errandify-orange focus:border-transparent"
            />
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold">SUGGESTIONS</p>
              <div className="grid gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="text-left px-4 py-3 bg-white border border-pink-200 rounded-lg hover:bg-pink-50 transition-colors text-errandify-brown"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Examples */}
          {suggestions.length === 0 && getCurrentHint().examples.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold">EXAMPLES</p>
              <div className="grid grid-cols-2 gap-2">
                {getCurrentHint().examples.slice(0, 4).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => selectSuggestion(example)}
                    className="text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-errandify-brown"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="fixed bottom-24 left-0 right-0 px-4 bg-gradient-to-t from-errandify-bg via-errandify-bg to-transparent pt-4">
            <button
              type="submit"
              disabled={!formData.title.trim()}
              className="w-full bg-errandify-orange text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Continue → Add Details
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: Details
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => setStep('quick')}
            className="text-errandify-orange font-semibold mb-3"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">
            Tell us more
          </h1>
          <p className="text-gray-600">Help doers understand your task better</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setStep('review'); }} className="space-y-4 pb-32">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add any details that would help..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Bukit Merah, Singapore"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              How urgent?
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            >
              <option value="low">Not urgent (flexible on timing)</option>
              <option value="normal">Normal (within a few days)</option>
              <option value="urgent">Urgent (ASAP)</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              Budget (SGD) - Optional
            </label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              When do you need this? - Optional
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Next Button */}
          <div className="fixed bottom-24 left-0 right-0 px-4 bg-gradient-to-t from-errandify-bg via-errandify-bg to-transparent pt-4">
            <button
              type="submit"
              className="w-full bg-errandify-orange text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition-colors text-lg"
            >
              Review & Post
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 3: Review
  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => setStep('details')}
          className="text-errandify-orange font-semibold mb-3"
        >
          ← Edit
        </button>
        <h1 className="text-3xl font-bold text-errandify-brown mb-2">
          Ready to post?
        </h1>
        <p className="text-gray-600">Here's what doers will see</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pb-32">
        {/* Preview Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-errandify-brown mb-4">{formData.title}</h2>

          {formData.description && (
            <p className="text-gray-700 mb-4">{formData.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {formData.location && (
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-semibold text-errandify-brown">{formData.location}</p>
              </div>
            )}
            {formData.budget && (
              <div>
                <p className="text-gray-500">Budget</p>
                <p className="font-semibold text-errandify-orange">SGD ${parseFloat(formData.budget).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Urgency</p>
              <p className="font-semibold text-errandify-brown capitalize">
                {formData.urgency === 'urgent' ? '🔴 Urgent' : formData.urgency === 'normal' ? '🟡 Normal' : '🟢 Flexible'}
              </p>
            </div>
            {formData.deadline && (
              <div>
                <p className="text-gray-500">Deadline</p>
                <p className="font-semibold text-errandify-brown">
                  {new Date(formData.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Post Button */}
        <div className="fixed bottom-24 left-0 right-0 px-4 bg-gradient-to-t from-errandify-bg via-errandify-bg to-transparent pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-errandify-orange text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? '⏳ Posting...' : '✨ Post Errand'}
          </button>
        </div>
      </form>
    </div>
  );
}
