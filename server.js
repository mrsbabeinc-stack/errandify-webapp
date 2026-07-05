// Minimal server to serve frontend
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== ERRANDIFY STAGING SERVER STARTING ===');
console.log('Node version:', process.version);
console.log('PORT:', PORT);
console.log('__dirname:', __dirname);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('[HEALTH] Request received');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const frontendPath = path.join(__dirname, 'frontend/dist');
console.log('Frontend path:', frontendPath);
console.log('Frontend exists:', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
  console.log('Frontend files:');
  fs.readdirSync(frontendPath).forEach(file => {
    console.log('  -', file);
  });
}

app.use(express.static(frontendPath, {
  maxAge: '1d',
  etag: false
}));

// React Router fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  console.log('[ROUTE]', req.path, '-> serving', indexPath);

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('[ERROR] index.html not found at:', indexPath);
    res.status(404).send('Frontend files not found');
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ App ready at http://0.0.0.0:${PORT}`);
});

// Error handling
server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
  process.exit(1);
});

console.log('=== SERVER INITIALIZED ===');
