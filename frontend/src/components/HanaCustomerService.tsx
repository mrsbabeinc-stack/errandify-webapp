import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaTaskCreation from './HanaTaskCreation';

interface Message {
  id: string;
  sender: 'user' | 'hana';
  text: string;
  timestamp: Date;
}

interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  fullAddress: string;
  date: string;
  time: string;
  duration: string;
  durationUnit: string;
  budget: string;
  postalCode: string;
  notes: string;
}

export default function HanaCustomerService() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'menu' | 'support' | 'create'>('menu');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'hana',
      text: "👋 Hi! I'm Hana. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/hana/customer-service',
        { message: input },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const reply = response.data?.data?.reply || response.data?.reply || 'How else can I help?';
      const hanaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'hana',
        text: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, hanaMessage]);
    } catch (error: any) {
      console.error('Failed to get Hana response:', error.response?.data || error.message);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'hana',
        text: "Sorry, I'm having trouble responding right now. Please try again or contact support@errandify.ai.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setMode('menu');
  };

  const handleTaskCreationComplete = (taskData: TaskData) => {
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    navigate(`/create-errand?prefilled=${prefilledJson}`);
    setIsOpen(false);
    setMode('menu');
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-40"
          title="Chat with Hana"
        >
          🤖
        </button>
      )}

      {/* Modal */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-24 right-6 z-50 max-h-96 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold"
          >
            ✕
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-2 right-9 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm"
          >
            −
          </button>

          <div className="w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white p-4">
              <h2 className="font-bold text-sm">Hana Assistant 🤖</h2>
              <p className="text-xs opacity-90">
                {mode === 'menu' && 'What can I help with?'}
                {mode === 'support' && 'Customer Support'}
                {mode === 'create' && 'Create an Errand'}
              </p>
            </div>

            {/* Menu View */}
            {mode === 'menu' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <button
                  onClick={() => setMode('support')}
                  className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg font-semibold text-blue-700 transition-colors"
                >
                  💬 Get Support
                </button>
                <button
                  onClick={() => setMode('create')}
                  className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg font-semibold text-green-700 transition-colors"
                >
                  ✨ Post an Errand
                </button>
              </div>
            )}

            {/* Support View */}
            {mode === 'support' && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                          msg.sender === 'user'
                            ? 'bg-errandify-orange text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-200">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t p-3 bg-white flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask Hana..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-errandify-orange"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-3 py-2 bg-errandify-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                  >
                    →
                  </button>
                </div>
              </>
            )}

            {/* Create View */}
            {mode === 'create' && (
              <div className="flex-1 overflow-y-auto bg-white">
                <HanaTaskCreation
                  isOpen={true}
                  onClose={() => {
                    setMode('menu');
                  }}
                  onComplete={handleTaskCreationComplete}
                  onSkipToManual={() => {
                    navigate('/create-errand');
                    setIsOpen(false);
                    setMode('menu');
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-40 ring-2 ring-orange-300"
          title="Chat with Hana"
        >
          🤖
        </button>
      )}
    </>
  );
}
