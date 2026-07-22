import { useState, useEffect } from 'react';
import axios from 'axios';
import { TaskData } from '../../pages/HanaTaskCreationPage';

interface HanaChatModeProps {
  taskData: TaskData;
  onTaskUpdate: (updates: Partial<TaskData>) => void;
  onReview: () => void;
}

type ChatStep = 'title' | 'location' | 'date' | 'budget' | 'notes' | 'complete';

interface ChatMessage {
  id: string;
  role: 'hana' | 'user';
  content: string;
  timestamp: Date;
}

export default function HanaChatMode({
  taskData,
  onTaskUpdate,
  onReview,
}: HanaChatModeProps) {
  const [currentStep, setCurrentStep] = useState<ChatStep>('title');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'hana',
      content: "Hello! I'm Hana 🌸. Let's create your errand together. What do you need done?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryMap: Record<string, string> = {
    'eldercare': 'Caregiving & Elder Companionship',
    'childcare': 'Childcare & School Pickup/Drop-off',
    'homehelp': 'Household Errands & Home Maintenance',
    'wellness': 'Wellness Support',
    'tripcarry': 'Cross-Border Errands',
    'petcare': 'Pet Care',
    'delivery': 'Delivery',
    'eventhelp': 'Events',
    'donate': 'Donate / Giveback',
    'localbiz': 'Microservices for Local SMEs',
  };

  const stepPrompts: Record<ChatStep, string> = {
    title: "What do you need done?",
    location: "Where? (your location or specific address)",
    date: "When do you need it? (date and time)",
    budget: "What's your budget? (in SGD)",
    notes: "Any special requirements? (optional, you can skip)",
    complete: "Perfect! Let me review your errand.",
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    setInput('');
    setLoading(true);

    try {
      // Process based on current step
      switch (currentStep) {
        case 'title':
          await processTitle(userMessage);
          break;
        case 'location':
          await processLocation(userMessage);
          break;
        case 'date':
          await processDate(userMessage);
          break;
        case 'budget':
          await processBudget(userMessage);
          break;
        case 'notes':
          await processNotes(userMessage);
          break;
      }
    } catch (error) {
      console.error('Chat error:', error);
      addHanaMessage('Sorry, I had trouble understanding. Can you try again?');
    } finally {
      setLoading(false);
    }
  };

  const addHanaMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + Math.random()).toString(),
        role: 'hana',
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const processTitle = async (input: string) => {
    onTaskUpdate({ title: input, description: input });

    // Detect category using extraction endpoint
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input }
      );
      console.log('[Hana] Full extraction response:', response.data.data);
      console.log('[Hana] Category from API:', response.data.data?.category);
      if (response.data.data?.category) {
        console.log('[Hana] ✅ Extracted category:', response.data.data.category);
        onTaskUpdate({ category: response.data.data.category });
        console.log('[Hana] Category update called with:', response.data.data.category);
      } else {
        console.log('[Hana] ❌ No category in extraction response');
      }
    } catch (err) {
      console.log('[Hana] ❌ Category extraction failed:', err);
    }

    addHanaMessage("Got it! Now, where do you need this done?");
    setCurrentStep('location');
  };

  const processLocation = async (input: string) => {
    onTaskUpdate({ location: input });

    // Extract area and postal code from location
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input }
      );
      console.log('[Hana] Location extraction response:', response.data.data);
      if (response.data.data) {
        console.log('[Hana] Updating location data - area:', response.data.data.area, 'postal:', response.data.data.postalCode);
        onTaskUpdate({
          area: response.data.data.area,
          fullAddress: response.data.data.fullAddress,
          postalCode: response.data.data.postalCode,
        });
      }
    } catch (err) {
      console.log('Location extraction failed', err);
    }

    addHanaMessage("Thanks! When do you need it done? (e.g., Tomorrow at 2pm, Saturday, Next week)");
    setCurrentStep('date');
  };

  const processDate = async (input: string) => {
    // Parse natural language date
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/parse-datetime`,
        { input }
      );
      const { date, time } = response.data.data;
      onTaskUpdate({ date, time });
    } catch (err) {
      // Fallback: try to extract date/time from input
      onTaskUpdate({ date: input, time: '10:00' });
    }

    addHanaMessage("Perfect! What's your budget for this? (in SGD, e.g., 50, 100)");
    setCurrentStep('budget');
  };

  const processBudget = async (input: string) => {
    const budget = input.replace(/[^\d.]/g, '');
    onTaskUpdate({ budget });
    addHanaMessage("Great! Any special requirements or notes? (You can skip this if not)");
    setCurrentStep('notes');
  };

  const processNotes = async (input: string) => {
    if (input.toLowerCase() !== 'skip' && input.toLowerCase() !== 'no') {
      onTaskUpdate({ notes: input });
    }

    addHanaMessage(
      "Perfect! Here's your errand summary:\n\n" +
      `📝 ${taskData.title}\n` +
      `📍 ${taskData.location}\n` +
      `📅 ${taskData.date} at ${taskData.time}\n` +
      `💰 SGD $${taskData.budget}\n` +
      (taskData.notes ? `📌 ${taskData.notes}\n` : '') +
      "\nReady to post?"
    );
    setCurrentStep('complete');
  };

  const handleSkip = () => {
    if (currentStep === 'notes') {
      processNotes('skip');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      {/* Chat Messages */}
      <div className="bg-gray-50 rounded-lg p-6 h-96 overflow-y-auto mb-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'hana' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs px-4 py-3 rounded-lg ${
                msg.role === 'hana'
                  ? 'bg-orange-100 text-errandify-orange-900 rounded-bl-none'
                  : 'bg-errandify-orange text-white rounded-br-none'
              }`}
            >
              {msg.role === 'hana' && <span className="text-lg mr-2">🌸</span>}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      {currentStep !== 'complete' ? (
        <form onSubmit={handleSendMessage} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
            {currentStep === 'notes' && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onReview}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90"
          >
            Review & Post
          </button>
          <button
            onClick={() => {
              setCurrentStep('title');
              setMessages([
                {
                  id: '1',
                  role: 'hana',
                  content: "Hello! I'm Hana 🌸. Let's create your errand together. What do you need done?",
                  timestamp: new Date(),
                },
              ]);
            }}
            className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
