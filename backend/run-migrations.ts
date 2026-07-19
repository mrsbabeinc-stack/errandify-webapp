#!/usr/bin/env tsx
/**
 * Database Migration Runner
 * Runs all SQL migration files in the migrations directory
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import db from './src/db.js';

const migrationsDir = './migrations';

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Get all .sql files
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${sqlFiles.length} migration files:\n`);

    for (const file of sqlFiles) {
      console.log(`📄 Running: ${file}`);
      const filepath = join(migrationsDir, file);
      const sql = await readFile(filepath, 'utf8');

      try {
        // Split by semicolon to handle multiple statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          await db.query(statement);
        }

        console.log(`   ✅ Successfully executed\n`);
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
