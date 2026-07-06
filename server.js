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

// Voucher redemption endpoint
app.post('/api/vouchers/:voucherId/redeem', async (req, res) => {
  try {
    const { voucherId } = req.params;
    const { user_id } = req.body;

    // Mock voucher data for demo
    const vouchers = {
      'starbucks-10': { name: 'Starbucks $10', discount: 10, cost: 500 },
      'kfc-voucher': { name: 'KFC Voucher', discount: 15, cost: 450 },
      'cathay-cineplex': { name: 'Cathay Cineplex', discount: 20, cost: 350 },
      'changi-lounge': { name: 'Changi Lounge', discount: 50, cost: 1000 }
    };

    const voucher = vouchers[voucherId];
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Mock redemption - just return success
    res.json({
      success: true,
      message: `Successfully redeemed ${voucher.name}!`,
      data: {
        voucher_id: voucherId,
        user_id: user_id || '1',
        discount_value: voucher.discount,
        redeemed_at: new Date().toISOString(),
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Error redeeming voucher:', error);
    res.status(500).json({ error: 'Failed to redeem voucher', details: error.message });
  }
});

// Get notifications endpoint
app.get('/api/notifications', (req, res) => {
  try {
    // Mock notifications for demo
    const notifications = [
      {
        id: 1,
        type: 'bid_placed',
        title: 'New Bid Received',
        message: 'Someone bid on your errand',
        read: false,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        type: 'bid_accepted',
        title: 'Bid Accepted',
        message: 'Your bid was accepted',
        read: false,
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Stub API endpoints for demo (prevent 404s and looping notifications)
app.get('/api/errands', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'asker'
    }
  });
});

app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'asker'
    }
  });
});

app.get('/api/user-stats', (req, res) => {
  res.json({
    success: true,
    data: {
      tasksCompleted: 0,
      rating: 5,
      points: 0,
      streak: 0
    }
  });
});

app.get('/api/shop/vouchers', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Hana AI task extraction endpoint (mock for demo)
app.post('/api/ai/extract-task-info', (req, res) => {
  try {
    let { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });

    console.log('[Extract] Input:', input);

    // Extract postal code (6 consecutive digits)
    const postalCodeMatch = input.match(/\b(\d{6})\b/);
    const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';

    // Extract budget (smart extraction)
    let budget = '';
    const budgetMatch = input.match(/[\$@]\s*(\d+)|budget\s*[\$@]?\s*(\d+)/i);
    if (budgetMatch) {
      budget = budgetMatch[1] || budgetMatch[2];
    } else {
      const allNumbers = input.match(/\b(\d+)\b/g) || [];
      const budgetCandidates = allNumbers
        .filter(num => num.length < 6)
        .map(num => parseInt(num))
        .filter(num => num >= 8 && num <= 999);
      if (budgetCandidates.length > 0) {
        budget = budgetCandidates[0].toString();
      }
    }
    console.log('[Extract] Budget:', budget || '(empty)');

    // Extract title - clean up metadata
    let title = input
      .replace(/,?\s*(?:on\s+)?at\s+\d{6},?/i, '')  // Remove ", at 150101", "on at 150101", "at 150101"
      .replace(/\d{6}\s*,?/g, '')  // Remove any 6-digit postal codes
      .replace(/budget\s*\$?\d+/i, '')
      .replace(/,?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)/i, '')
      .replace(/(?:tomorrow|today|in\s+\d+\s+days?|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i, '')
      .replace(/,?\s*[\d.]+\s*(?:hours?|hrs?|h|minutes?|mins?|m)/i, '')  // Remove duration like "2 hours", "30 mins"
      .replace(/for\s+[\d.]+\s*(?:hour|hr|min)s?/i, '')
      .replace(/^\s*(?:i\s+need|please|can you)\s+/i, '')
      .replace(/\s+on\s+/i, ' ')  // Remove "on" before dates/times
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')  // Remove double commas
      .replace(/,\s*$/g, '')  // Remove trailing commas
      .trim();

    if (!title || title.length < 3) {
      title = input.split(/[,.]|budget/i)[0].trim();
    }
    if (!title) title = 'Help needed';

    title = title.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 150);
    console.log('[Extract] Title:', title);

    // Category detection
    const lowerInput = input.toLowerCase();
    let category = 'home-maintenance';
    if (lowerInput.includes('walk') || lowerInput.includes('dog') || lowerInput.includes('pet')) category = 'pet-care';
    else if (lowerInput.includes('clean') || lowerInput.includes('laundry')) category = 'cleaning-household';
    else if (lowerInput.includes('move') || lowerInput.includes('deliver') || lowerInput.includes('moving')) category = 'delivery-moving';
    else if (lowerInput.includes('shop') || lowerInput.includes('grocery')) category = 'shopping-errands';
    else if (lowerInput.includes('cook') || lowerInput.includes('food')) category = 'food-beverage';

    // Parse date
    let date = '';
    if (/tomorrow/i.test(input)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
    } else if (/today|later/i.test(input)) {
      date = new Date().toISOString().split('T')[0];
    } else {
      const dayMatch = input.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i);
      if (dayMatch) {
        const dayMap = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6, sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
        const dayIndex = dayMap[dayMatch[1].toLowerCase()] || 0;
        const today = new Date();
        const current = today.getDay();
        let diff = dayIndex - current;
        if (diff <= 0) diff += 7;
        const result = new Date(today);
        result.setDate(result.getDate() + diff);
        date = result.toISOString().split('T')[0];
      }
    }
    console.log('[Extract] Date:', date || '(empty)');

    // Parse time
    let time = '';
    const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)|(\d{1,2})\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1] || timeMatch[4]);
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = (timeMatch[3] || timeMatch[5])?.toLowerCase();
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    console.log('[Extract] Time:', time || '(empty)');

    // Parse duration
    let duration = '';
    let durationUnit = 'Hr';
    const durationMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)s?|(\d+(?:\.\d+)?)\s*(?:min|m)(?:ute)?s?/i);
    if (durationMatch) {
      duration = durationMatch[1] || durationMatch[2];
      if (durationMatch[2]) durationUnit = 'Min';
    }
    console.log('[Extract] Duration:', duration, durationUnit);

    // Generate description
    const descriptionMap = {
      'home-maintenance': 'Professional household help needed. Specify area and type of work required.',
      'pet-care': 'Pet care service needed. Specify pet type, size, and what\'s needed.',
      'delivery-moving': 'Delivery or moving assistance needed. Specify items and locations.',
      'shopping-errands': 'Shopping assistance needed. Specify items and stores.',
      'food-beverage': 'Food preparation or delivery needed. Specify meal type and preferences.',
      'cleaning-household': 'Professional cleaning needed. Specify areas and type of cleaning.',
    };
    const description = descriptionMap[category] || 'Professional assistance needed. Provide specific details.';

    // Map postal code to area using postal code sectors
    const postalCodeToAreaMap = {
      '01': 'Raffles Place', '02': 'Cecil Street', '03': 'Tanjong Pagar', '04': 'Outram', '05': 'People\'s Park',
      '06': 'Chinatown', '07': 'Orchard', '08': 'Pasir Panjang', '09': 'Novena', '10': 'Newton',
      '11': 'Farrer Park', '12': 'Henderson', '13': 'Balestier', '14': 'Macpherson', '15': 'Paya Lebar',
      '16': 'Geylang', '17': 'Eunos', '18': 'Bedok', '19': 'Tampines', '20': 'Pasir Ris',
      '21': 'Punggol', '22': 'Hougang', '23': 'Serangoon', '24': 'Sengkang', '25': 'Choa Chu Kang',
      '26': 'Jurong West', '27': 'Jurong', '28': 'Jurong East', '29': 'Clementi', '30': 'Bukit Merah',
      '31': 'Tiong Bahru', '32': 'Queenstown', '33': 'Bukit Timah', '34': 'Ang Mo Kio', '35': 'Bishan',
      '36': 'Toa Payoh', '37': 'Yishun', '38': 'Sembawang', '39': 'Kranji', '40': 'Woodlands',
      '41': 'Woodlands', '42': 'Bukit Batok', '43': 'Choa Chu Kang', '44': 'Tuas', '45': 'Jurong East',
      '46': 'Changi', '47': 'Changi', '48': 'Seletar', '49': 'Seletar', '50': 'Sentosa',
      '51': 'Bukit Merah', '52': 'Bukit Merah', '53': 'Clementi', '54': 'Clementi', '55': 'Choa Chu Kang',
      '56': 'Choa Chu Kang', '57': 'Jurong', '58': 'Jurong', '59': 'Jurong East', '60': 'Pasir Ris',
      '61': 'Pasir Ris', '62': 'Pasir Ris', '63': 'Tampines', '64': 'Tampines', '65': 'Tampines',
      '66': 'Tampines', '67': 'Tampines', '68': 'Bedok', '69': 'Bedok', '70': 'Bedok',
      '71': 'Bedok', '72': 'Geylang', '73': 'Geylang', '74': 'Eunos', '75': 'Geylang',
      '76': 'Katong', '77': 'Macpherson', '78': 'Serangoon', '79': 'Hougang', '80': 'Sengkang',
      '81': 'Yishun', '82': 'Sembawang'
    };

    let areaName = '';
    let fullAddressValue = '';
    if (postalCode) {
      const sector = postalCode.substring(0, 2);
      areaName = postalCodeToAreaMap[sector] || '';
      fullAddressValue = areaName ? `Singapore ${postalCode}` : '';
    }

    res.json({
      success: true,
      data: {
        title,
        category,
        description,
        budget: budget ? parseInt(budget) : '',
        deadline: date ? new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : '',
        date,
        time,
        duration,
        durationUnit,
        location: areaName,
        area: areaName,
        fullAddress: fullAddressValue,
        postalCode: postalCode || '',
        notes: '',
        isRecurring: false,
        repeatEvery: 1,
        repeatUnit: 'week',
        occurrences: 1,
        suggestedSkills: []
      }
    });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(400).json({ error: 'Failed to extract task info' });
  }
});

// Hana suggestions endpoint (mock for demo)
app.post('/api/ai/suggestions', (req, res) => {
  const { category, title, description, date, time } = req.body;

  console.log('[Suggestions] Category:', category);

  const skillMap = {
    'home-maintenance': ['Handyman', 'Repairs', 'Maintenance', 'Carpentry'],
    'cleaning-household': ['Deep cleaning', 'Laundry service', 'Organization', 'Vacuuming'],
    'shopping-errands': ['Shopper', 'Delivery', 'Procurement', 'Errands'],
    'delivery-moving': ['Moving', 'Heavy lifting', 'Transportation', 'Logistics'],
    'pet-care': ['Dog walking', 'Pet sitting', 'Pet care', 'Animal care'],
    'food-beverage': ['Cooking', 'Food prep', 'Catering', 'Delivery'],
    'default': ['Help', 'Assistance', 'Support', 'Service']
  };

  const descriptionMap = {
    'home-maintenance': 'Skilled professional needed for household repairs and maintenance.',
    'cleaning-household': 'Professional cleaning and household organization service required.',
    'shopping-errands': 'Shopping assistance and errand running service needed.',
    'delivery-moving': 'Professional moving and delivery assistance required.',
    'pet-care': 'Experienced pet care and dog walking service needed.',
    'food-beverage': 'Professional food preparation and delivery service needed.',
    'default': 'Professional assistance service required.'
  };

  const notesMap = {
    'home-maintenance': 'Please bring necessary tools and materials. Access to all areas required.',
    'cleaning-household': 'Please bring cleaning supplies if needed. Parking available nearby.',
    'shopping-errands': 'Please have list of items ready. Flexible schedule appreciated.',
    'delivery-moving': 'Please bring moving equipment. Help with loading/unloading needed.',
    'pet-care': 'Please bring pet treats. Pet is friendly and well-behaved.',
    'food-beverage': 'Please confirm dietary preferences. Kitchen access available.',
    'default': 'Please confirm timing and any special requirements.'
  };

  const skills = skillMap[category] || skillMap['default'];
  const suggestionDesc = descriptionMap[category] || descriptionMap['default'];
  const suggestionNotes = notesMap[category] || notesMap['default'];

  res.json({
    success: true,
    data: {
      suggestedSkills: skills,
      suggestedDescription: suggestionDesc,
      suggestedNotes: suggestionNotes
    }
  });
});

// Content moderation endpoint (mock for demo)
app.post('/api/ai/check-content', (req, res) => {
  const { content } = req.body;

  console.log('[Moderation] Checking content');

  // Basic content filtering
  const blockedPatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Email addresses
    /\b(?:credit card|card number|cvv|bank account|routing number)\b/i,
    /\b(?:paypal|stripe|payment|card details)\b/i
  ];

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const hasBlocked = blockedPatterns.some(pattern => pattern.test(contentStr));

  res.json({
    success: true,
    data: {
      is_safe: !hasBlocked,
      has_blocked: hasBlocked,
      reason: hasBlocked ? 'Contact information or payment details detected' : null
    }
  });
});

// Catch all other POST requests
app.post('/api/email/send-no-offers-reminder', (req, res) => {
  res.json({ success: true });
});

app.post('/api/email/send-errand-start-reminder', (req, res) => {
  res.json({ success: true });
});

// Catch all other unimplemented API calls
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
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
