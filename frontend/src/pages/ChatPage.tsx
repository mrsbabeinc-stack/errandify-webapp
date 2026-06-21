import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskChatbox from '../components/TaskChatbox';

interface ChatPageProps {
  userRole: 'asker' | 'doer';
}

interface Conversation {
  id: number;
  title: string;
  otherPartyName: string;
  status: string;
  lastMessageAt?: string;
  deadline?: string;
  location?: string;
  postal?: string;
}

export default function ChatPage({ userRole }: ChatPageProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedErrandId, setSelectedErrandId] = useState<number | null>(null);
  const [showChatbox, setShowChatbox] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [userRole]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = userRole === 'asker' ? 'myOnly=true' : 'accepted=true';

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        const activeChats = response.data.data.filter((errand: any) =>
          ['confirmed', 'in_progress', 'completed_unconfirmed', 'completed_confirmed'].includes(errand.status)
        );

        const conversations = activeChats.map((errand: any) => ({
          id: errand.id,
          title: errand.title,
          otherPartyName: errand.askerName || errand.doerName || 'Unknown',
          status: errand.status,
          lastMessageAt: errand.updatedAt,
          deadline: errand.deadline,
          location: errand.location,
          postal: errand.postal_code,
        }));

        setConversations(conversations);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (errandId: number) => {
    setSelectedErrandId(errandId);
    setShowChatbox(true);
  };

  const handleCloseChat = () => {
    setShowChatbox(false);
    setSelectedErrandId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-orange-100 text-errandify-orange-700';
      case 'in_progress':
        return 'bg-green-100 text-green-700';
      case 'completed_unconfirmed':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed_confirmed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed_unconfirmed':
        return 'Awaiting Confirmation';
      case 'completed_confirmed':
        return 'Completed';
      default:
        return status;
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedErrandId);

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24">
      <h1 className="text-lg font-bold text-errandify-brown mb-2">Messages</h1>
      <p className="text-xs text-gray-600 mb-4">
        Chat with users about errands
      </p>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500 mb-2">No active chats yet</p>
          <p className="text-xs text-gray-400">Once you accept a task or receive an accepted bid, you can chat here</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-800 line-clamp-2">{conversation.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">with {conversation.otherPartyName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(conversation.status)}`}>
                  {getStatusLabel(conversation.status)}
                </span>
              </div>

              {/* Start Date/Time and Area - 2 lines */}
              <div className="text-xs text-gray-600 mb-3 space-y-0.5">
                {conversation.deadline && (
                  <p>📅 {new Date(conversation.deadline).toLocaleDateString()} {new Date(conversation.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {(conversation.location || conversation.postal) && (
                  <p>📍 {conversation.postal}{conversation.location && conversation.postal ? ', ' : ''}{conversation.location}</p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleOpenChat(conversation.id)}
                  className="flex-1 bg-errandify-orange text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  💬 Chat
                </button>
                {['in_progress', 'confirmed'].includes(conversation.status) && (
                  <button
                    onClick={() => navigate(`/task/${conversation.id}/execute`)}
                    className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    🚀 Work
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showChatbox && selectedConversation && selectedErrandId && (
        <TaskChatbox
          taskId={selectedErrandId}
          taskTitle={selectedConversation.title}
          isOpen={showChatbox}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}
