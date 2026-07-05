const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Try both possible paths (public and frontend/dist)
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, 'frontend/dist');
const frontendPath = fs.existsSync(publicPath) ? publicPath : distPath;

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
