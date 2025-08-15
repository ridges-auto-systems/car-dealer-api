/* eslint-disable consistent-return */
/* eslint-disable no-shadow */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-destructuring */
/* eslint-disable comma-dangle */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-use-before-define */
/* eslint-disable operator-linebreak */
/* eslint-disable max-len */
// routes/sales.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/rep', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    // Validate required parameters
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'userId, startDate, and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all data in parallel
    const [sales, leads, activities] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          status: 'SOLD',
          soldByUserId: userId,
          soldDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          soldPrice: true,
          soldDate: true,
        },
      }),

      prisma.lead.findMany({
        where: {
          assignedToId: userId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          vehicle: {
            select: { make: true, model: true },
          },
        },
      }),

      prisma.activity.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate metrics
    const closedWonLeads = leads.filter((lead) => lead.status === 'CLOSED_WON');
    const conversionRate =
      leads.length > 0 ? Math.round((closedWonLeads.length / leads.length) * 100) : 0;

    const totalCommission = sales.reduce((sum, vehicle) => sum + vehicle.soldPrice * 0.05, 0);

    // Group sales data by month
    const salesByPeriod = groupSalesData(sales, 'monthly', 6);

    // Find top performing model
    const modelCounts = {};
    sales.forEach((vehicle) => {
      const key = `${vehicle.make} ${vehicle.model}`;
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });
    const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    res.json({
      success: true,
      data: {
        stats: {
          mySales: sales.length,
          myLeads: leads.length,
          conversionRate,
          commission: totalCommission,
          avgLeadTime: calculateAverageLeadTime(closedWonLeads),
          topPerformingModel: topModel,
          quotaProgress: calculateQuotaProgress(sales.length),
        },
        salesData: salesByPeriod,
        activities: formatActivities(activities),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Sales rep dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load sales dashboard data',
    });
  }
});

/**
 * Groups sales data by time period for a specific sales rep
 * @param {Array} sales - Array of sales records
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @param {number} months - Number of months to include
 * @returns {Array} Grouped sales data with vehicles count and revenue
 */
function groupSalesData(sales, period = 'monthly', months = 6) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Initialize result object
  const grouped = {};

  // Create all period buckets in advance to ensure consistent output
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    let key;
    switch (period) {
      case 'daily':
        key = currentDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        // Get start of week (Sunday)
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
      default:
        key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        vehicles: 0,
        revenue: 0,
        date: new Date(currentDate).toISOString(),
        label: getPeriodLabel(currentDate, period),
      };
    }

    // Move to next period
    switch (period) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
      default:
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Group actual sales data
  sales.forEach((sale) => {
    const saleDate = new Date(sale.soldDate);
    let key;

    switch (period) {
      case 'daily':
        key = saleDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(saleDate);
        weekStart.setDate(saleDate.getDate() - saleDate.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
      default:
        key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
    }

    if (grouped[key]) {
      grouped[key].vehicles += 1;
      grouped[key].revenue += sale.soldPrice || 0;
    }
  });

  // Convert to array and sort chronologically
  return (
    Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      // eslint-disable-next-line no-shadow
      .filter(
        (period) =>
          // Filter out future periods
          new Date(period.date) <= endDate
      )
  );
}

/**
 * Generates human-readable labels for periods
 */
function getPeriodLabel(date, period) {
  switch (period) {
    case 'daily':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    case 'weekly':
      const weekEnd = new Date(date);
      weekEnd.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
    default:
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

function calculateAverageLeadTime(leads) {
  if (leads.length === 0) return 0;
  const totalDays = leads.reduce(
    (sum, lead) =>
      sum +
      Math.floor((new Date(lead.updatedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)),
    0
  );
  return Math.round(totalDays / leads.length);
}

function calculateQuotaProgress(salesCount) {
  const MONTHLY_QUOTA = 10; // Example quota
  return Math.min(100, Math.round((salesCount / MONTHLY_QUOTA) * 100));
}

function formatActivities(activities) {
  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    time: activity.createdAt,
    // ... additional formatting
  }));
}

module.exports = router;
