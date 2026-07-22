import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { config } from './config.js';
import { initializeSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import errandRoutes from './routes/errands.js';
import categoryRoutes from './routes/categories.js';
import addressRoutes from './routes/address.js';
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
import staffRoutes from './routes/staff.js';
import userProfileRoutes from './routes/userProfile.js';
import userDataExportRoutes from './routes/userDataExport.js';
import errandSearchRoutes from './routes/errandSearch.js';
import adminRoutes from './routes/admin.js';
import questionsRoutes from './routes/questions.js';
// import emailRoutes from './routes/email.js'; // TODO: Fix email module imports
import newsRoutes from './routes/news.js';
import blogRoutes from './routes/blog.js';
import recruitmentRoutes from './routes/recruitment.js';
import { community as communityRoutes, announcements as announcementRoutes, events as eventRoutes } from './routes/community.js';
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
import moderationReviewRoutes from './routes/moderationReview.js';
import casesRoutes from './routes/cases.js';
import companyRoutes from './routes/companyRoutes.js';
import acraRoutes from './routes/acraRoutes.js';
// import companyErrandOperations from "./routes/companyErrandOperations.js"; // Merged into companyRoutes
import demoRoutes from './routes/demo.js';
import staffManagementRoutes from './routes/staffManagement.js';
import salaryBenefitsRoutes from './routes/salaryBenefits.js';
import holidaysRoutes from './routes/holidays.js';
import advertisingRoutes from './routes/advertising.js';
import advertisingAdminRoutes from './routes/advertisingAdmin.js';
import adCreditMonitoringRoutes from './routes/adCreditMonitoring.js';
import adPaymentRoutes from './routes/adPayment.js';
import rbacRoutes from './routes/rbac.js';
import leavesRoutes from './routes/leaves.js';
import leaveApprovalsRoutes from './routes/leaveApprovals.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import subscriptionWebhooksRoutes from './routes/webhooks-subscriptions.js';
import { startCrons } from './cron.js';
import { loadCategoryCodes } from './utils/categoryCodes.js';
import db from './db.js';

const app = express();

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
    // Create advertising system tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        budget DECIMAL(10, 2) NOT NULL,
        spent DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        duration_days INTEGER,
        stripe_charge_id VARCHAR(255),
        admin_notes TEXT,
        rejection_reason TEXT,
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    console.log('Migration: campaigns table created');
  } catch (error) {
    console.log('Migration: campaigns table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ad_placements (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        placement_type VARCHAR(100) NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);
    console.log('Migration: ad_placements table created');
  } catch (error) {
    console.log('Migration: ad_placements table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaign_performance (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        performance_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(10, 2) DEFAULT 0,
        ctr DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, performance_date)
      );
    `);
    console.log('Migration: campaign_performance table created');
  } catch (error) {
    console.log('Migration: campaign_performance table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ad_schedules (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        scheduled_date TIMESTAMP NOT NULL,
        action VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);
    console.log('Migration: ad_schedules table created');
  } catch (error) {
    console.log('Migration: ad_schedules table already exists');
  }

  try {
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(starts_at);
      CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(ends_at);
      CREATE INDEX IF NOT EXISTS idx_ad_placements_campaign_id ON ad_placements(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_ad_schedules_campaign_id ON ad_schedules(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_ad_schedules_scheduled_date ON ad_schedules(scheduled_date);
    `);
    console.log('Migration: advertising indexes created');
  } catch (error) {
    console.log('Migration: advertising indexes already exist');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        uen VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        postal_code VARCHAR(10),
        area VARCHAR(100),
        subscription_tier VARCHAR(20) DEFAULT 'silver',
        company_status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: companies table created');
  } catch (error) {
    console.log('Migration: companies table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS company_wallets (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id),
        balance DECIMAL(15, 2) DEFAULT 0,
        total_earned DECIMAL(15, 2) DEFAULT 0,
        total_withdrawn DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: company_wallets table created');
  } catch (error) {
    console.log('Migration: company_wallets table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS company_subscriptions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id),
        current_tier VARCHAR(20) NOT NULL DEFAULT 'free',
        billing_type VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        billing_date DATE,
        renewal_date TIMESTAMP,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        pending_tier VARCHAR(20),
        pending_effective_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: company_subscriptions table created');
  } catch (error) {
    console.log('Migration: company_subscriptions table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        commission_rate DECIMAL(5, 3),
        ad_credit_monthly DECIMAL(10, 2),
        ep_multiplier INTEGER,
        max_team_members INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: subscription_tiers table created');
  } catch (error) {
    console.log('Migration: subscription_tiers table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_ad_credits (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        month VARCHAR(20),
        allocated_amount DECIMAL(10, 2),
        used_amount DECIMAL(10, 2) DEFAULT 0,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(company_id, month)
      );
    `);
    console.log('Migration: subscription_ad_credits table created');
  } catch (error) {
    console.log('Migration: subscription_ad_credits table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ad_credit_usage_log (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        campaign_id INTEGER,
        amount DECIMAL(10, 2),
        action VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: ad_credit_usage_log table created');
  } catch (error) {
    console.log('Migration: ad_credit_usage_log table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_milestones (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        tier VARCHAR(20),
        milestone_threshold INTEGER,
        reward_amount DECIMAL(10, 2),
        achieved BOOLEAN DEFAULT FALSE,
        achieved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: subscription_milestones table created');
  } catch (error) {
    console.log('Migration: subscription_milestones table already exists');
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_billing_history (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        stripe_invoice_id VARCHAR(255),
        amount DECIMAL(10, 2),
        status VARCHAR(50),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration: subscription_billing_history table created');
  } catch (error) {
    console.log('Migration: subscription_billing_history table already exists');
  }
})();

// Middleware
// Security headers. CSP is left off because this server also serves the SPA;
// a tailored CSP can be added later without breaking the frontend.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// CORS allowlist — the dev frontend (:5173) is cross-origin; the built SPA is
// served same-origin. Extra origins can be added via CORS_ORIGINS (comma-list).
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
];
app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / server-to-server (no Origin header) and allowlisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Singpass state/nonce ride in httpOnly cookies through the OIDC redirect
app.use(cookieParser());
// The raw body is kept alongside the parsed one because Stripe signatures are
// computed over the exact bytes sent — re-serialising the parsed object does
// not reproduce them. Nothing populated req.rawBody before this, so every
// signature check in the codebase was verifying against a string that could
// never match.
app.use(express.json({
  limit: '10mb', // large enough for base64 photo uploads
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));

// Rate limiting (anti brute-force / abuse). Generous global cap on the API,
// strict cap on auth to stop credential stuffing. Tunable via env.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_MAX || 300), // per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again shortly.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20), // login/signup attempts per IP / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.get("/health", async (req, res) => {
  const dbStatus = await getDbStatus();
  res.json({
    status: "ok",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
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
// The JWKS endpoint registered with Singpass. Public keys only — this is how
// Singpass verifies the client assertions we sign.
app.get('/api/.well-known/jwks.json', async (_req, res) => {
  const { publicJwks } = await import('./services/singpass.js');
  res.set('Cache-Control', 'public, max-age=3600').json(publicJwks());
});

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
app.use('/api/moderation', moderationReviewRoutes);
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
app.use('/api/categories', categoryRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/user-data', userDataExportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', staffManagementRoutes);
app.use('/api/admin', salaryBenefitsRoutes);
app.use('/api/admin', holidaysRoutes);
app.use('/api/admin', rbacRoutes);
app.use('/api/admin', leavesRoutes);
app.use('/api/leave', leaveApprovalsRoutes);
app.use('/api/operations', leaveApprovalsRoutes);
app.use('/api/approvals', leaveApprovalsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/webhooks', subscriptionWebhooksRoutes);
app.use('/api/advertising', advertisingRoutes);
app.use('/api/admin/advertising', advertisingAdminRoutes);
app.use('/api/ad-credits', adCreditMonitoringRoutes);
app.use('/api/ad-payment', adPaymentRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/questions', questionsRoutes);
// app.use('/api/email', emailRoutes); // TODO: Fix email module imports
// app.use('/api/verification', verificationRoutes); // TODO: Fix module imports
app.use('/api/news', newsRoutes);
// blog.ts existed since the blog pages were written but was never mounted,
// so every /api/blog call 404'd and the pages fell back to bundled data.
app.use('/api/blog', blogRoutes);
app.use('/api/recruitment', recruitmentRoutes);
// MyKampung content: authored in admin, read by the app. Both ends existed
// but were never connected — the admin screens saved to localStorage.
app.use('/api/community', communityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api', companyRoutes); // Company module routes
app.use('/api/acra-lookup', acraRoutes); // ACRA company verification
// Demo routes create users with fabricated SingPass identities, which would
// bypass the compulsory-SingPass rule. Development only.
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/demo', demoRoutes);
} else {
  console.log('[Startup] Demo routes disabled in production');
}
// Company errand allocation, leave, recommendations - merged into companyRoutes
app.use('/api', hanaRoutes);

// An unmatched /api/* request is a missing endpoint, not a page. Without this
// the React fallback below answered them with 200 and index.html, so a call to
// a route that does not exist looked like a success until response.json() blew
// up on "<!doctype html>" — which reads as a parsing bug rather than a 404.
// Comes first precisely because the fallback is greedy.
app.use('/api', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: `No such endpoint: ${req.method} /api${req.path}` });
});

// Serve index.html for all non-API routes (React Router fallback)
app.get('*', (req, res) => {
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

    // Load the 16 category codes from the DB into memory (for ID generation)
    loadCategoryCodes();

    // Start background cron jobs (wrapped in try-catch to prevent startup crash)
    try {
      startCrons();
    } catch (error) {
      console.error('Failed to start cron jobs:', error);
      console.log('Continuing without cron jobs...');
    }
  });
})();
