import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'user' | 'hana';
  text: string;
  timestamp: Date;
}

type Language = 'en' | 'zh' | 'yue';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  yue: '🇭🇰 粵語',
};

const LANGUAGE_PROMPTS: Record<Language, string> = {
  en: 'Reply in English.',
  zh: '用中文回复。',
  yue: '用粵語回復。',
};

export default function HanaCustomerService() {
  console.log('[Hana] Component mounted');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'hana',
      text: "👋 Hi! I'm Hana, your Errandify assistant. How can I help?",
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
    console.log('[Hana] Send button clicked, input:', input);
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
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      console.log('[Hana] Making API call to /api/chat/hana/customer-service with language:', language);
      const response = await axios.post(
        '/api/chat/hana/customer-service',
        { message: input, language },
        { headers }
      );

      console.log('[Hana] Got response:', response.data);
      const reply = response.data?.data?.reply || response.data?.reply || 'How else can I help?';
      console.log('[Hana] Reply text:', reply);
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
          className="fixed bottom-20 right-6 w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange"
          title="Chat with Hana"
        >
          <img
            src="/images/hana-avatar.png"
            alt="Hana"
            className="w-full h-full object-cover"
          />
        </button>
      )}

      {/* Modal */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-20 right-6 z-50 max-h-96 overflow-hidden">
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
            <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white p-4 flex items-center gap-3">
              <img
                src="/images/hana-avatar.png"
                alt="Sister Hana"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <h2 className="font-bold text-sm">Sister Hana</h2>
                <p className="text-xs opacity-90">How can I help you today?</p>
              </div>
            </div>

            {/* Language Selector */}
            <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 flex gap-2">
              {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    language === lang
                      ? 'bg-errandify-orange text-white font-semibold'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-errandify-orange'
                  }`}
                >
                  {LANGUAGE_NAMES[lang]}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'hana' && (
                    <img
                      src="/images/hana-avatar.png"
                      alt="Hana"
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1"
                    />
                  )}
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
                <div className="flex gap-2 justify-start">
                  <img
                    src="/images/hana-avatar.png"
                    alt="Hana"
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1"
                  />
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
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange ring-2 ring-orange-300"
          title="Chat with Hana"
        >
          <img
            src="/images/hana-avatar.png"
            alt="Hana"
            className="w-full h-full object-cover"
          />
        </button>
      )}
    </>
  );
}
