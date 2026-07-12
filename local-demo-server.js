const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const mockData = {
  errands: [
    // Sarah's errands (asker_id=1)
    {
      id: 1,
      asker_id: 1,
      formatted_id: 'ER26CL-K9M7',
      title: 'Deep clean 3-room apartment',
      description: 'Full house cleaning with attention to detail',
      category: 'cleaning-household',
      status: 'open',
      budget: '150.00',
      location: 'Tanjong Pagar',
      postal_code: '150101',
      full_address: 'Tanjong Pagar Centre',
      deadline: '2026-07-10T18:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      asker_id: 1,
      formatted_id: 'ER26FR-ABC2',
      title: 'Assemble IKEA furniture',
      description: 'Help assembling Billy bookshelf',
      category: 'furniture-assembly',
      status: 'open',
      budget: '60.00',
      location: 'Clementi',
      postal_code: '120130',
      full_address: 'Clementi Green Estate',
      deadline: '2026-07-11T20:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      asker_id: 1,
      formatted_id: 'ER26CH-XYZ3',
      title: 'Tutor my son in Math',
      description: 'Primary 5 - fractions and decimals',
      category: 'childcare-education',
      status: 'open',
      budget: '80.00',
      location: 'Bukit Timah',
      postal_code: '229881',
      full_address: 'Bukit Timah Road',
      deadline: '2026-07-15T18:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      asker_id: 1,
      formatted_id: 'ER26SH-DEF4',
      title: 'Grocery shopping and delivery',
      description: 'Pick up groceries from supermarket',
      category: 'shopping-errands',
      status: 'open',
      budget: '30.00',
      location: 'Ang Mo Kio',
      postal_code: '560161',
      full_address: 'Ang Mo Kio Avenue 6',
      deadline: '2026-07-08T17:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      asker_id: 1,
      formatted_id: 'ER26PC-GHI5',
      title: 'Pet sitting - cat care for 3 days',
      description: 'Visit twice daily to feed and play with cat',
      category: 'pet-care',
      status: 'open',
      budget: '120.00',
      location: 'Marine Parade',
      postal_code: '440291',
      full_address: 'Marine Parade Central',
      deadline: '2026-07-15T10:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 6,
      asker_id: 1,
      formatted_id: 'ER26DV-JKL6',
      title: 'Help with moving house',
      description: 'Need 2 people to carry boxes and furniture',
      category: 'delivery-moving',
      status: 'open',
      budget: '250.00',
      location: 'Pasir Ris',
      postal_code: '510165',
      full_address: 'Pasir Ris Street 11',
      deadline: '2026-07-12T09:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 7,
      asker_id: 1,
      formatted_id: 'ER26AR-MNO7',
      title: 'Graphic design - social media banner',
      description: 'Design 3 Instagram banners for business',
      category: 'creative-arts',
      status: 'open',
      budget: '100.00',
      location: 'Jurong East',
      postal_code: '600127',
      full_address: 'Jurong East Central',
      deadline: '2026-07-09T17:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 8,
      asker_id: 1,
      formatted_id: 'ER26HM-PQR8',
      title: 'Fix leaky kitchen faucet',
      description: 'Replace washer and check cartridge',
      category: 'home-maintenance',
      status: 'open',
      budget: '80.00',
      location: 'Bishan',
      postal_code: '570345',
      full_address: 'Bishan Street 24',
      deadline: '2026-07-10T18:00:00Z',
      created_at: new Date().toISOString(),
    },
    {
      id: 9,
      asker_id: 1,
      formatted_id: 'ER26PS-STU9',
      title: 'Personal shopping - clothes and shoes',
      description: 'Shop for formal clothes for upcoming event',
      category: 'personal-care',
      status: 'open',
      budget: '200.00',
      location: 'Orchard',
      postal_code: '228216',
      full_address: 'Orchard Road',
      deadline: '2026-07-09T15:00:00Z',
      created_at: new Date().toISOString(),
    },
  ],
};

let nextErrandId = 10;

// Auth
app.post('/api/auth/demo-login', (req, res) => {
  const { account } = req.body;
  const userId = account === 'sarah' ? 1 : account === 'john' ? 2 : 3;
  const token = `demo-token-${userId}`;
  res.json({
    success: true,
    data: {
      accessToken: token,
      user: {
        id: userId,
        name: account,
        email: `${account}@demo.com`,
        role: account === 'admin' ? 'admin' : 'user',
        isDemo: true,
      },
    },
  });
});

// Errands
app.get('/api/errands', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;
  const { myOnly } = req.query;
  
  let errands = mockData.errands;
  
  if (myOnly === 'true') {
    errands = errands.filter(e => e.asker_id === userId);
    console.log(`[API] My Errands for user ${userId}: ${errands.length} errands`);
  } else {
    errands = errands.filter(e => e.status === 'open' && e.asker_id !== userId);
    console.log(`[API] Browse for user ${userId}: ${errands.length} errands`);
  }
  
  res.json({ success: true, data: errands });
});

app.get('/api/errands/:id', (req, res) => {
  const errand = mockData.errands.find(e => e.id === parseInt(req.params.id));
  if (!errand) {
    return res.status(404).json({ error: 'Errand not found' });
  }
  res.json({ success: true, data: errand });
});

app.post('/api/errands', (req, res) => {
  const { title, description, category, location, postal_code, budget, deadline } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;
  const newErrand = {
    id: nextErrandId++,
    asker_id: userId,
    formatted_id: `ER26${category.substring(0, 2).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    title,
    description,
    category,
    status: 'open',
    budget: budget ? budget.toString() : '0.00',
    location,
    postal_code,
    full_address: location,
    deadline,
    created_at: new Date().toISOString(),
  };
  mockData.errands.push(newErrand);
  console.log(`[API] New errand created by user ${userId}: ${title}`);
  res.json({ success: true, data: newErrand });
});

// Bids
app.get('/api/bids/my-bids', (req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/bids', (req, res) => {
  const { errand_id, amount } = req.body;
  res.json({
    success: true,
    data: {
      id: Math.floor(Math.random() * 10000),
      offer_id: `OF26${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      errand_id,
      amount,
      status: 'pending',
    },
  });
});

// Users
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json({
    success: true,
    data: {
      id: userId,
      name: userId === 1 ? 'Sarah' : userId === 2 ? 'John' : 'Admin',
      email: `user${userId}@demo.com`,
      alias: userId === 1 ? 'Sarah' : userId === 2 ? 'John' : 'Admin',
      role: userId === 3 ? 'admin' : 'user',
      rating: 4.8,
    },
  });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json({ success: true, data: [] });
});

app.listen(PORT, () => {
  console.log(`\n✅ DEMO SERVER READY\n  Frontend: http://localhost:5173\n  Backend: http://localhost:3000\n  Errands: 9 sample errands loaded\n`);
});
