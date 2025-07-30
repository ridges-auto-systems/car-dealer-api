const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const vehicleRoutes = require('./vehicle');
const leadRoutes = require('./leads');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const bookingRoutes = require('./bookings');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// MAIN API ROUTES
// ============================================================================
router.use('/vehicles', vehicleRoutes);
router.use('/leads', leadRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bookings', bookingRoutes);

// ============================================================================
// API INFORMATION ENDPOINT
// ============================================================================
router.get('/', async (req, res) => {
  try {
    // Get real-time stats for API info
    const [vehicleCount, leadCount, userCount] = await Promise.all([
      prisma.vehicle.count({ where: { status: 'AVAILABLE', isActive: true } }),
      prisma.lead.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    res.json({
      message: 'Ridges Automotors API',
      version: '1.0.0',
      company: 'Ridges Automotors',
      tagline: 'Connecting customers with quality vehicles',
      status: 'Active',
      database: 'Connected',
      currentInventory: {
        availableVehicles: vehicleCount,
        activeLeads: leadCount,
        activeUsers: userCount,
      },
      endpoints: {
        vehicles: {
          list: 'GET /api/vehicles',
          search: 'GET /api/vehicles?search=term',
          details: 'GET /api/vehicles/:id',
          featured: 'GET /api/vehicles/featured/list',
        },
        leads: {
          create: 'POST /api/leads',
          list: 'GET /api/leads (auth required)',
        },
        users: {
          // Add users endpoints
          list: 'GET /api/users (admin required)',
          details: 'GET /api/users/:id (admin required)',
          create: 'POST /api/users (admin required)',
          update: 'PUT /api/users/:id (admin required)',
          stats: 'GET /api/users/stats (admin required)',
          salesReps: 'GET /api/users/role/sales-reps (auth required)',
        },
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
        },
        system: {
          health: 'GET /health',
          stats: 'GET /api/stats',
        },
      },
      features: [
        'Advanced Vehicle Search & Filtering',
        'Lead Capture & Management',
        'Customer Relationship Management',
        'User Account Management',
        'Real-time Inventory Updates',
        'Professional Analytics Dashboard',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching API info:', error);
    res.json({
      message: 'Ridges Automotors API',
      version: '1.0.0',
      company: 'Ridges Automotors',
      status: 'Active',
      database: 'Error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// COMPANY INFORMATION ENDPOINT
// ============================================================================
router.get('/company', (req, res) => {
  res.json({
    name: process.env.COMPANY_NAME || 'Ridges Automotors',
    tagline: 'Connecting customers with quality vehicles',
    description:
      'Modern automotive dealership focused on providing exceptional customer experiences through technology-driven solutions.',
    established: '2024',
    specialties: [
      'Quality Used Vehicles',
      'Certified Pre-Owned Programs',
      'Financing Solutions',
      'Trade-in Services',
      'Vehicle Inspections',
      'Extended Warranties',
    ],
    services: [
      'Vehicle Sales',
      'Trade-in Evaluations',
      'Financing Assistance',
      'Vehicle History Reports',
      'Multi-point Inspections',
      'Delivery Services',
    ],
    features: [
      'Advanced Vehicle Search',
      'Virtual Vehicle Tours',
      'Online Financing Applications',
      'Real-time Inventory Updates',
      'Mobile-friendly Experience',
      'Professional Customer Support',
    ],
    contact: {
      address: process.env.DEALERSHIP_ADDRESS || '123 Auto Plaza Drive, Your City, State 12345',
      phone: process.env.DEALERSHIP_PHONE || '(555) 123-4567',
      email: process.env.COMPANY_EMAIL || 'info@ridgesautomotors.com',
      website: process.env.FRONTEND_URL || 'https://ridgesautomotors.com',
      salesEmail: 'sales@ridgesautomotors.com',
      supportEmail: 'support@ridgesautomotors.com',
    },
    hours: {
      monday: process.env.BUSINESS_HOURS_MON_FRI || '9:00 AM - 8:00 PM',
      tuesday: process.env.BUSINESS_HOURS_MON_FRI || '9:00 AM - 8:00 PM',
      wednesday: process.env.BUSINESS_HOURS_MON_FRI || '9:00 AM - 8:00 PM',
      thursday: process.env.BUSINESS_HOURS_MON_FRI || '9:00 AM - 8:00 PM',
      friday: process.env.BUSINESS_HOURS_MON_FRI || '9:00 AM - 8:00 PM',
      saturday: process.env.BUSINESS_HOURS_SAT || '9:00 AM - 6:00 PM',
      sunday: process.env.BUSINESS_HOURS_SUN || '11:00 AM - 5:00 PM',
    },
    licenses: {
      dealerLicense: process.env.DEALERSHIP_LICENSE || 'Dealer License #12345',
      businessLicense: 'Business License #67890',
    },
    certifications: [
      'Better Business Bureau Accredited',
      'AutoCheck Certified Dealer',
      'Customer Satisfaction Award Winner',
    ],
    socialMedia: {
      facebook: 'https://facebook.com/ridgesautomotors',
      instagram: 'https://instagram.com/ridgesautomotors',
      twitter: 'https://twitter.com/ridgesautomotors',
      youtube: 'https://youtube.com/ridgesautomotors',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
