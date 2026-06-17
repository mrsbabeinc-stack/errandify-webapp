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
import { startCrons } from './cron.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/errands', errandRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/messages', messagesRoutes);
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

  // Start background cron jobs
  startCrons();
});
