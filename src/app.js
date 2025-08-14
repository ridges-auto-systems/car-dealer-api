/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
/* eslint-disable comma-dangle */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Import custom modules
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express app and Prisma
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ============================================================================
// DATABASE CONNECTION TEST
// ============================================================================
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully', {
      database: 'Ridges Automotors',
      provider: 'PostgreSQL',
    });
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
}

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
      'https://Ridgesautomotors.com',
      'https://www.Ridgesautomotors.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    company: 'Ridges Automotors',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`🚗 ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    company: 'Ridges Automotors',
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================
app.use('/api', routes);

// Enhanced health check with database status
app.get('/health', async (req, res) => {
  const dbStatus = await testDatabaseConnection();

  res.json({
    status: 'OK',
    service: 'Ridges Automotors API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    database: {
      connected: dbStatus,
      provider: 'PostgreSQL',
      status: dbStatus ? 'healthy' : 'disconnected',
    },
    company: {
      name: 'Ridges Automotors',
      tagline: 'Connecting customers with quality vehicles',
    },
  });
});

// Database statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const [vehicleCount, availableVehicles, leadCount, userCount] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE', isActive: true } }),
      prisma.lead.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    res.json({
      success: true,
      data: {
        inventory: {
          totalVehicles: vehicleCount,
          availableVehicles,
          soldVehicles: vehicleCount - availableVehicles,
        },
        customers: {
          totalLeads: leadCount,
          totalCustomers: userCount,
        },
        business: {
          inventoryValue: await calculateInventoryValue(),
          averagePrice: await calculateAveragePrice(),
        },
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      company: 'Ridges Automotors',
    });
  }
});

// Helper functions for statistics
async function calculateInventoryValue() {
  try {
    const result = await prisma.vehicle.aggregate({
      where: { status: 'AVAILABLE', isActive: true },
      _sum: { price: true },
    });
    return result._sum.price || 0;
  } catch {
    return 0;
  }
}

async function calculateAveragePrice() {
  try {
    const result = await prisma.vehicle.aggregate({
      where: { status: 'AVAILABLE', isActive: true },
      _avg: { price: true },
    });
    return Math.round(result._avg.price || 0);
  } catch {
    return 0;
  }
}

// Root endpoint with enhanced company info
app.get('/', (req, res) => {
  res.json({
    message: 'Ridges Automotors API',
    tagline: 'Connecting customers with quality vehicles',
    company: 'Ridges Automotors',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Vehicle Inventory Management',
      'Lead Processing System',
      'Customer Management',
      'Real-time Analytics',
      'Professional API Documentation',
    ],
    endpoints: {
      vehicles: '/api/vehicles',
      leads: '/api/leads',
      auth: '/api/auth',
      stats: '/api/stats',
      health: '/health',
      company: '/api/company',
      dashboard: '/api/dashboard',
    },
    contact: {
      email: process.env.COMPANY_EMAIL || 'info@Ridgesautomotors.com',
      phone: process.env.DEALERSHIP_PHONE || '(555) 123-4567',
      website: process.env.FRONTEND_URL || 'https://Ridgesautomotors.com',
    },
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    company: 'Ridges Automotors',
    message: 'The requested endpoint does not exist.',
    availableEndpoints: [
      '/api/vehicles',
      '/api/leads',
      '/health',
      '/api/stats',
      '/api/dashboard',
      '/api/reports',
    ],
  });
});

// ============================================================================
// SERVER STARTUP WITH DATABASE CHECK
// ============================================================================
async function startServer() {
  try {
    // Test database connection first
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      logger.warn('⚠️ Starting server without database connection');
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚗 Ridges Automotors API running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        database: dbConnected ? 'connected' : 'disconnected',
        company: 'Ridges Automotors',
      });

      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 Development endpoints:', {
          api: `http://localhost:${PORT}/api`,
          vehicles: `http://localhost:${PORT}/api/vehicles`,
          health: `http://localhost:${PORT}/health`,
          stats: `http://localhost:${PORT}/api/stats`,
          dashboard: `http://localhost:${PORT}/api/dashboard`,
          reports: `http://localhost:${PORT}/api/reports`,
        });
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`🛑 ${signal} received, shutting down Ridges Automotors API gracefully`);

      server.close(async () => {
        try {
          await prisma.$disconnect();
          logger.info('✅ Database disconnected');
        } catch (error) {
          logger.error('❌ Error disconnecting database:', error);
        }

        logger.info('✅ Ridges Automotors API process terminated successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
