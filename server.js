const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing for all routes
app.use(express.json());

// Try both possible paths (prefer frontend/dist for latest build)
const distPath = path.join(__dirname, 'frontend/dist');
const publicPath = path.join(__dirname, 'public');
const frontendPath = fs.existsSync(distPath) ? distPath : publicPath;

console.log('Serving from:', frontendPath);
console.log('Path exists:', fs.existsSync(frontendPath));

// Manual file serving with direct readFile
app.get('/assets/:filename', (req, res) => {
  const file = path.join(frontendPath, 'assets', req.params.filename);

  // Security: prevent path traversal
  if (!file.startsWith(path.join(frontendPath, 'assets'))) {
    return res.status(403).send('Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      console.error('File not found:', file);
      return res.status(404).send('Not found');
    }

    // Set correct MIME type
    if (req.params.filename.endsWith('.js')) {
      res.type('application/javascript');
    } else if (req.params.filename.endsWith('.css')) {
      res.type('text/css');
    }

    res.send(data);
  });
});

// Serve images
app.get('/images/:filename', (req, res) => {
  const file = path.join(frontendPath, 'images', req.params.filename);
  fs.readFile(file, (err, data) => {
    if (err) return res.status(404).send('Not found');
    res.send(data);
  });
});

// Serve other static files
app.get('/:filename', (req, res) => {
  const file = path.join(frontendPath, req.params.filename);
  if (file.includes('..')) return res.status(403).send('Forbidden');

  fs.readFile(file, (err, data) => {
    if (err) return res.status(404).send('Not found');
    res.send(data);
  });
});

// Health check
app.get('/test', (req, res) => {
  res.json({ status: 'ok', serving: frontendPath });
});

// Mock demo login endpoint
app.post('/api/auth/demo-login', express.json(), (req, res) => {
  const { account } = req.body;
  const demoUsers = {
    sarah: { id: '1', name: 'Sarah', email: 'sarah@demo.com', role: 'asker' },
    john: { id: '2', name: 'John', email: 'john@demo.com', role: 'asker' },
    admin: { id: '3', name: 'Admin', email: 'admin@demo.com', role: 'admin' },
    support_l2: { id: '4', name: 'Support L2', email: 'support_l2@demo.com', role: 'support_l2' },
    support_l3: { id: '5', name: 'Support L3', email: 'support_l3@demo.com', role: 'support_l3' }
  };

  const user = demoUsers[account];
  if (!user) {
    return res.status(400).json({ error: 'Invalid demo account' });
  }

  // Return mock token and user data
  res.json({
    success: true,
    data: {
      accessToken: 'demo-token-' + account,
      user: { ...user, isDemo: true }
    }
  });
});

// React Router fallback
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('index.html not found');
      return res.status(404).send('index.html not found');
    }
    res.type('text/html');
    res.send(data);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
