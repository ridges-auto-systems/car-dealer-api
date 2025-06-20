/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚗 Seeding Rides Automotors database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ridesautomotors.com' },
    update: {},
    create: {
      email: 'admin@ridesautomotors.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phone: '(555) 123-4567',
      address: '123 Auto Plaza Drive',
      city: 'Your City',
      state: 'Your State',
      zipCode: '12345',
    },
  });

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
    },
  });

  // Create sample vehicles
  const vehicles = [
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
      interior: 'Black',
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
        'Android Auto',
      ],
      description:
        'Well-maintained Toyota Camry with excellent fuel economy and modern safety features.',
      highlights: ['Low Mileage', 'Excellent Condition', 'Recent Trade-In'],
      isOnline: true,
      isFeatured: true,
    },
    {
      vin: '1FTFW1ET5DFC12345',
      stockNumber: 'RA002',
      make: 'Ford',
      model: 'F-150',
      year: 2021,
      trim: 'XLT SuperCrew',
      mileage: 25000,
      price: 42000,
      msrp: 48000,
      condition: 'USED',
      status: 'AVAILABLE',
      exterior: 'Blue',
      interior: 'Gray',
      engine: '3.5L V6 EcoBoost',
      transmission: '10-Speed Automatic',
      drivetrain: '4WD',
      fuelType: 'Gasoline',
      mpgCity: 20,
      mpgHighway: 26,
      doors: 4,
      seats: 5,
      features: [
        'SYNC 3 Infotainment',
        'Trailer Tow Package',
        'FordPass Connect',
        'Pre-Collision Assist',
        'LED Headlights',
        'Power Tailgate',
      ],
      description:
        'Powerful F-150 SuperCrew with 4WD and towing capability. Perfect for work or recreation.',
      highlights: ['4WD', 'Tow Package', 'Low Miles'],
      isOnline: true,
      isFeatured: false,
    },
    {
      vin: '19UYA42581A123456',
      stockNumber: 'RA003',
      make: 'Honda',
      model: 'Accord',
      year: 2023,
      trim: 'Sport',
      mileage: 8000,
      price: 32000,
      msrp: 35000,
      condition: 'USED',
      status: 'AVAILABLE',
      exterior: 'White',
      interior: 'Black',
      engine: '1.5L Turbo 4-Cylinder',
      transmission: 'CVT Automatic',
      drivetrain: 'FWD',
      fuelType: 'Gasoline',
      mpgCity: 30,
      mpgHighway: 38,
      doors: 4,
      seats: 5,
      features: [
        'Honda Sensing Suite',
        'Wireless Phone Charging',
        'Dual-Zone Climate Control',
        'Sport Mode',
        'LED Lighting Package',
        'Remote Engine Start',
      ],
      description: 'Nearly new Honda Accord Sport with sporty styling and excellent fuel economy.',
      highlights: ['Nearly New', 'Sport Package', 'Low Mileage'],
      isOnline: true,
      isFeatured: true,
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { vin: vehicle.vin },
      update: {},
      create: vehicle,
    });
  }

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123', 12);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'Jane',
      lastName: 'Customer',
      role: 'CUSTOMER',
      phone: '(555) 345-6789',
      address: '456 Customer Lane',
      city: 'Customer City',
      state: 'Your State',
      zipCode: '54321',
      marketingOptIn: true,
    },
  });

  // Create sample lead
  const toyotaCamry = await prisma.vehicle.findFirst({
    where: { make: 'Toyota', model: 'Camry' },
  });

  if (toyotaCamry) {
    await prisma.lead.create({
      data: {
        customerId: customer.id,
        vehicleId: toyotaCamry.id,
        salesRepId: salesRep.id,
        status: 'CONTACTED',
        source: 'website',
        priority: 'HIGH',
        notes: 'Customer interested in Toyota Camry. Prefers silver color. Needs financing.',
        interestedInTrade: true,
        financingNeeded: true,
        budgetRange: '25k-30k',
        timeline: 'This week',
        leadScore: 85,
        isHot: true,
        tradeVehicleInfo: {
          make: 'Honda',
          model: 'Civic',
          year: 2018,
          mileage: 65000,
          condition: 'Good',
        },
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin User: admin@ridesautomotors.com / admin123');
  console.log('👤 Sales Rep: john.sales@ridesautomotors.com / sales123');
  console.log('👤 Customer: customer@example.com / customer123');
  console.log(`🚗 ${vehicles.length} vehicles created`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
