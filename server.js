const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, 'public');

console.log('=== SERVER STARTING ===');
console.log('Frontend path:', frontendPath);
console.log('Frontend exists:', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
  const files = fs.readdirSync(frontendPath);
  console.log('Contents:', files);
  const assetsPath = path.join(frontendPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    console.log('Assets folder exists, files:', fs.readdirSync(assetsPath).slice(0, 3));
  }
}

// Health check
app.get('/test', (req, res) => {
  res.json({ status: 'ok', frontendPath, exists: fs.existsSync(frontendPath) });
});

// CRITICAL: Serve static files FIRST, with no caching
app.use(express.static(frontendPath, {
  maxAge: '0',
  etag: false,
  lastModified: false
}));

// FALLBACK: React Router for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ Serving index.html for route:', req.path);
    res.sendFile(indexPath);
  } else {
    console.error('❌ index.html not found at:', indexPath);
    res.status(404).send('index.html not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
