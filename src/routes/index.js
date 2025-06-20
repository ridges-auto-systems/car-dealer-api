const express = require('express');

const vehicleRoutes = require('./vehicle');
const leadRoutes = require('./leads');
const authRoutes = require('./auth');

const router = express.Router();

// Route handlers
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/leads', leadRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Rides Automotors API',
    version: '1.0.0',
    company: 'Rides Automotors',
    tagline: 'Connecting customers with quality vehicles',
    endpoints: {
      auth: '/api/auth',
      vehicles: '/api/vehicles',
      leads: '/api/leads',
      documentation: '/api/docs',
    },
    status: 'Active',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
