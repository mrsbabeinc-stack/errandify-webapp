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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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

  // Filter conversations
  const filteredConversations = conversations.filter((conversation) => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = selectedStatus === 'all' || conversation.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24">
      <h1 className="text-lg font-bold text-errandify-brown mb-2">Messages</h1>
      <p className="text-xs text-gray-600 mb-4">
        Chat with users about errands
      </p>

      {/* Search Box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search task name or user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-errandify-orange"
        />
      </div>

      {/* Status Filter Buttons */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selectedStatus === 'all'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedStatus('confirmed')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selectedStatus === 'confirmed'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Confirmed
        </button>
        <button
          onClick={() => setSelectedStatus('in_progress')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selectedStatus === 'in_progress'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setSelectedStatus('completed_unconfirmed')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selectedStatus === 'completed_unconfirmed'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Awaiting Confirmation
        </button>
        <button
          onClick={() => setSelectedStatus('completed_confirmed')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selectedStatus === 'completed_confirmed'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Completed
        </button>
      </div>

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
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500 mb-2">No chats match your search</p>
          <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-800 line-clamp-1">{conversation.title}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(conversation.status)}`}>
                  {getStatusLabel(conversation.status)}
                </span>
              </div>

              {/* Start Date/Time and Area - 2 lines with buttons on right */}
              <div className="text-xs text-gray-600 mb-3 space-y-0.5">
                {conversation.deadline && (
                  <div className="flex justify-between items-center">
                    <p>📅 {new Date(conversation.deadline).toLocaleDateString()} {new Date(conversation.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <button
                      onClick={() => handleOpenChat(conversation.id)}
                      className="bg-errandify-brown text-white px-2 py-1 rounded text-xs font-semibold hover:bg-opacity-90 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      💬 Chat
                    </button>
                  </div>
                )}
                {(conversation.location || conversation.postal) && (
                  <div className="flex justify-between items-center">
                    <p>📍 {conversation.postal}{conversation.location && conversation.postal ? ', ' : ''}{conversation.location}</p>
                    <p className="text-gray-600">Posted by {conversation.otherPartyName}</p>
                  </div>
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
