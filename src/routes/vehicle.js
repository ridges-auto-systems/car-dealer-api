/* eslint-disable operator-linebreak */
/* eslint-disable indent */
/* eslint-disable comma-dangle */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query, body, validationResult } = require('express-validator');
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
          company: 'Ridges Automotors',
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
            mileageFormatted: vehicle.mileage != null ? vehicle.mileage.toLocaleString() : null,
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
        company: 'Ridges Automotors',
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
        company: 'Ridges Automotors',
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
        company: 'Ridges Automotors',
      });
    }

    // Check if vehicle is available
    if (vehicle.status !== 'AVAILABLE' || !vehicle.isActive) {
      return res.status(410).json({
        success: false,
        error: 'Vehicle is no longer available',
        company: 'Ridges Automotors',
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
      mileageFormatted: vehicle.mileage != null ? vehicle.mileage.toLocaleString() : null,
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
      company: 'Ridges Automotors',
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
      company: 'Ridges Automotors',
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
          mileageFormatted: vehicle.mileage != null ? vehicle.mileage.toLocaleString() : null,
          mainImage: vehicle.images?.[0] || null,
          featuredBadge: true,
        })),
        count: featuredVehicles.length,
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching featured vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured vehicles',
      company: 'Ridges Automotors',
    });
  }
});

// Additional endpoints to add to your existing vehicle.js backend file

// ============================================================================
// POST /api/vehicles - Create New Vehicle
// ============================================================================
router.post(
  '/',
  [
    body('vin').optional().isLength({ min: 17, max: 17 }),
    body('make').notEmpty().withMessage('Make is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('year')
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Valid year is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('mileage').isInt({ min: 0 }).withMessage('Valid mileage is required'),
    body('condition').optional().isIn(['NEW', 'USED', 'CERTIFIED_PRE_OWNED', 'FAIR', 'POOR']),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'PENDING', 'HOLD', 'SOLD', 'UNAVAILABLE', 'IN_TRANSIT', 'IN_SERVICE']),
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
        vin,
        stockNumber,
        make,
        model,
        year,
        trim,
        mileage,
        price,
        msrp,
        costBasis,
        condition = 'USED',
        status = 'AVAILABLE',
        exterior,
        interior,
        engine,
        transmission,
        drivetrain,
        fuelType,
        mpgCity,
        mpgHighway,
        doors,
        seats,
        features = [],
        packages = [],
        options = [],
        images = [],
        videos = [],
        documents = [],
        description,
        highlights = [],
        keywords = [],
        inspectionDate,
        inspectionNotes,
        accidentHistory,
        serviceHistory,
        previousOwners,
        location,
        isFeatured = false,
        isOnline = true,
        displayOrder,
      } = req.body;

      // Check if VIN already exists
      if (vin && vin.trim()) {
        const existingVehicle = await prisma.vehicle.findUnique({
          where: { vin: vin.toUpperCase() },
          select: { id: true, vin: true },
        });

        if (existingVehicle) {
          return res.status(409).json({
            success: false,
            error: 'Vehicle with this VIN already exists',
            company: 'Ridges Automotors',
            conflictingVehicle: {
              id: existingVehicle.id,
              vin: existingVehicle.vin,
            },
          });
        }
      }

      // Generate stock number if not provided
      const finalStockNumber =
        stockNumber ||
        `${make.substring(0, 3).toUpperCase()}${year}${String(Date.now()).slice(-4)}`;

      // Create the vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          ...(vin ? { vin: vin.toUpperCase() } : {}),
          stockNumber: finalStockNumber,
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year, 10),
          trim: trim?.trim(),
          mileage: parseInt(mileage, 10),
          price: parseFloat(price),
          msrp: msrp ? parseFloat(msrp) : null,
          costBasis: costBasis ? parseFloat(costBasis) : null,
          condition,
          status,
          exterior: exterior?.trim(),
          interior: interior?.trim(),
          engine: engine?.trim(),
          transmission: transmission?.trim(),
          drivetrain: drivetrain?.trim(),
          fuelType: fuelType?.trim(),
          mpgCity: mpgCity ? parseInt(mpgCity, 10) : null,
          mpgHighway: mpgHighway ? parseInt(mpgHighway, 10) : null,
          mpgCombined:
            mpgCity && mpgHighway
              ? Math.round((parseInt(mpgCity, 10) + parseInt(mpgHighway, 10)) / 2)
              : null,
          doors: doors ? parseInt(doors, 10) : null,
          seats: seats ? parseInt(seats, 10) : null,
          features: Array.isArray(features) ? features : [],
          packages: Array.isArray(packages) ? packages : [],
          options: Array.isArray(options) ? options : [],
          images: Array.isArray(images) ? images : [],
          videos: Array.isArray(videos) ? videos : [],
          documents: Array.isArray(documents) ? documents : [],
          description: description?.trim(),
          highlights: Array.isArray(highlights) ? highlights : [],
          keywords: Array.isArray(keywords) ? keywords : [],
          inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
          inspectionNotes: inspectionNotes?.trim(),
          accidentHistory: accidentHistory?.trim(),
          serviceHistory: serviceHistory?.trim(),
          previousOwners: previousOwners ? parseInt(previousOwners, 10) : null,
          location: location?.trim(),
          isFeatured: Boolean(isFeatured),
          isOnline: Boolean(isOnline),
          isActive: true,
          displayOrder: displayOrder ? parseInt(displayOrder, 10) : null,
        },
      });

      // Format the created vehicle for response
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
        mileageFormatted: vehicle.mileage != null ? vehicle.mileage.toLocaleString() : null,
        fuelEconomy:
          vehicle.mpgCity && vehicle.mpgHighway
            ? `${vehicle.mpgCity}/${vehicle.mpgHighway} mpg`
            : null,
        mainImage: vehicle.images?.[0] || null,
      };

      res.status(201).json({
        success: true,
        data: {
          vehicle: formattedVehicle,
          message: 'Vehicle created successfully',
        },
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      // Log vehicle creation
      logger.info('New vehicle created', {
        vehicleId: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
      });
    } catch (error) {
      logger.error('Error creating vehicle:', error);

      // Handle unique constraint violations
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Vehicle with this VIN or stock number already exists',
          company: 'Ridges Automotors',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create vehicle',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// PUT /api/vehicles/:id - Update Vehicle
// ============================================================================
router.put(
  '/:id',
  [
    body('vin').optional().isLength({ min: 17, max: 17 }),
    body('make').optional().notEmpty().withMessage('Make cannot be empty'),
    body('model').optional().notEmpty().withMessage('Model cannot be empty'),
    body('year')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Valid year is required'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('mileage').optional().isInt({ min: 0 }).withMessage('Valid mileage is required'),
    body('condition').optional().isIn(['NEW', 'USED', 'CERTIFIED_PRE_OWNED', 'FAIR', 'POOR']),
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'PENDING', 'HOLD', 'SOLD', 'UNAVAILABLE', 'IN_TRANSIT', 'IN_SERVICE']),
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

      // Check if vehicle exists
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id },
      });

      if (!existingVehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
          company: 'Ridges Automotors',
        });
      }

      // If VIN is being updated, check for conflicts
      if (updateData.vin && updateData.vin !== existingVehicle.vin) {
        const conflictingVehicle = await prisma.vehicle.findUnique({
          where: { vin: updateData.vin.toUpperCase() },
          select: { id: true, vin: true },
        });

        if (conflictingVehicle) {
          return res.status(409).json({
            success: false,
            error: 'Another vehicle with this VIN already exists',
            company: 'Ridges Automotors',
            conflictingVehicle: {
              id: conflictingVehicle.id,
              vin: conflictingVehicle.vin,
            },
          });
        }
      }

      // Process update data
      const processedData = {};
      Object.keys(updateData).forEach((key) => {
        const value = updateData[key];

        switch (key) {
          case 'vin':
            if (value) processedData[key] = value.toUpperCase();
            break;
          case 'make':
          case 'model':
          case 'trim':
          case 'exterior':
          case 'interior':
          case 'engine':
          case 'transmission':
          case 'drivetrain':
          case 'fuelType':
          case 'description':
          case 'inspectionNotes':
          case 'accidentHistory':
          case 'serviceHistory':
          case 'location':
            if (value !== undefined) processedData[key] = value?.trim();
            break;
          case 'year':
          case 'mileage':
          case 'doors':
          case 'seats':
          case 'mpgCity':
          case 'mpgHighway':
          case 'previousOwners':
          case 'displayOrder':
            if (value !== undefined) processedData[key] = value ? parseInt(value, 10) : null;
            break;
          case 'price':
          case 'msrp':
          case 'costBasis':
            if (value !== undefined) processedData[key] = value ? parseFloat(value) : null;
            break;
          case 'isFeatured':
          case 'isOnline':
          case 'isActive':
            if (value !== undefined) processedData[key] = Boolean(value);
            break;
          case 'features':
          case 'packages':
          case 'options':
          case 'images':
          case 'videos':
          case 'documents':
          case 'highlights':
          case 'keywords':
            if (value !== undefined) processedData[key] = Array.isArray(value) ? value : [];
            break;
          case 'inspectionDate':
            if (value) processedData[key] = new Date(value);
            break;
          default:
            if (value !== undefined) processedData[key] = value;
        }
      });

      // Calculate combined MPG if both city and highway are provided
      if (processedData.mpgCity && processedData.mpgHighway) {
        processedData.mpgCombined = Math.round(
          (processedData.mpgCity + processedData.mpgHighway) / 2
        );
      }

      // Update the vehicle
      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: processedData,
      });

      // Format the updated vehicle for response
      const formattedVehicle = {
        ...updatedVehicle,
        priceFormatted: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(updatedVehicle.price),
        msrpFormatted: updatedVehicle.msrp
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(updatedVehicle.msrp)
          : null,
        mileageFormatted:
          updatedVehicle.mileage != null ? updatedVehicle.mileage.toLocaleString() : null,
        fuelEconomy:
          updatedVehicle.mpgCity && updatedVehicle.mpgHighway
            ? `${updatedVehicle.mpgCity}/${updatedVehicle.mpgHighway} mpg`
            : null,
        mainImage: updatedVehicle.images?.[0] || null,
      };

      res.json({
        success: true,
        data: formattedVehicle,
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      // Log vehicle update
      logger.info('Vehicle updated', {
        vehicleId: updatedVehicle.id,
        vin: updatedVehicle.vin,
        changedFields: Object.keys(processedData),
      });
    } catch (error) {
      logger.error('Error updating vehicle:', error);

      // Handle unique constraint violations
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Vehicle with this VIN or stock number already exists',
          company: 'Ridges Automotors',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update vehicle',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// DELETE /api/vehicles/:id - Delete Vehicle (Soft Delete)
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        vin: true,
        make: true,
        model: true,
        year: true,
        isActive: true,
        leads: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        company: 'Ridges Automotors',
      });
    }

    // Check if vehicle has active leads
    if (vehicle.leads.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete vehicle with active leads',
        company: 'Ridges Automotors',
        activeLeads: vehicle.leads.length,
        suggestion: 'Please resolve or transfer active leads before deleting this vehicle',
      });
    }

    // Soft delete - set isActive to false instead of actual deletion
    const deletedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        isActive: false,
        status: 'UNAVAILABLE',
        isOnline: false,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        vin: true,
        make: true,
        model: true,
        year: true,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Vehicle deleted successfully',
        vehicle: deletedVehicle,
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });

    // Log vehicle deletion
    logger.info('Vehicle deleted (soft delete)', {
      vehicleId: vehicle.id,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vehicle',
      company: 'Ridges Automotors',
    });
  }
});

// ============================================================================
// PATCH /api/vehicles/:id/status - Update Vehicle Status
// ============================================================================
router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(['AVAILABLE', 'PENDING', 'HOLD', 'SOLD', 'UNAVAILABLE', 'IN_TRANSIT', 'IN_SERVICE'])
      .withMessage('Invalid status'),
    body('soldPrice').optional().isFloat({ min: 0 }).withMessage('Valid sold price required'),
    body('soldDate').optional().isISO8601().withMessage('Valid sold date required'),
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
      const { status, soldPrice, soldDate } = req.body;

      const updateData = { status };

      // If marking as sold, handle sold data
      if (status === 'SOLD') {
        updateData.soldDate = soldDate ? new Date(soldDate) : new Date();
        if (soldPrice) {
          updateData.soldPrice = parseFloat(soldPrice);
        }
        updateData.isOnline = false; // Remove from online listings
      }

      // If changing from sold to available, clear sold data
      if (status === 'AVAILABLE') {
        updateData.soldDate = null;
        updateData.soldPrice = null;
        updateData.isOnline = true; // Make available online
      }

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: vehicle,
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      });

      logger.info('Vehicle status updated', {
        vehicleId: id,
        newStatus: status,
        soldPrice: soldPrice || null,
      });
    } catch (error) {
      logger.error('Error updating vehicle status:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
          company: 'Ridges Automotors',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update vehicle status',
        company: 'Ridges Automotors',
      });
    }
  }
);

// Don't forget to add the required imports at the top of your vehicle.js file:
// const { body, validationResult } = require('express-validator');

module.exports = router;
