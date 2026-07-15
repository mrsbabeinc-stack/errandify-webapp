import db from '../db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  try {
    console.log('🔄 Running TypeScript migrations...');

    const migrationsDir = join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts') && f.match(/^\d+_/))
      .sort();

    for (const file of files) {
      const migrationPath = join(migrationsDir, file);
      console.log(`\n📝 Loading migration: ${file}`);

      try {
        // Dynamic import of the migration file
        const migration = await import(migrationPath);

        if (migration.up && typeof migration.up === 'function') {
          console.log(`⏳ Running migration: ${file}`);
          await migration.up(db);
          console.log(`✅ Completed: ${file}`);
        } else {
          console.warn(`⚠️  Skipped ${file} - no 'up' function found`);
        }
      } catch (error: any) {
        console.error(`❌ Error in migration ${file}:`, error.message);
        console.error(error);
      }
    }

    console.log('\n✅ All migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration runner error:', error);
    process.exit(1);
  }
}

runMigrations();
