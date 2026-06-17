import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HanaAssistantProps {
  isOpen?: boolean;
}

export default function HanaAssistant({ isOpen: initialOpen = false }: HanaAssistantProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Hana. 🌸 I'm here to help you post tasks or answer questions. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat/hana`,
        {
          message: input,
          conversationId: 'hana-assistant',
        }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an issue. Please try again or contact support.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    const sosMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: '🆘 SOS - I need emergency help!',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, sosMessage]);
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat/hana/sos`,
        {
          conversationId: 'hana-assistant',
        }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get SOS response:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-300 to-pink-400 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all transform overflow-hidden border-4 border-white"
          title="Chat with Hana"
        >
          {/* Hana Avatar - will show image or fallback to emoji */}
          <img
            src="/images/hana-avatar.png"
            alt="Hana"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // Replace with emoji on error
              const btn = e.currentTarget.parentElement;
              if (btn) {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.textContent = '🌸';
                fallback.className = 'text-3xl';
                btn.appendChild(fallback);
              }
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 w-72 h-80 bg-white rounded-2xl shadow-3xl flex flex-col z-40 border border-pink-100" style={{transform: 'perspective(1000px) rotateX(2deg) rotateY(-2deg)'}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-300 to-pink-400 rounded-t-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hana Avatar in Header */}
          <div className="w-12 h-12 bg-white rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow">
            <img
              src="/images/hana-avatar.png"
              alt="Hana"
              className="w-full h-full object-cover"
              onError={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.textContent = '🌸';
                  fallback.className = 'w-full h-full flex items-center justify-center text-xl';
                  container.appendChild(fallback);
                }
              }}
            />
          </div>
          <div>
            <h3 className="font-bold text-white">Hana</h3>
            <p className="text-xs text-pink-100">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white text-xl hover:opacity-75"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-pink-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-errandify-orange text-white rounded-br-none'
                  : 'bg-white text-errandify-brown rounded-bl-none border border-pink-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-errandify-brown px-4 py-2 rounded-lg border border-pink-200 rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-pink-100 p-3 space-y-2">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Hana..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-errandify-orange text-white px-3 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 font-semibold text-sm"
          >
            Send
          </button>
        </form>

        {/* SOS Button */}
        <button
          onClick={handleSOS}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          🆘 SOS - Emergency Help
        </button>
      </div>
    </div>
  );
}
