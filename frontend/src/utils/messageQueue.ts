// Offline Message Queue Manager
// Store messages when offline, retry when online

export interface QueuedMessage {
  id: string;
  conversationId: number;
  text: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  lastRetryAt?: string;
}

const DB_NAME = 'ErrandifyDB';
const STORE_NAME = 'messageQueue';
const MAX_RETRIES = 5;

/**
 * Open IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Add message to queue
 */
export async function queueMessage(conversationId: number, text: string): Promise<QueuedMessage> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const message: QueuedMessage = {
    id: `${Date.now()}_${Math.random()}`,
    conversationId,
    text,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const request = store.add(message);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(message);
  });
}

/**
 * Get all queued messages
 */
export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get queued messages for a conversation
 */
export async function getQueuedMessagesForConversation(
  conversationId: number
): Promise<QueuedMessage[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('conversationId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(conversationId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  messageId: string,
  status: 'pending' | 'sent' | 'failed'
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(messageId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const message = getRequest.result as QueuedMessage;
      if (message) {
        message.status = status;
        if (status === 'failed') {
          message.retryCount += 1;
          message.lastRetryAt = new Date().toISOString();
        }

        const putRequest = store.put(message);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Delete message from queue
 */
export async function deleteQueuedMessage(messageId: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(messageId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get failed messages for retry
 */
export async function getFailedMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('status');

  return new Promise((resolve, reject) => {
    const request = index.getAll('failed');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const messages = request.result as QueuedMessage[];
      // Filter by retry count
      resolve(messages.filter((m) => m.retryCount < MAX_RETRIES));
    };
  });
}

/**
 * Clear all queued messages
 */
export async function clearMessageQueue(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear messages for a conversation
 */
export async function clearConversationQueue(conversationId: number): Promise<void> {
  const messages = await getQueuedMessagesForConversation(conversationId);
  for (const message of messages) {
    await deleteQueuedMessage(message.id);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  failed: number;
}> {
  const messages = await getQueuedMessages();

  return {
    total: messages.length,
    pending: messages.filter((m) => m.status === 'pending').length,
    failed: messages.filter((m) => m.status === 'failed').length,
  };
}
