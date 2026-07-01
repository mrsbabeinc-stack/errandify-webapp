// Socket.io Server for Real-Time Messaging
import { Server as SocketIOServer, Socket } from 'socket.io';
import db from './db.js';

interface SocketConnection {
  userId: number;
  socketId: string;
  rooms: Set<number>;
  lastSeen: Date;
}

const activeConnections = new Map<string, SocketConnection>();
let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocket(httpServer: any): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers();
  console.log('Socket.io server initialized');
  return io;
}

/**
 * Setup Socket.io event handlers
 */
function setupSocketHandlers() {
  if (!io) return;

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Authenticate user
    const userId = authenticateSocket(socket);
    if (!userId) {
      socket.disconnect();
      return;
    }

    // Track connection
    activeConnections.set(socket.id, {
      userId,
      socketId: socket.id,
      rooms: new Set(),
      lastSeen: new Date(),
    });

    // --- Chat Events ---

    // Join conversation room
    socket.on('join-conversation', (conversationId: number) => {
      const roomName = `conversation_${conversationId}`;
      socket.join(roomName);

      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.rooms.add(conversationId);
      }

      console.log(`User ${userId} joined conversation ${conversationId}`);

      // Notify others in room
      socket.to(roomName).emit('user-joined', { userId, timestamp: new Date() });
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: number) => {
      const roomName = `conversation_${conversationId}`;
      socket.leave(roomName);

      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.rooms.delete(conversationId);
      }

      console.log(`User ${userId} left conversation ${conversationId}`);

      // Notify others in room
      socket.to(roomName).emit('user-left', { userId, timestamp: new Date() });
    });

    // Send message
    socket.on('send-message', async (data: { conversationId: number; message: string }) => {
      try {
        const { conversationId, message } = data;
        const roomName = `conversation_${conversationId}`;

        // Save message to database
        const result = await db.query(
          `INSERT INTO chat_messages (conversation_id, sender_id, text, status, created_at)
           VALUES ($1, $2, $3, 'sent', NOW())
           RETURNING id, created_at`,
          [conversationId, userId, message]
        );

        const messageId = result.rows[0].id;
        const createdAt = result.rows[0].created_at;

        // Emit to room
        io?.to(roomName).emit('message-received', {
          id: messageId,
          conversationId,
          senderId: userId,
          text: message,
          status: 'sent',
          createdAt,
        });

        console.log(`Message ${messageId} sent to conversation ${conversationId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (conversationId: number) => {
      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user-typing', { userId, conversationId });
    });

    // Stop typing
    socket.on('stop-typing', (conversationId: number) => {
      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user-stop-typing', { userId, conversationId });
    });

    // Mark messages as delivered
    socket.on('mark-delivered', async (messageIds: number[]) => {
      try {
        if (messageIds.length === 0) return;

        await db.query(
          `UPDATE chat_messages
           SET status = 'delivered', delivered_at = NOW()
           WHERE id = ANY($1) AND status = 'sent'`,
          [messageIds]
        );

        // Notify sender
        socket.emit('messages-delivered', { messageIds });
        console.log(`Marked ${messageIds.length} messages as delivered`);
      } catch (error) {
        console.error('Error marking delivered:', error);
      }
    });

    // Mark messages as read
    socket.on('mark-read', async (messageIds: number[]) => {
      try {
        if (messageIds.length === 0) return;

        // Get conversation IDs for the messages
        const result = await db.query(
          `SELECT DISTINCT conversation_id FROM chat_messages WHERE id = ANY($1)`,
          [messageIds]
        );

        // Update messages to read
        await db.query(
          `UPDATE chat_messages
           SET status = 'read', read_at = NOW()
           WHERE id = ANY($1) AND status IN ('sent', 'delivered')`,
          [messageIds]
        );

        // Notify senders in each conversation room
        result.rows.forEach((row) => {
          const roomName = `conversation_${row.conversation_id}`;
          io?.to(roomName).emit('messages-read', { messageIds, readBy: userId });
        });

        console.log(`Marked ${messageIds.length} messages as read by user ${userId}`);
      } catch (error) {
        console.error('Error marking read:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const connection = activeConnections.get(socket.id);

      // Notify users in rooms that user left
      if (connection) {
        connection.rooms.forEach((conversationId) => {
          const roomName = `conversation_${conversationId}`;
          io?.to(roomName).emit('user-left', { userId, timestamp: new Date() });
        });
      }

      activeConnections.delete(socket.id);
      console.log('User disconnected:', socket.id);
    });

    // Handle reconnection with pending messages
    socket.on('request-messages-since', async (data: { conversationId: number; timestamp: string }) => {
      try {
        const { conversationId, timestamp } = data;

        const result = await db.query(
          `SELECT id, conversation_id, sender_id, text, status, created_at, delivered_at, read_at
           FROM chat_messages
           WHERE conversation_id = $1 AND created_at > $2
           ORDER BY created_at ASC`,
          [conversationId, timestamp]
        );

        socket.emit('messages-since', {
          conversationId,
          messages: result.rows,
        });

        console.log(`Sent ${result.rows.length} messages since ${timestamp} for conversation ${conversationId}`);
      } catch (error) {
        console.error('Error fetching messages:', error);
        socket.emit('message-error', { error: 'Failed to fetch messages' });
      }
    });
  });
}

/**
 * Authenticate socket connection from token
 */
function authenticateSocket(socket: Socket): number | null {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.warn('No token provided for socket connection');
      return null;
    }

    // Decode JWT token - extract payload and parse user ID
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT token format');
      return null;
    }

    try {
      // Decode the payload (second part of JWT)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const userId = payload.userId || payload.sub;

      if (!userId || isNaN(parseInt(userId, 10))) {
        console.warn('No userId found in token payload');
        return null;
      }

      console.log(`Socket authenticated for user ${userId}`);
      return parseInt(userId, 10);
    } catch (parseError) {
      console.warn('Failed to parse JWT payload:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Send notification to specific user
 */
export function notifyUser(userId: number, eventName: string, data: any) {
  if (!io) return;

  // Find socket(s) for this user
  activeConnections.forEach((connection, socketId) => {
    if (connection.userId === userId) {
      io?.to(socketId).emit(eventName, data);
    }
  });
}

/**
 * Broadcast to all users in conversation room
 */
export function broadcastToConversation(conversationId: number, eventName: string, data: any) {
  if (!io) return;
  const roomName = `conversation_${conversationId}`;
  io.to(roomName).emit(eventName, data);
}

/**
 * Get active connections count
 */
export function getActiveConnectionsCount(): number {
  return activeConnections.size;
}

/**
 * Get users in conversation room
 */
export function getUsersInConversation(conversationId: number): number[] {
  const roomName = `conversation_${conversationId}`;
  const sockets = io?.sockets.adapter.rooms.get(roomName);
  if (!sockets) return [];

  const userIds: number[] = [];
  sockets.forEach((socketId) => {
    const connection = activeConnections.get(socketId);
    if (connection) {
      userIds.push(connection.userId);
    }
  });

  return [...new Set(userIds)]; // Remove duplicates
}

export default io;
