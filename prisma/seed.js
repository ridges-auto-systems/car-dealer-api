/* eslint-disable import/newline-after-import */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Users
  const salesRep = await prisma.user.create({
    data: {
      email: 'sales@example.com',
      password: 'securepass123',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '1234567890',
      role: 'SALES_REP',
      preferredContact: 'email',
      marketingOptIn: true,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: 'mypassword',
      firstName: 'John',
      lastName: 'Smith',
      phone: '9876543210',
      role: 'CUSTOMER',
      preferredContact: 'sms',
    },
  });

  // Create Vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      stockNumber: 'STK123',
      make: 'Toyota',
      mileage: 1000,
      model: 'Camry',
      year: 2023,
      price: 25000.0,
      condition: 'New',
      status: 'AVAILABLE',
    },
  });

  // Create Lead
  const lead = await prisma.lead.create({
    data: {
      customerId: customer.id,
      salesRepId: salesRep.id,
      vehicleId: vehicle.id,
      source: 'Website',
      status: 'NEW',
      priority: 'HIGH',
      notes: 'Customer is interested in a trade-in',
      interestedInTrade: true,
      timeline: 'Within a week',
      budgetRange: '$20,000 - $30,000',
      isHot: true,
    },
  });

  // Create Test Drive
  await prisma.testDrive.create({
    data: {
      leadId: lead.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      scheduledAt: new Date(Date.now() + 86400000), // 1 day from now
    },
  });

  // Create Appointment
  await prisma.appointment.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      scheduledAt: new Date(Date.now() + 172800000), // 2 days from now
    },
  });

  // Create Communication
  await prisma.communication.create({
    data: {
      customerId: customer.id,
      leadId: lead.id,
      type: 'email',
      subject: 'Welcome!',
      content: 'Thanks for your interest in the Camry.',
    },
  });

  // Create Financing Application
  await prisma.financingApplication.create({
    data: {
      customerId: customer.id,
      leadId: lead.id,
      vehicleId: vehicle.id,
      requestedAmount: 20000.0,
      annualIncome: 75000.0,
      employmentType: 'Full-Time',
      creditScore: 700,
    },
  });

  // Create Vehicle History
  await prisma.vehicleHistory.create({
    data: {
      vehicleId: vehicle.id,
      eventType: 'Inspection',
      description: 'Passed full inspection',
      eventDate: new Date(),
    },
  });

  console.log('✅ Database has been seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
