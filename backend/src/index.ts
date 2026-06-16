import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import errandRoutes from './routes/errands.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';

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
});
