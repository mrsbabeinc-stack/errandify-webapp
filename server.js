const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, 'frontend/dist');

console.log('SERVER STARTING...');
console.log('Frontend path:', frontendPath);
console.log('Frontend exists:', fs.existsSync(frontendPath));

// Build frontend if dist doesn't exist
if (!fs.existsSync(frontendPath)) {
  console.log('Building frontend...');
  try {
    execSync('npm run build --prefix frontend', { stdio: 'inherit' });
    console.log('Frontend build complete');
  } catch (err) {
    console.error('Frontend build failed:', err);
  }
}

// Test route
app.get('/test', (req, res) => {
  res.json({ status: 'server.js is running', path: frontendPath });
});

// Serve static files
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // React Router fallback
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  });
} else {
  app.get('*', (req, res) => {
    res.status(404).send('Frontend files not found at: ' + frontendPath);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
