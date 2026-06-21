import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  id: number;
  taskId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  flagged: boolean;
  createdAt: string;
}

interface TaskChatboxProps {
  taskId: number;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskChatbox({
  taskId,
  taskTitle,
  isOpen,
  onClose,
}: TaskChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Poll for new messages every 2 seconds
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}/send`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewMessage('');
      fetchMessages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 md:items-center md:justify-center">
      <div className="bg-white rounded-t-lg md:rounded-lg w-full md:max-w-md md:h-96 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-errandify-brown text-white p-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h3 className="font-bold text-base">Chat: {taskTitle}</h3>
            <p className="text-xs text-orange-100">Real-time messaging</p>
          </div>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:opacity-80"
          >
            ✕
          </button>
        </div>


        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              <p>💬 No messages yet</p>
              <p className="text-xs mt-1">Start a conversation to coordinate!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.flagged ? 'opacity-60' : ''
                }`}
              >
                {msg.senderAvatar && (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {msg.senderName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className={`text-sm py-2 px-3 rounded-lg inline-block max-w-xs ${
                      msg.flagged
                        ? 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {msg.flagged ? (
                      <>
                        <p className="font-semibold">⚠️ Message flagged</p>
                        <p className="text-xs mt-1">
                          This message was reviewed for community safety.
                        </p>
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-gray-200 p-4 bg-white"
        >
          {error && (
            <p className="text-red-600 text-xs mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="px-3 py-2 bg-errandify-orange text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {isLoading ? '⏳' : '→'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💬 Messages are reviewed for community safety
          </p>
        </form>
      </div>
    </div>
  );
}
