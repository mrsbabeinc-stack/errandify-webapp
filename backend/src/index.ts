import express from 'express';
import cors from 'cors';
import { config } from './config.js';
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
})();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Errandify API running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`SingPass enabled: ${config.singpass.useSingpass}`);

  // Start background cron jobs (wrapped in try-catch to prevent startup crash)
  try {
    startCrons();
  } catch (error) {
    console.error('Failed to start cron jobs:', error);
    console.log('Continuing without cron jobs...');
  }
});
