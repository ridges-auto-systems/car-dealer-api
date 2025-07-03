/* eslint-disable comma-dangle */
/* eslint-disable no-plusplus */
// prisma/seed.js - Fixed version for optional VIN
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚗 Seeding Rides Automotors database...');

  try {
    // Clear existing data (optional)
    console.log('🧹 Cleaning existing data...');
    await prisma.vehicle.deleteMany({});

    // Sample vehicles with some having VINs and some not
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
        inspectionNotes: 'Excellent condition, all systems operational.',
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
        packages: ['Sport Package', 'Technology Package'],
        description:
          'Nearly new Honda Accord Sport with sporty styling and excellent fuel economy. Like-new condition with warranty remaining.',
        highlights: ['Nearly New', 'Sport Package', 'Low Mileage', 'Warranty Remaining'],
        isOnline: true,
        isFeatured: true,
        location: 'Showroom Floor',
        inspectionDate: new Date(),
        inspectionNotes: 'Like new condition, all features operational.',
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
        packages: ['Limited Package', 'Technology Group', 'Luxury Group'],
        description:
          'Certified Pre-Owned Jeep Grand Cherokee with luxury features and capability. Comprehensive warranty included.',
        highlights: ['Certified Pre-Owned', 'AWD', 'Luxury Features', 'Extended Warranty'],
        isOnline: true,
        isFeatured: true,
        location: 'Front Lot A-2',
        inspectionDate: new Date(),
        inspectionNotes: 'Certified Pre-Owned inspection completed, all systems pass.',
        images: [
          'https://example.com/images/grandcherokee-1.jpg',
          'https://example.com/images/grandcherokee-2.jpg',
        ],
      },
      {
        // NO VIN PROVIDED - This vehicle doesn't have a VIN
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
      {
        // NO VIN PROVIDED - Another vehicle without VIN
        stockNumber: 'RA006',
        make: 'Nissan',
        model: 'Altima',
        year: 2022,
        trim: 'SV',
        mileage: 18000,
        price: 26500,
        msrp: 30000,
        condition: 'USED',
        status: 'AVAILABLE',
        exterior: 'Sunset Orange',
        interior: 'Charcoal Cloth',
        engine: '2.5L 4-Cylinder',
        transmission: 'CVT Automatic',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 28,
        mpgHighway: 39,
        doors: 4,
        seats: 5,
        features: [
          'Nissan Safety Shield',
          'Remote Engine Start',
          'Intelligent Key',
          'Push Button Start',
          'Automatic Emergency Braking',
          'Blind Spot Warning',
          '8-inch Display',
          'Apple CarPlay',
        ],
        packages: ['SV Convenience Package'],
        description:
          'Low-mileage Nissan Altima with modern safety features and reliability. Perfect for daily commuting.',
        highlights: ['Low Mileage', 'Safety Features', 'Reliable', 'Fuel Efficient'],
        isOnline: true,
        isFeatured: false,
        location: 'Side Lot C-2',
        inspectionDate: new Date(),
        inspectionNotes: 'Excellent condition, minimal wear.',
        images: [
          'https://example.com/images/altima-1.jpg',
          'https://example.com/images/altima-2.jpg',
        ],
      },
    ];

    console.log(`📝 Creating ${vehicles.length} vehicles...`);

    // Create vehicles using stockNumber as the unique identifier for upserts
    for (let i = 0; i < vehicles.length; i++) {
      const vehicleData = vehicles[i];

      console.log(
        `🚗 Processing vehicle ${i + 1}/${vehicles.length}: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`
      );

      // Use stockNumber for upsert since it's always provided and unique
      // eslint-disable-next-line no-await-in-loop
      const vehicle = await prisma.vehicle.upsert({
        where: {
          stockNumber: vehicleData.stockNumber,
        },
        update: {
          // Update existing vehicle with new data
          ...vehicleData,
          updatedAt: new Date(),
        },
        create: {
          // Create new vehicle
          ...vehicleData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(
        `  ✅ ${vehicle.vin ? `VIN: ${vehicle.vin}` : 'No VIN'} | Stock: ${vehicle.stockNumber} | ${vehicle.make} ${vehicle.model}`
      );
    }

    // Create some sample users/customers (optional)
    console.log('👥 Creating sample users...');
    await prisma.user.upsert({
      where: { email: 'admin@ridesautomotors.com' },
      update: {},
      create: {
        email: 'admin@ridesautomotors.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        phone: '(555) 123-4567',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'sales@ridesautomotors.com' },
      update: {},
      create: {
        email: 'sales@ridesautomotors.com',
        firstName: 'Sales',
        lastName: 'Representative',
        role: 'SALES_REP',
        phone: '(555) 123-4568',
        isActive: true,
      },
    });

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created ${vehicles.length} vehicles`);
    console.log('📈 Summary:');
    console.log(`   - Vehicles with VIN: ${vehicles.filter((v) => v.vin).length}`);
    console.log(`   - Vehicles without VIN: ${vehicles.filter((v) => !v.vin).length}`);
    console.log(`   - Featured vehicles: ${vehicles.filter((v) => v.isFeatured).length}`);
    console.log(
      `   - Available vehicles: ${vehicles.filter((v) => v.status === 'AVAILABLE').length}`
    );
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
