const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock data storage
let errands = [];
let errandIdCounter = 1000;

// Mock errand creation
app.post('/api/errands', (req, res) => {
  const { title, description, category, location, full_address, postal_code, budget, deadline } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'title and category required' });
  }

  const categoryMap = {
    'home-maintenance': 'HM',
    'cleaning-household': 'CL',
    'food-beverage': 'FD',
    'furniture-assembly': 'FR',
    'shopping-errands': 'SH',
    'delivery-moving': 'DV',
    'travel-mobility': 'TR',
    'event-planning': 'EV',
    'childcare-education': 'CH',
    'eldercare-healthcare': 'EL',
    'pet-care': 'PC',
    'personal-care': 'PS',
    'tech-support': 'TC',
    'creative-arts': 'AR',
    'admin-business': 'AD',
    'charity-community': 'CC',
  };

  const year = new Date().getFullYear().toString().slice(-2);
  const categoryCode = categoryMap[category] || 'XX';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const formattedId = `ER${year}${categoryCode}-${code}`;

  const errand = {
    id: errandIdCounter++,
    formatted_id: formattedId,
    title,
    description,
    category,
    location,
    full_address,
    postal_code,
    budget: parseFloat(budget),
    deadline,
    asker_id: 1,
    status: 'open',
    created_at: new Date().toISOString(),
  };

  errands.push(errand);
  console.log('✅ Errand created:', formattedId);
  res.status(201).json(errand);
});

// Mock get errands list
app.get('/api/errands', (req, res) => {
  res.json({ data: errands, total: errands.length });
});

// Mock get errand by ID
app.get('/api/errands/:id', (req, res) => {
  const errand = errands.find(e => e.id == req.params.id || e.formatted_id === req.params.id);
  if (!errand) {
    return res.status(404).json({ error: 'Errand not found' });
  }
  res.json(errand);
});

// Mock AI extraction
app.post('/api/ai/extract-task-info', (req, res) => {
  const { input } = req.body;

  // Simple mock category detection
  let category = 'cleaning-household';
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('baby') || lowerInput.includes('kid') || lowerInput.includes('child')) category = 'childcare-education';
  if (lowerInput.includes('dog') || lowerInput.includes('pet') || lowerInput.includes('walk')) category = 'pet-care';
  if (lowerInput.includes('elderly') || lowerInput.includes('grandma') || lowerInput.includes('grandpa')) category = 'eldercare-healthcare';
  if (lowerInput.includes('event') || lowerInput.includes('party')) category = 'event-planning';
  if (lowerInput.includes('deliver') || lowerInput.includes('send') || lowerInput.includes('pick')) category = 'delivery-moving';

  res.json({
    data: {
      category,
      area: 'Central',
      postalCode: '150101',
      fullAddress: 'Tanjong Pagar, Singapore 150101',
    }
  });
});

// Mock datetime parsing
app.post('/api/ai/parse-datetime', (req, res) => {
  res.json({
    data: {
      date: new Date().toISOString().split('T')[0],
      time: '14:00'
    }
  });
});

// Mock content moderation
app.post('/api/moderation/check', (req, res) => {
  res.json({ status: 'approved' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
});
