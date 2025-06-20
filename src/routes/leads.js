/* eslint-disable object-curly-newline */
/* eslint-disable consistent-return */
/* eslint-disable comma-dangle */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/leads - Create new lead
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone(),
    body('vehicleId').optional().isString(),
    body('message').optional().isString(),
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

      const { email, firstName, lastName, phone, vehicleId, message, source } = req.body;

      // Check if customer exists
      let customer = await prisma.user.findUnique({
        where: { email },
      });

      // Create customer if doesn't exist
      if (!customer) {
        customer = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            phone,
            password: 'temp', // Will be set when they create account
            role: 'CUSTOMER',
          },
        });
      }

      // Create lead
      const lead = await prisma.lead.create({
        data: {
          customerId: customer.id,
          vehicleId,
          source: source || 'website',
          notes: message,
          status: 'NEW',
        },
        include: {
          customer: true,
          vehicle: true,
        },
      });

      res.status(201).json({
        success: true,
        data: lead,
        message: 'Thank you for your interest! We will contact you soon.',
        company: 'Rides Automotors',
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lead',
        company: 'Rides Automotors',
      });
    }
  }
);

module.exports = router;
