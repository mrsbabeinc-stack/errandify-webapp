import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { TaskData } from '../../pages/HanaTaskCreationPage';

interface HanaManualModeProps {
  taskData: TaskData;
  onTaskUpdate: (updates: Partial<TaskData>) => void;
  onReview: () => void;
}

interface Suggestion {
  id: string;
  text: string;
}

export default function HanaManualMode({
  taskData,
  onTaskUpdate,
  onReview,
}: HanaManualModeProps) {
  const [titleSuggestions, setTitleSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const categoryMap: Record<string, string> = {
    'home-maintenance': '🏠 Home Maintenance',
    'cleaning-laundry': '🧺 Cleaning & Laundry',
    'shopping-errands': '🛍️ Shopping & Errands',
    'delivery-moving': '📦 Delivery & Moving',
    'childcare-tutoring': '🧒 Childcare & Tutoring',
    'pet-care': '🐾 Pet Care',
    'tech-support': '💻 Tech Support',
    'moving-help': '🚚 Moving Help',
  };

  // Debounced title input to fetch suggestions
  useEffect(() => {
    if (!taskData.title.trim()) {
      setTitleSuggestions([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setLoadingSuggestions(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggest-completion`,
          { title: taskData.title }
        );

        const suggestions: Suggestion[] = (response.data.data.suggestions || []).map(
          (text: string, idx: number) => ({
            id: `${idx}`,
            text,
          })
        );
        setTitleSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.log('Could not fetch suggestions');
        setTitleSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [taskData.title]);

  const handleSuggestionClick = (suggestion: string) => {
    onTaskUpdate({ title: suggestion });
    setShowSuggestions(false);
  };

  const handleCategoryChange = (category: string) => {
    onTaskUpdate({ category });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <form onSubmit={(e) => { e.preventDefault(); onReview(); }} className="space-y-6">
        {/* Title Input with AI Suggestions */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={taskData.title}
            onChange={(e) => onTaskUpdate({ title: e.target.value })}
            onFocus={() => taskData.title && setShowSuggestions(true)}
            placeholder="e.g., Help me pack for moving, Fix my kitchen tap..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && titleSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <div className="p-2 space-y-1">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded transition-colors text-sm text-gray-700"
                  >
                    ✨ {suggestion.text}
                  </button>
                ))}
              </div>
              {loadingSuggestions && (
                <div className="p-2 text-center text-xs text-gray-500">
                  Loading suggestions...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Description
          </label>
          <textarea
            value={taskData.description}
            onChange={(e) => onTaskUpdate({ description: e.target.value })}
            placeholder="Give more details about what you need done..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-3">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categoryMap).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryChange(key)}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all text-sm ${
                  taskData.category === key
                    ? 'bg-errandify-orange text-white border-errandify-orange'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-errandify-orange'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Location *
          </label>
          <input
            type="text"
            value={taskData.location}
            onChange={(e) => onTaskUpdate({ location: e.target.value })}
            placeholder="e.g., Tanjong Pagar, 150101"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={taskData.date}
              onChange={(e) => onTaskUpdate({ date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Time
            </label>
            <input
              type="time"
              value={taskData.time}
              onChange={(e) => onTaskUpdate({ time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Budget (SGD)
          </label>
          <div className="flex items-center">
            <span className="text-lg text-gray-600 mr-2">$</span>
            <input
              type="number"
              value={taskData.budget}
              onChange={(e) => onTaskUpdate({ budget: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Special Notes (Optional)
          </label>
          <textarea
            value={taskData.notes}
            onChange={(e) => onTaskUpdate({ notes: e.target.value })}
            placeholder="Any additional requirements or preferences..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90"
          >
            Review & Post
          </button>
          <button
            type="button"
            onClick={() => {
              onTaskUpdate({
                title: '',
                description: '',
                category: '',
                location: '',
                date: '',
                time: '',
                budget: '',
                notes: '',
              });
            }}
            className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}
