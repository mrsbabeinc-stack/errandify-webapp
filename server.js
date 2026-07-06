const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const axios = require('axios');

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

    // AI-powered title extraction using Qwen
    let title = input;
    try {
      const qwenResponse = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: 'Extract task title. Rules: (1) Remove numbers and $ amounts, (2) Remove dates (tomorrow, today, mon-sun), (3) Remove times (am/pm), (4) Remove durations (hours, mins), (5) Remove postal codes, (6) Remove "for" when followed by money/time, (7) Keep only core action (1-5 words). Example: "buy bread from supermarket 150102 tomorrow 10am for 1 hour $100" → "Buy Bread From Supermarket"'
            },
            {
              role: 'user',
              content: input
            }
          ],
          temperature: 0.2,
          max_tokens: 40
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (qwenResponse.data.choices?.[0]?.message?.content) {
        title = qwenResponse.data.choices[0].message.content
          .trim()
          .replace(/^["'\n]|["'\n]$/g, '') // Remove quotes and newlines
          .replace(/^-\s*/, '') // Remove leading dash
          .replace(/\$.*$/i, '') // Remove anything after $
          .replace(/\bfor\s*\$?\d+/i, '') // Remove "for $100" or "for 100"
          .replace(/\bfor\s+\d+\s*(?:hours?|mins?|h|m)/i, '') // Remove "for 1 hour"
          .substring(0, 150)
          .trim();
        console.log('[Extract] AI-cleaned title:', title);
      }
    } catch (aiErr) {
      console.warn('[Extract] AI title cleaning failed, using fallback:', aiErr.message);
      // Fallback to simple regex if AI fails
      title = input
        .replace(/\d{6}/g, '') // Remove postal codes
        .replace(/\bfor\s+\$?\d+/i, '') // Remove "for $100"
        .replace(/\$?\d+/g, '') // Remove any prices/budget
        .replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i, '') // Remove times
        .replace(/(?:tomorrow|today|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, '') // Remove dates
        .replace(/\bfor\s+\d+\s*(?:hours?|hrs?|mins?|h|m)/i, '') // Remove "for 2 hours"
        .replace(/[\d.]+\s*(?:hours?|hrs?|mins?|h|m)/i, '') // Remove durations
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!title || title.length < 3) {
      title = 'Help needed';
    }

    // Capitalize properly
    title = title.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    console.log('[Extract] Final title:', title);

    // Category detection - checked in order of priority
    const lowerInput = input.toLowerCase();
    let category = 'home-maintenance';
    if (lowerInput.includes('walk') || lowerInput.includes('dog') || lowerInput.includes('pet')) category = 'pet-care';
    else if (lowerInput.includes('clean') || lowerInput.includes('laundry')) category = 'cleaning-household';
    else if (lowerInput.includes('move') || lowerInput.includes('deliver') || lowerInput.includes('moving')) category = 'delivery-moving';
    else if (lowerInput.includes('buy') || lowerInput.includes('shop') || lowerInput.includes('grocery') || lowerInput.includes('supermarket') || lowerInput.includes('purchase') || lowerInput.includes('fetch')) category = 'shopping-errands';
    else if (lowerInput.includes('cook') || lowerInput.includes('food') || lowerInput.includes('prepare')) category = 'food-beverage';
    else if (lowerInput.includes('makeup') || lowerInput.includes('beauty') || lowerInput.includes('hair') || lowerInput.includes('salon') || lowerInput.includes('nails')) category = 'beauty-personal-care';
    else if (lowerInput.includes('tutor') || lowerInput.includes('teach') || lowerInput.includes('lesson') || lowerInput.includes('class')) category = 'tutoring-lessons';
    else if (lowerInput.includes('photo') || lowerInput.includes('picture') || lowerInput.includes('shoot')) category = 'photography';
    else if (lowerInput.includes('design') || lowerInput.includes('graphic') || lowerInput.includes('logo')) category = 'design-creative';
    else if (lowerInput.includes('repair') || lowerInput.includes('fix') || lowerInput.includes('maintenance')) category = 'home-maintenance';

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

    // Use Mapbox to resolve postal code → address, cache in DB to avoid future API calls
    // This provides accurate real addresses, cached for performance, user-correctable for improvement
    let areaName = '';
    let fullAddressValue = '';

    if (postalCode && postalCode.length === 6) {
      try {
        console.log('[Extract] Looking up postal code:', postalCode);

        // FIRST: Check database cache (no API calls if exists)
        let cached = null;
        try {
          const cacheResult = await db.query(
            'SELECT area, formatted_address FROM postal_code_cache WHERE postal_code = $1 LIMIT 1',
            [postalCode]
          );
          if (cacheResult.rows.length > 0) {
            cached = cacheResult.rows[0];
            console.log('[Extract] Cache HIT for', postalCode);
          }
        } catch (dbErr) {
          console.warn('[Extract] Cache lookup failed (DB may not exist yet):', dbErr.message);
        }

        if (cached) {
          // Use cached value (zero API calls!)
          areaName = cached.area || '';
          fullAddressValue = cached.formatted_address || '';
          console.log('[Extract] Using cached address:', fullAddressValue);
        } else {
          // SECOND: Call Mapbox API to get real address
          console.log('[Extract] Cache MISS, querying Mapbox...');
          try {
            const mapboxResponse = await axios.get(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/Singapore%20${postalCode}.json`,
              {
                params: { access_token: process.env.MAPBOX_API_KEY },
                timeout: 5000
              }
            );

            if (mapboxResponse.data.features && mapboxResponse.data.features.length > 0) {
              const feature = mapboxResponse.data.features[0];
              fullAddressValue = feature.place_name || `Singapore ${postalCode}`;

              // Extract area from place name (e.g., "Choa Chu Kang, Singapore" → "Choa Chu Kang")
              const parts = fullAddressValue.split(',');
              areaName = parts[0]?.trim() || '';

              console.log('[Extract] Mapbox result:', fullAddressValue);

              // THIRD: Cache in DB for future requests (reduce API calls)
              try {
                await db.query(
                  `INSERT INTO postal_code_cache (postal_code, area, formatted_address, provider, confidence)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (postal_code) DO UPDATE SET
                   area = $2, formatted_address = $3, provider = $4, confidence = $5, last_verified_at = NOW()`,
                  [postalCode, areaName, fullAddressValue, 'mapbox', 0.95]
                );
                console.log('[Extract] Cached postal', postalCode, '→ area:', areaName);
              } catch (cacheErr) {
                console.warn('[Extract] Cache save failed (DB may not exist):', cacheErr.message);
                // Continue anyway - address is still valid
              }
            } else {
              console.log('[Extract] Mapbox returned no results for postal', postalCode);
              // Fallback: use sector-based area mapping
              const postalCodeToAreaMap = {'01': 'Raffles Place','02': 'Downtown Core','03': 'Marina Bay','04': 'Bukit Merah','05': 'Outram','06': 'Bukit Merah','07': 'Outram','08': 'Outram','09': 'Outram','10': 'Orchard','11': 'Orchard','12': 'Orchard','23': 'Orchard','13': 'Tanglin','14': 'Tanglin','15': 'Henderson','16': 'Clementi','17': 'Novena','18': 'Novena','19': 'Bukit Timah','20': 'Bukit Timah','21': 'Clementi','22': 'Clementi','24': 'Kallang','25': 'Kallang','26': 'Geylang','27': 'Geylang','28': 'Bedok','29': 'Bedok','30': 'Bedok','31': 'Tampines','32': 'Tampines','33': 'Tampines','34': 'Tampines','35': 'Toa Payoh','36': 'Toa Payoh','37': 'Serangoon','38': 'Serangoon','39': 'Hougang','40': 'Hougang','41': 'Bishan','42': 'Bishan','43': 'Serangoon','44': 'Serangoon','45': 'Sengkang','46': 'Sengkang','47': 'Tampines','48': 'Sengkang','49': 'Geylang','50': 'Bukit Timah','51': 'Bukit Timah','52': 'Bukit Timah','53': 'Bukit Timah','54': 'Bukit Timah','55': 'Choa Chu Kang','56': 'Choa Chu Kang','57': 'Choa Chu Kang','58': 'Choa Chu Kang','59': 'Choa Chu Kang','60': 'Jurong East','61': 'Jurong East','62': 'Jurong West','63': 'Jurong West','64': 'Jurong West','65': 'Jurong West','66': 'Jurong West','67': 'Clementi','68': 'Choa Chu Kang','69': 'Jurong West','70': 'Woodlands','71': 'Woodlands','72': 'Woodlands','73': 'Woodlands','74': 'Yishun','75': 'Yishun','76': 'Yishun','77': 'Yishun','78': 'Sembawang','79': 'Sembawang','80': 'Punggol','81': 'Punggol','82': 'Punggol'};
              const sector = postalCode.substring(0, 2);
              areaName = postalCodeToAreaMap[sector] || '';
              fullAddressValue = areaName ? `Singapore ${postalCode}` : '';
            }
          } catch (mapboxErr) {
            console.warn('[Extract] Mapbox API failed:', mapboxErr.message);
            // Ultimate fallback: sector-only
            const postalCodeToAreaMap = {'01': 'Raffles Place','02': 'Downtown Core','03': 'Marina Bay','04': 'Bukit Merah','05': 'Outram','06': 'Bukit Merah','07': 'Outram','08': 'Outram','09': 'Outram','10': 'Orchard','11': 'Orchard','12': 'Orchard','23': 'Orchard','13': 'Tanglin','14': 'Tanglin','15': 'Henderson','16': 'Clementi','17': 'Novena','18': 'Novena','19': 'Bukit Timah','20': 'Bukit Timah','21': 'Clementi','22': 'Clementi','24': 'Kallang','25': 'Kallang','26': 'Geylang','27': 'Geylang','28': 'Bedok','29': 'Bedok','30': 'Bedok','31': 'Tampines','32': 'Tampines','33': 'Tampines','34': 'Tampines','35': 'Toa Payoh','36': 'Toa Payoh','37': 'Serangoon','38': 'Serangoon','39': 'Hougang','40': 'Hougang','41': 'Bishan','42': 'Bishan','43': 'Serangoon','44': 'Serangoon','45': 'Sengkang','46': 'Sengkang','47': 'Tampines','48': 'Sengkang','49': 'Geylang','50': 'Bukit Timah','51': 'Bukit Timah','52': 'Bukit Timah','53': 'Bukit Timah','54': 'Bukit Timah','55': 'Choa Chu Kang','56': 'Choa Chu Kang','57': 'Choa Chu Kang','58': 'Choa Chu Kang','59': 'Choa Chu Kang','60': 'Jurong East','61': 'Jurong East','62': 'Jurong West','63': 'Jurong West','64': 'Jurong West','65': 'Jurong West','66': 'Jurong West','67': 'Clementi','68': 'Choa Chu Kang','69': 'Jurong West','70': 'Woodlands','71': 'Woodlands','72': 'Woodlands','73': 'Woodlands','74': 'Yishun','75': 'Yishun','76': 'Yishun','77': 'Yishun','78': 'Sembawang','79': 'Sembawang','80': 'Punggol','81': 'Punggol','82': 'Punggol'};
              const sector = postalCode.substring(0, 2);
              areaName = postalCodeToAreaMap[sector] || '';
              fullAddressValue = areaName ? `Singapore ${postalCode}` : '';
            }
        }
      } catch (err) {
        console.error('[Extract] Postal code lookup error:', err.message);
        // Continue with empty values - user can fill in manually
      }
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
    'beauty-personal-care': ['Makeup artist', 'Hair styling', 'Nail care', 'Beauty consultant'],
    'tutoring-lessons': ['Tutor', 'Instructor', 'Coach', 'Mentor'],
    'photography': ['Photographer', 'Photo editing', 'Videography', 'Lighting'],
    'design-creative': ['Designer', 'Graphic design', 'Creative', 'Illustrator'],
    'default': ['Help', 'Assistance', 'Support', 'Service']
  };

  const descriptionMap = {
    'home-maintenance': 'Skilled professional needed for household repairs and maintenance.',
    'cleaning-household': 'Professional cleaning and household organization service required.',
    'shopping-errands': 'Shopping assistance and errand running service needed.',
    'delivery-moving': 'Professional moving and delivery assistance required.',
    'pet-care': 'Experienced pet care and dog walking service needed.',
    'food-beverage': 'Professional food preparation and delivery service needed.',
    'beauty-personal-care': 'Professional beauty and personal care service needed.',
    'tutoring-lessons': 'Experienced tutor or instructor needed for lessons and coaching.',
    'photography': 'Professional photography and visual content creation service required.',
    'design-creative': 'Creative design and visual content service needed.',
    'default': 'Professional assistance service required.'
  };

  const notesMap = {
    'home-maintenance': 'Please bring necessary tools and materials. Access to all areas required.',
    'cleaning-household': 'Please bring cleaning supplies if needed. Parking available nearby.',
    'shopping-errands': 'Please have list of items ready. Flexible schedule appreciated.',
    'delivery-moving': 'Please bring moving equipment. Help with loading/unloading needed.',
    'pet-care': 'Please bring pet treats. Pet is friendly and well-behaved.',
    'food-beverage': 'Please confirm dietary preferences. Kitchen access available.',
    'beauty-personal-care': 'Please bring all necessary products and equipment. Hygienic setup required.',
    'tutoring-lessons': 'Please confirm learning objectives and preferred teaching methods.',
    'photography': 'Please confirm location and lighting requirements. Equipment as discussed.',
    'design-creative': 'Please provide brief and reference materials. Timeline to be confirmed.',
    'default': 'Please confirm timing and any special requirements.'
  };

  const skills = skillMap[category] || skillMap['default'];
  const suggestionDesc = descriptionMap[category] || descriptionMap['default'];
  let suggestionNotes = notesMap[category] || notesMap['default'];

  // Enhance notes based on title keywords for more specific guidance
  const titleLower = (title || '').toLowerCase();

  // Cleaning-specific enhancements
  if (category === 'cleaning-household') {
    if (titleLower.includes('deep') || titleLower.includes('thorough')) {
      suggestionNotes = 'Deep cleaning required. Please bring all necessary cleaning supplies and equipment.';
    } else if (titleLower.includes('laundry') || titleLower.includes('wash')) {
      suggestionNotes = 'Laundry service. Please bring detergent and fabric care products if needed.';
    } else if (titleLower.includes('organize') || titleLower.includes('declutter')) {
      suggestionNotes = 'Organization service. Please confirm area to organize and any special handling needed.';
    }
  }

  // Moving-specific enhancements
  if (category === 'delivery-moving') {
    if (titleLower.includes('move') || titleLower.includes('relocate')) {
      suggestionNotes = 'Help with moving required. Please bring packing materials, boxes, and moving equipment.';
    } else if (titleLower.includes('deliver') || titleLower.includes('transport')) {
      suggestionNotes = 'Delivery service. Please confirm item size/weight and any special handling instructions.';
    }
  }

  // Pet-care enhancements
  if (category === 'pet-care') {
    if (titleLower.includes('walk') || titleLower.includes('walking')) {
      suggestionNotes = 'Dog walking service. Please provide leash, treats, and confirm route preference.';
    } else if (titleLower.includes('sit') || titleLower.includes('sitting')) {
      suggestionNotes = 'Pet sitting. Please provide food, toys, and emergency contact information.';
    }
  }

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
