import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

try {
  if (config.databaseUrl) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.databaseUrl.includes('supabase') ? true : { rejectUnauthorized: false },
      family: 4, // Force IPv4 instead of IPv6
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

export const isDbConnected = (): boolean => {
  return pool !== null;
};

export const getDbStatus = async () => {
  if (!pool) {
    return {
      connected: false,
      databaseUrl: config.databaseUrl ? 'SET' : 'NOT SET',
      error: 'No pool created',
    };
  }

  try {
    const result = await pool.query('SELECT NOW()');
    return {
      connected: true,
      databaseUrl: config.databaseUrl ? 'SET' : 'NOT SET',
      timestamp: result.rows[0].now,
    };
  } catch (err) {
    return {
      connected: false,
      databaseUrl: config.databaseUrl ? 'SET' : 'NOT SET',
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const db = {
  query: (text: string, params?: unknown[]) => {
    if (!pool) {
      console.error('[DB] No database connection available. DATABASE_URL:', config.databaseUrl ? 'SET' : 'NOT SET');
      return Promise.reject(new Error('Database not connected'));
    }
    return pool.query(text, params);
  },
  getClient: () => {
    if (!pool) {
      console.error('[DB] No database connection available. DATABASE_URL:', config.databaseUrl ? 'SET' : 'NOT SET');
      return Promise.reject(new Error('Database not connected'));
    }
    return pool.connect();
  },
};

export default db;
