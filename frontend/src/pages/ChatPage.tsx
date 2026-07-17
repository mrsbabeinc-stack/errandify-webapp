import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import TaskChatbox from '../components/TaskChatbox';
import AdminThemeWrapper from '../components/AdminThemeWrapper';
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
      let askerData: any[] = [];
      let doerData: any[] = [];

      try {
        const askerResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?myOnly=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        askerData = askerResponse.data.success && Array.isArray(askerResponse.data.data) ? askerResponse.data.data : [];
        console.log('[ChatPage] askerResponse:', askerResponse.data);
      } catch (askerErr) {
        console.warn('[ChatPage] Failed to fetch asker conversations:', askerErr);
        askerData = [];
      }

      try {
        const doerResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?accepted=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        doerData = doerResponse.data.success && Array.isArray(doerResponse.data.data) ? doerResponse.data.data : [];
        console.log('[ChatPage] doerResponse:', doerResponse.data);
      } catch (doerErr) {
        console.warn('[ChatPage] Failed to fetch doer conversations:', doerErr);
        doerData = [];
      }

      // Combine and deduplicate
      const allData = [...askerData, ...doerData];

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
      if (activeChats.length > 0) {
        console.log('[ChatPage] Sample errand status:', activeChats[0]?.status, 'Type:', typeof activeChats[0]?.status);
        activeChats.forEach((chat, idx) => {
          if (chat.status === 'completed') {
            console.log(`[ChatPage] Chat ${idx} (${chat.title}) has completed status`);
          }
        });
      }

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
    if (!location) return '📍 Location';
    const loc = location.trim();
    if (loc.toLowerCase() === 'remote') return 'Remote';
    if (!loc || loc.toLowerCase() === 'location' || loc.toLowerCase() === 'singapore') return '📍 Location';

    // If it's JUST a postal code, show placeholder
    if (/^[A-Z]?\d{6}$/.test(loc)) return '📍 Location';

    // Otherwise return the location as-is (area should be passed directly from form)
    return loc;
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
    <AdminThemeWrapper title="💬 MyChat" subtitle="Chat with users about errands" showBackButton onBack={() => navigate(-1)}>
      <div style={{maxWidth: '1000px', margin: '0 auto'}}>
        {/* Socket Connection Status Indicator */}
        <div style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: isSocketConnected ? '#E8F5E9' : '#FFF3E0', borderRadius: '8px', borderLeft: `4px solid ${isSocketConnected ? '#4CAF50' : '#FF9800'}`}}>
          <div style={{width: '8px', height: '8px', borderRadius: '50%', background: isSocketConnected ? '#4CAF50' : '#FF9800'}} />
          <p style={{fontSize: '12px', fontWeight: '600', color: isSocketConnected ? '#2E7D32' : '#E65100', margin: 0}}>
            {isSocketConnected ? '✅ Real-time messaging active' : '⏳ Connecting...'}
          </p>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div style={{position: 'fixed', top: '16px', left: '16px', right: '16px', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: '600', zIndex: 40, background: notification.type === 'info' ? '#2196F3' : '#FF9800', color: 'white', animation: 'fadeInOut 3s ease-in-out'}}>
            {notification.message}
          </div>
        )}

        {/* Search Box */}
        <div style={{marginBottom: '16px'}}>
          <input
            type="text"
            placeholder="🔍 Search task name or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{width: '100%', padding: '10px 12px', border: '2px solid #FFE0D6', borderRadius: '8px', fontSize: '14px', fontWeight: '500', background: '#FFF9F7', outline: 'none', transition: 'all 0.2s'}}
            onFocus={(e) => {e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';}}
            onBlur={(e) => {e.currentTarget.style.borderColor = '#FFE0D6'; e.currentTarget.style.boxShadow = 'none';}}
          />
        </div>

        {/* View Filter - All/Asker/Doer */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '8px'}}>
          {['all', 'asker', 'doer'].map((filter) => (
            <button
              key={filter}
              onClick={() => setViewFilter(filter as any)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: viewFilter === filter ? '#FF6B35' : 'linear-gradient(135deg, rgba(255,245,240,0.6) 0%, rgba(255,232,214,0.4) 100%)',
                color: viewFilter === filter ? 'white' : '#555',
                boxShadow: viewFilter === filter ? '0 4px 12px rgba(255, 107, 53, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={(e) => {if (viewFilter !== filter) {e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,232,214,0.8) 0%, rgba(255,200,160,0.6) 100%)'; e.currentTarget.style.transform = 'translateY(-2px)';}} }
              onMouseLeave={(e) => {if (viewFilter !== filter) {e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,245,240,0.6) 0%, rgba(255,232,214,0.4) 100%)'; e.currentTarget.style.transform = 'translateY(0)';}} }
            >
              {filter === 'all' && '📬 All Messages'}
              {filter === 'asker' && '📝 My Tasks (Asker)'}
              {filter === 'doer' && '✓ My Jobs (Doer)'}
            </button>
          ))}
        </div>

        {/* Status Filter Buttons */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px'}}>
          {[
            { value: 'all', label: 'All' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed_unconfirmed', label: 'Awaiting Confirmation' },
            { value: 'completed_confirmed', label: 'Completed' }
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: selectedStatus === status.value ? '#FF6B35' : '#F5F5F5',
                color: selectedStatus === status.value ? 'white' : '#555',
                boxShadow: selectedStatus === status.value ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {if (selectedStatus !== status.value) e.currentTarget.style.background = '#E8E8E8';}}
              onMouseLeave={(e) => {if (selectedStatus !== status.value) e.currentTarget.style.background = '#F5F5F5';}}
            >
              {status.label}
            </button>
          ))}
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
        <div style={{display: 'grid', gap: '12px'}}>
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} style={{background: 'linear-gradient(135deg, #FFF9F7 0%, #FFF5F0 100%)', borderRadius: '12px', padding: '14px', boxShadow: '0 4px 12px rgba(255, 107, 53, 0.1)', border: '1px solid #FFE0D6', position: 'relative', transition: 'all 0.2s', cursor: 'pointer'}} onMouseEnter={(e) => {e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)';}} onMouseLeave={(e) => {e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.1)'; e.currentTarget.style.transform = 'translateY(0)';}}>
              {/* Unread Badge */}
              {unreadCounts.get(conversation.id) && unreadCounts.get(conversation.id)! > 0 && (
                <div style={{position: 'absolute', top: '10px', right: '10px', background: '#E63946', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'}}>
                  {unreadCounts.get(conversation.id)}
                </div>
              )}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px'}}>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <h3 style={{fontWeight: '700', fontSize: '14px', color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{conversation.title}</h3>
                    <span style={{fontSize: '11px', fontWeight: '700', color: '#FF6B35', background: '#FFE8D6', padding: '4px 8px', borderRadius: '6px', flexShrink: 0}}>{conversation.formattedId}</span>
                  </div>
                </div>
                <span style={{padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', background: getStatusColor(conversation.status).includes('orange') ? '#FFE8D6' : getStatusColor(conversation.status).includes('green') ? '#E8F5E9' : '#F5F5F5', color: getStatusColor(conversation.status).includes('orange') ? '#FF6B35' : getStatusColor(conversation.status).includes('green') ? '#2E7D32' : '#555'}}>
                  {getStatusLabel(conversation.status)}
                </span>
              </div>

              {/* Start Date/Time and Area - 2 lines with buttons on right */}
              <div style={{fontSize: '12px', color: '#666'}}>
                {conversation.deadline && (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <p style={{margin: 0}}>📅 {new Date(conversation.deadline).toLocaleDateString()} {new Date(conversation.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <button
                      onClick={() => handleOpenChat(conversation.id)}
                      style={{background: '#FF6B35', color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'}}
                      onMouseEnter={(e) => {e.currentTarget.style.background = '#FF5520'; e.currentTarget.style.transform = 'scale(1.05)';}}
                      onMouseLeave={(e) => {e.currentTarget.style.background = '#FF6B35'; e.currentTarget.style.transform = 'scale(1)';}}
                    >
                      💬 Chat
                    </button>
                  </div>
                )}
                {(conversation.location || conversation.postal) && conversation.status !== 'completed' && conversation.status !== 'completed_confirmed' && conversation.status !== 'completed_unconfirmed' && (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <p style={{margin: 0}}>📍 {`${conversation.postal}${conversation.location && conversation.postal ? ', ' : ''}${conversation.location}`}</p>
                    <p style={{margin: 0, color: '#999', fontSize: '11px'}}>Posted by {conversation.otherPartyName}</p>
                  </div>
                )}
                {(conversation.location || conversation.postal) && (conversation.status === 'completed' || conversation.status === 'completed_confirmed' || conversation.status === 'completed_unconfirmed') && (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <p style={{margin: 0}}>📍 {getAreaOnly(conversation.location)}</p>
                    <p style={{margin: 0, color: '#999', fontSize: '11px'}}>Posted by {conversation.otherPartyName}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

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
    </AdminThemeWrapper>
  );
}
