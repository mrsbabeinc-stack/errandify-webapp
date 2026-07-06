const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing for all routes
app.use(express.json());

// Initialize PostgreSQL connection pool for Supabase
let db = null;
if (process.env.DATABASE_URL) {
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : true,
  });
  db.on('error', (err) => console.error('DB pool error:', err));
  db.on('connect', () => console.log('✅ Connected to Supabase database'));
  console.log('📦 Database pool initialized');
} else {
  console.warn('⚠️  DATABASE_URL not set - database features disabled');
}

// Try both possible paths (prefer frontend/dist for latest build)
const distPath = path.join(__dirname, 'frontend/dist');
const publicPath = path.join(__dirname, 'public');
const frontendPath = fs.existsSync(distPath) ? distPath : publicPath;

console.log('Serving from:', frontendPath);
console.log('Path exists:', fs.existsSync(frontendPath));

// Serve static files with proper headers
app.use(express.static(frontendPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Health check
app.get('/test', (req, res) => {
  res.json({ status: 'ok', serving: frontendPath, database: !!db });
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

// Save errand endpoint
app.post('/api/errands', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const {
      user_id,
      title,
      category,
      description,
      budget,
      deadline,
      postal_code,
      area,
      full_address,
      frequency
    } = req.body;

    // Validate required fields
    if (!title || !category || !budget) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert into errands table
    const query = `
      INSERT INTO errands (
        user_id,
        title,
        category,
        description,
        budget,
        deadline,
        postal_code,
        area,
        full_address,
        frequency,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      user_id || '1', // Default to user 1 for demo
      title,
      category,
      description || null,
      budget,
      deadline || null,
      postal_code || null,
      area || null,
      full_address || null,
      frequency || 'once'
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving errand:', error);
    res.status(500).json({ error: 'Failed to save errand', details: error.message });
  }
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
