// Message Service for Real-Time Messaging
import db from '../db.js';
/**
 * Create and save a message
 */
export async function createMessage(conversationId, senderId, text) {
    try {
        const result = await db.query(`INSERT INTO chat_messages (conversation_id, sender_id, text, status, created_at)
       VALUES ($1, $2, $3, 'sent', NOW())
       RETURNING id, conversation_id, sender_id, text, status, created_at`, [conversationId, senderId, text]);
        return {
            id: result.rows[0].id,
            conversationId: result.rows[0].conversation_id,
            senderId: result.rows[0].sender_id,
            text: result.rows[0].text,
            status: result.rows[0].status,
            createdAt: result.rows[0].created_at,
        };
    }
    catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
}
/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId, limit = 50) {
    try {
        const result = await db.query(`SELECT id, conversation_id, sender_id, text, status, created_at, delivered_at, read_at
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [conversationId, limit]);
        return result.rows.map((row) => ({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            text: row.text,
            status: row.status,
            createdAt: row.created_at,
            deliveredAt: row.delivered_at,
            readAt: row.read_at,
        }));
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }
}
/**
 * Get messages since timestamp (for reconnect)
 */
export async function getMessagesSince(conversationId, timestamp) {
    try {
        const result = await db.query(`SELECT id, conversation_id, sender_id, text, status, created_at, delivered_at, read_at
       FROM chat_messages
       WHERE conversation_id = $1 AND created_at > $2
       ORDER BY created_at ASC`, [conversationId, timestamp]);
        return result.rows.map((row) => ({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            text: row.text,
            status: row.status,
            createdAt: row.created_at,
            deliveredAt: row.delivered_at,
            readAt: row.read_at,
        }));
    }
    catch (error) {
        console.error('Error fetching messages since:', error);
        throw error;
    }
}
/**
 * Mark messages as delivered
 */
export async function markAsDelivered(messageIds) {
    try {
        if (messageIds.length === 0)
            return;
        await db.query(`UPDATE chat_messages
       SET status = 'delivered', delivered_at = NOW()
       WHERE id = ANY($1) AND status = 'sent'`, [messageIds]);
    }
    catch (error) {
        console.error('Error marking delivered:', error);
        throw error;
    }
}
/**
 * Mark messages as read
 */
export async function markAsRead(messageIds) {
    try {
        if (messageIds.length === 0)
            return;
        await db.query(`UPDATE chat_messages
       SET status = 'read', read_at = NOW()
       WHERE id = ANY($1) AND status IN ('sent', 'delivered')`, [messageIds]);
    }
    catch (error) {
        console.error('Error marking read:', error);
        throw error;
    }
}
/**
 * Get unread message count for user in conversation
 */
export async function getUnreadCount(userId, conversationId) {
    try {
        const result = await db.query(`SELECT COUNT(*) as count
       FROM chat_messages
       WHERE conversation_id = $1 AND sender_id != $2 AND status IN ('sent', 'delivered')`, [conversationId, userId]);
        return result.rows[0].count || 0;
    }
    catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}
/**
 * Delete message (soft delete - for user privacy)
 */
export async function deleteMessage(messageId, userId) {
    try {
        const result = await db.query(`UPDATE chat_messages
       SET text = '[deleted]', is_deleted = true
       WHERE id = $1 AND sender_id = $2`, [messageId, userId]);
        return (result.rowCount || 0) > 0;
    }
    catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
}
/**
 * Search messages in conversation
 */
export async function searchMessages(conversationId, query) {
    try {
        const result = await db.query(`SELECT id, conversation_id, sender_id, text, status, created_at, delivered_at, read_at
       FROM chat_messages
       WHERE conversation_id = $1 AND text ILIKE $2
       ORDER BY created_at DESC
       LIMIT 50`, [conversationId, `%${query}%`]);
        return result.rows.map((row) => ({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            text: row.text,
            status: row.status,
            createdAt: row.created_at,
            deliveredAt: row.delivered_at,
            readAt: row.read_at,
        }));
    }
    catch (error) {
        console.error('Error searching messages:', error);
        throw error;
    }
}
