/* eslint-disable indent */
/* eslint-disable comma-dangle */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// GET /api/vehicles - Advanced Vehicle Search & Filtering
// ============================================================================
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
    query('make').optional().isLength({ min: 1 }).withMessage('Make cannot be empty'),
    query('model').optional().isLength({ min: 1 }).withMessage('Model cannot be empty'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
    query('minYear').optional().isInt({ min: 1900 }).withMessage('Min year must be valid'),
    query('maxYear').optional().isInt({ min: 1900 }).withMessage('Max year must be valid'),
    query('condition').optional().isIn(['NEW', 'USED', 'CERTIFIED_PRE_OWNED']),
    query('transmission').optional().isString(),
    query('fuelType').optional().isString(),
    query('drivetrain').optional().isString(),
    query('sortBy').optional().isIn(['price', 'year', 'mileage', 'make', 'createdAt']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('featured').optional().isBoolean(),
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
        model,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        condition,
        transmission,
        fuelType,
        drivetrain,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        featured,
      } = req.query;

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      // Build comprehensive filter conditions
      const where = {
        status: 'AVAILABLE',
        isActive: true,
        isOnline: true,
        ...(make && { make: { contains: make, mode: 'insensitive' } }),
        ...(model && { model: { contains: model, mode: 'insensitive' } }),
        ...(condition && { condition }),
        ...(transmission && { transmission: { contains: transmission, mode: 'insensitive' } }),
        ...(fuelType && { fuelType: { contains: fuelType, mode: 'insensitive' } }),
        ...(drivetrain && { drivetrain: { contains: drivetrain, mode: 'insensitive' } }),
        ...(featured !== undefined && { isFeatured: featured === 'true' }),
        ...(search && {
          OR: [
            { make: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { trim: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { features: { has: search } },
          ],
        }),
      };

      // Handle price range filtering properly
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) {
          where.price.gte = parseFloat(minPrice);
        }
        if (maxPrice) {
          where.price.lte = parseFloat(maxPrice);
        }
      }

      // Handle year range filtering properly
      if (minYear || maxYear) {
        where.year = {};
        if (minYear) {
          where.year.gte = parseInt(minYear, 10);
        }
        if (maxYear) {
          where.year.lte = parseInt(maxYear, 10);
        }
      }

      // Build sorting
      const orderBy = {};
      if (sortBy === 'price' || sortBy === 'year' || sortBy === 'mileage') {
        orderBy[sortBy] = sortOrder;
      } else if (sortBy === 'make') {
        orderBy.make = sortOrder;
      } else {
        orderBy.createdAt = sortOrder;
      }

      const [vehicles, total, makes, priceRange] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          orderBy: [
            { isFeatured: 'desc' }, // Featured vehicles first
            orderBy,
          ],
          select: {
            id: true,
            vin: true,
            stockNumber: true,
            make: true,
            model: true,
            year: true,
            trim: true,
            mileage: true,
            price: true,
            msrp: true,
            condition: true,
            status: true,
            exterior: true,
            interior: true,
            engine: true,
            transmission: true,
            drivetrain: true,
            fuelType: true,
            mpgCity: true,
            mpgHighway: true,
            doors: true,
            seats: true,
            features: true,
            images: true,
            description: true,
            highlights: true,
            isFeatured: true,
            location: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.vehicle.count({ where }),
        // Get available makes for filters
        prisma.vehicle.groupBy({
          by: ['make'],
          where: { status: 'AVAILABLE', isActive: true },
          _count: { make: true },
          orderBy: { make: 'asc' },
        }),
        // Get price range for filters
        prisma.vehicle.aggregate({
          where: { status: 'AVAILABLE', isActive: true },
          _min: { price: true },
          _max: { price: true },
        }),
      ]);

      // Calculate additional metadata
      const totalPages = Math.ceil(total / parseInt(limit, 10));
      const hasNextPage = parseInt(page, 10) < totalPages;
      const hasPreviousPage = parseInt(page, 10) > 1;

      res.json({
        success: true,
        data: {
          vehicles: vehicles.map((vehicle) => ({
            ...vehicle,
            // Add computed fields
            priceFormatted: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(vehicle.price),
            mileageFormatted: vehicle.mileage.toLocaleString(),
            fuelEconomy:
              vehicle.mpgCity && vehicle.mpgHighway
                ? `${vehicle.mpgCity}/${vehicle.mpgHighway} mpg`
                : null,
            isNew: vehicle.condition === 'NEW',
            isCertified: vehicle.condition === 'CERTIFIED_PRE_OWNED',
            mainImage: vehicle.images?.[0] || null,
          })),
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages,
            hasNextPage,
            hasPreviousPage,
            nextPage: hasNextPage ? parseInt(page, 10) + 1 : null,
            previousPage: hasPreviousPage ? parseInt(page, 10) - 1 : null,
          },
          filters: {
            availableMakes: makes.map((m) => ({
              make: m.make,
              count: m._count.make,
            })),
            priceRange: {
              min: priceRange._min.price || 0,
              max: priceRange._max.price || 0,
            },
            totalResults: total,
          },
          meta: {
            searchQuery: search || null,
            appliedFilters: {
              make,
              model,
              condition,
              transmission,
              fuelType,
              drivetrain,
              priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
              yearRange: minYear || maxYear ? { min: minYear, max: maxYear } : null,
            },
            sortedBy: `${sortBy} ${sortOrder}`,
          },
        },
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      // Log search activity
      logger.info('Vehicle search performed', {
        searchQuery: search,
        filters: { make, model, condition },
        resultsCount: total,
        page: parseInt(page, 10),
      });
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vehicles',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// GET /api/vehicles/:id - Get Vehicle Details
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        leads: {
          where: { isActive: true },
          select: { id: true, status: true, createdAt: true },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        company: 'Rides Automotors',
      });
    }

    // Check if vehicle is available
    if (vehicle.status !== 'AVAILABLE' || !vehicle.isActive) {
      return res.status(410).json({
        success: false,
        error: 'Vehicle is no longer available',
        company: 'Rides Automotors',
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          status: vehicle.status,
        },
      });
    }

    // Format vehicle data for detailed view
    const formattedVehicle = {
      ...vehicle,
      priceFormatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(vehicle.price),
      msrpFormatted: vehicle.msrp
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }).format(vehicle.msrp)
        : null,
      mileageFormatted: vehicle.mileage.toLocaleString(),
      fuelEconomy: {
        city: vehicle.mpgCity,
        highway: vehicle.mpgHighway,
        combined:
          vehicle.mpgCity && vehicle.mpgHighway
            ? Math.round((vehicle.mpgCity + vehicle.mpgHighway) / 2)
            : null,
        formatted:
          vehicle.mpgCity && vehicle.mpgHighway
            ? `${vehicle.mpgCity}/${vehicle.mpgHighway} mpg`
            : null,
      },
      specs: {
        engine: vehicle.engine,
        transmission: vehicle.transmission,
        drivetrain: vehicle.drivetrain,
        fuelType: vehicle.fuelType,
        doors: vehicle.doors,
        seats: vehicle.seats,
      },
      media: {
        images: vehicle.images || [],
        videos: vehicle.videos || [],
        hasVirtualTour: vehicle.images?.length > 5,
      },
      business: {
        leadCount: vehicle._count.leads,
        daysSinceListed: Math.floor(
          (new Date() - new Date(vehicle.createdAt)) / (1000 * 60 * 60 * 24)
        ),
        lastUpdated: vehicle.updatedAt,
      },
    };

    res.json({
      success: true,
      data: formattedVehicle,
      company: 'Rides Automotors',
      timestamp: new Date().toISOString(),
    });

    // Log vehicle view
    logger.info('Vehicle details viewed', {
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
    });
  } catch (error) {
    logger.error('Error fetching vehicle details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle details',
      company: 'Rides Automotors',
    });
  }
});

// ============================================================================
// GET /api/vehicles/featured - Get Featured Vehicles
// ============================================================================
router.get('/featured/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;

    const featuredVehicles = await prisma.vehicle.findMany({
      where: {
        status: 'AVAILABLE',
        isActive: true,
        isFeatured: true,
      },
      take: limit,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        trim: true,
        price: true,
        mileage: true,
        condition: true,
        exterior: true,
        images: true,
        highlights: true,
        features: true,
      },
    });

    res.json({
      success: true,
      data: {
        vehicles: featuredVehicles.map((vehicle) => ({
          ...vehicle,
          priceFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }).format(vehicle.price),
          mileageFormatted: vehicle.mileage.toLocaleString(),
          mainImage: vehicle.images?.[0] || null,
          featuredBadge: true,
        })),
        count: featuredVehicles.length,
      },
      company: 'Rides Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching featured vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured vehicles',
      company: 'Rides Automotors',
    });
  }
});

module.exports = router;
