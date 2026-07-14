const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

// Qwen API Configuration
const QWEN_API_KEY = 'sk-ws-H.IEXLEL.Z3E5.MEUCIQC8wObhyMlp03fPr_w_rWelWwHZiVcIOcsp05yntX56fgIgEkEpVo29g6na675nmhk_tr97nUPj3JAHGiSfWrmg4qw';
const QWEN_API_BASE = 'https://ws-5qpu2xdkh16k4pgo.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';

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

// Serve built frontend
const frontendPath = path.join(__dirname, 'frontend/dist');
app.use(express.static(frontendPath));

// Mock database
const mockData = {
  cases: [],
  errands: [
    { id: 1, asker_id: 1, formatted_id: 'ER26CL-K9M7', title: 'Deep clean 3-room apartment', description: 'Full house cleaning with attention to detail', category: 'cleaning-household', status: 'open', budget: '150.00', location: 'Tanjong Pagar', postal_code: '150101', full_address: 'Tanjong Pagar Centre', deadline: '2026-07-10T18:00:00Z', created_at: new Date().toISOString() },
    { id: 2, asker_id: 1, formatted_id: 'ER26FR-ABC2', title: 'Assemble IKEA furniture', description: 'Help assembling Billy bookshelf', category: 'furniture-assembly', status: 'open', budget: '60.00', location: 'Clementi', postal_code: '120130', full_address: 'Clementi Green Estate', deadline: '2026-07-11T20:00:00Z', created_at: new Date().toISOString() },
    { id: 3, asker_id: 1, formatted_id: 'ER26CH-XYZ3', title: 'Tutor my son in Math', description: 'Primary 5 - fractions and decimals', category: 'childcare-education', status: 'open', budget: '80.00', location: 'Bukit Timah', postal_code: '229881', full_address: 'Bukit Timah Road', deadline: '2026-07-15T18:00:00Z', created_at: new Date().toISOString() },
    { id: 4, asker_id: 1, formatted_id: 'ER26SH-DEF4', title: 'Grocery shopping and delivery', description: 'Pick up groceries from supermarket', category: 'shopping-errands', status: 'open', budget: '30.00', location: 'Ang Mo Kio', postal_code: '560161', full_address: 'Ang Mo Kio Avenue 6', deadline: '2026-07-08T17:00:00Z', created_at: new Date().toISOString() },
    { id: 5, asker_id: 1, formatted_id: 'ER26PC-GHI5', title: 'Pet sitting - cat care for 3 days', description: 'Visit twice daily to feed and play with cat', category: 'pet-care', status: 'open', budget: '120.00', location: 'Marine Parade', postal_code: '440291', full_address: 'Marine Parade Central', deadline: '2026-07-15T10:00:00Z', created_at: new Date().toISOString() },
    { id: 6, asker_id: 1, formatted_id: 'ER26DV-JKL6', title: 'Help with moving house', description: 'Need 2 people to carry boxes and furniture', category: 'delivery-moving', status: 'open', budget: '250.00', location: 'Pasir Ris', postal_code: '510165', full_address: 'Pasir Ris Street 11', deadline: '2026-07-12T09:00:00Z', created_at: new Date().toISOString() },
    { id: 7, asker_id: 1, formatted_id: 'ER26AR-MNO7', title: 'Graphic design - social media banner', description: 'Design 3 Instagram banners for business', category: 'creative-arts', status: 'open', budget: '100.00', location: 'Jurong East', postal_code: '600127', full_address: 'Jurong East Central', deadline: '2026-07-09T17:00:00Z', created_at: new Date().toISOString() },
    { id: 8, asker_id: 1, formatted_id: 'ER26HM-PQR8', title: 'Fix leaky kitchen faucet', description: 'Replace washer and check cartridge', category: 'home-maintenance', status: 'open', budget: '80.00', location: 'Bishan', postal_code: '570345', full_address: 'Bishan Street 24', deadline: '2026-07-10T18:00:00Z', created_at: new Date().toISOString() },
    { id: 9, asker_id: 1, formatted_id: 'ER26PS-STU9', title: 'Personal shopping - clothes and shoes', description: 'Shop for formal clothes for upcoming event', category: 'personal-care', status: 'open', budget: '200.00', location: 'Orchard', postal_code: '228216', full_address: 'Orchard Road', deadline: '2026-07-09T15:00:00Z', created_at: new Date().toISOString() },
  ],
  bids: [],
};

let nextErrandId = 10;

// API Routes
app.post('/api/auth/demo-login', (req, res) => {
  const { account } = req.body;
  const userId = account === 'sarah' ? 1 : account === 'john' ? 2 : 3;
  const token = `demo-token-${userId}`;

  // Check if user has pending errands (as asker) or pending bids (as doer)
  const userErrands = mockData.errands.filter(e => e.asker_id === userId && e.status === 'open');
  const userBids = mockData.bids.filter(b => b.doer_id === userId && b.status === 'pending');

  // Default to 'asker' if has pending errands, else 'doer'
  let defaultRole = 'asker';
  if (userErrands.length === 0 && userBids.length > 0) {
    defaultRole = 'doer';
  }

  res.json({
    success: true,
    data: {
      accessToken: token,
      user: {
        id: userId,
        name: account,
        email: `${account}@demo.com`,
        role: defaultRole,
        isDemo: true,
        hasPendingErrands: userErrands.length > 0,
        hasPendingBids: userBids.length > 0,
      },
    },
  });
});

app.get('/api/errands', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;
  const { myOnly } = req.query;
  let errands = mockData.errands;
  if (myOnly === 'true') {
    errands = errands.filter(e => e.asker_id === userId);
  } else {
    errands = errands.filter(e => e.status === 'open' && e.asker_id !== userId);
  }
  res.json({ success: true, data: errands });
});

app.get('/api/errands/:id', (req, res) => {
  const errand = mockData.errands.find(e => e.id === parseInt(req.params.id));
  if (!errand) return res.status(404).json({ error: 'Errand not found' });

  // Ensure askerId is set for frontend compatibility
  const errandWithIds = {
    ...errand,
    askerId: errand.asker_id,
    doerId: errand.doer_id,
  };

  res.json({ success: true, data: errandWithIds });
});

app.post('/api/errands', (req, res) => {
  const { title, description, category, location, postal_code, budget, deadline } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;
  const newErrand = {
    id: nextErrandId++,
    asker_id: userId,
    askerId: userId,
    formatted_id: `ER26${category.substring(0, 2).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    errandId: `ER26${category.substring(0, 2).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    title, description, category, status: 'open',
    budget: budget ? budget.toString() : '0.00',
    location, postal_code, full_address: location, deadline,
    created_at: new Date().toISOString(),
  };
  mockData.errands.push(newErrand);
  res.json({ success: true, data: newErrand });
});

app.get('/api/bids/my-bids', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;
  const myBids = mockData.bids.filter(b => b.doer_id === userId);
  res.json({ success: true, data: myBids });
});

// Postal code to area mapping (first 2 digits)
const postalCodeAreas = {
  '01': 'Raffles Place', '02': 'Cecil Street', '03': 'Tanjong Pagar', '04': 'Tanjong Pagar',
  '05': 'Outram', '06': 'People\'s Park', '07': 'Chinatown', '08': 'Tanjong Pagar', '09': 'Tanjong Pagar',
  '10': 'Orchard', '11': 'Pasir Panjang', '12': 'Novena', '13': 'Newton', '14': 'Farrer Park',
  '15': 'Henderson', '16': 'Henderson', '17': 'Balestier', '18': 'Macpherson', '19': 'Paya Lebar',
  '20': 'Paya Lebar', '21': 'Geylang', '22': 'Geylang', '23': 'Orchard', '24': 'Eunos',
  '25': 'Bedok', '26': 'Bedok', '27': 'Bedok', '28': 'Tampines', '29': 'Tampines', '30': 'Tampines',
  '31': 'Pasir Ris', '32': 'Pasir Ris', '33': 'Punggol', '34': 'Punggol', '35': 'Hougang',
  '36': 'Hougang', '37': 'Sengkang', '38': 'Sengkang', '39': 'Sengkang', '40': 'Jurong West',
  '41': 'Jurong West', '42': 'Jurong', '43': 'Jurong East', '44': 'Clementi', '45': 'Clementi',
  '46': 'Clementi', '47': 'Bukit Merah', '48': 'Bukit Merah', '49': 'Tiong Bahru', '50': 'Redhill',
  '51': 'Queenstown', '52': 'Commonwealth', '53': 'Pasir Panjang', '54': 'Pasir Panjang', '55': 'Bukit Timah',
  '56': 'Bukit Timah', '57': 'Holland', '58': 'Tanglin', '59': 'Clementi', '60': 'Bukit Timah',
  '61': 'Bishan', '62': 'Jurong', '63': 'Ang Mo Kio', '64': 'Ang Mo Kio', '65': 'Serangoon',
  '66': 'Serangoon', '67': 'Ang Mo Kio', '68': 'Choa Chu Kang', '69': 'Geylang', '70': 'Bedok',
  '71': 'Bedok', '72': 'Bedok', '73': 'Bedok', '74': 'Tampines', '75': 'Tampines', '76': 'Tampines',
  '77': 'Tampines', '78': 'Tampines', '79': 'Sengkang', '80': 'Sengkang', '81': 'Sengkang',
  '82': 'Sengkang', '83': 'Simei',
};

// Hana AI Task Extraction - Using Real Qwen API
app.post('/api/ai/extract-task-info', async (req, res) => {
  try {
    const { input } = req.body;

    const nowDate = new Date();
    const todayStr = nowDate.toISOString().split('T')[0];
    const tomorrowDate = new Date(nowDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    const systemPrompt = `You are an AI assistant that extracts structured errand/task information from natural language input.
Today's date is ${todayStr}. Tomorrow is ${tomorrowStr}.
Extract and return ONLY valid JSON with these fields:
{
  "title": "task title (max 60 chars)",
  "description": "full task description",
  "category": "category slug (e.g., 'home-maintenance', 'cleaning-household', 'childcare-education')",
  "location": "location or area name",
  "postalCode": "6-digit postal code if mentioned, else null",
  "fullAddress": "full address if available",
  "date": "YYYY-MM-DD format date (MUST be today or in future)",
  "time": "HH:MM format time",
  "duration": "number (hours)",
  "durationUnit": "Hr",
  "budget": "number (SGD)",
  "notes": "any special requirements"
}`;

    const userPrompt = `Extract task info from: "${input}". If it mentions "tomorrow", use ${tomorrowStr}. Never use dates before today.`;

    const response = await axios.post(
      `${QWEN_API_BASE}/chat/completions`,
      {
        model: 'qwen-max',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: require('https').Agent({ rejectUnauthorized: false }),
      }
    );

    const qwenResponse = response.data.choices[0].message.content;
    console.log('[Qwen] Raw response:', qwenResponse);

    // Parse JSON from response
    const jsonMatch = qwenResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Qwen response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Ensure date is in future and deadline is set
    let taskDate = extracted.date ? new Date(extracted.date + 'T00:00:00Z') : new Date();
    const todayCheckDate = new Date();
    todayCheckDate.setUTCHours(0, 0, 0, 0);

    // If date is today or in the past, set to tomorrow
    if (isNaN(taskDate.getTime()) || taskDate <= todayCheckDate) {
      taskDate = new Date(todayCheckDate);
      taskDate.setUTCDate(taskDate.getUTCDate() + 1);
    }

    const deadline = new Date(taskDate);
    deadline.setUTCHours(18, 0, 0, 0);

    // Format date back to YYYY-MM-DD
    const dateString = taskDate.toISOString().split('T')[0];

    // Resolve area from postal code if available
    let resolvedArea = extracted.location || 'Singapore';
    let resolvedPostalCode = extracted.postalCode || '';

    if (resolvedPostalCode && resolvedPostalCode.length >= 2) {
      const postalPrefix = resolvedPostalCode.substring(0, 2);
      const areaFromPostal = postalCodeAreas[postalPrefix];
      if (areaFromPostal) {
        resolvedArea = areaFromPostal;
      }
    }

    res.json({
      success: true,
      data: {
        title: extracted.title || input.substring(0, 60),
        description: extracted.description || input,
        category: extracted.category || 'home-maintenance',
        location: resolvedArea,
        postalCode: resolvedPostalCode,
        fullAddress: extracted.fullAddress || `${resolvedArea}, Singapore ${resolvedPostalCode}` || resolvedArea,
        area: resolvedArea,
        date: dateString,
        time: extracted.time || '09:00',
        duration: extracted.duration?.toString() || '2',
        durationUnit: 'Hr',
        budget: extracted.budget?.toString() || '100',
        notes: extracted.notes || '',
        deadline: deadline.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Qwen] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// AI Suggestions - Using Real Qwen API
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { category, title, description } = req.body;

    const systemPrompt = `You are an AI assistant that generates professional recommendations for task/errand platform.
IMPORTANT: Do NOT repeat information already visible on the form (title, budget, date, time, location, duration).
Focus on NEW insights - special tools needed, safety tips, preparation steps, or expertise required.

Return ONLY valid JSON with:
{
  "description": "NEW insights or tips, NOT repeating the task title/description already filled",
  "notes": "A specific actionable tip for the doer (e.g., 'Bring your own tools' or 'Allow 15 min setup time')",
  "certifications": ["Certification1", "Certification2"],
  "category": "category slug"
}`;

    const userPrompt = `For a ${category || 'general'} task titled "${title}": ${description || 'no description'}.
What professional certifications or qualifications are needed? (e.g., "Plumbing License", "First Aid", "Gas Safe Register", "Driving License")
DO NOT repeat the task title, description, or budget in your response.`;

    const response = await axios.post(
      `${QWEN_API_BASE}/chat/completions`,
      {
        model: 'qwen-max',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: require('https').Agent({ rejectUnauthorized: false }),
      }
    );

    const qwenResponse = response.data.choices[0].message.content;
    console.log('[Qwen] Suggestions raw response:', qwenResponse);
    const jsonMatch = qwenResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON');
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    console.log('[Qwen] Parsed suggestions:', suggestions);

    res.json({
      success: true,
      data: {
        description: suggestions.description || `Professional ${category} service`,
        notes: suggestions.notes || 'High quality work guaranteed',
        certifications: Array.isArray(suggestions.certifications) ? suggestions.certifications : [],
        category: suggestions.category || category,
      },
    });
  } catch (error) {
    console.error('[Qwen] Suggestions error:', error.message);
    res.json({
      success: true,
      data: {
        description: `Professional ${req.body.category} service`,
        notes: 'High quality work guaranteed',
        certifications: [],
        category: req.body.category,
      },
    });
  }
});

app.post('/api/bids', (req, res) => {
  const { errand_id, amount } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  const userId = token ? parseInt(token.replace('demo-token-', '')) : 1;

  const newBid = {
    id: mockData.bids.length + 1,
    errand_id,
    doer_id: userId,
    offer_id: `OF26${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    amount: parseFloat(amount),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  mockData.bids.push(newBid);

  res.json({
    success: true,
    data: newBid,
  });
});

app.get('/api/errands/:errand_id/bids', (req, res) => {
  const errandId = parseInt(req.params.errand_id);
  const bids = mockData.bids.filter(b => b.errand_id === errandId);
  res.json({ success: true, data: bids });
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json({
    success: true,
    data: { id: userId, name: userId === 1 ? 'Sarah' : userId === 2 ? 'John' : 'Admin', email: `user${userId}@demo.com`, alias: userId === 1 ? 'Sarah' : userId === 2 ? 'John' : 'Admin', role: userId === 3 ? 'admin' : 'user', rating: 4.8 },
  });
});

app.get('/api/ratings/check', (req, res) => {
  res.json({ success: true, data: { hasRated: false } });
});

app.get('/api/errands/:errandId/doer', (req, res) => {
  const errandId = parseInt(req.params.errandId);
  const errand = mockData.errands.find(e => e.id === errandId);
  if (!errand) return res.status(404).json({ error: 'Errand not found' });

  const doerId = errand.asker_id;
  res.json({
    success: true,
    data: {
      id: doerId,
      name: doerId === 1 ? 'Sarah' : doerId === 2 ? 'John' : 'Admin',
      alias: doerId === 1 ? 'Sarah' : doerId === 2 ? 'John' : 'Admin',
      rating: 4.8
    }
  });
});

app.get('/api/notifications', (req, res) => {
  res.json({ success: true, data: [] });
});

// Parse datetime endpoint
app.post('/api/ai/parse-datetime', (req, res) => {
  const { input } = req.body;
  const now = new Date();
  let deadline = new Date(now);
  
  if (input.toLowerCase().includes('tomorrow')) {
    deadline.setDate(deadline.getDate() + 1);
  } else if (input.toLowerCase().includes('today') || input.toLowerCase().includes('now')) {
    deadline.setHours(deadline.getHours() + 1);
  } else {
    deadline.setDate(deadline.getDate() + 3);
  }
  
  deadline.setHours(18, 0, 0, 0);
  
  res.json({
    success: true,
    data: {
      date: deadline.toISOString().split('T')[0],
      time: '18:00',
      deadline: deadline.toISOString(),
    },
  });
});

// Content moderation endpoint
app.post('/api/ai/check-content', (req, res) => {
  res.json({
    success: true,
    data: {
      is_safe: true,
      warnings: [],
    },
  });
});

// Cases endpoints
app.get('/api/cases', (req, res) => {
  res.json({
    cases: mockData.cases,
    total: mockData.cases.length,
    limit: 20,
    offset: 0
  });
});

app.post('/api/cases/demo/create-samples', (req, res) => {
  const sampleCases = [
    {
      case_type: 'app_issue',
      severity: 'high',
      complainant_user_id: 1,
      respondent_user_id: 2,
      errand_id: 101,
      subject: 'App crashes when uploading photos',
      description: 'The app freezes and crashes whenever I try to upload multiple photos to an errand. Tried on WiFi and mobile data, same issue.',
      status: 'open',
      ai_confidence: 0.80
    },
    {
      case_type: 'payment_enquiry',
      severity: 'medium',
      complainant_user_id: 3,
      respondent_user_id: 4,
      errand_id: 102,
      subject: 'How does payment hold work?',
      description: 'I want to understand the payment hold process. When does the money get released after completion?',
      status: 'open',
      ai_confidence: 0.75
    },
    {
      case_type: 'task_enquiry',
      severity: 'low',
      complainant_user_id: 5,
      respondent_user_id: 6,
      errand_id: 103,
      subject: 'Can I edit task after posting?',
      description: 'I posted a cleaning task but realized I need to change the location. Can I edit it or do I need to cancel and repost?',
      status: 'open',
      ai_confidence: 0.75
    },
    {
      case_type: 'safety_concern',
      severity: 'critical',
      complainant_user_id: 7,
      respondent_user_id: 8,
      errand_id: 104,
      subject: 'Doer made inappropriate comments during task',
      description: 'During the errand, the doer made offensive comments that made me feel uncomfortable and unsafe.',
      status: 'open',
      ai_confidence: 0.95
    },
    {
      case_type: 'app_issue',
      severity: 'medium',
      complainant_user_id: 9,
      respondent_user_id: 10,
      errand_id: 105,
      subject: 'Cannot logout from account',
      description: 'The logout button does not work. I have tried clearing cache and restarting the app but still unable to logout.',
      status: 'open',
      ai_confidence: 0.80
    },
    {
      case_type: 'task_enquiry',
      severity: 'low',
      complainant_user_id: 11,
      respondent_user_id: 12,
      errand_id: 106,
      subject: 'What is the cancellation policy?',
      description: 'If I cancel a task after a doer accepts it, what are the charges? Will the doer be penalized?',
      status: 'open',
      ai_confidence: 0.75
    },
    {
      case_type: 'safety_concern',
      severity: 'high',
      complainant_user_id: 13,
      respondent_user_id: 14,
      errand_id: 107,
      subject: 'Suspicious user activity',
      description: 'This user has been messaging multiple times trying to arrange meetups outside the app. Very suspicious behavior.',
      status: 'open',
      ai_confidence: 0.90
    },
    {
      case_type: 'payment_enquiry',
      severity: 'low',
      complainant_user_id: 15,
      respondent_user_id: 16,
      errand_id: 108,
      subject: 'Do I get points for this task?',
      description: 'Does completing errands earn Errandify Points? How are they calculated?',
      status: 'open',
      ai_confidence: 0.75
    }
  ];

  const createdCases = sampleCases.map((caseData, idx) => ({
    id: mockData.cases.length + idx + 1,
    case_id: `D26-${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
    ...caseData,
    created_at: new Date().toISOString(),
    asker_alias: `User-${caseData.complainant_user_id}`,
    doer_alias: `User-${caseData.respondent_user_id}`,
    asker_online: Math.random() > 0.5,
    doer_online: Math.random() > 0.5,
    tags: [],
    ai_recommendation: {
      recommendation: caseData.case_type === 'safety_concern' ? 'escalated' : 'no_action',
      confidence: caseData.ai_confidence,
      reasoning: 'Sample test case'
    }
  }));

  mockData.cases.push(...createdCases);

  res.status(201).json({
    success: true,
    message: `Created ${createdCases.length} sample test cases`,
    cases: createdCases.map(c => ({
      id: c.id,
      case_id: c.case_id,
      case_type: c.case_type,
      severity: c.severity,
      subject: c.subject,
      status: c.status
    }))
  });
});

// Task analysis endpoint
app.post('/api/ai/analyze-task', (req, res) => {
  res.json({
    success: true,
    data: {
      sentiment: 'neutral',
      complexity: 'medium',
      suggestions: [],
    },
  });
});

// SPA Fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Errandify Demo Server running on http://0.0.0.0:${PORT}`);
  console.log(`📦 Serving frontend from ${frontendPath}`);
  console.log(`🤖 Using Real Qwen AI API`);
  console.log(`📱 Accessible from: http://10.11.146.187:${PORT}`);
});

