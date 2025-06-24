/* eslint-disable indent */
/* eslint-disable operator-linebreak */
/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

// eslint-disable-next-line consistent-return
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided, authorization denied',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token is not valid',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Token is not valid',
    });
  }
};

// Role-based authorization
const authorize =
  (...roles) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };

module.exports = { auth, authorize };
