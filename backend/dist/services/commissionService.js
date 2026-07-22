/**
 * Commission Service
 * Calculates commission based on subscription tier
 */
import db from '../db.js';
import { getCommissionRate } from './subscriptionService.js';
/**
 * Calculate commission for a task/payment
 * Returns the commission amount in cents
 */
export async function calculateCommission(companyId, taskAmountCents) {
    const commissionRate = await getCommissionRate(companyId);
    const commission = Math.round(taskAmountCents * commissionRate);
    return commission;
}
/**
 * Get payable amount (task amount - commission)
 */
export async function calculatePayable(companyId, taskAmountCents) {
    const commission = await calculateCommission(companyId, taskAmountCents);
    const payable = taskAmountCents - commission;
    return payable;
}
/**
 * Log commission transaction
 */
export async function logCommission(companyId, taskAmountCents, tier, commissionRate) {
    const commissionAmount = Math.round(taskAmountCents * commissionRate);
    const result = await db.query(`INSERT INTO commission_logs
     (company_id, task_amount, commission_rate, commission_amount, tier, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`, [companyId, taskAmountCents, commissionRate, commissionAmount, tier]);
    return {
        company_id: companyId,
        task_amount: taskAmountCents,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        tier: tier,
    };
}
/**
 * Get commission history for company
 */
export async function getCommissionHistory(companyId, limit = 100, offset = 0) {
    const result = await db.query(`SELECT * FROM commission_logs
     WHERE company_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`, [companyId, limit, offset]);
    return result;
}
/**
 * Get commission summary for date range
 */
export async function getCommissionSummary(companyId, startDate, endDate) {
    const result = await db.query(`SELECT
       SUM(task_amount) as total_task_amount,
       SUM(commission_amount) as total_commission,
       AVG(commission_rate) as average_rate,
       COUNT(*) as transaction_count
     FROM commission_logs
     WHERE company_id = ? AND created_at BETWEEN ? AND ?`, [companyId, startDate, endDate]);
    return result[0] || {
        total_task_amount: 0,
        total_commission: 0,
        average_rate: 0.2,
        transaction_count: 0,
    };
}
/**
 * Create commission_logs table if it doesn't exist
 * (backup in case migration didn't run)
 */
export async function ensureCommissionTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS commission_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        company_id BIGINT NOT NULL,
        task_amount INT NOT NULL,
        commission_rate DECIMAL(4,2) NOT NULL,
        commission_amount INT NOT NULL,
        tier VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_company_id (company_id),
        INDEX idx_created_at (created_at),
        CONSTRAINT fk_commission_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    catch (error) {
        console.error('Error ensuring commission_logs table:', error);
    }
}
