import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config.js';
import { initializeSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import errandRoutes from './routes/errands.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import hanaRoutes from './routes/hana.js';
import aiRoutes from './routes/ai.js';
import bidsRoutes from './routes/bids.js';
import paymentRoutes from './routes/payment.js';
import jobsRoutes from './routes/jobs.js';
import messagesRoutes from './routes/messages.js';
import disputesRoutes from './routes/disputes.js';
import notificationsRoutes from './routes/notifications.js';
import chasRoutes from './routes/chas.js';
import pushRoutes from './routes/push.js';
import taskExecutionRoutes from './routes/taskExecution.js';
import sessionsRoutes from './routes/sessions.js';
import screeningRoutes from './routes/screening.js';
import ratingsRoutes from './routes/ratings.js';
import gamificationRoutes from './routes/gamification.js';
import walletRoutes from './routes/wallet.js';
import userProfileRoutes from './routes/userProfile.js';
import userDataExportRoutes from './routes/userDataExport.js';
import errandSearchRoutes from './routes/errandSearch.js';
import adminRoutes from './routes/admin.js';
import questionsRoutes from './routes/questions.js';
// import emailRoutes from './routes/email.js'; // TODO: Fix email module imports
import newsRoutes from './routes/news.js';
// import verificationRoutes from './routes/verification.js'; // TODO: Fix module imports
import referralRoutes from './routes/referrals.js';
import speechRoutes from './routes/speech.js';
import activityLogRoutes from './routes/activityLog.js';
import mockAuthRoutes from './routes/mockAuth.js';
import mockPaymentRoutes from './routes/mockPayment.js';
import uploadRoutes from './routes/uploads.js';
import categoryPreferencesRoutes from './routes/categoryPreferences.js';
import safetyRoutes from './routes/safety.js';
import disputesL2L3Routes from './routes/disputes_l2_l3.js';
import casesRoutes from './routes/cases.js';
import { startCrons } from './cron.js';
import db from './db.js';

const app = express();

// Log environment variables on startup for debugging
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('QWEN_API_KEY:', process.env.QWEN_API_KEY ? `Set (${process.env.QWEN_API_KEY.substring(0, 20)}...)` : 'NOT SET');
console.log('QWEN_API_BASE:', process.env.QWEN_API_BASE ? `Set: ${process.env.QWEN_API_BASE}` : 'NOT SET');
console.log('MAPBOX_API_KEY:', process.env.MAPBOX_API_KEY ? `Set (${process.env.MAPBOX_API_KEY.substring(0, 20)}...)` : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================================\n');

// Run migrations on startup
(async () => {
  try {
    // Add photo_urls column to completion_submissions if it doesn't exist
    await db.query(`
      ALTER TABLE completion_submissions
      ADD COLUMN IF NOT EXISTS photo_urls TEXT DEFAULT '[]';
    `);
    console.log('Migration: photo_urls column checked/added');
  } catch (error) {
    console.log('Migration: photo_urls column already exists or not needed');
  }

  try {
    // Add accepted_bid_id column to errands if it doesn't exist
    await db.query(`
      ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS accepted_bid_id INTEGER REFERENCES bids(id) ON DELETE SET NULL;
    `);
    console.log('Migration: accepted_bid_id column checked/added');
  } catch (error) {
    console.log('Migration: accepted_bid_id column already exists or not needed');
  }

  try {
    // Add full_address column to errands if it doesn't exist
    await db.query(`
      ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS full_address VARCHAR(500);
    `);
    console.log('Migration: full_address column checked/added');
  } catch (error) {
    console.log('Migration: full_address column already exists or not needed');
  }

  try {
    // Ensure formatted_id column exists
    await db.query(`
      ALTER TABLE errands ADD COLUMN IF NOT EXISTS formatted_id VARCHAR(20) UNIQUE;
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errands_formatted_id ON errands(formatted_id);
    `);
    console.log('Migration: formatted_id column checked/added');
  } catch (error) {
    console.log('Migration: formatted_id column already exists');
  }

  } catch (error) {
    console.log('Migration: full_address column already exists or not needed');
  }

  try {
    // Update status constraint to include 'expired' status
    // This allows marking errands as expired when deadline passes
    await db.query(`
      ALTER TABLE errands DROP CONSTRAINT IF EXISTS errands_status_check;
    `);
    await db.query(`
      ALTER TABLE errands ADD CONSTRAINT errands_status_check
      CHECK (status IN ('open', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired'));
    `);
    console.log('Migration: status constraint updated to include "expired"');
  } catch (error) {
    console.log('Migration: status constraint already includes "expired"');
  }

  try {
    // Add formatted_id column to errands if it doesn't exist
    await db.query(`
      ALTER TABLE errands
      ADD COLUMN IF NOT EXISTS formatted_id VARCHAR(20) UNIQUE;
    `);
    console.log('Migration: formatted_id column checked/added to errands');
  } catch (error) {
    console.log('Migration: formatted_id column already exists');
  }

  try {
    // Add offer_id column to bids if it doesn't exist
    await db.query(`
      ALTER TABLE bids
      ADD COLUMN IF NOT EXISTS offer_id VARCHAR(20) UNIQUE;
    `);
    console.log('Migration: offer_id column checked/added to bids');
  } catch (error) {
    console.log('Migration: offer_id column already exists');
  }

  try {
    // Add formatted_user_id column to users if it doesn't exist
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS formatted_user_id VARCHAR(20) UNIQUE;
    `);
    console.log('Migration: formatted_user_id column checked/added to users');
  } catch (error) {
    console.log('Migration: formatted_user_id column already exists');
  }

  try {
    // Create postal_code_cache table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS postal_code_cache (
        id SERIAL PRIMARY KEY,
        postal_code VARCHAR(6) UNIQUE NOT NULL,
        formatted_address VARCHAR(500),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        area VARCHAR(100),
        subzone VARCHAR(100),
        provider VARCHAR(50),
        confidence NUMERIC(3, 2),
        manually_corrected BOOLEAN DEFAULT FALSE,
        corrected_by_user_id VARCHAR(50),
        last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration: postal_code_cache table checked/created');
  } catch (error) {
    console.log('Migration: postal_code_cache table already exists or creation failed');
  }

  try {
    // Add missing columns to postal_code_cache if they don't exist
    await db.query(`
      ALTER TABLE postal_code_cache
      ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'mapbox';
    `);
    console.log('Migration: provider column checked/added to postal_code_cache');
  } catch (error) {
    console.log('Migration: provider column already exists');
  }

  try {
    await db.query(`
      ALTER TABLE postal_code_cache
      ADD COLUMN IF NOT EXISTS confidence NUMERIC(3, 2) DEFAULT 0.5;
    `);
    console.log('Migration: confidence column checked/added to postal_code_cache');
  } catch (error) {
    console.log('Migration: confidence column already exists');
  }

  try {
    await db.query(`
      ALTER TABLE postal_code_cache
      ADD COLUMN IF NOT EXISTS manually_corrected BOOLEAN DEFAULT FALSE;
    `);
    console.log('Migration: manually_corrected column checked/added to postal_code_cache');
  } catch (error) {
    console.log('Migration: manually_corrected column already exists');
  }

  try {
    await db.query(`
      ALTER TABLE postal_code_cache
      ADD COLUMN IF NOT EXISTS corrected_by_user_id VARCHAR(50);
    `);
    console.log('Migration: corrected_by_user_id column checked/added to postal_code_cache');
  } catch (error) {
    console.log('Migration: corrected_by_user_id column already exists');
  }

  try {
    // Create task_analysis table for sentiment + complexity analysis
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_analysis (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        location_insights JSONB,
        task_complexity JSONB,
        sentiment_analysis JSONB,
        ai_suggestions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, title)
      );
    `);
    console.log('Migration: task_analysis table checked/created');
  } catch (error) {
    console.log('Migration: task_analysis table already exists or creation failed');
  }
})();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend files
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendPath = join(__dirname, '../../frontend/dist');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Routes
// MOCK TESTING ROUTES (for development/testing only)
app.use('/api/mock-auth', mockAuthRoutes);
app.use('/api/mock-payment', mockPaymentRoutes);

// REAL ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
// Mount category preferences BEFORE general user routes (more specific first)
app.use('/api/users', categoryPreferencesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/disputes', disputesL2L3Routes); // L2+L3 resolution routes
app.use('/api/cases', casesRoutes); // Admin case management
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chas', chasRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/tasks', taskExecutionRoutes);
// Mount specific errand routes BEFORE the catch-all
app.use('/api/errands', sessionsRoutes);
app.use('/api/errands', errandSearchRoutes);
app.use('/api/errands', activityLogRoutes);
// Mount main errand routes LAST so specific routes take precedence
app.use('/api/errands', errandRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/user-data', userDataExportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/questions', questionsRoutes);
// app.use('/api/email', emailRoutes); // TODO: Fix email module imports
// app.use('/api/verification', verificationRoutes); // TODO: Fix module imports
app.use('/api/news', newsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api', hanaRoutes);

// Serve index.html for all non-API routes (React Router fallback)
// But skip if it's a static asset or has a file extension
app.get('*', (req, res) => {
  // Don't serve index.html for API routes, assets, or files with extensions
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || /\.\w+$/.test(req.path)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(join(__dirname, '../../frontend/dist/index.html'));
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with Socket.io
const PORT = config.port;
const httpServer = http.createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Test database connection on startup but don't fail if it's missing
const testDatabase = async () => {
  try {
    if (config.databaseUrl) {
      await db.query('SELECT 1');
      console.log('✅ Database connected');
      return true;
    } else {
      console.warn('⚠️  DATABASE_URL not configured');
      return false;
    }
  } catch (err) {
    console.error('⚠️  Database connection failed - continuing without DB');
    return false;
  }
};

(async () => {
  try {
    await testDatabase();
  } catch (err) {
    console.error('Database test error:', err);
  }

  httpServer.listen(PORT, () => {
    console.log(`✅ Errandify API running on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`SingPass enabled: ${config.singpass.useSingpass}`);
    console.log(`Socket.io enabled on ws://localhost:${PORT}`);

    // Start background cron jobs (wrapped in try-catch to prevent startup crash)
    try {
      startCrons();
    } catch (error) {
      console.error('Failed to start cron jobs:', error);
      console.log('Continuing without cron jobs...');
    }
  });

  try {
    // Create landmarks table for postal code resolution
    await db.query(`
      CREATE TABLE IF NOT EXISTS landmarks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        postal_code CHAR(6) NOT NULL,
        address TEXT,
        category VARCHAR(50),
        alternate_names TEXT[] DEFAULT '{}',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_landmarks_name ON landmarks(name);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_landmarks_postal ON landmarks(postal_code);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_landmarks_category ON landmarks(category);');
    
    console.log('Migration: landmarks table checked/created');
    
    // Seed initial landmarks if table is empty
    const checkCount = await db.query('SELECT COUNT(*) as cnt FROM landmarks');
    if (checkCount.rows[0].cnt === 0) {
      const seedData = [
        ['Nan Hua Primary School', '128806', '30 Jalan Lempeng, Clementi, Singapore 128806', 'school', ARRAY['nan hua', 'nanhua primary']],
        ['Marina Bay Sands', '018956', '10 Bayfront Avenue, Marina Bay, Singapore 018956', 'landmark', ARRAY['mbs', 'marina bay']],
        ['National Library Board', '179103', '100 Victoria Street, City Hall, Singapore 179103', 'library', ARRAY['national library', 'nlb']],
        ['Clementi Mall', '129603', '3155 Commonwealth Avenue West, Clementi, Singapore 129603', 'mall', ARRAY['clementi']],
        ['Gardens by the Bay', '018953', '18 Marina Gardens Drive, Marina Bay, Singapore 018953', 'landmark', ARRAY['gardens', 'bay']],
        ['Singapore Zoo', '729826', '80 Mandai Lake Road, Mandai, Singapore 729826', 'landmark', ARRAY['zoo', 'mandai']],
        ['Sentosa Island', '098269', 'Sentosa, Singapore 098269', 'landmark', ARRAY['sentosa']],
        ['Orchard Road', '238801', 'Orchard Road, Orchard, Singapore 238801', 'shopping', ARRAY['orchard']],
        ['Changi Airport', '918141', '65 Airport Boulevard, Changi, Singapore 918141', 'airport', ARRAY['airport', 'changi']],
        ['Pulau Ubin', '508667', 'Pulau Ubin, Singapore 508667', 'landmark', ARRAY['ubin']]
      ];
      
      for (const [name, postal, address, category, altNames] of seedData) {
        await db.query(
          `INSERT INTO landmarks (name, postal_code, address, category, alternate_names) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT (name) DO NOTHING`,
          [name, postal, address, category, altNames]
        );
      }
      console.log('Migration: Seeded landmarks table with 10 initial entries');
    }
  
  try {
    // Ensure full_address column exists
    await db.query(`
      ALTER TABLE errands ADD COLUMN IF NOT EXISTS full_address VARCHAR(500);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_errands_full_address ON errands(full_address);
    `);
    console.log('Migration: full_address column checked/added');
  } catch (error) {
    console.log('Migration: full_address column already exists');
  }

  } catch (error) {
    console.warn('Migration: landmarks table error:', error);
  }

})();
