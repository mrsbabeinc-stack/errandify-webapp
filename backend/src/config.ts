import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
  mapbox: {
    apiKey: process.env.MAPBOX_API_KEY || '',
  },
  singpass: {
    clientId: process.env.SINGPASS_CLIENT_ID || '',
    clientSecret: process.env.SINGPASS_CLIENT_SECRET || '',
    useSingpass: process.env.USE_SINGPASS === 'true' || false,
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid', // 'sendgrid', 'mailgun', 'smtp'
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    mailgunApiKey: process.env.MAILGUN_API_KEY || '',
    mailgunDomain: process.env.MAILGUN_DOMAIN || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@errandify.app',
    fromName: process.env.EMAIL_FROM_NAME || 'Errandify',
  },
};
