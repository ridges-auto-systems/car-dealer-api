/* eslint-disable object-curly-newline */
/* eslint-disable comma-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// POST /api/auth/login - User Login
// ============================================================================
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          company: 'Rides Automotors',
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          company: 'Rides Automotors',
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          company: 'Rides Automotors',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: '7 days',
        },
        message: 'Login successful',
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('User logged in', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// POST /api/auth/register - User Registration (Customer Only)
// ============================================================================
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          company: 'Rides Automotors',
        });
      }

      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists with this email',
          company: 'Rides Automotors',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'CUSTOMER',
          marketingOptIn: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          expiresIn: '7 days',
        },
        message: 'Registration successful',
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('New user registered', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// GET /api/auth/me - Get Current User
// ============================================================================
router.get('/me', async (req, res) => {
  res.json({
    message: 'User profile endpoint - authentication middleware required',
    company: 'Rides Automotors',
    note: 'This endpoint will be implemented with authentication middleware',
  });
});

module.exports = router;
