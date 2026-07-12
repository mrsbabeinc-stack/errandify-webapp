// Socket.io Client Utility
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

/**
 * Initialize Socket.io connection
 */
export function initializeSocket(token: string): Socket {
  if (socket?.connected) {
    console.log('Socket already connected:', socket.id);
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  // Connection established
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  // Connection lost
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  // Reconnection attempt
  socket.on('reconnect_attempt', () => {
    console.log('Attempting to reconnect...');
  });

  // Connection error
  socket.on('connect_error', (error: any) => {
    console.error('Socket connection error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
      data: error?.data,
    });
  });

  return socket;
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Join a conversation room
 */
export function joinConversation(conversationId: number): void {
  if (!socket?.connected) {
    console.warn('Socket not connected, queuing join');
    return;
  }
  socket.emit('join-conversation', conversationId);
  console.log('Joined conversation:', conversationId);
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: number): void {
  if (!socket?.connected) return;
  socket.emit('leave-conversation', conversationId);
  console.log('Left conversation:', conversationId);
}

/**
 * Send a message
 */
export function sendMessage(conversationId: number, message: string): void {
  if (!socket?.connected) {
    console.warn('Socket not connected, message queued locally');
    return;
  }
  socket.emit('send-message', { conversationId, message });
  console.log('Message sent to conversation:', conversationId);
}

/**
 * Emit typing indicator
 */
export function emitTyping(conversationId: number): void {
  if (!socket?.connected) return;
  socket.emit('typing', conversationId);
}

/**
 * Stop typing indicator
 */
export function stopTyping(conversationId: number): void {
  if (!socket?.connected) return;
  socket.emit('stop-typing', conversationId);
}

/**
 * Mark messages as delivered
 */
export function markDelivered(messageIds: number[]): void {
  if (!socket?.connected) return;
  if (messageIds.length === 0) return;
  socket.emit('mark-delivered', messageIds);
}

/**
 * Mark messages as read
 */
export function markRead(messageIds: number[]): void {
  if (!socket?.connected) return;
  if (messageIds.length === 0) return;
  socket.emit('mark-read', messageIds);
}

/**
 * Request messages since timestamp (for sync after reconnect)
 */
export function requestMessagesSince(conversationId: number, timestamp: string): void {
  if (!socket?.connected) return;
  socket.emit('request-messages-since', { conversationId, timestamp });
}

/**
 * Listen for incoming messages
 */
export function onMessageReceived(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('message-received', callback);
  return () => socket?.off('message-received', callback);
}

/**
 * Listen for user typing
 */
export function onUserTyping(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('user-typing', callback);
  return () => socket?.off('user-typing', callback);
}

/**
 * Listen for user stop typing
 */
export function onUserStopTyping(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('user-stop-typing', callback);
  return () => socket?.off('user-stop-typing', callback);
}

/**
 * Listen for delivery confirmation
 */
export function onMessagesDelivered(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('messages-delivered', callback);
  return () => socket?.off('messages-delivered', callback);
}

/**
 * Listen for read confirmation
 */
export function onMessagesRead(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('messages-read', callback);
  return () => socket?.off('messages-read', callback);
}

/**
 * Listen for messages since sync
 */
export function onMessagesSince(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('messages-since', callback);
  return () => socket?.off('messages-since', callback);
}

/**
 * Listen for user joined
 */
export function onUserJoined(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('user-joined', callback);
  return () => socket?.off('user-joined', callback);
}

/**
 * Listen for user left
 */
export function onUserLeft(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('user-left', callback);
  return () => socket?.off('user-left', callback);
}

/**
 * Listen for message error
 */
export function onMessageError(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('message-error', callback);
  return () => socket?.off('message-error', callback);
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  console.log('Socket disconnected');
}
