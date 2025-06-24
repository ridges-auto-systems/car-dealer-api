/* eslint-disable comma-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/vehicles - List vehicles with filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('make').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('minYear').optional().isInt({ min: 1900 }),
    query('maxYear').optional().isInt({ min: 1900 }),
    query('condition').optional().isIn(['NEW', 'USED', 'CERTIFIED_PRE_OWNED']),
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
        limit = 12,
        make,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        condition,
        search,
      } = req.query;

      const skip = (page - 1) * limit;

      // Build filter conditions
      const where = {
        status: 'AVAILABLE',
        isActive: true,
        isOnline: true,
        ...(make && { make: { contains: make, mode: 'insensitive' } }),
        ...(condition && { condition }),
        ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
        ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
        ...(minYear && { year: { gte: parseInt(minYear, 10) } }),
        ...(maxYear && { year: { lte: parseInt(maxYear, 10) } }),
        ...(search && {
          OR: [
            { make: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { trim: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip: parseInt(skip, 10),
          take: parseInt(limit, 10),
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.vehicle.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          vehicles,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            pages: Math.ceil(total / limit),
          },
        },
        company: 'Rides Automotors',
      });
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vehicles',
        company: 'Rides Automotors',
      });
    }
  }
);

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        company: 'Rides Automotors',
      });
    }

    res.json({
      success: true,
      data: vehicle,
      company: 'Rides Automotors',
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle',
      company: 'Rides Automotors',
    });
  }
});

module.exports = router;
