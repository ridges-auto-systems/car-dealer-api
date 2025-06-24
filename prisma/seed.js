/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚗 Seeding Rides Automotors database...');

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
      address: '123 Auto Plaza Drive',
      city: 'Your City',
      state: 'Your State',
      zipCode: '12345',
      isActive: true,
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
      isActive: true,
    },
  });

  // Create sample vehicles with comprehensive data
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
        'Android Auto',
        'Adaptive Cruise Control',
        'LED Headlights',
      ],
      packages: ['Safety Sense 2.0', 'Convenience Package'],
      description:
        'Well-maintained Toyota Camry with excellent fuel economy and modern safety features. Single owner, non-smoker vehicle with complete service history.',
      highlights: ['Low Mileage', 'Excellent Condition', 'Recent Trade-In', 'Clean Title'],
      isOnline: true,
      isFeatured: true,
      location: 'Front Lot A-1',
      inspectionDate: new Date(),
      inspectionNotes: 'Passed 150-point inspection with flying colors.',
      images: [
        'https://example.com/images/camry-1.jpg',
        'https://example.com/images/camry-2.jpg',
        'https://example.com/images/camry-3.jpg',
      ],
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
      exterior: 'Oxford Blue',
      interior: 'Medium Gray Cloth',
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
        'Remote Start',
        'Dual-Zone Climate Control',
      ],
      packages: ['XLT Chrome Package', 'Trailer Tow Package', 'Equipment Group 302A'],
      description:
        'Powerful F-150 SuperCrew with 4WD and towing capability. Perfect for work or recreation. This truck has been meticulously maintained.',
      highlights: ['4WD', 'Tow Package', 'Low Miles', 'Work Ready'],
      isOnline: true,
      isFeatured: false,
      location: 'Back Lot B-3',
      inspectionDate: new Date(),
      inspectionNotes: 'Excellent condition, ready for work or family use.',
      images: ['https://example.com/images/f150-1.jpg', 'https://example.com/images/f150-2.jpg'],
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
      exterior: 'Platinum White Pearl',
      interior: 'Black Leather',
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
        'Heated Front Seats',
        'Sunroof',
      ],
      packages: ['Sport Package', 'Honda Sensing Suite'],
      description:
        'Nearly new Honda Accord Sport with sporty styling and excellent fuel economy. Like-new condition with warranty remaining.',
      highlights: ['Nearly New', 'Sport Package', 'Low Mileage', 'Warranty Remaining'],
      isOnline: true,
      isFeatured: true,
      location: 'Showroom Floor',
      inspectionDate: new Date(),
      inspectionNotes: 'Like new condition, still under factory warranty.',
      images: [
        'https://example.com/images/accord-1.jpg',
        'https://example.com/images/accord-2.jpg',
        'https://example.com/images/accord-3.jpg',
        'https://example.com/images/accord-4.jpg',
      ],
    },
    {
      vin: '1C4RJFAG8EC123789',
      stockNumber: 'RA004',
      make: 'Jeep',
      model: 'Grand Cherokee',
      year: 2020,
      trim: 'Limited',
      mileage: 35000,
      price: 38500,
      msrp: 45000,
      condition: 'CERTIFIED_PRE_OWNED',
      status: 'AVAILABLE',
      exterior: 'Granite Crystal Metallic',
      interior: 'Black Leather',
      engine: '3.6L V6',
      transmission: '8-Speed Automatic',
      drivetrain: 'AWD',
      fuelType: 'Gasoline',
      mpgCity: 23,
      mpgHighway: 30,
      doors: 4,
      seats: 5,
      features: [
        'Uconnect 4C Nav',
        'Blind Spot Monitoring',
        'Rear Cross Traffic Alert',
        'Adaptive Cruise Control',
        'Heated/Ventilated Seats',
        'Panoramic Sunroof',
        'Premium Audio',
        'Trailer Tow Group',
      ],
      packages: ['Luxury Group II', 'Advanced Technology Group'],
      description:
        'Certified Pre-Owned Jeep Grand Cherokee with luxury features and capability. Comprehensive warranty included.',
      highlights: ['Certified Pre-Owned', 'AWD', 'Luxury Features', 'Extended Warranty'],
      isOnline: true,
      isFeatured: true,
      location: 'Front Lot A-2',
      inspectionDate: new Date(),
      inspectionNotes: 'Certified Pre-Owned with 7-year/100k mile warranty.',
      images: [
        'https://example.com/images/grandcherokee-1.jpg',
        'https://example.com/images/grandcherokee-2.jpg',
      ],
    },
    {
      vin: '3VWD17AJ9EM123456',
      stockNumber: 'RA005',
      make: 'Volkswagen',
      model: 'Jetta',
      year: 2019,
      trim: 'SEL',
      mileage: 42000,
      price: 22500,
      msrp: 28000,
      condition: 'USED',
      status: 'AVAILABLE',
      exterior: 'Deep Black Pearl',
      interior: 'Titan Black Leatherette',
      engine: '1.4L Turbo 4-Cylinder',
      transmission: '8-Speed Automatic',
      drivetrain: 'FWD',
      fuelType: 'Gasoline',
      mpgCity: 30,
      mpgHighway: 40,
      doors: 4,
      seats: 5,
      features: [
        'Digital Cockpit',
        'App-Connect',
        'Blind Spot Monitor',
        'Forward Collision Warning',
        'Automatic Post-Collision Braking',
        'LED Headlights',
        'Heated Front Seats',
        'Dual-Zone Climate Control',
      ],
      packages: ['SEL Premium Package'],
      description:
        'Well-equipped Volkswagen Jetta with premium features and excellent fuel economy. Great value for a reliable sedan.',
      highlights: ['Great Value', 'Premium Features', 'Excellent MPG', 'Well Maintained'],
      isOnline: true,
      isFeatured: false,
      location: 'Side Lot C-1',
      inspectionDate: new Date(),
      inspectionNotes: 'Good condition, minor wear consistent with age.',
      images: ['https://example.com/images/jetta-1.jpg'],
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { vin: vehicle.vin },
      update: {},
      create: vehicle,
    });
  }

  // Create sample customers
  const customers = [
    {
      email: 'customer1@example.com',
      password: await bcrypt.hash('customer123', 12),
      firstName: 'Jane',
      lastName: 'Customer',
      phone: '(555) 345-6789',
      address: '456 Customer Lane',
      city: 'Customer City',
      state: 'Your State',
      zipCode: '54321',
      role: 'CUSTOMER',
      marketingOptIn: true,
    },
    {
      email: 'customer2@example.com',
      password: await bcrypt.hash('customer123', 12),
      firstName: 'Bob',
      lastName: 'Johnson',
      phone: '(555) 456-7890',
      address: '789 Main Street',
      city: 'Anytown',
      state: 'Your State',
      zipCode: '67890',
      role: 'CUSTOMER',
      marketingOptIn: false,
    },
  ];

  for (const customer of customers) {
    await prisma.user.upsert({
      where: { email: customer.email },
      update: {},
      create: customer,
    });
  }

  // Create sample leads
  const toyotaCamry = await prisma.vehicle.findFirst({
    where: { make: 'Toyota', model: 'Camry' },
  });

  const customer1 = await prisma.user.findFirst({
    where: { email: 'customer1@example.com' },
  });

  if (toyotaCamry && customer1) {
    await prisma.lead.upsert({
      where: { id: 'sample-lead-1' },
      update: {},
      create: {
        id: 'sample-lead-1',
        customerId: customer1.id,
        vehicleId: toyotaCamry.id,
        salesRepId: salesRep.id,
        status: 'CONTACTED',
        source: 'website',
        priority: 'HIGH',
        notes: 'Customer interested in Toyota Camry. Prefers silver color. Needs financing.',
        interestedInTrade: true,
        financingNeeded: true,
        budgetRange: '25k-30k',
        timeline: 'this_week',
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
  console.log('👤 Customer 1: customer1@example.com / customer123');
  console.log('👤 Customer 2: customer2@example.com / customer123');
  console.log(`🚗 ${vehicles.length} vehicles created`);
  console.log('📊 Sample leads and data created');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
