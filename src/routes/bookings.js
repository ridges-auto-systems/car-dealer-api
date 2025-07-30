/* eslint-disable no-shadow */
/* eslint-disable no-else-return */
/* eslint-disable object-curly-newline */
/* eslint-disable no-unused-vars */
/* eslint-disable operator-linebreak */
/* eslint-disable indent */
/* eslint-disable comma-dangle */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// BOOKING/RESERVATION TYPES & CONSTANTS
// ============================================================================

const BOOKING_TYPES = {
  RESERVATION: 'RESERVATION',
  TEST_DRIVE: 'TEST_DRIVE',
};

const APPOINTMENT_TYPES = {
  VEHICLE_RESERVATION: 'VEHICLE_RESERVATION',
  SHOWROOM_VISIT: 'SHOWROOM_VISIT',
  DELIVERY: 'DELIVERY',
  SERVICE: 'SERVICE',
};

const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
};

const TEST_DRIVE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateLeadScore(items) {
  let score = 50; // Base score

  // Add points for each item
  score += items.length * 10;

  // Higher score for reservations (shows more serious intent)
  const reservations = items.filter((item) => item.type === BOOKING_TYPES.RESERVATION);
  score += reservations.length * 20;

  // Bonus for multiple vehicles (serious buyer)
  if (items.length > 1) score += 15;

  return Math.min(score, 100); // Cap at 100
}

function calculateAvailableTimeSlots(existingBookings, targetDate) {
  const allSlots = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
  ];

  const bookedSlots = existingBookings
    .filter((booking) => {
      const bookingDate = new Date(booking.scheduledAt);
      const target = new Date(targetDate);
      return bookingDate.toDateString() === target.toDateString();
    })
    .map((booking) => {
      const hour = new Date(booking.scheduledAt).getHours();
      const timeMap = {
        9: '9:00 AM',
        10: '10:00 AM',
        11: '11:00 AM',
        12: '12:00 PM',
        13: '1:00 PM',
        14: '2:00 PM',
        15: '3:00 PM',
        16: '4:00 PM',
        17: '5:00 PM',
      };
      return timeMap[hour] || null;
    })
    .filter(Boolean);

  return allSlots.filter((slot) => !bookedSlots.includes(slot));
}

function generateConfirmationNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RA${timestamp}${random}`;
}

async function sendBookingNotifications(leadId, bookings) {
  try {
    // Here you would implement:
    // - Send email confirmation to customer
    // - Send SMS/email notification to sales team
    // - Create calendar events for test drives
    // - Send booking details to CRM

    logger.info('Booking notifications sent', {
      leadId,
      bookingCount: bookings.length,
      bookingTypes: bookings.map((b) => b.type),
    });

    // For now, just log what would be sent
    logger.info('Notification details', {
      leadId,
      bookings: bookings.map((booking) => ({
        type: booking.type,
        vehicleInfo: booking.vehicleInfo,
        scheduledAt: booking.scheduledAt || booking.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Notification sending failed:', error);
    throw error;
  }
}

async function processCartItem(tx, item, customer, lead) {
  // Verify vehicle exists and is available
  const vehicle = await tx.vehicle.findUnique({
    where: {
      id: item.vehicleId,
      isActive: true,
    },
  });

  if (!vehicle) {
    throw new Error(`Vehicle ${item.vehicleId} not found or inactive`);
  }

  if (vehicle.status === 'SOLD' || vehicle.status === 'UNAVAILABLE') {
    throw new Error(
      `Vehicle ${vehicle.year} ${vehicle.make} ${vehicle.model} is no longer available`
    );
  }

  // Create booking based on type
  if (item.type === BOOKING_TYPES.RESERVATION) {
    // Check if vehicle is already reserved
    const existingReservation = await tx.appointment.findFirst({
      where: {
        vehicleId: vehicle.id,
        type: APPOINTMENT_TYPES.VEHICLE_RESERVATION,
        status: {
          in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED],
        },
        scheduledAt: {
          gt: new Date(),
        },
      },
    });

    if (existingReservation) {
      throw new Error(
        `Vehicle ${vehicle.year} ${vehicle.make} ${vehicle.model} is already reserved`
      );
    }

    // Create appointment for reservation (48 hour hold)
    const reservationDate = new Date();
    reservationDate.setHours(reservationDate.getHours() + 48); // 48 hour reservation

    const appointment = await tx.appointment.create({
      data: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        scheduledAt: reservationDate,
        type: APPOINTMENT_TYPES.VEHICLE_RESERVATION,
        status: APPOINTMENT_STATUS.SCHEDULED,
        duration: 60, // 1 hour default
        notes: `Vehicle reservation from cart checkout. Expires: ${reservationDate.toLocaleString()}`,
      },
    });

    // Update vehicle status to PENDING (held for customer)
    await tx.vehicle.update({
      where: {
        id: vehicle.id,
      },
      data: {
        status: 'PENDING',
      },
    });

    logger.info('Vehicle reservation created', {
      appointmentId: appointment.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      expiresAt: reservationDate,
    });

    return {
      type: 'reservation',
      appointmentId: appointment.id,
      vehicleId: vehicle.id,
      vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      expiresAt: reservationDate,
    };
  } else if (item.type === BOOKING_TYPES.TEST_DRIVE) {
    // Parse scheduled date and time if provided
    let scheduledDate = new Date();

    if (item.scheduledDate) {
      scheduledDate = new Date(item.scheduledDate);

      // If time is provided, set it
      if (item.scheduledTime) {
        const [time, period] = item.scheduledTime.split(' ');
        const [hours, minutes] = time.split(':');
        let hour24 = parseInt(hours, 10);

        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }

        scheduledDate.setHours(hour24, parseInt(minutes || '0', 10), 0, 0);
      }
    } else {
      // Default to next business day at 10 AM
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(10, 0, 0, 0);
    }

    // Create test drive
    const testDrive = await tx.testDrive.create({
      data: {
        leadId: lead.id,
        customerId: customer.id,
        vehicleId: vehicle.id,
        scheduledAt: scheduledDate,
        status: TEST_DRIVE_STATUS.SCHEDULED,
        duration: 30, // 30 minutes default
        notes: item.notes || 'Test drive from cart checkout',
      },
    });

    logger.info('Test drive created', {
      testDriveId: testDrive.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      scheduledAt: scheduledDate,
    });

    return {
      type: 'test_drive',
      testDriveId: testDrive.id,
      vehicleId: vehicle.id,
      vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      scheduledAt: scheduledDate,
    };
  }

  throw new Error(`Invalid booking type: ${item.type}`);
}

// ============================================================================
// ROUTES
// ============================================================================

router.post(
  '/cart-checkout',
  [
    body('customerInfo.firstName').notEmpty().withMessage('First name is required'),
    body('customerInfo.lastName').notEmpty().withMessage('Last name is required'),
    body('customerInfo.email').isEmail().withMessage('Valid email is required'),
    body('customerInfo.phone').notEmpty().withMessage('Phone number is required'),
    body('items')
      .isArray({
        min: 1,
      })
      .withMessage('At least one item is required'),
    body('items.*.vehicleId').notEmpty().withMessage('Vehicle ID is required'),
    body('items.*.type')
      .isIn([BOOKING_TYPES.RESERVATION, BOOKING_TYPES.TEST_DRIVE])
      .withMessage('Valid booking type is required'),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: validationErrors.array(),
          company: 'Ridges Automotors',
        });
      }

      const { customerInfo, items } = req.body;

      logger.info('Processing cart checkout', {
        customerEmail: customerInfo.email,
        itemCount: items.length,
        items: items.map((item) => ({
          vehicleId: item.vehicleId,
          type: item.type,
        })),
      });

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create or find customer (using User model)
        let customer = await tx.user.findUnique({
          where: {
            email: customerInfo.email.toLowerCase(),
          },
        });

        if (!customer) {
          customer = await tx.user.create({
            data: {
              firstName: customerInfo.firstName.trim(),
              lastName: customerInfo.lastName.trim(),
              email: customerInfo.email.toLowerCase(),
              phone: customerInfo.phone.trim(),
              role: 'CUSTOMER',
              preferredContact: customerInfo.preferredContact || 'phone',
              isActive: true,
            },
          });
          logger.info('New customer created', {
            customerId: customer.id,
            email: customer.email,
          });
        } else {
          // Update existing customer info if provided
          customer = await tx.user.update({
            where: {
              id: customer.id,
            },
            data: {
              phone: customerInfo.phone.trim(),
              preferredContact: customerInfo.preferredContact || customer.preferredContact,
            },
          });
          logger.info('Existing customer updated', {
            customerId: customer.id,
            email: customer.email,
          });
        }

        // 2. Create main lead
        const lead = await tx.lead.create({
          data: {
            customerId: customer.id,
            source: 'website_cart_checkout',
            status: 'NEW',
            priority: 'MEDIUM',
            leadScore: calculateLeadScore(items),
            notes: `Cart checkout with ${items.length} items: ${items
              .map((item) => `${item.type} for vehicle ${item.vehicleId}`)
              .join(', ')}`,
            financingNeeded: customerInfo.financingNeeded || false,
            interestedInTrade: customerInfo.interestedInTrade || false,
            timeline: customerInfo.timeline || 'this_month',
            budgetRange: customerInfo.budgetRange || '',
          },
        });

        logger.info('Lead created', {
          leadId: lead.id,
          customerId: customer.id,
        });

        // 3. Process each cart item using Promise.all to avoid await in loop
        const itemResults = await Promise.allSettled(
          items.map((item) => processCartItem(tx, item, customer, lead))
        );

        const bookings = [];
        const processingErrors = [];

        itemResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            bookings.push(result.value);
          } else {
            logger.error('Error processing cart item', {
              item: items[index],
              error: result.reason.message,
            });
            processingErrors.push(
              `Error processing ${items[index].type} for vehicle ${items[index].vehicleId}: ${result.reason.message}`
            );
          }
        });

        // If we have errors but some bookings succeeded, still continue
        if (processingErrors.length > 0 && bookings.length === 0) {
          throw new Error(`Failed to process any items: ${processingErrors.join('; ')}`);
        }

        // 4. Create communication log
        await tx.communication.create({
          data: {
            customerId: customer.id,
            leadId: lead.id,
            type: 'BOOKING_REQUEST',
            subject: 'Cart Checkout - Booking Request',
            content: `Customer submitted cart checkout with ${items.length} items. Successfully processed: ${bookings.length}, Errors: ${processingErrors.length}`,
            direction: 'INBOUND',
          },
        });

        return {
          lead,
          customer,
          bookings,
          errors: processingErrors,
        };
      });

      // 5. Send notifications (async - don't wait)
      setTimeout(async () => {
        try {
          await sendBookingNotifications(result.lead.id, result.bookings);
        } catch (notificationError) {
          logger.error('Failed to send notifications', {
            leadId: result.lead.id,
            error: notificationError.message,
          });
        }
      }, 1000);

      const response = {
        success: true,
        message: 'Bookings processed successfully',
        data: {
          leadId: result.lead.id,
          customerId: result.customer.id,
          bookingCount: result.bookings.length,
          confirmationNumber: generateConfirmationNumber(),
          bookings: result.bookings,
          customer: {
            id: result.customer.id,
            name: `${result.customer.firstName} ${result.customer.lastName}`,
            email: result.customer.email,
            phone: result.customer.phone,
          },
        },
        company: 'Ridges Automotors',
        timestamp: new Date().toISOString(),
      };

      // Include errors if any occurred
      if (result.errors.length > 0) {
        response.warnings = result.errors;
        response.message = `${result.bookings.length} bookings processed successfully, ${result.errors.length} items had issues`;
      }

      res.status(201).json(response);

      logger.info('Cart checkout completed', {
        leadId: result.lead.id,
        customerId: result.customer.id,
        successfulBookings: result.bookings.length,
        errors: result.errors.length,
      });
    } catch (error) {
      logger.error('Cart checkout error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process checkout',
        company: 'Ridges Automotors',
      });
    }
  }
);

router.get('/availability/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { date } = req.query;

    const vehicle = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
      },
      include: {
        testDrives: {
          where: {
            scheduledAt: date
              ? {
                  gte: new Date(date),
                  lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
                }
              : {
                  gte: new Date(),
                  lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Next 14 days
                },
            status: {
              notIn: [TEST_DRIVE_STATUS.CANCELLED],
            },
          },
        },
        appointments: {
          where: {
            type: APPOINTMENT_TYPES.VEHICLE_RESERVATION,
            status: {
              in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED],
            },
            scheduledAt: {
              gt: new Date(),
            },
          },
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

    // Calculate available time slots
    const availableSlots = calculateAvailableTimeSlots(vehicle.testDrives, date || new Date());

    res.json({
      success: true,
      data: {
        vehicleId,
        vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        isAvailableForReservation:
          vehicle.status === 'AVAILABLE' && vehicle.appointments.length === 0,
        isAvailableForTestDrive: !['SOLD', 'UNAVAILABLE'].includes(vehicle.status),
        availableTimeSlots: availableSlots,
        activeReservations: vehicle.appointments.length,
        upcomingTestDrives: vehicle.testDrives.length,
        vehicleStatus: vehicle.status,
      },
      company: 'Ridges Automotors',
    });
  } catch (error) {
    logger.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
      company: 'Ridges Automotors',
    });
  }
});

router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const [appointments, testDrives] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          customerId,
          isActive: true,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              trim: true,
              stockNumber: true,
              price: true,
              images: true,
              status: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      }),
      prisma.testDrive.findMany({
        where: {
          customerId,
          isActive: true,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              trim: true,
              stockNumber: true,
              price: true,
              images: true,
              status: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      }),
    ]);

    const allBookings = [
      ...appointments.map((apt) => ({
        ...apt,
        bookingType: 'appointment',
        displayType:
          apt.type === APPOINTMENT_TYPES.VEHICLE_RESERVATION
            ? 'Vehicle Reservation'
            : 'Appointment',
      })),
      ...testDrives.map((td) => ({
        ...td,
        bookingType: 'test_drive',
        displayType: 'Test Drive',
      })),
    ].sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

    res.json({
      success: true,
      data: allBookings,
      count: allBookings.length,
      summary: {
        totalBookings: allBookings.length,
        appointments: appointments.length,
        testDrives: testDrives.length,
        upcoming: allBookings.filter((b) => new Date(b.scheduledAt) > new Date()).length,
        past: allBookings.filter((b) => new Date(b.scheduledAt) <= new Date()).length,
      },
      company: 'Ridges Automotors',
    });
  } catch (error) {
    logger.error('Customer bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      company: 'Ridges Automotors',
    });
  }
});

router.patch(
  '/appointment/:appointmentId/status',
  [body('status').isIn(Object.values(APPOINTMENT_STATUS)).withMessage('Valid status is required')],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: validationErrors.array(),
          company: 'Ridges Automotors',
        });
      }

      const { appointmentId } = req.params;
      const { status, notes } = req.body;

      // Get current appointment first
      const currentAppointment = await prisma.appointment.findUnique({
        where: {
          id: appointmentId,
        },
      });

      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found',
          company: 'Ridges Automotors',
        });
      }

      const appointment = await prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status,
          notes: notes ? `${currentAppointment.notes || ''}\n${notes}`.trim() : undefined,
          updatedAt: new Date(),
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });

      // Handle status-specific logic
      if (status === APPOINTMENT_STATUS.CANCELLED) {
        // Release vehicle if it was reserved
        if (appointment.type === APPOINTMENT_TYPES.VEHICLE_RESERVATION) {
          await prisma.vehicle.update({
            where: {
              id: appointment.vehicleId,
            },
            data: {
              status: 'AVAILABLE',
            },
          });

          logger.info('Vehicle released from cancelled reservation', {
            vehicleId: appointment.vehicleId,
            appointmentId: appointment.id,
          });
        }
      }

      res.json({
        success: true,
        data: appointment,
        company: 'Ridges Automotors',
      });

      logger.info('Appointment status updated', {
        appointmentId,
        newStatus: status,
        vehicleId: appointment.vehicleId,
      });
    } catch (error) {
      logger.error('Appointment status update error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found',
          company: 'Ridges Automotors',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update appointment status',
        company: 'Ridges Automotors',
      });
    }
  }
);

router.patch(
  '/test-drive/:testDriveId/status',
  [
    body('status').isIn(Object.values(TEST_DRIVE_STATUS)).withMessage('Valid status is required'),
    body('rating')
      .optional()
      .isInt({
        min: 1,
        max: 5,
      })
      .withMessage('Rating must be between 1-5'),
  ],
  async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: validationErrors.array(),
          company: 'Ridges Automotors',
        });
      }

      const { testDriveId } = req.params;
      const { status, notes, feedback, rating } = req.body;

      const updateData = {
        status,
        updatedAt: new Date(),
      };

      if (notes) updateData.notes = notes;
      if (feedback) updateData.feedback = feedback;
      if (rating) updateData.rating = parseInt(rating, 10);

      const testDrive = await prisma.testDrive.update({
        where: {
          id: testDriveId,
        },
        data: updateData,
        include: {
          vehicle: true,
          customer: true,
        },
      });

      res.json({
        success: true,
        data: testDrive,
        company: 'Ridges Automotors',
      });

      logger.info('Test drive status updated', {
        testDriveId,
        newStatus: status,
        rating: rating || null,
        vehicleId: testDrive.vehicleId,
      });
    } catch (error) {
      logger.error('Test drive status update error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Test drive not found',
          company: 'Ridges Automotors',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update test drive status',
        company: 'Ridges Automotors',
      });
    }
  }
);

// ============================================================================
// CLEANUP JOBS
// ============================================================================

async function expireOldReservations() {
  try {
    const now = new Date();

    // Find expired reservations (appointments older than scheduled time that are still pending)
    const expiredAppointments = await prisma.appointment.findMany({
      where: {
        type: APPOINTMENT_TYPES.VEHICLE_RESERVATION,
        status: APPOINTMENT_STATUS.SCHEDULED,
        scheduledAt: {
          lt: now,
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
          },
        },
      },
    });

    const updatePromises = expiredAppointments.map(async (appointment) => {
      // Update appointment status to cancelled
      await prisma.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          status: APPOINTMENT_STATUS.CANCELLED,
          notes: `${appointment.notes || ''}\nAuto-expired on ${now.toISOString()}`.trim(),
        },
      });

      // Release the vehicle
      await prisma.vehicle.update({
        where: {
          id: appointment.vehicleId,
        },
        data: {
          status: 'AVAILABLE',
        },
      });

      logger.info('Expired reservation processed', {
        appointmentId: appointment.id,
        vehicleId: appointment.vehicleId,
        vehicleInfo: `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`,
      });
    });

    await Promise.all(updatePromises);

    if (expiredAppointments.length > 0) {
      logger.info(`Processed ${expiredAppointments.length} expired reservations`);
    }
  } catch (error) {
    logger.error('Reservation cleanup error:', error);
  }
}

// Run cleanup every 30 minutes
const cleanupInterval = setInterval(expireOldReservations, 30 * 60 * 1000);

// Export cleanup function for manual use
router.cleanup = expireOldReservations;

// Cleanup on process exit
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  process.exit(0);
});

module.exports = router;
