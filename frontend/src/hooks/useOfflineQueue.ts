// Offline Message Queue Hook
// Manage queued messages and retry logic

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  queueMessage,
  getQueuedMessages,
  getQueuedMessagesForConversation,
  updateMessageStatus,
  deleteQueuedMessage,
  clearConversationQueue,
  getQueueStats,
  QueuedMessage,
} from '../utils/messageQueue';
import { sendMessage, getSocket } from '../utils/socketClient';

export interface OfflineQueueState {
  queued: QueuedMessage[];
  stats: {
    total: number;
    pending: number;
    failed: number;
  };
  isSyncing: boolean;
}

/**
 * Hook to manage offline message queue and retry
 */
export function useOfflineQueue(conversationId: number) {
  const [queueState, setQueueState] = useState<OfflineQueueState>({
    queued: [],
    stats: { total: 0, pending: 0, failed: 0 },
    isSyncing: false,
  });
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load queued messages on mount
  useEffect(() => {
    loadQueuedMessages();
  }, [conversationId]);

  // Monitor connection status and sync when online
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      console.log('Connected - syncing queued messages');
      syncQueuedMessages();
    };

    const handleDisconnect = () => {
      console.log('Disconnected - will retry when online');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Also watch for navigator.onLine changes
    window.addEventListener('online', syncQueuedMessages);
    window.addEventListener('offline', () => {
      console.log('Network offline');
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      window.removeEventListener('online', syncQueuedMessages);
      window.removeEventListener('offline', () => {});
    };
  }, []);

  /**
   * Load queued messages for conversation
   */
  const loadQueuedMessages = useCallback(async () => {
    try {
      const queued = await getQueuedMessagesForConversation(conversationId);
      const stats = await getQueueStats();
      setQueueState({
        queued,
        stats,
        isSyncing: false,
      });
    } catch (error) {
      console.error('Failed to load queued messages:', error);
    }
  }, [conversationId]);

  /**
   * Add message to queue (when offline)
   */
  const queueOfflineMessage = useCallback(
    async (text: string): Promise<QueuedMessage> => {
      try {
        const message = await queueMessage(conversationId, text);
        console.log('Message queued:', message.id);

        // Reload queue state
        await loadQueuedMessages();

        return message;
      } catch (error) {
        console.error('Failed to queue message:', error);
        throw error;
      }
    },
    [conversationId, loadQueuedMessages]
  );

  /**
   * Attempt to send a queued message
   */
  const retryQueuedMessage = useCallback(async (message: QueuedMessage): Promise<boolean> => {
    const socket = getSocket();

    if (!socket?.connected) {
      console.log('Socket not connected, will retry later');
      return false;
    }

    try {
      // Emit via socket (same as sending normally)
      sendMessage(message.conversationId, message.text);

      // Mark as sent
      await updateMessageStatus(message.id, 'sent');

      // Schedule deletion after confirmation from server
      setTimeout(async () => {
        await deleteQueuedMessage(message.id);
      }, 1000);

      console.log('Queued message sent:', message.id);
      return true;
    } catch (error) {
      console.error('Failed to retry message:', error);
      await updateMessageStatus(message.id, 'failed');
      return false;
    }
  }, []);

  /**
   * Sync all queued messages
   */
  const syncQueuedMessages = useCallback(async () => {
    const socket = getSocket();

    if (!socket?.connected) {
      console.log('Cannot sync - socket not connected');
      return;
    }

    setQueueState((prev) => ({
      ...prev,
      isSyncing: true,
    }));

    try {
      const queued = await getQueuedMessages();
      const pendingMessages = queued.filter((m) => m.status === 'pending' || m.status === 'failed');

      console.log(`Syncing ${pendingMessages.length} queued messages`);

      let successCount = 0;
      for (const message of pendingMessages) {
        const success = await retryQueuedMessage(message);
        if (success) successCount++;

        // Add delay between retries to avoid overwhelming server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`Synced ${successCount}/${pendingMessages.length} messages`);

      // Reload queue state
      await loadQueuedMessages();
    } catch (error) {
      console.error('Failed to sync queued messages:', error);
    } finally {
      setQueueState((prev) => ({
        ...prev,
        isSyncing: false,
      }));
    }
  }, [loadQueuedMessages, retryQueuedMessage]);

  /**
   * Send message (with offline fallback)
   */
  const sendWithOfflineFallback = useCallback(
    async (text: string): Promise<boolean> => {
      const socket = getSocket();

      if (socket?.connected) {
        // Send immediately
        sendMessage(conversationId, text);
        return true;
      } else {
        // Queue for later
        console.log('Offline - queueing message');
        await queueOfflineMessage(text);
        return false;
      }
    },
    [conversationId, queueOfflineMessage]
  );

  /**
   * Clear queue for conversation
   */
  const clearQueue = useCallback(async () => {
    await clearConversationQueue(conversationId);
    await loadQueuedMessages();
  }, [conversationId, loadQueuedMessages]);

  return {
    ...queueState,
    queueOfflineMessage,
    sendWithOfflineFallback,
    syncQueuedMessages,
    clearQueue,
    loadQueuedMessages,
  };
}

/**
 * Simple hook to get queue stats globally
 */
export function useQueueStats() {
  const [stats, setStats] = useState({ total: 0, pending: 0, failed: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const s = await getQueueStats();
      setStats(s);
    };

    loadStats();

    // Monitor online/offline
    window.addEventListener('online', loadStats);
    window.addEventListener('offline', loadStats);

    // Monitor every 5 seconds
    const interval = setInterval(loadStats, 5000);

    return () => {
      window.removeEventListener('online', loadStats);
      window.removeEventListener('offline', loadStats);
      clearInterval(interval);
    };
  }, []);

  return stats;
}
