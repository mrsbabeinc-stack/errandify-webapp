/**
 * Database Configuration
 * Production-ready for Alibaba Cloud RDS
 * Supports local development & cloud deployment
 */

require('dotenv').config();

const DB_CONFIG = {
  // Local Development
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'errandify_local',
    charset: 'utf8mb4',
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  },

  // Alibaba Cloud RDS Production
  production: {
    host: process.env.DB_HOST, // e.g., rm-xxx.mysql.rds.aliyuncs.com
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'errandify',
    charset: 'utf8mb4',
    connectionLimit: 100,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    enableSSL: true, // Alibaba RDS supports SSL
    multipleStatements: false, // Security: disable multiple statements
    waitForConnectionsTimeout: 10000,
    connectionTimeoutMillis: 10000,
  },

  // Staging (Alibaba RDS)
  staging: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'errandify_staging',
    charset: 'utf8mb4',
    connectionLimit: 50,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    enableSSL: true,
  },
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const config = DB_CONFIG[NODE_ENV];

module.exports = {
  // Connection pool configuration
  pool: {
    ...config,
    // Connection pool settings
    min: NODE_ENV === 'production' ? 5 : 2,
    max: config.connectionLimit,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // Query settings
  query: {
    timeout: 30000, // 30 seconds for queries
    normalizeUndefinedValuesTo: null,
  },

  // Performance settings
  performance: {
    enableSlowQueryLog: NODE_ENV !== 'development',
    slowQueryThresholdMs: 1000, // Log queries taking > 1s
  },

  // Logging
  logging: {
    enabled: NODE_ENV !== 'production',
    level: NODE_ENV === 'production' ? 'error' : 'debug',
  },

  // Database migration settings
  migration: {
    directory: './migrations',
    extension: 'sql',
    table: '_migrations', // Track migrations in DB
  },

  // Backup settings (Alibaba)
  backup: {
    enabled: NODE_ENV === 'production',
    frequency: 'daily', // Daily backups on RDS
    retention: 7, // Keep 7 days of backups
  },

  // Replication (for high availability)
  replication: {
    enabled: NODE_ENV === 'production',
    readReplicas: process.env.DB_READ_REPLICAS?.split(',') || [],
  },

  // Environment-specific info
  environment: NODE_ENV,
  config,
};
