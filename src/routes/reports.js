/* eslint-disable indent */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable operator-linebreak */
/* eslint-disable max-len */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-unused-vars */
/* eslint-disable comma-dangle */
/* eslint-disable no-use-before-define */
// backend/routes/reports.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

/** ------------------------------ Helpers ------------------------------ */
function getDateRange(req, res) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({
      success: false,
      message: 'startDate and endDate are required (ISO date strings)',
    });
    return null;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    res.status(400).json({
      success: false,
      message: 'Invalid startDate or endDate. Use ISO date strings.',
    });
    return null;
  }
  return { start, end };
}

const toInt = (v, d = 0) => (v == null ? d : parseInt(v, 10));
const toNumber = (v, d = 0) => {
  if (v == null) return d;
  // Prisma Decimal or number
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Format yyyy-mm from Date
const ymKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** =====================================================================
 * GET /api/reports/sales
 *  - Uses Vehicle as source of truth for sales (status 'SOLD', soldDate, soldPrice)
 *  - Top performers derived from Leads with status 'CLOSED_WON' joined to sold Vehicles
 * ===================================================================== */
router.get('/sales', async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;

  const { start, end } = range;
  logger.info('📊 Sales Report Request', { start, end });

  try {
    // 1) Pull sold vehicles in date range
    const soldVehicles = await prisma.vehicle.findMany({
      where: {
        status: 'SOLD',
        soldDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        price: true,
        soldPrice: true,
        soldDate: true,
      },
      orderBy: { soldDate: 'desc' },
    });

    // Aggregate totals
    const totalSales = soldVehicles.length;
    const totalRevenue = soldVehicles.reduce((sum, v) => sum + toNumber(v.soldPrice ?? v.price), 0);
    const avgSalePrice = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Group by month (YYYY-MM)
    const salesByMonthMap = new Map();
    soldVehicles.forEach((v) => {
      const key = ymKey(new Date(v.soldDate));
      const current = salesByMonthMap.get(key) || { month: key, sales: 0, revenue: 0 };
      current.sales += 1;
      current.revenue += toNumber(v.soldPrice ?? v.price);
      salesByMonthMap.set(key, current);
    });
    const salesByMonth = Array.from(salesByMonthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // Vehicles sold list
    const vehiclesSold = soldVehicles.map((v) => ({
      make: v.make,
      model: v.model,
      year: v.year,
      price: toNumber(v.soldPrice ?? v.price),
      saleDate: v.soldDate,
      salesRep: null, // populated below if we can resolve from a CLOSED_WON lead
    }));

    // 2) Find CLOSED_WON leads that correspond to those sold vehicles in the same window
    // We filter by vehicle.soldDate within range (safer than lead.createdAt)
    const leadsForSoldVehicles = await prisma.lead.findMany({
      where: {
        status: 'CLOSED_WON',
        vehicleId: { in: soldVehicles.map((v) => v.id) },
        vehicle: {
          soldDate: { gte: start, lte: end },
          status: 'SOLD',
        },
      },
      select: {
        id: true,
        vehicleId: true,
        salesRepId: true,
        customerId: true,
        createdAt: true,
        updatedAt: true,
        salesRep: { select: { firstName: true, lastName: true, id: true } },
      },
    });

    // Top performers by salesRep: count and sum revenue using vehicle.soldPrice for matched vehicleId
    const vehicleRevenueById = new Map(
      soldVehicles.map((v) => [v.id, toNumber(v.soldPrice ?? v.price)])
    );

    const repAgg = new Map();
    leadsForSoldVehicles.forEach((lead) => {
      if (!lead.salesRep) return;
      const repKey = lead.salesRep.id;
      const revenue = vehicleRevenueById.get(lead.vehicleId) || 0;
      const entry = repAgg.get(repKey) || {
        salesRep: `${lead.salesRep.firstName} ${lead.salesRep.lastName}`,
        sales: 0,
        revenue: 0,
      };
      entry.sales += 1;
      entry.revenue += revenue;
      repAgg.set(repKey, entry);
    });

    const topPerformers = Array.from(repAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Map salesRep name onto vehiclesSold list if we can find a matching CLOSED_WON lead
    const leadByVehicle = new Map();
    leadsForSoldVehicles.forEach((l) => {
      if (!leadByVehicle.has(l.vehicleId)) {
        leadByVehicle.set(l.vehicleId, l);
      }
    });
    vehiclesSold.forEach((v) => {
      const l = leadByVehicle.get(
        // find vehicle id by matching in soldVehicles (we need id)
        soldVehicles.find(
          (sv) =>
            sv.make === v.make &&
            sv.model === v.model &&
            sv.year === v.year &&
            toNumber(sv.soldPrice ?? sv.price) === v.price &&
            sv.soldDate?.toISOString() === v.saleDate?.toISOString()
        )?.id
      );
    });
    // More robust mapping by direct id:
    // Build index by id so we can attach easily
    const soldVehicleIndex = new Map(soldVehicles.map((v) => [v.id, v]));
    vehiclesSold.forEach((row) => {
      // find vehicle object matching this row
      // Build reverse lookup (price+date+make+model+year -> id) is brittle; better to reconstruct directly:
      // We'll rebuild vehiclesSold with id so we can map reliably.
    });
    // Rebuild vehiclesSold with id for safe mapping
    const vehiclesSoldWithId = soldVehicles.map((v) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      price: toNumber(v.soldPrice ?? v.price),
      saleDate: v.soldDate,
      salesRep: null,
    }));
    vehiclesSoldWithId.forEach((row) => {
      const l = leadByVehicle.get(row.id);
      if (l && l.salesRep) {
        row.salesRep = `${l.salesRep.firstName} ${l.salesRep.lastName}`;
      }
    });

    // Response payload
    const data = {
      totalSales,
      totalRevenue,
      avgSalePrice,
      salesByMonth,
      topPerformers,
      vehiclesSold: vehiclesSoldWithId,
    };

    res.json({ success: true, data });
  } catch (error) {
    logger.error('❌ Sales Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report',
      error: error?.message,
    });
  }
});

/** =====================================================================
 * GET /api/reports/inventory
 *  - Inventory is based on Vehicle where status indicates availability
 *  - Uses price (Decimal) and createdAt for days-on-lot
 *  - vehiclesByCategory grouped by `make` (since schema has no category field)
 * ===================================================================== */
router.get('/inventory', async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const reportDate = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(reportDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid asOfDate' });
    }

    logger.info('📦 Inventory Report Request', { reportDate });

    // Available inventory definition: status 'AVAILABLE' (string), isActive true
    const availableWhere = {
      isActive: true,
      status: 'AVAILABLE',
    };

    const [availableVehicles, aging60Plus, aging90Plus] = await Promise.all([
      prisma.vehicle.findMany({
        where: availableWhere,
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          price: true,
          createdAt: true,
        },
      }),
      prisma.vehicle.findMany({
        where: {
          ...availableWhere,
          createdAt: { lte: new Date(reportDate.getTime() - 60 * 24 * 60 * 60 * 1000) }, // > 60 days
        },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          price: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.vehicle.findMany({
        where: {
          ...availableWhere,
          createdAt: { lte: new Date(reportDate.getTime() - 90 * 24 * 60 * 60 * 1000) }, // > 90 days
        },
        select: { id: true },
      }),
    ]);

    const totalVehicles = availableVehicles.length;
    const totalValue = availableVehicles.reduce((sum, v) => sum + toNumber(v.price), 0);

    // Avg days on lot
    const daysOnLot = (dt) =>
      Math.max(
        0,
        Math.floor((reportDate.getTime() - new Date(dt).getTime()) / (1000 * 60 * 60 * 24))
      );
    const avgDaysOnLot =
      totalVehicles > 0
        ? availableVehicles.reduce((sum, v) => sum + daysOnLot(v.createdAt), 0) / totalVehicles
        : 0;

    // Low stock alert (older than 90 days)
    const lowStockAlert = aging90Plus.length;

    // Group by "category" — we’ll use make (since there is no vehicle_type)
    const byCategoryMap = new Map();
    availableVehicles.forEach((v) => {
      const key = v.make || 'Unknown';
      const current = byCategoryMap.get(key) || { category: key, count: 0, value: 0 };
      current.count += 1;
      current.value += toNumber(v.price);
      byCategoryMap.set(key, current);
    });
    const vehiclesByCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.count - a.count);

    // Aging inventory details (> 60 days)
    const agingInventory = aging60Plus.map((v) => ({
      vehicleId: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      currentPrice: toNumber(v.price),
      daysOnLot: daysOnLot(v.createdAt),
    }));

    const data = {
      totalVehicles,
      totalValue,
      avgDaysOnLot,
      lowStockAlert,
      vehiclesByCategory,
      agingInventory,
    };

    res.json({ success: true, data });
  } catch (error) {
    logger.error('❌ Inventory Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report',
      error: error?.message,
    });
  }
});

/** =====================================================================
 * GET /api/reports/lead-conversion
 *  - Based on Lead model (createdAt within range)
 *  - convertedLeads: status 'CLOSED_WON'
 *  - avgConversionTime: avg(updatedAt - createdAt) for CLOSED_WON
 *  - leadsBySource: group by source with conversions & rate
 * ===================================================================== */
router.get('/lead-conversion', async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;

  const { start, end } = range;
  logger.info('🎯 Lead Conversion Request', { start, end });

  try {
    // Pull leads in range
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        source: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalLeads = leads.length;
    const closedWon = leads.filter((l) => l.status === 'CLOSED_WON');

    // Conversion rate
    const convertedLeads = closedWon.length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Avg conversion time (days) for CLOSED_WON
    const avgConversionTime =
      convertedLeads > 0
        ? closedWon.reduce((sum, l) => {
            const days = Math.max(
              0,
              Math.floor(
                (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            );
            return sum + days;
          }, 0) / convertedLeads
        : 0;

    // Leads by source
    const bySourceMap = new Map();
    leads.forEach((l) => {
      const key = l.source || 'Unknown';
      const current = bySourceMap.get(key) || {
        source: key,
        leads: 0,
        conversions: 0,
        conversionRate: 0,
      };
      current.leads += 1;
      if (l.status === 'CLOSED_WON') current.conversions += 1;
      bySourceMap.set(key, current);
    });
    // compute rate
    Array.from(bySourceMap.values()).forEach((row) => {
      row.conversionRate = row.leads > 0 ? (row.conversions / row.leads) * 100 : 0;
    });
    const leadsBySource = Array.from(bySourceMap.values()).sort((a, b) => b.leads - a.leads);

    const data = {
      totalLeads,
      convertedLeads,
      conversionRate,
      avgConversionTime,
      leadsBySource,
    };

    res.json({ success: true, data });
  } catch (error) {
    logger.error('❌ Lead Conversion Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate lead conversion report',
      error: error?.message,
    });
  }
});

module.exports = router;
