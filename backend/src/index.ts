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
import walletRoutes from './routes/wallet.js';
import userProfileRoutes from './routes/userProfile.js';
import userDataExportRoutes from './routes/userDataExport.js';
import errandSearchRoutes from './routes/errandSearch.js';
import adminRoutes from './routes/admin.js';
import questionsRoutes from './routes/questions.js';
import { startCrons } from './cron.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chas', chasRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/tasks', taskExecutionRoutes);
// Mount specific errand routes BEFORE the catch-all
app.use('/api/errands', sessionsRoutes);
app.use('/api/errands', errandSearchRoutes);
// Mount main errand routes LAST so specific routes take precedence
app.use('/api/errands', errandRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/user-data', userDataExportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/questions', questionsRoutes);
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
