import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
const pool = new Pool({
    connectionString: config.databaseUrl,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
export const db = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
};
export default db;
