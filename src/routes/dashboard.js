/* eslint-disable no-else-return */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-destructuring */
/* eslint-disable comma-dangle */
/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// GET /api/dashboard/stats - Get Dashboard Statistics
// ============================================================================
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = '30' } = req.query; // days
    const daysAgo = parseInt(timeframe, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Run all queries in parallel for better performance
    const [
      totalSales,
      newLeads,
      totalInventory,
      availableInventory,
      totalRevenue,
      recentSales,
      conversionRate,
      averageLeadTime,
      topSellingVehicle,
    ] = await Promise.all([
      // Total Sales (vehicles sold)
      prisma.vehicle.count({
        where: {
          status: 'SOLD',
          soldDate: {
            gte: startDate,
          },
        },
      }),

      // New Leads
      prisma.lead.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          isActive: true,
        },
      }),

      // Total Inventory Count
      prisma.vehicle.count({
        where: {
          isActive: true,
        },
      }),

      // Available Inventory Count
      prisma.vehicle.count({
        where: {
          status: 'AVAILABLE',
          isActive: true,
        },
      }),

      // Total Revenue
      prisma.vehicle.aggregate({
        where: {
          status: 'SOLD',
          soldDate: {
            gte: startDate,
          },
        },
        _sum: {
          soldPrice: true,
        },
      }),

      // Recent Sales for trend analysis
      prisma.vehicle.findMany({
        where: {
          status: 'SOLD',
          soldDate: {
            gte: startDate,
          },
        },
        select: {
          soldPrice: true,
          soldDate: true,
          make: true,
          model: true,
          year: true,
        },
        orderBy: {
          soldDate: 'desc',
        },
      }),

      // Conversion Rate Calculation
      Promise.all([
        prisma.lead.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
        prisma.lead.count({
          where: {
            status: 'CLOSED_WON',
            createdAt: {
              gte: startDate,
            },
          },
        }),
      ]).then(([totalLeads, convertedLeads]) => ({
        total: totalLeads,
        converted: convertedLeads,
        rate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
      })),

      // Average Lead Time
      prisma.lead
        .findMany({
          where: {
            status: 'CLOSED_WON',
            createdAt: {
              gte: startDate,
            },
          },
          select: {
            createdAt: true,
            updatedAt: true,
          },
        })
        .then((leads) => {
          if (leads.length === 0) return 0;

          const totalDays = leads.reduce((sum, lead) => {
            const days = Math.floor(
              (new Date(lead.updatedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0);

          return Math.round(totalDays / leads.length);
        }),

      // Top Selling Vehicle
      // Top Selling Vehicle - Updated for Prisma 4.x+
      prisma.vehicle
        .groupBy({
          by: ['make', 'model'],
          where: {
            status: 'SOLD',
            soldDate: {
              gte: startDate,
            },
          },
          _count: {
            make: true, // Count occurrences per make/model
          },
          orderBy: {
            _count: {
              make: 'desc', // Order by the count in descending order
            },
          },
          take: 1,
        })
        .then((result) => result[0] || null),
    ]);

    // Calculate revenue in millions
    const revenue = totalRevenue._sum.soldPrice || 0;
    const revenueInMillions = revenue / 1000000;

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          newLeads,
          inventory: {
            total: totalInventory,
            available: availableInventory,
            sold: totalInventory - availableInventory,
          },
          revenue: {
            total: revenue,
            formatted: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(revenue),
            inMillions: `$${revenueInMillions.toFixed(1)}M`,
          },
        },
        metrics: {
          conversionRate: `${conversionRate.rate}%`,
          averageLeadTime: `${averageLeadTime} days`,
          topSelling: topSellingVehicle
            ? `${topSellingVehicle.make} ${topSellingVehicle.model}`
            : 'N/A',
        },
        salesData: recentSales,
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      company: 'Ridges Automotors',
    });
  }
});

// ============================================================================
// GET /api/dashboard/sales-performance - Get Sales Performance Chart Data
// ============================================================================
router.get('/sales-performance', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months, 10));

    // Get sales data grouped by time period
    const salesData = await prisma.vehicle.findMany({
      where: {
        status: 'SOLD',
        soldDate: {
          gte: startDate,
        },
      },
      select: {
        soldDate: true,
        soldPrice: true,
        price: true,
      },
      orderBy: {
        soldDate: 'asc',
      },
    });

    // Group data by period
    const groupedData = groupSalesData(salesData, period);

    res.json({
      success: true,
      data: {
        chartData: groupedData,
        period,
        totalDataPoints: groupedData.length,
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching sales performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales performance data',
      company: 'Ridges Automotors',
    });
  }
});

// ============================================================================
// GET /api/dashboard/recent-activity - Get Recent Activity Feed
// ============================================================================
router.get('/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const [recentLeads, recentSales, recentListings] = await Promise.all([
      // Recent leads
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
          vehicle: {
            select: { make: true, model: true, year: true },
          },
        },
      }),

      // Recent sales
      prisma.vehicle.findMany({
        where: { status: 'SOLD' },
        take: 5,
        orderBy: { soldDate: 'desc' },
        select: {
          make: true,
          model: true,
          year: true,
          soldPrice: true,
          soldDate: true,
        },
      }),

      // Recent listings
      prisma.vehicle.findMany({
        where: {
          status: 'AVAILABLE',
          isActive: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          make: true,
          model: true,
          year: true,
          price: true,
          createdAt: true,
        },
      }),
    ]);

    // Combine and format activities
    const activities = [];

    recentLeads.forEach((lead) => {
      activities.push({
        type: 'lead',
        icon: '👤',
        title: 'New Lead Received',
        description: `${lead.customer.firstName} ${lead.customer.lastName} ${lead.vehicle ? `interested in ${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : 'general inquiry'}`,
        timestamp: lead.createdAt,
        priority: lead.priority,
      });
    });

    recentSales.forEach((sale) => {
      activities.push({
        type: 'sale',
        icon: '🎉',
        title: 'Vehicle Sold',
        description: `${sale.year} ${sale.make} ${sale.model} sold for ${new Intl.NumberFormat(
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }
        ).format(sale.soldPrice)}`,
        timestamp: sale.soldDate,
        amount: sale.soldPrice,
      });
    });

    recentListings.forEach((listing) => {
      activities.push({
        type: 'listing',
        icon: '🚗',
        title: 'New Vehicle Listed',
        description: `${listing.year} ${listing.make} ${listing.model} added to inventory`,
        timestamp: listing.createdAt,
        amount: listing.price,
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map((activity) => ({
        ...activity,
        timeAgo: getTimeAgo(activity.timestamp),
        formattedTime: new Date(activity.timestamp).toLocaleString(),
      }));

    res.json({
      success: true,
      data: {
        activities: sortedActivities,
        total: activities.length,
      },
      company: 'Ridges Automotors',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
      company: 'Ridges Automotors',
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupSalesData(salesData, period) {
  const grouped = {};

  salesData.forEach((sale) => {
    let key;
    const date = new Date(sale.soldDate);

    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        vehicles: 0,
        revenue: 0,
        date: key,
      };
    }

    grouped[key].vehicles += 1;
    grouped[key].revenue += sale.soldPrice || sale.price || 0;
  });

  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMs = now - time;
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
}

module.exports = router;
