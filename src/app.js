/* eslint-disable comma-dangle */
// ============================================================================
// src/app.js - Main Application Entry Point
// ============================================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import custom modules (we'll create these)
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://ridesautomotors.com',
      'https://www.ridesautomotors.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`🚗 ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    company: 'Rides Automotors',
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Rides Automotors API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    company: {
      name: 'Rides Automotors',
      tagline: 'Connecting customers with quality vehicles',
    },
  });
});

// Root endpoint with company branding
app.get('/', (req, res) => {
  res.json({
    message: 'Rides Automotors API',
    tagline: 'Connecting customers with quality vehicles',
    company: 'Rides Automotors',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    endpoints: {
      vehicles: '/api/vehicles',
      leads: '/api/leads',
      auth: '/api/auth',
      uploads: '/api/uploads',
    },
    contact: {
      email: process.env.COMPANY_EMAIL || 'info@ridesautomotors.com',
      phone: process.env.DEALERSHIP_PHONE || '(555) 123-4567',
      website: process.env.FRONTEND_URL || 'https://ridesautomotors.com',
    },
    support: {
      technical: 'dev@ridesautomotors.com',
      sales: 'sales@ridesautomotors.com',
      general: 'info@ridesautomotors.com',
    },
  });
});

// Company info endpoint
app.get('/api/company', (req, res) => {
  res.json({
    name: process.env.COMPANY_NAME || 'Rides Automotors',
    tagline: 'Connecting customers with quality vehicles',
    description:
      'Modern automotive dealership focused on providing exceptional customer experiences through technology-driven solutions.',
    services: [
      'Vehicle Sales',
      'Trade-in Evaluations',
      'Financing Solutions',
      'Vehicle Inspections',
      'Customer Support',
    ],
    features: [
      'Advanced Vehicle Search',
      'Virtual Test Drives',
      'Digital Paperwork',
      'Real-time Inventory',
      'Mobile-friendly Experience',
    ],
    contact: {
      address: process.env.DEALERSHIP_ADDRESS || 'Your dealership address',
      phone: process.env.DEALERSHIP_PHONE || '(555) 123-4567',
      email: process.env.COMPANY_EMAIL || 'info@ridesautomotors.com',
      website: process.env.FRONTEND_URL || 'https://ridesautomotors.com',
    },
    hours: {
      monday: '9:00 AM - 8:00 PM',
      tuesday: '9:00 AM - 8:00 PM',
      wednesday: '9:00 AM - 8:00 PM',
      thursday: '9:00 AM - 8:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '9:00 AM - 6:00 PM',
      sunday: '11:00 AM - 5:00 PM',
    },
    license: process.env.DEALERSHIP_LICENSE || 'Dealer License #12345',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use(errorHandler);

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    company: 'Rides Automotors',
    message: 'The requested endpoint does not exist. Please check our API documentation.',
    documentation: '/api/docs',
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================
const server = app.listen(PORT, () => {
  logger.info(`🚗 Rides Automotors API running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT,
    company: 'Rides Automotors',
    tagline: 'Connecting customers with quality vehicles',
  });

  if (process.env.NODE_ENV === 'development') {
    logger.info('🔧 Development endpoints:', {
      api: `http://localhost:${PORT}/api`,
      health: `http://localhost:${PORT}/health`,
      docs: `http://localhost:${PORT}/api/docs`,
      company: `http://localhost:${PORT}/api/company`,
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down Rides Automotors API gracefully');
  server.close(() => {
    logger.info('✅ Rides Automotors API process terminated successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down Rides Automotors API gracefully');
  server.close(() => {
    logger.info('✅ Rides Automotors API process terminated successfully');
    process.exit(0);
  });
});

module.exports = app;
