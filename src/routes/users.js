/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
/* eslint-disable object-curly-newline */
/* eslint-disable max-len */
/* eslint-disable comma-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable arrow-parens */
// src/routes/users.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// GET /api/users - List All Users (Admin/Manager Only)
// ============================================================================
router.get(
  '/',
  [
    auth,
    authorize('ADMIN', 'MANAGER'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('role').optional().isIn(['CUSTOMER', 'SALES_REP', 'ADMIN', 'MANAGER']),
    query('sortBy').optional().isIn(['createdAt', 'firstName', 'lastName', 'email', 'role']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('isActive').optional().isBoolean(),
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

      const {
        page = 1,
        limit = 20,
        search,
        role,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isActive,
      } = req.query;

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      // Build where clause
      const where = {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(role && { role }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Build orderBy
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          orderBy,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            preferredContact: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                leadsAsCustomer: true,
                leadsAsSalesRep: true,
                appointments: true,
                testDrives: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Calculate pagination
      const totalPages = Math.ceil(total / parseInt(limit, 10));
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      res.json({
        success: true,
        data: {
          users: users.map((user) => ({
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            leadCount: user._count.leadsAsCustomer + user._count.leadsAsSalesRep,
            appointmentCount: user._count.appointments,
            testDriveCount: user._count.testDrives,
          })),
          pagination: {
            current: parseInt(page, 10),
            total: totalPages,
            hasNext,
            hasPrev,
            totalRecords: total,
            limit: parseInt(limit, 10),
          },
        },
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('Users fetched successfully', {
        userId: req.user.id,
        total,
        page,
        limit,
        filters: { search, role, isActive },
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// GET /api/users/stats - User Statistics (Admin/Manager Only)
// ============================================================================
router.get('/stats', [auth, authorize('ADMIN', 'MANAGER')], async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      customerCount,
      salesRepCount,
      adminCount,
      managerCount,
      newThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'SALES_REP' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'MANAGER' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisMonth,
        byRole: {
          customers: customerCount,
          salesReps: salesRepCount,
          admins: adminCount,
          managers: managerCount,
        },
        growthRate: newThisMonth > 0 ? ((newThisMonth / totalUsers) * 100).toFixed(1) : '0',
      },
      company: 'Rides Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      company: 'Rides Automotors',
    });
  }
});

// ============================================================================
// GET /api/users/:id - Get Single User (Admin/Manager Only)
// ============================================================================
router.get(
  '/:id',
  [auth, authorize('ADMIN', 'MANAGER'), param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          preferredContact: true,
          createdAt: true,
          updatedAt: true,
          leadsAsCustomer: {
            select: {
              id: true,
              status: true,
              priority: true,
              createdAt: true,
              vehicle: {
                select: {
                  make: true,
                  model: true,
                  year: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          leadsAsSalesRep: {
            select: {
              id: true,
              status: true,
              priority: true,
              createdAt: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          company: 'Rides Automotors',
        });
      }

      res.json({
        success: true,
        data: {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
          customerLeadsCount: user.leadsAsCustomer.length,
          salesLeadsCount: user.leadsAsSalesRep.length,
        },
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// POST /api/users - Create New User (Admin Only)
// ============================================================================
router.post(
  '/',
  [
    auth,
    authorize('ADMIN'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').optional().isMobilePhone(),
    body('role').isIn([
      'CUSTOMER',
      'SALES_REP',
      'ADMIN',
      'MANAGER',
      'SALES_MANAGER',
      'FINANCE_MANAGER',
      'SUPER_ADMIN',
    ]),
    body('preferredContact').optional().isString(),
    // Optional additional fields
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('zipCode').optional().isString(),
    body('department').optional().isString(),
    body('position').optional().isString(),
    body('hireDate').optional().isString(),
    body('commission').optional().isNumeric(),
    body('salesGoal').optional().isNumeric(),
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

      const { email, password, firstName, lastName, phone, role, preferredContact } = req.body;

      // Optional fields that might be sent but aren't stored yet
      // const { address, city, state, zipCode, department, position, hireDate, commission, salesGoal } = req.body;

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
          role,
          preferredContact: preferredContact || (phone ? 'phone' : 'email'),
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
          preferredContact: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        message: 'User created successfully',
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('New user created', {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdBy: req.user.id,
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// PUT /api/users/:id - Update User (Admin Only)
// ============================================================================
router.put(
  '/:id',
  [
    auth,
    authorize('ADMIN'),
    param('id').isString(),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().isMobilePhone(),
    body('role')
      .optional()
      .isIn([
        'CUSTOMER',
        'SALES_REP',
        'ADMIN',
        'MANAGER',
        'SALES_MANAGER',
        'FINANCE_MANAGER',
        'SUPER_ADMIN',
      ]),
    body('isActive').optional().isBoolean(),
    body('preferredContact').optional().isString(),
    // Optional additional fields
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('zipCode').optional().isString(),
    body('department').optional().isString(),
    body('position').optional().isString(),
    body('hireDate').optional().isString(),
    body('commission').optional().isNumeric(),
    body('salesGoal').optional().isNumeric(),
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

      const { id } = req.params;
      const updateData = req.body;

      // Filter out fields that aren't in our database schema yet
      const allowedFields = [
        'email',
        'firstName',
        'lastName',
        'phone',
        'role',
        'isActive',
        'preferredContact',
      ];
      const filteredUpdateData = Object.keys(updateData)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          company: 'Rides Automotors',
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
            company: 'Rides Automotors',
          });
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: filteredUpdateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          preferredContact: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: {
          ...updatedUser,
          fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
        },
        message: 'User updated successfully',
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('User updated', {
        userId: id,
        updatedBy: req.user.id,
        changes: Object.keys(updateData),
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// DELETE /api/users/:id - Delete User (Admin Only)
// ============================================================================
router.delete('/:id', [auth, authorize('ADMIN'), param('id').isString()], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        company: 'Rides Automotors',
      });
    }

    // Prevent deletion of the current user
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        company: 'Rides Automotors',
      });
    }

    // Soft delete by setting isActive to false (recommended)
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      company: 'Rides Automotors',
      timestamp: new Date().toISOString(),
    });

    logger.info('User deactivated', {
      userId: id,
      deactivatedBy: req.user.id,
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      company: 'Rides Automotors',
    });
  }
});

// ============================================================================
// GET /api/users/sales-reps - Get All Sales Representatives
// ============================================================================
router.get('/role/sales-reps', [auth], async (req, res) => {
  try {
    const salesReps = await prisma.user.findMany({
      where: {
        role: 'SALES_REP',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    res.json({
      success: true,
      data: salesReps.map((rep) => ({
        ...rep,
        fullName: `${rep.firstName} ${rep.lastName}`,
      })),
      company: 'Rides Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching sales reps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales representatives',
      company: 'Rides Automotors',
    });
  }
});

module.exports = router;
