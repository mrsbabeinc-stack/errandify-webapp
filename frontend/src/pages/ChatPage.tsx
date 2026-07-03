import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import TaskChatbox from '../components/TaskChatbox';
import { initializeSocket, getSocket, isSocketConnected as checkSocketConnected } from '../utils/socketClient';

interface ChatPageProps {
  userRole: 'asker' | 'doer';
}

interface Conversation {
  id: number;
  formattedId?: string;
  title: string;
  otherPartyName: string;
  status: string;
  lastMessageAt?: string;
  deadline?: string;
  location?: string;
  postal?: string;
  budget?: number;
  description?: string;
  unreadCount?: number;
}

export default function ChatPage({ userRole }: ChatPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedErrandId, setSelectedErrandId] = useState<number | null>(null);
  const [showChatbox, setShowChatbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [unreadCounts, setUnreadCounts] = useState<Map<number, number>>(new Map());
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' } | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'asker' | 'doer'>('all');
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    // Check if errandId is in location state (from notification click) or URL query params
    const stateErrandId = (location.state as any)?.errandId;
    const urlErrandId = searchParams.get('errandId');
    const errandIdParam = stateErrandId || urlErrandId;

    console.log('[ChatPage] Full location.state:', location.state);
    console.log('[ChatPage] stateErrandId:', stateErrandId);
    console.log('[ChatPage] urlErrandId:', urlErrandId);
    console.log('[ChatPage] Final errandIdParam:', errandIdParam);

    if (errandIdParam) {
      const errandId = typeof errandIdParam === 'string' ? parseInt(errandIdParam, 10) : errandIdParam;
      console.log('[ChatPage] Parsed errandId:', errandId, 'type:', typeof errandId);
      setSelectedErrandId(errandId);
      setShowChatbox(true);
    }
  }, [location, searchParams]);

  // Auto-open chat when conversations load and we have a selectedErrandId from URL
  useEffect(() => {
    console.log('[ChatPage] selectedErrandId:', selectedErrandId, 'allConversations.length:', allConversations.length, 'loading:', loading);
    if (selectedErrandId && !loading) {
      const conversation = allConversations.find(c => c.id === selectedErrandId);
      console.log('[ChatPage] Auto-opening chat for errandId:', selectedErrandId, 'conversation found:', !!conversation);
      // Open chatbox regardless of whether conversation is in list (TaskChatbox will fetch it)
      setShowChatbox(true);
    }
  }, [allConversations, selectedErrandId, loading]);

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    if (token) {
      initializeSocket(token);
    }

    // Fetch conversations on mount
    fetchAllConversations();

    // Optional: Refresh conversations periodically (less frequent now - every 30s instead of 3s)
    // This is a fallback if socket updates miss any changes
    const interval = setInterval(fetchAllConversations, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const fetchAllConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch both asker and doer conversations
      const askerResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?myOnly=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const doerResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?accepted=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Combine and deduplicate
      const allData = [
        ...(askerResponse.data.success && Array.isArray(askerResponse.data.data) ? askerResponse.data.data : []),
        ...(doerResponse.data.success && Array.isArray(doerResponse.data.data) ? doerResponse.data.data : []),
      ];

      console.log('[ChatPage] askerResponse:', askerResponse.data);
      console.log('[ChatPage] doerResponse:', doerResponse.data);
      console.log('[ChatPage] allData (before dedup):', allData);

      // Remove duplicates based on ID
      const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());

      console.log('[ChatPage] uniqueData (after dedup):', uniqueData);

      const activeChats = uniqueData.filter((errand: any) => {
        // Only show chats when offer is confirmed, in_progress, or completed
        // Open status means no bid accepted yet - no chat until doer is selected
        const chatableStatuses = ['confirmed', 'in_progress', 'completed_unconfirmed', 'completed_confirmed', 'completed'];
        return chatableStatuses.includes(errand.status);
      });

      console.log('[ChatPage] activeChats:', activeChats);
      console.log('[ChatPage] Sample errand data:', activeChats[0]);

      // Get current user ID for role determination
      const currentUserStr = localStorage.getItem('user');
      const currentUserId = currentUserStr ? JSON.parse(currentUserStr).id : null;

      const allConversations = activeChats.map((errand: any) => {
        // Determine user's role: if current user is asker_id, they're the asker; otherwise they're the doer
        const userRole = errand.asker_id === currentUserId ? 'asker' : 'doer';
        const otherPartyName = userRole === 'asker'
          ? (errand.doerName || 'Doer')
          : (errand.askerName || 'Asker');

        return {
          id: errand.id,
          formattedId: errand.errandId || errand.formatted_id || `ER${errand.id}`,
          title: errand.title,
          otherPartyName,
          status: errand.status,
          lastMessageAt: errand.updatedAt,
          deadline: errand.deadline,
          location: errand.location,
          postal: errand.postal_code,
          budget: errand.budget,
          description: errand.description,
          role: userRole,
        };
      });

      setAllConversations(allConversations);
      filterConversations(allConversations);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = (convos: any[]) => {
    let filtered = convos;

    if (viewFilter === 'asker') {
      filtered = convos.filter(c => c.role === 'asker');
    } else if (viewFilter === 'doer') {
      filtered = convos.filter(c => c.role === 'doer');
    }

    // Sort by status priority: in_progress > confirmed > confirmed_awaiting_start > completed
    const statusPriority: Record<string, number> = {
      'in_progress': 0,
      'confirmed': 1,
      'confirmed_awaiting_start': 2,
      'completed': 3,
    };

    filtered = filtered.sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 999;
      const priorityB = statusPriority[b.status] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by last message time (newest first)
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    setConversations(filtered);
  };

  useEffect(() => {
    filterConversations(allConversations);
  }, [viewFilter, allConversations]);

  // Monitor socket connection status
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsSocketConnected(true);
      setNotification({ message: '✅ Connected to real-time messaging', type: 'info' });
      setTimeout(() => setNotification(null), 3000);
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
      setNotification({ message: '⏳ Reconnecting to messaging...', type: 'warning' });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial status
    setIsSocketConnected(checkSocketConnected());

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

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
      case 'confirmed_awaiting_start':
        return 'Awaiting Start';
      case 'completed_unconfirmed':
        return 'Awaiting Confirmation';
      case 'completed_confirmed':
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getAreaOnly = (location?: string) => {
    if (!location) return 'Singapore';
    if (location.toLowerCase() === 'remote') return 'Remote';

    // Extract area name from location
    // Hana stores area as: "Area Name" or "Area Name 123456" (postal)
    // Examples: "Test Location" → "Test Location"
    //          "WHOLESALE CENTRE 110001" → "WHOLESALE CENTRE"
    //          "GUL 629652" → "GUL"

    // Remove trailing postal codes/numbers: "AREA 629652" → "AREA"
    const withoutTrailingNumbers = location.replace(/\s+\d{6}[\d\s]*$/, '').trim();

    // Remove anything that looks like a unit/building number: "#12-345" → empty
    if (/^#/.test(withoutTrailingNumbers) || /^\d+[-\/]/.test(withoutTrailingNumbers)) {
      return 'Singapore';
    }

    // Return the cleaned location if it has meaningful content
    if (withoutTrailingNumbers && withoutTrailingNumbers.length > 0 && withoutTrailingNumbers !== 'Singapore') {
      return withoutTrailingNumbers;
    }

    return 'Singapore';
  };

  // Use allConversations when looking up from URL param, since viewFilter might exclude it
  const selectedConversation = allConversations.find(c => c.id === selectedErrandId) || conversations.find(c => c.id === selectedErrandId);

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
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24 relative">
      {/* Socket Connection Status Indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <p className="text-xs font-medium text-gray-600">
          {isSocketConnected ? '✅ Real-time messaging active' : '⏳ Connecting...'}
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-4 right-4 p-3 rounded-lg shadow-lg text-sm font-semibold z-40 animate-bounce ${
          notification.type === 'info' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
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

      {/* View Filter - All/Asker/Doer */}
      <div className="flex gap-2 mb-3 pb-2">
        <button
          onClick={() => setViewFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            viewFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📬 All Messages
        </button>
        <button
          onClick={() => setViewFilter('asker')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            viewFilter === 'asker'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📝 My Tasks (Asker)
        </button>
        <button
          onClick={() => setViewFilter('doer')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            viewFilter === 'doer'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ My Jobs (Doer)
        </button>
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
          <p className="text-xs text-gray-400">Once you accept an errand or receive a confirmed offer, you can chat here</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500 mb-2">No chats match your search</p>
          <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative">
              {/* Unread Badge */}
              {unreadCounts.get(conversation.id) && unreadCounts.get(conversation.id)! > 0 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {unreadCounts.get(conversation.id)}
                </div>
              )}
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-gray-800 line-clamp-1">{conversation.title}</h3>
                    <span className="text-xs font-bold text-errandify-orange bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0">{conversation.formattedId}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(conversation.status)}`}>
                  {getStatusLabel(conversation.status)}
                </span>
              </div>

              {/* Start Date/Time and Area - 2 lines with buttons on right */}
              <div className="text-xs text-gray-600 space-y-0">
                {conversation.deadline && (
                  <div className="flex justify-between items-center">
                    <p>📅 {new Date(conversation.deadline).toLocaleDateString()} {new Date(conversation.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <button
                      onClick={() => handleOpenChat(conversation.id)}
                      className="bg-errandify-orange text-white px-2 py-1 rounded text-xs font-semibold hover:bg-opacity-90 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      💬 Chat
                    </button>
                  </div>
                )}
                {(conversation.location || conversation.postal) && conversation.status !== 'completed' && (
                  <div className="flex justify-between items-center">
                    <p>
                      📍 {`${conversation.postal}${conversation.location && conversation.postal ? ', ' : ''}${conversation.location}`}
                    </p>
                    <p className="text-gray-600">Posted by {conversation.otherPartyName}</p>
                  </div>
                )}
                {(conversation.location || conversation.postal) && conversation.status === 'completed' && (
                  <div className="flex justify-between items-center">
                    <p>
                      📍 {getAreaOnly(conversation.location)}
                    </p>
                    <p className="text-gray-600">Posted by {conversation.otherPartyName}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showChatbox && selectedErrandId && (
        <TaskChatbox
          taskId={selectedErrandId}
          taskTitle={selectedConversation?.title || 'Chat'}
          isOpen={showChatbox}
          onClose={handleCloseChat}
          errandDetails={selectedConversation ? {
            budget: selectedConversation.budget,
            deadline: selectedConversation.deadline,
            location: selectedConversation.location,
            postal_code: selectedConversation.postal,
            description: selectedConversation.description,
          } : undefined}
        />
      )}
    </div>
  );
}
