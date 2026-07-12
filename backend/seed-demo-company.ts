import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoCompany() {
  try {
    console.log('🌱 Seeding demo company...');

    // Create demo user (owner)
    const owner = await prisma.users.upsert({
      where: { phone: '+6581234567' },
      update: {},
      create: {
        name: 'John Lim',
        email: 'john.lim@rumahemas.sg',
        phone: '+6581234567',
        user_type: 'user',
        email_verified: true,
        phone_verified: true,
      },
    });

    console.log('✅ Created demo owner:', owner.id);

    // Create demo company
    const company = await prisma.companies.upsert({
      where: { uen: 'UEN202401001' },
      update: {},
      create: {
        uen: 'UEN202401001',
        name: 'Rumah Emas Demo Company',
        description: 'Demo company for testing the Errandify company module',
        owner_id: owner.id,
        email: 'contact@rumahemas.sg',
        phone: '+6565123456',
        address: '101 Tanjong Pagar Road, Singapore 088518',
        postal_code: '088518',
        area: 'Tanjong Pagar',
        subscription_tier: 'silver',
        company_status: 'active',
      },
    });

    console.log('✅ Created demo company:', company.id);

    // Create demo employees
    const employee1 = await prisma.users.upsert({
      where: { phone: '+6587654321' },
      update: {},
      create: {
        name: 'Sarah Wong',
        email: 'sarah.wong@rumahemas.sg',
        phone: '+6587654321',
        user_type: 'user',
        email_verified: true,
        phone_verified: true,
      },
    });

    const employee2 = await prisma.users.upsert({
      where: { phone: '+6581112222' },
      update: {},
      create: {
        name: 'Priya Kumar',
        email: 'priya.kumar@rumahemas.sg',
        phone: '+6581112222',
        user_type: 'user',
        email_verified: true,
        phone_verified: true,
      },
    });

    const employee3 = await prisma.users.upsert({
      where: { phone: '+6583334444' },
      update: {},
      create: {
        name: 'Ahmad Hassan',
        email: 'ahmad.hassan@rumahemas.sg',
        phone: '+6583334444',
        user_type: 'user',
        email_verified: true,
        phone_verified: true,
      },
    });

    console.log('✅ Created demo employees:', employee1.id, employee2.id, employee3.id);

    // Tag employees to company
    const emp1 = await prisma.employees.upsert({
      where: {
        company_id_user_id: {
          company_id: company.id,
          user_id: employee1.id,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        user_id: employee1.id,
        role: 'manager',
        skills: 'Cleaning, Customer Service, Coordination',
        status: 'active',
        hire_date: new Date('2025-01-15'),
      },
    });

    const emp2 = await prisma.employees.upsert({
      where: {
        company_id_user_id: {
          company_id: company.id,
          user_id: employee2.id,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        user_id: employee2.id,
        role: 'employee',
        skills: 'Delivery, Packing, Inventory',
        status: 'active',
        hire_date: new Date('2025-02-01'),
      },
    });

    const emp3 = await prisma.employees.upsert({
      where: {
        company_id_user_id: {
          company_id: company.id,
          user_id: employee3.id,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        user_id: employee3.id,
        role: 'employee',
        skills: 'Customer Support, Troubleshooting',
        status: 'active',
        hire_date: new Date('2025-02-15'),
      },
    });

    console.log('✅ Tagged employees to company');

    // Create company wallet
    const wallet = await prisma.company_wallets.upsert({
      where: { company_id: company.id },
      update: {},
      create: {
        company_id: company.id,
        balance: 500.00,
        total_earned: 1250.00,
        total_withdrawn: 750.00,
      },
    });

    console.log('✅ Created company wallet:', wallet.balance);

    // Create company subscription
    const subscription = await prisma.company_subscriptions.upsert({
      where: { company_id: company.id },
      update: {},
      create: {
        company_id: company.id,
        tier: 'silver',
        monthly_fee: 99.00,
        start_date: new Date(),
        status: 'active',
      },
    });

    console.log('✅ Created subscription:', subscription.tier);

    console.log('\n🎉 Demo company seeded successfully!');
    console.log(`
📊 Demo Company Details:
   Company ID: ${company.id}
   Owner ID: ${owner.id}
   Owner Email: ${owner.email}
   Company Name: ${company.name}
   Employees: 3
   - Sarah Wong (Manager)
   - Priya Kumar (Employee)
   - Ahmad Hassan (Employee)
   Wallet Balance: SGD $${wallet.balance}
   Subscription Tier: ${subscription.tier}
    `);
  } catch (error) {
    console.error('❌ Error seeding demo company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoCompany();
