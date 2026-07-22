import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  id: number;
  taskId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

interface TaskChatProps {
  taskId: number;
  taskTitle: string;
}

export default function TaskChat({ taskId, taskTitle }: TaskChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = parseInt(localStorage.getItem('user')?.split('"id":')[1]?.split(',')[0] || '0', 10);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setMessages(response.data.data || []);
      setError('');

      // Opening the conversation clears its unread badge (fire and forget)
      axios
        .post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}/read`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
        .catch(() => {});
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}/send`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setNewMessage('');
      await fetchMessages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[500px] bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white p-4">
        <h3 className="font-bold text-lg">💬 Errand Chat</h3>
        <p className="text-sm text-orange-100">{taskTitle}</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Start communicating about this errand!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.senderId === currentUserId
                    ? 'bg-errandify-orange text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-75">
                  {msg.senderName}
                </p>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.senderId === currentUserId ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {error && (
          <div className="text-red-600 text-sm mb-2 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-opacity text-sm"
          >
            {sending ? '⏳' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
}
