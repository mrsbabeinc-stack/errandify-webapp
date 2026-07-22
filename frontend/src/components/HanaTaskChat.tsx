import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import HanaAvatar from './HanaAvatar';

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

type TaskStep = 'start' | 'title' | 'location' | 'date' | 'budget' | 'notes' | 'review' | 'manual';

interface HanaTaskChatProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
}

export default function HanaTaskChat({
  isOpen,
  onClose,
  onTaskCreated,
}: HanaTaskChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [showManualForm, setShowManualForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = () => {
    const greeting: Message = {
      id: '1',
      role: 'hana',
      content: "Hello! 🌸 I'm Hana. Let's create your errand together! What do you need done?",
      timestamp: new Date(),
    };
    setMessages([greeting]);
    setCurrentStep('title');
  };

  const addHanaMessage = (content: string) => {
    const message: Message = {
      id: (Date.now() + Math.random()).toString(),
      role: 'hana',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);

    // Simulate speaking duration based on content length
    setIsSpeaking(true);
    const speakingDuration = Math.min(content.length * 30, 3000); // 30ms per character, max 3s
    setTimeout(() => setIsSpeaking(false), speakingDuration);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    addUserMessage(userInput);
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
      addHanaMessage('Sorry, I had trouble understanding. Can you try again?');
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

    addHanaMessage("Got it! 📍 Where do you need this done?");
    setCurrentStep('location');
  };

  const processLocation = async (input: string) => {
    setTaskData((prev) => ({ ...prev, location: input }));
    addHanaMessage("Great! 📅 When do you need it done? (e.g., Tomorrow, Next Saturday, 25 Dec)");
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

    addHanaMessage("Perfect! 💰 What's your budget? (in SGD, e.g., 50, 100)");
    setCurrentStep('budget');
  };

  const processBudget = async (input: string) => {
    const budget = input.replace(/[^\d.]/g, '');
    setTaskData((prev) => ({ ...prev, budget }));
    addHanaMessage("Excellent! 📝 Any special requirements or notes? (type 'skip' if none)");
    setCurrentStep('notes');
  };

  const processNotes = async (input: string) => {
    if (input.toLowerCase() !== 'skip') {
      setTaskData((prev) => ({ ...prev, notes: input }));
    }

    // Show summary
    const summary = `
📝 **${taskData.title}**
📍 ${taskData.location}
📅 ${new Date(taskData.date).toLocaleDateString('en-SG')} at ${taskData.time}
💰 SGD $${taskData.budget}
${taskData.notes ? `📌 ${taskData.notes}` : ''}

Ready to post this errand?`;

    addHanaMessage(summary);
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
        addHanaMessage('⚠️ This errand needs review before it goes live. Our team will check it shortly.');
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

      addHanaMessage(`✅ Errand posted successfully! You can view it or continue creating more errands.`);
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
      addHanaMessage(`❌ Error: ${err.response?.data?.error || 'Failed to create errand'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentStep === 'notes') {
      processNotes('skip');
    }
  };

  const handleManualSwitch = () => {
    setShowManualForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full h-[700px] flex flex-col overflow-hidden">
        {/* Header with Avatar */}
        <div className="bg-gradient-to-r from-pink-400 to-pink-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <h2 className="font-bold text-white text-lg">Hana (Your AI Sister)</h2>
              <p className="text-pink-100 text-xs">Chat With Hana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Animated Avatar */}
        <div className="bg-gradient-to-b from-pink-50 to-white p-4 border-b border-pink-100">
          <HanaAvatar isSpeaking={isSpeaking} isThinking={loading} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 animate-fadeIn" style={{ maxHeight: 'calc(700px - 320px)' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'hana' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-lg ${
                  msg.role === 'hana'
                    ? 'bg-pink-100 text-gray-800 rounded-bl-none'
                    : 'bg-errandify-orange text-white rounded-br-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!showManualForm ? (
          <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
            {currentStep !== 'review' && currentStep !== 'start' && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-400 text-sm"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 text-sm"
                >
                  Send
                </button>
                {currentStep === 'notes' && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 text-sm"
                  >
                    Skip
                  </button>
                )}
              </form>
            )}

            {currentStep === 'review' && (
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmTask}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Posting...' : '✓ Post Errand'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('notes');
                    setMessages((prev) => prev.slice(0, -1));
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 text-sm"
                >
                  Edit
                </button>
              </div>
            )}

            {currentStep === 'start' && (
              <div className="flex gap-2">
                <button
                  onClick={initializeChat}
                  className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 text-sm"
                >
                  + Create New Errand
                </button>
                <button
                  onClick={handleManualSwitch}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 text-sm"
                >
                  📝 Manual Form
                </button>
              </div>
            )}

            <div className="text-center text-xs text-gray-500">
              <button
                onClick={onClose}
                className="hover:underline font-semibold"
              >
                Close Hana
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">Switch to manual form mode to fill in errand details</p>
              <button
                onClick={() => {
                  setShowManualForm(false);
                  onClose();
                }}
                className="px-4 py-2 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 text-sm"
              >
                Open Manual Form
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in;
          }
        `}</style>
      </div>
    </div>
  );
}
