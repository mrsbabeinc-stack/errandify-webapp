import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  budget: string;
  notes: string;
}

type TaskStep = 'start' | 'title' | 'location' | 'date' | 'budget' | 'notes' | 'review';

interface HanaTaskCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToManual: () => void;
  onTaskCreated?: (taskId: string) => void;
}

export default function HanaTaskCreation({
  isOpen,
  onClose,
  onSwitchToManual,
  onTaskCreated,
}: HanaTaskCreationProps) {
  const [currentStep, setCurrentStep] = useState<TaskStep>('start');
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    category: '',
    location: '',
    date: '',
    time: '',
    budget: '',
    notes: '',
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hanaMessage, setHanaMessage] = useState('');
  const [isExpressing, setIsExpressing] = useState(false);

  useEffect(() => {
    if (isOpen && !hanaMessage) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = () => {
    setHanaMessage("Hello! 🌸 I'm Hana. Let's create your task together!\n\nShare what you need done, your location, timing, and budget. I'll take care of the rest.");
    setCurrentStep('title');
    triggerExpression();
  };

  const triggerExpression = () => {
    setIsExpressing(true);
    setTimeout(() => setIsExpressing(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);
    triggerExpression();

    try {
      switch (currentStep) {
        case 'title':
          await processTitle(userInput);
          break;
        case 'location':
          await processLocation(userInput);
          break;
        case 'date':
          await processDate(userInput);
          break;
        case 'budget':
          await processBudget(userInput);
          break;
        case 'notes':
          await processNotes(userInput);
          break;
      }
    } catch (error) {
      console.error('Chat error:', error);
      setHanaMessage('Sorry, I had trouble understanding. Can you try again?');
    } finally {
      setLoading(false);
    }
  };

  const processTitle = async (input: string) => {
    setTaskData((prev) => ({ ...prev, title: input, description: input }));

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/detect-category`,
        { title: input, description: input }
      );
      if (response.data.data.category) {
        setTaskData((prev) => ({ ...prev, category: response.data.data.category }));
      }
    } catch (err) {
      console.log('Category detection failed');
    }

    setHanaMessage("Got it! 📍 Now, where do you need this done?");
    setCurrentStep('location');
  };

  const processLocation = async (input: string) => {
    setTaskData((prev) => ({ ...prev, location: input }));
    setHanaMessage("Great! 📅 When do you need it done?\n(e.g., Tomorrow, Saturday, 25 Dec at 2pm)");
    setCurrentStep('date');
  };

  const processDate = async (input: string) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/parse-datetime`,
        { input }
      );
      setTaskData((prev) => ({
        ...prev,
        date: response.data.data.date,
        time: response.data.data.time,
      }));
    } catch (err) {
      setTaskData((prev) => ({ ...prev, date: input, time: '10:00' }));
    }

    setHanaMessage("Perfect! 💰 What's your budget? (in SGD)");
    setCurrentStep('budget');
  };

  const processBudget = async (input: string) => {
    const budget = input.replace(/[^\d.]/g, '');
    setTaskData((prev) => ({ ...prev, budget }));
    setHanaMessage("Any special notes? (type 'skip' if none)");
    setCurrentStep('notes');
  };

  const processNotes = async (input: string) => {
    if (input.toLowerCase() !== 'skip') {
      setTaskData((prev) => ({ ...prev, notes: input }));
    }

    const summary = `✓ ${taskData.title}\n📍 ${taskData.location}\n📅 ${new Date(taskData.date).toLocaleDateString('en-SG')} ${taskData.time}\n💰 SGD $${taskData.budget}\n\nReady to post?`;

    setHanaMessage(summary);
    setCurrentStep('review');
  };

  const handleConfirmTask = async () => {
    setLoading(true);
    try {
      const filterResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/content-filter`,
        {
          title: taskData.title,
          description: taskData.description,
        }
      );

      if (filterResponse.data.data.status === 'FLAG') {
        setHanaMessage('⚠️ This task needs review. Our team will check it shortly.');
        setCurrentStep('start');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          location: taskData.location,
          budget: parseFloat(taskData.budget) || 0,
          deadline: new Date(`${taskData.date}T${taskData.time}`).toISOString(),
          specialNote: taskData.notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setHanaMessage('✅ Task posted!\n\nCreate another?');
      setCurrentStep('start');
      setTaskData({
        title: '',
        description: '',
        category: '',
        location: '',
        date: '',
        time: '',
        budget: '',
        notes: '',
      });

      if (onTaskCreated) {
        onTaskCreated(response.data.data.id);
      }
    } catch (err: any) {
      setHanaMessage(`❌ ${err.response?.data?.error || 'Failed to create task'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end justify-center p-0">
      {/* Compact Half-Page Modal */}
      <div className="bg-white rounded-t-3xl shadow-2xl w-full h-[95vh] max-w-2xl flex flex-col overflow-hidden">
        {/* Header - Compact */}
        <div className="bg-errandify-orange px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white">Hana (Your AI Sister)</h1>
            <p className="text-orange-100 text-xs">Chat With Hana</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToManual}
              className="text-white hover:text-orange-100 font-semibold text-sm underline"
            >
              Manual Input
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-100 text-2xl font-light"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content - Compact Layout */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Top Section: Speech Bubble */}
          {hanaMessage && (
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="bg-errandify-bg border-2 border-errandify-orange rounded-3xl px-6 py-4 shadow-md animate-slideDown">
                <p className="text-gray-800 text-center whitespace-pre-line leading-relaxed text-sm">
                  {hanaMessage}
                </p>
              </div>
            </div>
          )}

          {/* Middle Section: Hana Image - Compressed */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-4 py-4">
            <div
              className={`transition-all duration-500 ${
                isExpressing ? 'scale-105' : 'scale-100'
              }`}
            >
              <img
                src="/images/Hana_Pose_2_4K.png"
                alt="Hana"
                className="h-96 w-auto object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* Bottom Section: Input - Always Visible */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
            {currentStep !== 'review' && currentStep !== 'start' && (
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type here..."
                  className="flex-1 px-4 py-3 border-2 border-errandify-orange border-opacity-30 rounded-full focus:outline-none focus:border-opacity-100 text-sm"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {loading ? '•••' : '→'}
                </button>
              </form>
            )}

            {currentStep === 'review' && (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmTask}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Posting...' : '✓ Post'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('notes');
                    setHanaMessage("Let me know what to change.");
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-400 text-sm"
                >
                  Edit
                </button>
              </div>
            )}

            {currentStep === 'start' && hanaMessage.includes('✅') && (
              <div className="flex gap-3">
                <button
                  onClick={initializeChat}
                  className="flex-1 px-4 py-3 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 text-sm"
                >
                  + New Task
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-400 text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
