import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Fail fast if the JWT secret is missing or left at the insecure default —
// otherwise anyone who reads the repo could forge tokens (including admin).
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key' || JWT_SECRET.length < 32) {
  throw new Error(
    'FATAL: JWT_SECRET is missing, too short, or set to the insecure default. ' +
    'Set a strong random JWT_SECRET (>=32 chars) in backend/.env before starting the server.'
  );
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/errandify',
  jwtSecret: JWT_SECRET,
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
