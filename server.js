// Minimal server to test Heroku deployment
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend
const frontendPath = join(__dirname, 'frontend/dist');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
