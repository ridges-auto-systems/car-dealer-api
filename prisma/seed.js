/* eslint-disable comma-dangle */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚗 Seeding Rides Automotors database...');

  try {
    // Check if we're in CI environment
    const isCI = process.env.CI === 'true';

    if (isCI) {
      console.log('📝 Running in CI environment - using minimal seed data');
    }

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash('admin123', 12);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@ridesautomotors.com' },
      update: {},
      create: {
        email: 'admin@ridesautomotors.com',
        password: hashedAdminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        phone: '(555) 123-4567',
        isActive: true,
      }
    });

    console.log('✅ Admin user created');

    // Create sales rep
    const salesRepPassword = await bcrypt.hash('sales123', 12);

    const salesRep = await prisma.user.upsert({
      where: { email: 'john.sales@ridesautomotors.com' },
      update: {},
      create: {
        email: 'john.sales@ridesautomotors.com',
        password: salesRepPassword,
        firstName: 'John',
        lastName: 'Sales',
        role: 'SALES_REP',
        phone: '(555) 234-5678',
        isActive: true
      }
    });

    console.log('✅ Sales rep created');

    // Create minimal vehicle for CI, full data for development
    const vehicles = isCI ? [
      {
        vin: '1HGBH41JXMN109186',
        stockNumber: 'RA001',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        trim: 'LE',
        mileage: 15000,
        price: 28500,
        condition: 'USED',
        status: 'AVAILABLE',
        exterior: 'Silver',
        interior: 'Black',
        engine: '2.5L 4-Cylinder',
        transmission: 'CVT',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        features: ['Bluetooth', 'Backup Camera'],
        description: 'Test vehicle for CI',
        highlights: ['Test Vehicle'],
        isOnline: true,
        isFeatured: true,
      },
    ] : [
      // Full vehicle data for development
      {
        vin: '1HGBH41JXMN109186',
        stockNumber: 'RA001',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        trim: 'LE',
        mileage: 15000,
        price: 28500,
        msrp: 32000,
        condition: 'USED',
        status: 'AVAILABLE',
        exterior: 'Silver',
        interior: 'Black Cloth',
        engine: '2.5L 4-Cylinder',
        transmission: 'CVT Automatic',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 28,
        mpgHighway: 39,
        doors: 4,
        seats: 5,
        features: [
          'Bluetooth Connectivity',
          'Backup Camera',
          'Lane Departure Warning',
          'Automatic Emergency Braking',
          'Apple CarPlay',
          'Android Auto'
        ],
        packages: ['Safety Sense 2.0'],
        description: 'Well-maintained Toyota Camry with excellent fuel economy.',
        highlights: ['Low Mileage', 'Excellent Condition'],
        isOnline: true,
        isFeatured: true,
        location: 'Front Lot A-1',
        images: ['https://example.com/images/camry-1.jpg']
      },
    ];

    for (const vehicle of vehicles) {
      await prisma.vehicle.upsert({
        where: { vin: vehicle.vin },
        update: {},
        create: vehicle,
      });
    }

    console.log(`✅ ${vehicles.length} vehicles created`);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
