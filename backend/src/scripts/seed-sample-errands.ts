import db from '../db.js';

const sampleErrands = [
  {
    asker_id: 1,
    title: 'Help me clean my apartment',
    description: 'Need help with general cleaning - sweep, mop, and dust',
    category: 'cleaning-laundry',
    location: 'Singapore 239211',
    postal_code: '239211',
    budget: 50,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    status: 'open',
  },
  {
    asker_id: 1,
    title: 'Need someone to do grocery shopping',
    description: 'Buy groceries from NTUC for my household. List will be provided.',
    category: 'shopping-errands',
    location: 'Singapore 048943',
    postal_code: '048943',
    budget: 30,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    status: 'open',
  },
  {
    asker_id: 1,
    title: 'Pet sitting for my dog',
    description: 'Need someone to look after my Golden Retriever for 2 hours. Very friendly dog.',
    category: 'pet-care',
    location: 'Singapore 128373',
    postal_code: '128373',
    budget: 40,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    status: 'open',
  },
  {
    asker_id: 1,
    title: 'Fix my leaky kitchen faucet',
    description: 'The kitchen tap is leaking. Need someone to fix or replace it.',
    category: 'home-maintenance',
    location: 'Singapore 560291',
    postal_code: '560291',
    budget: 60,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    status: 'open',
  },
  {
    asker_id: 1,
    title: 'Help move boxes to new apartment',
    description: 'Need help moving boxes and light furniture to new place 2km away.',
    category: 'moving-help',
    location: 'Singapore 140005',
    postal_code: '140005',
    budget: 80,
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
    status: 'open',
  },
];

async function seedErrands() {
  try {
    console.log('Starting to seed sample errands...');

    for (const errand of sampleErrands) {
      const result = await db.query(
        `INSERT INTO errands
         (asker_id, title, description, category, location, postal_code, budget, deadline, status, errand_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, errand_id, title`,
        [
          errand.asker_id,
          errand.title,
          errand.description,
          errand.category,
          errand.location,
          errand.postal_code,
          errand.budget,
          errand.deadline,
          errand.status,
          `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        ]
      );

      console.log(`✅ Created errand: ${result.rows[0].title} (ID: ${result.rows[0].errand_id})`);
    }

    console.log(`\n✅ Successfully seeded ${sampleErrands.length} sample errands!`);
    console.log('These are now available for doers to bid on in Browse ToHelp.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding errands:', error);
    process.exit(1);
  }
}

seedErrands();
