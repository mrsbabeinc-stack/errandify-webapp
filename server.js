// Minimal server to test Heroku deployment
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend
const frontendPath = path.join(__dirname, 'frontend/dist');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
