/**
 * Database Connection Manager
 * Handles connection pooling for Alibaba Cloud RDS
 * Works with local MySQL and production RDS
 */

const mysql = require('mysql2/promise');
const config = require('../config/database.config');

let pool = null;

/**
 * Initialize database connection pool
 * @returns {Promise<mysql.Pool>}
 */
async function initializePool() {
  try {
    pool = mysql.createPool(config.pool);

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    console.log(`✅ Database connected: ${config.config.host}:${config.config.port}/${config.config.database}`);
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

/**
 * Get existing pool or create new one
 * @returns {Promise<mysql.Pool>}
 */
async function getPool() {
  if (!pool) {
    await initializePool();
  }
  return pool;
}

/**
 * Execute query with automatic connection handling
 * @param {string} sql - SQL query
 * @param {Array} values - Query parameters
 * @returns {Promise<Array>}
 */
async function query(sql, values = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, values);
  return rows;
}

/**
 * Execute query and return first row
 * @param {string} sql - SQL query
 * @param {Array} values - Query parameters
 * @returns {Promise<Object>}
 */
async function queryOne(sql, values = []) {
  const rows = await query(sql, values);
  return rows[0] || null;
}

/**
 * Execute multiple queries in transaction
 * @param {Function} callback - Function receives connection, should execute queries
 * @returns {Promise}
 */
async function transaction(callback) {
  const p = await getPool();
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Insert record
 * @param {string} table - Table name
 * @param {Object} data - Column-value pairs
 * @returns {Promise<{insertId, affectedRows}>}
 */
async function insert(table, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(',');

  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
  const [result] = await (await getPool()).execute(sql, values);

  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows,
  };
}

/**
 * Update record
 * @param {string} table - Table name
 * @param {Object} data - Columns to update
 * @param {string} whereClause - WHERE clause (e.g., "id = ?")
 * @param {Array} whereValues - Values for WHERE clause
 * @returns {Promise<{affectedRows}>}
 */
async function update(table, data, whereClause, whereValues = []) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col) => `${col} = ?`).join(',');

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const [result] = await (await getPool()).execute(sql, [...values, ...whereValues]);

  return {
    affectedRows: result.affectedRows,
  };
}

/**
 * Delete record
 * @param {string} table - Table name
 * @param {string} whereClause - WHERE clause
 * @param {Array} whereValues - Values for WHERE clause
 * @returns {Promise<{affectedRows}>}
 */
async function deleteRecord(table, whereClause, whereValues = []) {
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const [result] = await (await getPool()).execute(sql, whereValues);

  return {
    affectedRows: result.affectedRows,
  };
}

/**
 * Close all connections
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Get connection pool stats
 * @returns {Object}
 */
function getPoolStats() {
  if (!pool) return { status: 'not initialized' };

  return {
    status: 'active',
    connectionCount: pool._allConnections?.length || 0,
    freeConnections: pool._freeConnections?.length || 0,
    activeConnections: (pool._allConnections?.length || 0) - (pool._freeConnections?.length || 0),
  };
}

module.exports = {
  initializePool,
  getPool,
  query,
  queryOne,
  transaction,
  insert,
  update,
  deleteRecord,
  closePool,
  getPoolStats,
};
