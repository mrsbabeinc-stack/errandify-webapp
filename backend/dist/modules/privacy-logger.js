import db from '../db.js';
export async function logAiDecision(entry) {
    try {
        const result = await db.query(`INSERT INTO ai_audit_log (user_id, action, ai_model, reason_code, result_summary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`, [
            entry.userId,
            entry.action,
            entry.aiModel,
            entry.reasonCode,
            JSON.stringify(entry.resultSummary),
        ]);
        return result.rows[0].id.toString();
    }
    catch (error) {
        console.error('Failed to log AI decision:', error);
        throw error;
    }
}
export async function getAuditLog(userId, action, limit = 100) {
    try {
        let query = `SELECT id, user_id, action, ai_model, reason_code, result_summary, created_at
                 FROM ai_audit_log WHERE user_id = $1`;
        const params = [userId];
        let paramIndex = 2;
        if (action) {
            query += ` AND action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT ${limit}`;
        const result = await db.query(query, params);
        return result.rows;
    }
    catch (error) {
        console.error('Failed to fetch audit log:', error);
        throw error;
    }
}
export async function cleanupExpiredAuditLogs() {
    try {
        const result = await db.query(`DELETE FROM ai_audit_log WHERE expires_at < NOW()`);
        return result.rowCount || 0;
    }
    catch (error) {
        console.error('Failed to cleanup audit logs:', error);
        throw error;
    }
}
