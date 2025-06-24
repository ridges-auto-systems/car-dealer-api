/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable operator-linebreak */
/* eslint-disable indent */
/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        company: 'Rides Automotors',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user account deactivated',
        company: 'Rides Automotors',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      company: 'Rides Automotors',
    });
  }
};

// Role-based authorization middleware
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        company: 'Rides Automotors',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
        userRole: req.user.role,
        company: 'Rides Automotors',
      });
    }
    next();
  };

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = { auth, authorize, optionalAuth };
