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
  const assetsPath = path.join(frontendPath, 'assets');
  res.json({
    status: 'server.js is running',
    path: frontendPath,
    assetsExist: fs.existsSync(assetsPath),
    distFiles: fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : []
  });
});

// Serve static files with explicit content type handling
if (fs.existsSync(frontendPath)) {
  console.log('✅ Frontend dist directory found, serving static files');

  // Explicitly serve JS with correct MIME type
  app.get('/assets/*.js', (req, res) => {
    const filePath = path.join(frontendPath, req.path);
    console.log('Serving JS:', filePath, 'exists:', fs.existsSync(filePath));
    res.type('application/javascript');
    res.sendFile(filePath, (err) => {
      if (err) console.error('Error serving JS:', err);
    });
  });

  // Explicitly serve CSS with correct MIME type
  app.get('/assets/*.css', (req, res) => {
    const filePath = path.join(frontendPath, req.path);
    res.type('text/css');
    res.sendFile(filePath);
  });

  // General static files
  app.use(express.static(frontendPath));

  // React Router fallback (for non-file routes)
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    res.type('text/html');
    res.sendFile(indexPath);
  });
} else {
  app.get('*', (req, res) => {
    res.status(404).send('Frontend files not found at: ' + frontendPath);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
