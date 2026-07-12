// Socket.io Hook for Real-Time Messaging
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  initializeSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  emitTyping,
  stopTyping,
  markDelivered,
  markRead,
  requestMessagesSince,
  onMessageReceived,
  onUserTyping,
  onUserStopTyping,
  onMessagesDelivered,
  onMessagesRead,
  onMessagesSince,
  onUserJoined,
  onUserLeft,
  onMessageError,
  isSocketConnected,
} from '../utils/socketClient';

export interface SocketMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
}

export interface SocketContextType {
  isConnected: boolean;
  isTyping: boolean;
  messages: SocketMessage[];
  activeUsers: number[];
  typingUsers: number[];
  sendMessage: (text: string) => void;
  markAsRead: (messageIds: number[]) => void;
  requestSync: () => void;
}

/**
 * Hook to manage Socket.io connection and messaging
 */
export function useSocket(conversationId: number, userId: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [activeUsers, setActiveUsers] = useState<number[]>([]);
  const lastSeenRef = useRef<string>(new Date().toISOString());
  const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Initialize socket on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = initializeSocket(token);

    // Track connection status
    const handleConnect = () => {
      setIsConnected(true);
      joinConversation(conversationId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Initial connection status
    if (socket.connected) {
      setIsConnected(true);
      joinConversation(conversationId);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      leaveConversation(conversationId);
    };
  }, [conversationId]);

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = onMessageReceived((data: SocketMessage) => {
      setMessages((prev) => [...prev, { ...data, createdAt: new Date(data.createdAt) }]);
      lastSeenRef.current = new Date().toISOString();
    });

    return unsubscribe;
  }, []);

  // Listen for typing indicators
  useEffect(() => {
    const handleUserTyping = (data: { userId: number; conversationId: number }) => {
      if (data.userId === userId) return; // Ignore own typing

      setTypingUsers((prev) => new Set([...prev, data.userId]));

      // Clear existing timeout
      if (typingTimeoutRef.current.has(data.userId)) {
        clearTimeout(typingTimeoutRef.current.get(data.userId)!);
      }

      // Auto-hide typing after 5 seconds
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }, 5000);

      typingTimeoutRef.current.set(data.userId, timeout);
    };

    const handleUserStopTyping = (data: { userId: number; conversationId: number }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });

      if (typingTimeoutRef.current.has(data.userId)) {
        clearTimeout(typingTimeoutRef.current.get(data.userId)!);
      }
    };

    const unsubscribeTyping = onUserTyping(handleUserTyping);
    const unsubscribeStopTyping = onUserStopTyping(handleUserStopTyping);

    return () => {
      unsubscribeTyping();
      unsubscribeStopTyping();
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [userId]);

  // Listen for read receipts
  useEffect(() => {
    const handleMessagesRead = (data: { messageIds: number[]; readBy: number }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id)
            ? { ...msg, status: 'read' as const }
            : msg
        )
      );
    };

    const unsubscribe = onMessagesRead(handleMessagesRead);
    return unsubscribe;
  }, []);

  // Listen for delivery confirmation
  useEffect(() => {
    const handleMessagesDelivered = (data: { messageIds: number[] }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id)
            ? { ...msg, status: 'delivered' as const }
            : msg
        )
      );
    };

    const unsubscribe = onMessagesDelivered(handleMessagesDelivered);
    return unsubscribe;
  }, []);

  // Listen for sync messages (reconnection)
  useEffect(() => {
    const handleMessagesSince = (data: { conversationId: number; messages: SocketMessage[] }) => {
      setMessages((prev) => {
        // Merge new messages, avoiding duplicates
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = data.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMessages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      lastSeenRef.current = new Date().toISOString();
    };

    const unsubscribe = onMessagesSince(handleMessagesSince);
    return unsubscribe;
  }, []);

  // Track active users
  useEffect(() => {
    const handleUserJoined = (data: { userId: number; timestamp: string }) => {
      if (data.userId === userId) return;
      setActiveUsers((prev) => [...new Set([...prev, data.userId])]);
    };

    const handleUserLeft = (data: { userId: number; timestamp: string }) => {
      setActiveUsers((prev) => prev.filter((id) => id !== data.userId));
    };

    const unsubscribeJoined = onUserJoined(handleUserJoined);
    const unsubscribeLeft = onUserLeft(handleUserLeft);

    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
    };
  }, [userId]);

  // Send message
  const handleSendMessage = useCallback((text: string) => {
    if (!isConnected) {
      console.warn('Socket not connected');
      return;
    }
    sendMessage(conversationId, text);
  }, [conversationId, isConnected]);

  // Emit typing
  const handleTyping = useCallback(() => {
    if (!isConnected) return;
    emitTyping(conversationId);
  }, [conversationId, isConnected]);

  // Stop typing
  const handleStopTyping = useCallback(() => {
    if (!isConnected) return;
    stopTyping(conversationId);
  }, [conversationId, isConnected]);

  // Mark messages as read
  const handleMarkRead = useCallback((messageIds: number[]) => {
    if (!isConnected) return;
    markRead(messageIds);
    setMessages((prev) =>
      prev.map((msg) =>
        messageIds.includes(msg.id)
          ? { ...msg, status: 'read' as const }
          : msg
      )
    );
  }, [isConnected]);

  // Mark messages as delivered
  const handleMarkDelivered = useCallback((messageIds: number[]) => {
    if (!isConnected) return;
    markDelivered(messageIds);
  }, [isConnected]);

  // Request sync
  const handleRequestSync = useCallback(() => {
    if (!isConnected) return;
    requestMessagesSince(conversationId, lastSeenRef.current);
  }, [conversationId, isConnected]);

  return {
    isConnected,
    messages,
    typingUsers: Array.from(typingUsers),
    activeUsers,
    sendMessage: handleSendMessage,
    emitTyping: handleTyping,
    stopTyping: handleStopTyping,
    markAsRead: handleMarkRead,
    markAsDelivered: handleMarkDelivered,
    requestSync: handleRequestSync,
  };
}

/**
 * Simpler hook for just connection status
 */
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(isSocketConnected());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return { isConnected };
}
