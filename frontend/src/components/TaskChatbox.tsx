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
  errandDetails?: {
    budget?: number;
    deadline?: string;
    location?: string;
    description?: string;
  };
}

export default function TaskChatbox({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  errandDetails,
}: TaskChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [askerId, setAskerId] = useState<number | null>(null);
  const [doerId, setDoerId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setMessages(response.data.data.messages || response.data.data);
      // Update online status and user IDs if available
      if (response.data.data.participantStatus) {
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          setCurrentUserId(user.id);
          setAskerId(response.data.data.participantStatus.askerId);
          setDoerId(response.data.data.participantStatus.doerId);
          const isAsker = user.id === response.data.data.participantStatus.askerId;
          const onlineStatus = isAsker
            ? response.data.data.participantStatus.doerOnline
            : response.data.data.participantStatus.askerOnline;
          setOtherUserOnline(onlineStatus);
        }
      }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 md:items-center md:justify-center">
      <div className="bg-white rounded-t-lg md:rounded-lg w-full md:max-w-2xl md:h-screen md:max-h-[90vh] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header - Full Width */}
        <div className="bg-errandify-brown text-white p-3 flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm">Chat with {currentUserId === askerId ? 'Doer' : 'Asker'}</h3>
              <span className={`inline-block w-2 h-2 rounded-full ${otherUserOnline ? 'bg-green-400' : 'bg-red-400'}`} title={otherUserOnline ? 'Online' : 'Offline'} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white text-xl hover:opacity-80 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col">


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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {msg.senderName}
                    </p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      msg.senderId === askerId
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {msg.senderId === askerId ? 'Asker' : 'Doer'}
                    </span>
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
          className="border-t border-gray-200 p-3 bg-white space-y-2"
        >
          {error && (
            <p className="text-red-600 text-xs mb-2">{error}</p>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-20 h-20">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={clearImageSelection}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-2 text-gray-500 hover:text-errandify-orange transition text-lg"
              title="Attach image"
              disabled={isLoading}
            >
              🖼️
            </button>
            <button
              type="submit"
              disabled={isLoading || (!newMessage.trim() && !selectedImage)}
              className="px-3 py-2 bg-errandify-orange text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {isLoading ? '⏳' : '→'}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

        </form>
          </div>
        </div>

        {/* Bottom Panel - Errand Details */}
        {errandDetails && (
          <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-32 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {errandDetails.budget && (
                <div>
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="text-xs font-bold text-errandify-orange">SGD ${errandDetails.budget}</p>
                </div>
              )}

              {errandDetails.deadline && (
                <div>
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="text-xs text-gray-700">
                    {new Date(errandDetails.deadline).toLocaleDateString('en-SG')} {new Date(errandDetails.deadline).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}

              {errandDetails.location && (
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-xs text-gray-700">📍 {errandDetails.location}</p>
                </div>
              )}

              {errandDetails.description && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 mb-0.5">Description</p>
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{errandDetails.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
