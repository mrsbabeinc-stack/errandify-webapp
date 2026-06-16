import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/errandify',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || '',
  },
  singpass: {
    clientId: process.env.SINGPASS_CLIENT_ID || '',
    clientSecret: process.env.SINGPASS_CLIENT_SECRET || '',
    useSingpass: process.env.USE_SINGPASS === 'true' || false,
  },
};
