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
  const [descriptionTips, setDescriptionTips] = useState<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const categoryMap: Record<string, string> = {
    'eldercare': '👴 Caregiving & Elder Companionship',
    'childcare': '🧒 Childcare & School Pickup/Drop-off',
    'homehelp': '🏠 Household Errands & Home Maintenance',
    'wellness': '🌿 Wellness Support',
    'tripcarry': '✈️ Cross-Border Errands',
    'petcare': '🐾 Pet Care',
    'delivery': '📦 Delivery',
    'eventhelp': '🎉 Events',
    'donate': '❤️ Donate / Giveback',
    'localbiz': '🏪 Microservices for Local SMEs',
  };

  const getTaskSpecificTips = (title: string, category?: string): string => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('lunch') || lowerTitle.includes('meal') || lowerTitle.includes('cook') || lowerTitle.includes('prepare') || category === 'food-beverage') {
      return '• Confirm any dietary restrictions or allergies with the asker. • Bring all necessary cooking equipment unless specified otherwise. • Arrive 15-30 minutes early to prep ingredients.';
    }

    if (lowerTitle.includes('clean') || category === 'cleaning-laundry') {
      return '• Bring all cleaning supplies unless the asker provides them. • Take photos before and after as evidence. • Check if access to any restricted areas needs prior arrangement.';
    }

    if (lowerTitle.includes('babysit') || lowerTitle.includes('childcare') || category === 'childcare-tutoring') {
      return '• Get emergency contact numbers and ensure you have them saved. • Ask about bedtime routines and any special dietary needs. • Keep the asker updated with photos/messages during the job.';
    }

    if (lowerTitle.includes('elderly') || lowerTitle.includes('elder') || lowerTitle.includes('care')) {
      return '• Ask about any mobility assistance or special care requirements. • Ensure you have emergency contacts and medical history if needed. • Be patient and maintain a calm, supportive demeanor.';
    }

    if (lowerTitle.includes('delivery') || lowerTitle.includes('send') || lowerTitle.includes('transport')) {
      return '• Take photos of items before and after delivery. • Keep the asker informed of your location and ETA. • Handle items with care and avoid damage.';
    }

    if (lowerTitle.includes('tutor') || lowerTitle.includes('teach') || lowerTitle.includes('lesson')) {
      return '• Clarify learning goals and student level before the session. • Prepare materials and examples relevant to the subject. • Provide feedback and suggest next steps for improvement.';
    }

    if (lowerTitle.includes('event') || lowerTitle.includes('party') || lowerTitle.includes('setup')) {
      return '• Arrive early to understand the layout and setup needs. • Confirm what materials/decorations you need to provide. • Have a clear timeline and stay in touch with the organizer.';
    }

    if (lowerTitle.includes('repair') || lowerTitle.includes('fix')) {
      return '• Assess the problem and provide a cost estimate upfront. • Use quality materials and ensure proper installation. • Provide warranty or guarantee if applicable.';
    }

    return '• Communicate clearly with the asker about expectations. • Take progress photos/videos as documentation. • Follow any special instructions provided by the asker.';
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

  // Generate description tips based on title
  useEffect(() => {
    if (!taskData.title.trim()) {
      setDescriptionTips('');
      return;
    }
    setDescriptionTips(getTaskSpecificTips(taskData.title, taskData.category));
  }, [taskData.title, taskData.category]);

  const handleSuggestionClick = (suggestion: string) => {
    onTaskUpdate({ title: suggestion });
    setShowSuggestions(false);
  };

  const handleCategoryChange = (category: string) => {
    onTaskUpdate({ category });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <form onSubmit={(e) => {
        e.preventDefault();
        // Validate all required fields (except notes which is optional)
        if (!taskData.title?.trim()) {
          alert('What would you like help with? Please give your errand a title.');
          return;
        }
        if (taskData.title.trim().length < 5) {
          alert('Give your errand a bit more detail - at least 5 characters please.');
          return;
        }
        if (!taskData.description?.trim()) {
          alert('Tell us more! Describe what you need help with so doers understand.');
          return;
        }
        if (taskData.description.trim().length < 10) {
          alert('A bit more detail please - at least 10 characters helps doers understand better.');
          return;
        }
        if (!taskData.category?.trim()) {
          alert('Which category best fits your errand? This helps us find the right doers.');
          return;
        }
        if (!taskData.location?.trim()) {
          alert('Where do you need help? Let us know your location.');
          return;
        }
        if (!taskData.date?.trim()) {
          alert('When do you need this done? Please pick a date.');
          return;
        }
        // Validate date is not in the past
        const selectedDate = new Date(taskData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          alert('We can only schedule for today or later. Pick a date coming up!');
          return;
        }
        if (!taskData.time?.trim()) {
          alert('What time works for you? Please select a time.');
          return;
        }
        // Validate time is at least 30 minutes from now
        const selectedDateTime = new Date(taskData.date);
        const [hours, minutes] = taskData.time.split(':').map(Number);
        selectedDateTime.setHours(hours, minutes, 0, 0);
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        if (selectedDateTime < thirtyMinutesFromNow) {
          alert('Give doers a bit of time! Please schedule at least 30 minutes from now.');
          return;
        }
        if (!taskData.budget || parseFloat(taskData.budget) <= 0) {
          alert('What\'s your budget? Tell us how much you can pay.');
          return;
        }
        const budgetNum = parseFloat(taskData.budget);
        if (budgetNum < 5) {
          alert('Budget should be at least SGD $5 to attract good doers.');
          return;
        }
        onReview();
      }} className="space-y-6">
        {/* Title Input with AI Suggestions */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Errand Title *
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
                    className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded transition-colors text-sm text-gray-700"
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

        {/* Tips Section - Shows instantly as title is typed */}
        {taskData.title.trim() && descriptionTips && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 animate-fade-in">
            <p className="text-xs font-semibold text-errandify-orange-700 mb-2">💡 Tips for this errand:</p>
            <p className="text-xs text-errandify-orange-700 leading-relaxed">
              {descriptionTips}
            </p>
          </div>
        )}

        {/* Description - Shows instantly as title is typed */}
        {taskData.title.trim() && (
          <div className="animate-fade-in">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Description *
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => onTaskUpdate({ description: e.target.value })}
              placeholder="Give more details about what you need done..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
            />
            {!taskData.description?.trim() && (
              <p className="text-xs text-red-600 mt-1">Description is required</p>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-3">
            Category *
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
              Time *
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

        {/* Validation Messages */}
        {(() => {
          const errors = [];

          if (!taskData.title?.trim()) errors.push('Add a errand title - what do you need help with?');
          if (!taskData.description?.trim()) errors.push('Describe your errand - give more details so doers understand');
          if (taskData.title?.trim() && taskData.title.trim().length < 5) errors.push('Make the title a bit longer - at least 5 characters');
          if (taskData.description?.trim() && taskData.description.trim().length < 10) errors.push('Give more details - at least 10 characters helps doers');
          if (!taskData.category?.trim()) errors.push('Pick a category - which type of errand is this?');
          if (!taskData.location?.trim()) errors.push('Tell us where - which area do you need help in?');
          if (!taskData.date?.trim()) errors.push('When? - Pick a date for your errand');
          if (taskData.date?.trim()) {
            const selectedDate = new Date(taskData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) errors.push('Pick a future date - we can\'t schedule for the past');
          }
          if (!taskData.time?.trim()) errors.push('What time? - Pick a time for your errand');
          if (taskData.time?.trim() && taskData.date?.trim()) {
            const selectedDateTime = new Date(taskData.date);
            const [hours, minutes] = taskData.time.split(':').map(Number);
            selectedDateTime.setHours(hours, minutes, 0, 0);
            const now = new Date();
            const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
            if (selectedDateTime < thirtyMinutesFromNow) errors.push('Give doers notice - schedule at least 30 minutes from now');
          }
          if (!taskData.budget || parseFloat(taskData.budget) <= 0) errors.push('What\'s your budget? - Tell us how much you can pay');
          if (taskData.budget && parseFloat(taskData.budget) < 5) errors.push('Budget needs to be at least SGD $5 to attract doers');

          return errors.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-300 rounded-lg p-3 text-xs text-orange-800">
              <p className="font-bold mb-1.5">Almost there! Just a few things:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                {errors.map((error, idx) => <li key={idx}>{error}</li>)}
              </ul>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={(() => {
              // Check title
              if (!taskData.title?.trim() || taskData.title.trim().length < 5) return true;
              // Check description
              if (!taskData.description?.trim() || taskData.description.trim().length < 10) return true;
              // Check category
              if (!taskData.category?.trim()) return true;
              // Check location
              if (!taskData.location?.trim()) return true;
              // Check date
              if (!taskData.date?.trim()) return true;
              const selectedDate = new Date(taskData.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (selectedDate < today) return true;
              // Check time
              if (!taskData.time?.trim()) return true;
              const selectedDateTime = new Date(taskData.date);
              const [hours, minutes] = taskData.time.split(':').map(Number);
              selectedDateTime.setHours(hours, minutes, 0, 0);
              const now = new Date();
              const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
              if (selectedDateTime < thirtyMinutesFromNow) return true;
              // Check budget
              if (!taskData.budget || parseFloat(taskData.budget) <= 0 || parseFloat(taskData.budget) < 5) return true;
              return false;
            })()}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
