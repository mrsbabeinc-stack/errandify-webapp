import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

try {
  if (config.databaseUrl) {
    // Ensure SSL is enforced for Supabase
    const connectionString = config.databaseUrl.includes('sslmode')
      ? config.databaseUrl
      : `${config.databaseUrl}?sslmode=require`;

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.warn('[DB] Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
      console.log('[DB] Successfully connected to PostgreSQL');
    });

    console.log('[DB] PostgreSQL pool initialized');
  } else {
    console.warn('[DB] DATABASE_URL not set - database operations will fail');
  }
} catch (err) {
  console.error('[DB] Failed to initialize pool:', err);
}

export const db = {
  query: (text: string, params?: unknown[]) => {
    if (!pool) {
      console.error('[DB] No database connection available');
      return Promise.reject(new Error('Database not connected'));
    }
    return pool.query(text, params);
  },
  getClient: () => {
    if (!pool) {
      console.error('[DB] No database connection available');
      return Promise.reject(new Error('Database not connected'));
    }
    return pool.connect();
  },
};

export default db;
