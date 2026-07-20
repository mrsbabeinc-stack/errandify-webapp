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
  // Phone-only: let the chat card title take a full line so the status badge isn't clipped
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
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
        <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: isSocketConnected ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)' : 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', borderRadius: '8px', borderLeft: `4px solid ${isSocketConnected ? '#4CAF50' : '#FF9800'}`, boxShadow: `0 2px 8px ${isSocketConnected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)'}`}}>
          <div style={{width: '8px', height: '8px', borderRadius: '50%', background: isSocketConnected ? '#4CAF50' : '#FF9800', boxShadow: isSocketConnected ? '0 0 6px rgba(76, 175, 80, 0.5)' : '0 0 6px rgba(255, 152, 0, 0.5)'}} />
          <p style={{fontSize: '12px', fontWeight: '600', color: isSocketConnected ? '#2E7D32' : '#E65100', margin: 0}}>
            {isSocketConnected ? '✅ Real-time active' : '⏳ Connecting...'}
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
        <div style={{display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', paddingBottom: '6px'}}>
          {['all', 'asker', 'doer'].map((filter) => (
            <button
              key={filter}
              onClick={() => setViewFilter(filter as any)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                border: viewFilter === filter ? 'none' : '1.5px solid #FFE0D6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: viewFilter === filter ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)' : 'linear-gradient(135deg, rgba(255,245,240,0.7) 0%, rgba(255,232,214,0.5) 100%)',
                color: viewFilter === filter ? 'white' : '#FF6B35',
                boxShadow: viewFilter === filter ? '0 3px 10px rgba(255, 107, 53, 0.25)' : '0 2px 6px rgba(255, 107, 53, 0.08)',
              }}
              onMouseEnter={(e) => {if (viewFilter !== filter) {e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,232,214,0.8) 0%, rgba(255,200,160,0.6) 100%)'; e.currentTarget.style.transform = 'translateY(-2px)';}} }
              onMouseLeave={(e) => {if (viewFilter !== filter) {e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,245,240,0.7) 0%, rgba(255,232,214,0.5) 100%)'; e.currentTarget.style.transform = 'translateY(0)';}} }
            >
              {filter === 'all' && '📬 All'}
              {filter === 'asker' && 'As Asker'}
              {filter === 'doer' && 'As Doer'}
            </button>
          ))}
        </div>

        {/* Status Filter Buttons */}
        <div style={{display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', paddingBottom: '6px'}}>
          {[
            { value: 'all', label: 'All' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed_unconfirmed', label: 'Awaiting' },
            { value: 'completed_confirmed', label: 'Done' }
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '18px',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: selectedStatus === status.value ? '#FF6B35' : '#F5F5F5',
                color: selectedStatus === status.value ? 'white' : '#666',
                boxShadow: selectedStatus === status.value ? '0 2px 8px rgba(255, 107, 53, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {if (selectedStatus !== status.value) e.currentTarget.style.background = '#EEEEEE';}}
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
        <div style={{display: 'grid', gap: '6px'}}>
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} style={{background: 'linear-gradient(135deg, #FFFBF8 0%, #FFF6F0 100%)', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 2px 12px rgba(255, 107, 53, 0.12)', border: '1px solid #FFE0CC', position: 'relative', transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'pointer'}} onMouseEnter={(e) => {e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.18)'; e.currentTarget.style.transform = 'translateY(-2px)';}} onMouseLeave={(e) => {e.currentTarget.style.boxShadow = '0 2px 12px rgba(255, 107, 53, 0.12)'; e.currentTarget.style.transform = 'translateY(0)';}}>
              {/* Unread Badge */}
              {unreadCounts.get(conversation.id) && unreadCounts.get(conversation.id)! > 0 && (
                <div style={{position: 'absolute', top: '4px', right: '4px', background: '#E63946', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', boxShadow: '0 1px 4px rgba(230, 57, 70, 0.25)', border: '1.5px solid white'}}>
                  {unreadCounts.get(conversation.id)}
                </div>
              )}
              {/* Row 1: ID Badge + Title + Status + Chat Button */}
              <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', justifyContent: 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: isMobile ? '1 1 100%' : 1, minWidth: 0}}>
                  <span style={{fontSize: '12px', fontWeight: '800', color: 'white', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)', padding: '6px 12px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 3px 10px rgba(255, 107, 53, 0.3)'}}>{conversation.formattedId}</span>
                  <h3 style={{fontWeight: '800', fontSize: '16px', color: '#2D2D2D', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0}}>{conversation.title}</h3>
                </div>
                <span style={{padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', background: getStatusColor(conversation.status).includes('orange') ? 'linear-gradient(135deg, #FFD89B 0%, #FFC870 100%)' : getStatusColor(conversation.status).includes('green') ? 'linear-gradient(135deg, #A8E6C1 0%, #7DD9B5 100%)' : 'linear-gradient(135deg, #E8E8E8 0%, #D8D8D8 100%)', color: getStatusColor(conversation.status).includes('orange') ? '#B85A1D' : getStatusColor(conversation.status).includes('green') ? '#2E7D32' : '#555', flexShrink: 0, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'}}>
                  {getStatusLabel(conversation.status).replace('Awaiting Confirmation', 'Awaiting').replace('Completed', 'Done')}
                </span>
              </div>

              {/* Row 2: Date | Area | Chat Button */}
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: 'wrap'}}>
                  {conversation.deadline && (
                    <span style={{fontSize: '12px', color: '#FF6B35', fontWeight: '700', whiteSpace: 'nowrap', background: 'rgba(255, 107, 53, 0.1)', padding: '4px 10px', borderRadius: '6px'}}>📅 {new Date(conversation.deadline).toLocaleDateString()}</span>
                  )}
                  {(conversation.location || conversation.postal) && (
                    <span style={{fontSize: '12px', fontWeight: '700', color: '#FF6B35', whiteSpace: 'nowrap', background: 'rgba(255, 107, 53, 0.1)', padding: '4px 10px', borderRadius: '6px'}}>📍 {conversation.postal}{conversation.location && conversation.postal ? ', ' : ''}{conversation.location}</span>
                  )}
                </div>
                <button
                  onClick={() => handleOpenChat(conversation.id)}
                  style={{background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)', flexShrink: 0}}
                  onMouseEnter={(e) => {e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)'; e.currentTarget.style.transform = 'translateY(-1px)';}}
                  onMouseLeave={(e) => {e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.2)'; e.currentTarget.style.transform = 'translateY(0)';}}
                >
                  💬 Chat
                </button>
              </div>
              <div style={{fontSize: '12px', color: '#999', marginTop: '4px'}}>By {conversation.otherPartyName}</div>
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
