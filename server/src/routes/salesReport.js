/**
 * salesReport.js — Sales Report & Business Analytics API Routes.
 * Accessible by:
 * - System Admin
 * - Inventory Manager
 */

const express = require('express');
const { SalesReportService, parseDateRange } = require('../services/salesReportService');
const { authMiddleware, employeeRoleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Enforce authentication & role protection: Admin and Inventory Manager only
router.use(authMiddleware);
router.use(employeeRoleMiddleware('Inventory Manager'));

/**
 * 1. GET /api/v1/sales-report
 * Returns full structured sales analytics report for the selected period.
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      periodType = 'monthly',
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    } = req.query;

    const report = await SalesReportService.getFullReport(periodType, {
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: report,
      message: 'Sales report generated successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. GET /api/v1/sales-report/orders
 * Paginated and searchable order transaction details for the selected period.
 */
router.get('/orders', async (req, res, next) => {
  try {
    const {
      periodType = 'monthly',
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate,
      search,
      status,
      paymentStatus,
      sortBy = 'orderDate',
      sortDir = 'DESC',
      page = 1,
      pageSize = 20
    } = req.query;

    const range = parseDateRange(periodType, {
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    });

    const ordersData = await SalesReportService.getOrderDetails({
      start: range.start,
      end: range.end,
      search,
      status,
      paymentStatus,
      sortBy,
      sortDir,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20
    });

    res.json({
      success: true,
      data: ordersData,
      message: 'Order transactions retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. GET /api/v1/sales-report/products
 * Detailed product-wise performance with search and sort.
 */
router.get('/products', async (req, res, next) => {
  try {
    const {
      periodType = 'monthly',
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate,
      search,
      sortBy = 'quantitySold',
      sortDir = 'DESC'
    } = req.query;

    const range = parseDateRange(periodType, {
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    });

    const products = await SalesReportService.getProductSales(
      range.start,
      range.end,
      search,
      sortBy,
      sortDir
    );

    res.json({
      success: true,
      data: products,
      message: 'Product performance retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. GET /api/v1/sales-report/export-html
 * Serves complete standalone printable HTML sales report for browser printing & PDF export.
 */
router.get('/export-html', async (req, res, next) => {
  try {
    const {
      periodType = 'monthly',
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    } = req.query;

    const report = await SalesReportService.getFullReport(periodType, {
      date,
      weekStart,
      month,
      year,
      startDate,
      endDate
    });

    const html = SalesReportService.generateHtmlReport(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
