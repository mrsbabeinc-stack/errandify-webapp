// Start compiled backend or fallback to frontend-only server
const fs = require('fs');
const path = require('path');

const backendDistPath = path.join(__dirname, 'backend/dist/index.js');
const hasBackend = fs.existsSync(backendDistPath);

console.log('=== ERRANDIFY STAGING SERVER ===');
console.log('Node version:', process.version);
console.log('Backend exists:', hasBackend);
console.log('PORT:', process.env.PORT || 3000);

if (hasBackend) {
  console.log('✅ Loading full backend from backend/dist/index.js');
  try {
    require(backendDistPath);
  } catch (err) {
    console.error('❌ Failed to load backend:', err.message);
    console.log('Falling back to frontend-only server...');
    startFrontendServer();
  }
} else {
  console.log('Backend dist not found, starting frontend-only server');
  startFrontendServer();
}

function startFrontendServer() {
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log('=== FRONTEND-ONLY SERVER ===');

  // Serve frontend
  const frontendPath = path.join(__dirname, 'frontend/dist');
  console.log('Serving frontend from:', frontendPath);
  console.log('Frontend exists:', fs.existsSync(frontendPath));

  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, { maxAge: '1d' }));

    // React Router fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    app.get('*', (req, res) => {
      res.status(404).send('Frontend files not found');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}
