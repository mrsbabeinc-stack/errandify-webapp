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

interface Message {
  id: string;
  role: 'hana' | 'user';
  content: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [hanaMessage]);

  useEffect(() => {
    if (isOpen && !hanaMessage) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = () => {
    setHanaMessage("Hello! 🌸 I'm Hana. Let's create your task together!\n\nShare what you need done, your location, timing, and budget. I'll take care of the rest.");
    setCurrentStep('title');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

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

    // Detect category
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
    setHanaMessage("Great! 📅 When do you need it done?\n(e.g., Tomorrow, Next Saturday, 25 Dec at 2pm)");
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

    setHanaMessage("Perfect! 💰 What's your budget?\n(in SGD, e.g., 50, 100, 200)");
    setCurrentStep('budget');
  };

  const processBudget = async (input: string) => {
    const budget = input.replace(/[^\d.]/g, '');
    setTaskData((prev) => ({ ...prev, budget }));
    setHanaMessage("Excellent! 📝 Any special requirements or notes?\n(You can type 'skip' if none)");
    setCurrentStep('notes');
  };

  const processNotes = async (input: string) => {
    if (input.toLowerCase() !== 'skip') {
      setTaskData((prev) => ({ ...prev, notes: input }));
    }

    const summary = `Perfect! Here's your task summary:

📝 ${taskData.title}
📍 ${taskData.location}
📅 ${new Date(taskData.date).toLocaleDateString('en-SG')} at ${taskData.time}
💰 SGD $${taskData.budget}
${taskData.notes ? `📌 ${taskData.notes}` : ''}

Ready to post?`;

    setHanaMessage(summary);
    setCurrentStep('review');
  };

  const handleConfirmTask = async () => {
    setLoading(true);
    try {
      // Content filter check
      const filterResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/content-filter`,
        {
          title: taskData.title,
          description: taskData.description,
        }
      );

      if (filterResponse.data.data.status === 'FLAG') {
        setHanaMessage('⚠️ This task needs review before it goes live. Our team will check it shortly.');
        setCurrentStep('start');
        return;
      }

      // Post the task
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

      setHanaMessage('✅ Task posted successfully!\n\nWould you like to create another task?');
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
      setHanaMessage(`❌ Error: ${err.response?.data?.error || 'Failed to create task'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Hana (Your AI Sister)</h1>
            <p className="text-orange-100 text-sm mt-1">Chat With Hana</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSwitchToManual}
              className="text-white hover:text-orange-100 font-semibold text-sm transition-colors underline"
            >
              Manual Input
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-100 text-3xl font-light leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-12">
          {/* Hana Avatar Section */}
          <div className="flex justify-center items-start">
            <div className="relative">
              {/* Speech Bubble */}
              {hanaMessage && (
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 z-10">
                  <div className="bg-errandify-bg border-2 border-errandify-orange rounded-3xl px-8 py-6 shadow-xl">
                    <p className="text-gray-800 text-center whitespace-pre-line leading-relaxed text-base">
                      {hanaMessage}
                    </p>
                    {/* Tail */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-12 border-r-12 border-t-12 border-l-transparent border-r-transparent border-t-errandify-bg"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hana Avatar Image - Half Body */}
              <img
                src="/images/hana-half-body.png"
                alt="Hana"
                className="w-96 h-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-96 h-80 bg-gradient-to-br from-errandify-bg to-orange-100 rounded-2xl flex items-center justify-center border-4 border-errandify-orange shadow-lg';
                  fallback.innerHTML = `
                    <div class="text-center">
                      <p class="text-6xl mb-4">👩</p>
                      <p class="text-gray-600 text-sm">Hana Avatar</p>
                      <p class="text-gray-500 text-xs mt-2">(Place hana-half-body.png in public/images/)</p>
                    </div>
                  `;
                  img.parentElement?.appendChild(fallback);
                }}
              />
            </div>
          </div>

          {/* Input Area */}
          <div className="mt-8" ref={messagesEndRef}>
            {currentStep !== 'review' && currentStep !== 'start' && (
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 px-6 py-4 border-2 border-errandify-orange border-opacity-30 rounded-full focus:outline-none focus:border-errandify-orange text-lg"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-8 py-4 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                >
                  {loading ? '...' : '→'}
                </button>
              </form>
            )}

            {currentStep === 'review' && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleConfirmTask}
                  disabled={loading}
                  className="px-8 py-4 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 disabled:opacity-50 text-lg"
                >
                  {loading ? 'Posting...' : '✓ Post Task'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('notes');
                    setHanaMessage("Let me know if you'd like to change anything.");
                  }}
                  disabled={loading}
                  className="px-8 py-4 bg-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-400 text-lg"
                >
                  Edit
                </button>
              </div>
            )}

            {currentStep === 'start' && hanaMessage.includes('successfully') && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={initializeChat}
                  className="px-8 py-4 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 text-lg"
                >
                  + Create New Task
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-400 text-lg"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
