/* eslint-disable no-underscore-dangle */
/* eslint-disable newline-per-chained-call */
/* eslint-disable comma-dangle */
/* eslint-disable no-unused-vars */
/* eslint-disable default-case */
/* eslint-disable no-use-before-define */
/* eslint-disable no-lonely-if */
/* eslint-disable consistent-return */
/* eslint-disable indent */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { auth, authorize } = require('../middleware/auth'); // Adjust path as needed

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// GET /api/users - List Users (Admin Only)
// ============================================================================
router.get(
  '/',
  auth, // Require authentication
  authorize('ADMIN', 'SUPER_ADMIN'), // Only admins can access
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isString(),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'firstName', 'lastName', 'email', 'role']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          company: 'Ridges Automotors',
        });
      }

      const {
        page = 1,
        limit = 20,
        role,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      // Build where clause
      const where = {
        ...(role && { role }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Build order clause
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          orderBy,
          select: {
            // 🔥 FIXED: Only select fields that exist in your schema
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            // Removed: profileImage, address, city, state, zipCode (don't exist)
            preferredContact: true,
            marketingOptIn: true,
            createdAt: true,
            updatedAt: true,
            // Count related records using correct relation names
            _count: {
              select: {
                leadsAsCustomer: true, // Leads where this user is the customer
                leadsAsSalesRep: true, // Leads assigned to this user as sales rep
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users: users.map((user) => ({
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            leadCount: user._count.leadsAsCustomer || 0,
            assignedLeadsCount: user._count.leadsAsSalesRep || 0,
            roleBadge: getRoleBadge(user.role),
            statusBadge: getStatusBadge(user.isActive),
          })),
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10)),
          },
          summary: {
            totalUsers: total,
            activeUsers: users.filter((u) => u.isActive).length,
            inactiveUsers: users.filter((u) => !u.isActive).length,
          },
        },
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// GET /api/users/:id - Get User Details (Admin Only)
// ============================================================================
router.get('/:id', auth, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        // 🔥 FIXED: Only select fields that exist
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        // Removed: profileImage, dateOfBirth, address, city, state, zipCode
        preferredContact: true,
        marketingOptIn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        company: 'Ridges Automotors',
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        roleBadge: getRoleBadge(user.role),
        statusBadge: getStatusBadge(user.isActive),
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details',
      company: 'Ridges Automotors',
    });
  }
});

// ============================================================================
// POST /api/users - Create User (Admin Only)
// ============================================================================
router.post(
  '/',
  auth,
  authorize('ADMIN', 'SUPER_ADMIN'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn([
      'CUSTOMER',
      'SALES_REP',
      'SALES_MANAGER',
      'FINANCE_MANAGER',
      'ADMIN',
      'SUPER_ADMIN',
    ]),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          company: 'Ridges Automotors',
        });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role = 'CUSTOMER',
        // Removed: address, city, state, zipCode
        preferredContact,
        marketingOptIn = false,
      } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists',
          company: 'Ridges Automotors',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          // Removed: address, city, state, zipCode
          preferredContact: preferredContact || (phone ? 'phone' : 'email'),
          marketingOptIn,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            ...newUser,
            fullName: `${newUser.firstName} ${newUser.lastName}`,
            roleBadge: getRoleBadge(newUser.role),
            statusBadge: getStatusBadge(newUser.isActive),
          },
        },
        message: 'User created successfully',
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('User created by admin', {
        createdUserId: newUser.id,
        createdByUserId: req.user.id,
        role: newUser.role,
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// PUT /api/users/:id - Update User (Admin Only)
// ============================================================================
router.put(
  '/:id',
  auth,
  authorize('ADMIN', 'SUPER_ADMIN'),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('role')
      .optional()
      .isIn(['CUSTOMER', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN']),
    body('phone').optional().isMobilePhone(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          company: 'Ridges Automotors',
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove password from update data (handle separately for security)
      delete updateData.password;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          company: 'Ridges Automotors',
        });
      }

      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailConflict = await prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (emailConflict) {
          return res.status(409).json({
            success: false,
            error: 'Email already in use by another user',
            company: 'Ridges Automotors',
          });
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            ...updatedUser,
            fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
            roleBadge: getRoleBadge(updatedUser.role),
            statusBadge: getStatusBadge(updatedUser.isActive),
          },
        },
        message: 'User updated successfully',
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('User updated by admin', {
        updatedUserId: id,
        updatedByUserId: req.user.id,
        changedFields: Object.keys(updateData),
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// PATCH /api/users/:id/status - Toggle User Status (Admin Only)
// ============================================================================
router.patch(
  '/:id/status',
  auth,
  authorize('ADMIN', 'SUPER_ADMIN'),
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        data: { user },
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('User status changed', {
        userId: id,
        newStatus: isActive ? 'active' : 'inactive',
        changedByUserId: req.user.id,
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRoleBadge(role) {
  const badges = {
    CUSTOMER: { color: 'blue', text: '👤 Customer' },
    SALES_REP: { color: 'green', text: '🤝 Sales Rep' },
    SALES_MANAGER: { color: 'purple', text: '👨‍💼 Sales Manager' },
    FINANCE_MANAGER: { color: 'orange', text: '💰 Finance Manager' },
    ADMIN: { color: 'red', text: '⚡ Admin' },
    SUPER_ADMIN: { color: 'black', text: '🛡️ Super Admin' },
  };

  return badges[role] || badges.CUSTOMER;
}

function getStatusBadge(isActive) {
  return isActive ? { color: 'green', text: '✅ Active' } : { color: 'red', text: '❌ Inactive' };
}

module.exports = router;
