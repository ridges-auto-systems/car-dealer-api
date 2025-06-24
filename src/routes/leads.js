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

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// POST /api/leads - Create New Lead (Customer Inquiry)
// ============================================================================
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('vehicleId').optional().isUUID().withMessage('Invalid vehicle ID'),
    body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message too long'),
    body('interestedInTrade').optional().isBoolean(),
    body('financingNeeded').optional().isBoolean(),
    body('timeline')
      .optional()
      .isIn(['immediately', 'this_week', 'this_month', 'next_month', 'just_browsing']),
    body('budgetRange').optional().isString(),
    body('source').optional().isString(),
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
        email,
        firstName,
        lastName,
        phone,
        vehicleId,
        message,
        interestedInTrade = false,
        financingNeeded = true,
        timeline,
        budgetRange,
        source = 'website',
        tradeVehicleInfo,
      } = req.body;

      // Check if customer exists
      let customer = await prisma.user.findUnique({
        where: { email },
      });

      // Create customer if doesn't exist
      if (!customer) {
        const hashedPassword = await bcrypt.hash(`temp-password-${Date.now()}`, 10);

        customer = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            phone,
            password: hashedPassword, // Temporary password
            role: 'CUSTOMER',
            preferredContact: phone ? 'phone' : 'email',
            marketingOptIn: true,
          },
        });

        logger.info('New customer created', {
          customerId: customer.id,
          email: customer.email,
          source,
        });
      } else {
        // Update existing customer info if provided
        if (phone && phone !== customer.phone) {
          await prisma.user.update({
            where: { id: customer.id },
            data: { phone },
          });
        }
      }

      // Validate vehicle exists if provided
      let vehicle = null;
      if (vehicleId) {
        vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            price: true,
            status: true,
          },
        });

        if (!vehicle) {
          return res.status(400).json({
            success: false,
            error: 'Vehicle not found',
            company: 'Rides Automotors',
          });
        }
      }

      // Calculate lead score based on available information
      const leadScore = calculateLeadScore({
        hasPhone: !!phone,
        hasVehicleInterest: !!vehicleId,
        financingNeeded,
        timeline,
        hasTradeIn: interestedInTrade,
        messageLength: message?.length || 0,
      });

      // Determine lead priority
      const priority = determineLeadPriority(leadScore, timeline, vehicle?.price);

      // Create lead
      const lead = await prisma.lead.create({
        data: {
          customerId: customer.id,
          vehicleId,
          source,
          status: 'NEW',
          priority,
          notes: message,
          interestedInTrade,
          tradeVehicleInfo,
          financingNeeded,
          timeline,
          budgetRange,
          leadScore,
          isHot: leadScore >= 80 || priority === 'HOT',
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              trim: true,
              price: true,
              condition: true,
              images: true,
            },
          },
        },
      });

      // Auto-assign to available sales rep (simplified logic)
      try {
        const availableSalesRep = await prisma.user.findFirst({
          where: {
            role: 'SALES_REP',
            isActive: true,
          },
          orderBy: { createdAt: 'asc' }, // Round-robin assignment
        });

        if (availableSalesRep) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { salesRepId: availableSalesRep.id },
          });

          logger.info('Lead assigned to sales rep', {
            leadId: lead.id,
            salesRepId: availableSalesRep.id,
            salesRepName: `${availableSalesRep.firstName} ${availableSalesRep.lastName}`,
          });
        }
      } catch (assignmentError) {
        logger.warn('Failed to auto-assign lead to sales rep:', assignmentError);
      }

      // Send notification email (placeholder - implement with actual email service)
      try {
        await sendLeadNotification(lead);
      } catch (emailError) {
        logger.warn('Failed to send lead notification email:', emailError);
      }

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          lead: {
            id: lead.id,
            status: lead.status,
            priority: lead.priority,
            leadScore: lead.leadScore,
            createdAt: lead.createdAt,
          },
          customer: lead.customer,
          vehicle: lead.vehicle,
          nextSteps: getNextSteps(lead.priority, lead.timeline),
        },
        message: 'Thank you for your interest! We will contact you soon.',
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });

      // Log lead creation
      logger.info('New lead created', {
        leadId: lead.id,
        customerId: customer.id,
        vehicleId,
        source,
        priority,
        leadScore,
      });
    } catch (error) {
      logger.error('Error creating lead:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process your inquiry. Please try again.',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// GET /api/leads - List Leads (Sales Team Only)
// ============================================================================
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('priority').optional().isString(),
    query('salesRepId').optional().isUUID(),
    query('source').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'priority', 'leadScore', 'lastContactDate']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      // Note: In production, this would require authentication
      // For now, we'll return leads data for development

      const {
        page = 1,
        limit = 20,
        status,
        priority,
        salesRepId,
        source,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const where = {
        isActive: true,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(salesRepId && { salesRepId }),
        ...(source && { source }),
      };

      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          orderBy,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                preferredContact: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                trim: true,
                price: true,
                condition: true,
                images: true,
              },
            },
            salesRep: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.lead.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          leads: leads.map((lead) => ({
            ...lead,
            customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
            vehicleName: lead.vehicle
              ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}`
              : null,
            salesRepName: lead.salesRep
              ? `${lead.salesRep.firstName} ${lead.salesRep.lastName}`
              : 'Unassigned',
            daysSinceCreated: Math.floor(
              (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
            ),
            priorityBadge: getPriorityBadge(lead.priority),
            statusBadge: getStatusBadge(lead.status),
          })),
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10)),
          },
        },
        company: 'Rides Automotors',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching leads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leads',
        company: 'Rides Automotors',
      });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateLeadScore({
  hasPhone,
  hasVehicleInterest,
  financingNeeded,
  timeline,
  hasTradeIn,
  messageLength,
}) {
  let score = 50; // Base score

  if (hasPhone) score += 15;
  if (hasVehicleInterest) score += 20;
  if (financingNeeded) score += 10;
  if (hasTradeIn) score += 10;
  if (messageLength > 50) score += 5;

  // Timeline scoring
  switch (timeline) {
    case 'immediately':
      score += 25;
      break;
    case 'this_week':
      score += 20;
      break;
    case 'this_month':
      score += 15;
      break;
    case 'next_month':
      score += 10;
      break;
    case 'just_browsing':
      score += 0;
      break;
  }

  return Math.min(100, score);
}

function determineLeadPriority(leadScore, timeline, _vehiclePrice) {
  if (leadScore >= 90 || timeline === 'immediately') return 'HOT';
  if (leadScore >= 75 || timeline === 'this_week') return 'HIGH';
  if (leadScore >= 60 || timeline === 'this_month') return 'MEDIUM';
  return 'LOW';
}

function getNextSteps(priority, _timeline) {
  const steps = {
    HOT: [
      'Immediate phone call within 15 minutes',
      'Schedule same-day appointment',
      'Prepare vehicle for showing',
    ],
    HIGH: [
      'Phone call within 1 hour',
      'Send vehicle information',
      'Schedule appointment within 24 hours',
    ],
    MEDIUM: ['Contact within 4 hours', 'Send personalized email', 'Follow up in 2-3 days'],
    LOW: ['Contact within 24 hours', 'Add to nurture campaign', 'Weekly follow-up'],
  };

  return steps[priority] || steps.MEDIUM;
}

function getPriorityBadge(priority) {
  const badges = {
    HOT: { color: 'red', text: '🔥 Hot Lead' },
    HIGH: { color: 'orange', text: '⚡ High Priority' },
    MEDIUM: { color: 'yellow', text: '📋 Medium Priority' },
    LOW: { color: 'green', text: '📝 Low Priority' },
  };

  return badges[priority] || badges.MEDIUM;
}

function getStatusBadge(status) {
  const badges = {
    NEW: { color: 'blue', text: '🆕 New' },
    CONTACTED: { color: 'purple', text: '📞 Contacted' },
    QUALIFIED: { color: 'green', text: '✅ Qualified' },
    APPOINTMENT_SCHEDULED: { color: 'orange', text: '📅 Appointment Set' },
    TEST_DRIVE_COMPLETED: { color: 'teal', text: '🚗 Test Drive Done' },
    NEGOTIATING: { color: 'yellow', text: '💬 Negotiating' },
    FINANCING_PENDING: { color: 'indigo', text: '💳 Financing Pending' },
    PAPERWORK: { color: 'pink', text: '📄 Paperwork' },
    CLOSED_WON: { color: 'green', text: '🎉 Sale Completed' },
    CLOSED_LOST: { color: 'red', text: '❌ Lost' },
    FOLLOW_UP: { color: 'gray', text: '🔄 Follow Up' },
  };

  return badges[status] || badges.NEW;
}

async function sendLeadNotification(lead) {
  // Placeholder for email notification
  // In production, integrate with email service like SendGrid, Mailgun, etc.
  logger.info('Lead notification sent', {
    leadId: lead.id,
    customerEmail: lead.customer.email,
    vehicleInfo: lead.vehicle
      ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}`
      : 'General Inquiry',
  });
}

module.exports = router;
