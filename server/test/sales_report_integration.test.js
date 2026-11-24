/**
 * sales_report_integration.test.js
 * Comprehensive integration tests for Sales Report & Business Analytics Module.
 * Tests role permissions, date ranges, calculations, comparisons, insights, and HTML generation.
 */

const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/db/pool');
const { SalesReportService, parseDateRange } = require('../src/services/salesReportService');
const { authMiddleware, employeeRoleMiddleware } = require('../src/middleware/auth');

async function runTests() {
  console.log('===============================================================');
  console.log('       RUNNING SALES REPORT & ANALYTICS INTEGRATION TESTS       ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      process.stdout.write(`TEST: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('   ', err.message);
      failed++;
    }
  };

  // 1. Role Access Permission Checks
  await test('Role authorization: Admin and Inventory Manager allowed, others blocked', async () => {
    const adminToken = jwt.sign({ sub: 'ADM001', role: 'admin', name: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const invMgrToken = jwt.sign({ sub: 'EMP001', role: 'employee', roleName: 'Inventory Manager', name: 'Mohsin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const salesExecToken = jwt.sign({ sub: 'EMP002', role: 'employee', roleName: 'Sales Executive', name: 'Abid' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const socialToken = jwt.sign({ sub: 'EMP003', role: 'employee', roleName: 'Social Media Manager', name: 'Zara' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const custToken = jwt.sign({ sub: 'C001', role: 'customer', name: 'Ayesha' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const checkAccess = async (token) => {
      let passed = false;
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: () => ({ json: () => {} }) };
      try {
        await authMiddleware(req, res, () => {
          const mw = employeeRoleMiddleware('Inventory Manager');
          mw(req, res, () => { passed = true; });
        });
      } catch (_) {}
      return passed;
    };

    assert.strictEqual(await checkAccess(adminToken), true, 'Admin MUST have access to Sales Report');
    assert.strictEqual(await checkAccess(invMgrToken), true, 'Inventory Manager MUST have access to Sales Report');
    assert.strictEqual(await checkAccess(salesExecToken), false, 'Sales Executive MUST NOT have access to Sales Report');
    assert.strictEqual(await checkAccess(socialToken), false, 'Social Media Manager MUST NOT have access to Sales Report');
    assert.strictEqual(await checkAccess(custToken), false, 'Customer MUST NOT have access to Sales Report');
  });

  // 2. Date Range Parsing
  await test('parseDateRange correctly computes daily, weekly, monthly, yearly, and custom boundaries', async () => {
    // Daily
    const daily = parseDateRange('daily', { date: '2026-05-17' });
    assert.strictEqual(daily.startDateStr, '2026-05-17');
    assert.strictEqual(daily.endDateStr, '2026-05-17');
    assert.strictEqual(daily.grouping, 'hourly');

    // Monthly
    const monthly = parseDateRange('monthly', { year: 2026, month: 5 });
    assert.strictEqual(monthly.startDateStr, '2026-05-01');
    assert.strictEqual(monthly.endDateStr, '2026-05-31');
    assert.strictEqual(monthly.grouping, 'daily');
    assert(monthly.periodLabel.includes('May 2026'));

    // Yearly
    const yearly = parseDateRange('yearly', { year: 2026 });
    assert.strictEqual(yearly.startDateStr, '2026-01-01');
    assert.strictEqual(yearly.endDateStr, '2026-12-31');
    assert.strictEqual(yearly.grouping, 'monthly');

    // Custom
    const custom = parseDateRange('custom', { startDate: '2026-05-01', endDate: '2026-05-20' });
    assert.strictEqual(custom.startDateStr, '2026-05-01');
    assert.strictEqual(custom.endDateStr, '2026-05-20');
  });

  // 3. Database Aggregation & Business Calculations (May 2026 contains order O001)
  await test('Full sales report generates accurate metrics from existing PostgreSQL records', async () => {
    const report = await SalesReportService.getFullReport('monthly', { year: 2026, month: 5 });

    assert(report.summary !== undefined, 'Summary must exist');
    assert.strictEqual(typeof report.summary.totalRevenue, 'number');
    assert.strictEqual(typeof report.summary.completedOrders, 'number');
    assert.strictEqual(typeof report.summary.totalProductsSold, 'number');
    assert.strictEqual(typeof report.summary.avgOrderValue, 'number');
    assert.strictEqual(report.summary.totalDiscounts, 0);
    assert.strictEqual(report.summary.netSales, report.summary.totalRevenue);

    // Order O001 is 11,000 PKR Delivered
    assert(report.summary.totalRevenue >= 11000, 'Total revenue must reflect delivered order O001');
    assert(report.summary.completedOrders >= 1, 'Completed orders must be at least 1');
    assert(report.summary.totalProductsSold >= 1, 'Total products sold must be at least 1');

    // Product performance
    assert(Array.isArray(report.productPerformance.allProducts), 'allProducts must be an array');
    const p1 = report.productPerformance.allProducts.find(p => p.productId === 'P001');
    assert(p1 !== undefined, 'Product P001 must appear in sales');
    assert(p1.quantitySold >= 1, 'P001 quantity sold >= 1');
    assert.strictEqual(p1.totalRevenue, 11000);

    // Payment analysis
    assert(Array.isArray(report.paymentAnalysis.methods), 'payment methods must be an array');
    const cod = report.paymentAnalysis.methods.find(m => m.paymentMethod === 'Cash on Delivery');
    assert(cod !== undefined, 'Cash on Delivery payment must be recorded');

    // Profit analysis note
    assert.strictEqual(report.profitAnalysis.isAvailable, false);
    assert(report.profitAnalysis.note.includes('Cost price'));
  });

  // 4. Comparison with Previous Period handles 0 revenue safely
  await test('Comparison percentages handle zero prior revenue without NaN or Infinity', async () => {
    // A month with no previous sales (e.g. January 2025)
    const report = await SalesReportService.getFullReport('monthly', { year: 2025, month: 1 });
    const comp = report.summary.comparison;

    assert(!isNaN(comp.revenueGrowthPct), 'Growth percentage must not be NaN');
    assert(isFinite(comp.revenueGrowthPct), 'Growth percentage must not be Infinity');
    assert(!isNaN(comp.ordersGrowthPct), 'Orders growth percentage must not be NaN');
    assert(isFinite(comp.ordersGrowthPct), 'Orders growth percentage must not be Infinity');
  });

  // 5. Standalone Printable HTML Report Generation
  await test('generateHtmlReport produces valid, complete printable HTML report', async () => {
    const report = await SalesReportService.getFullReport('monthly', { year: 2026, month: 5 });
    const html = SalesReportService.generateHtmlReport(report);

    assert(html.includes('<!DOCTYPE html>'), 'Must be a full HTML document');
    assert(html.includes('FASHION JEWELLERS'), 'Must contain company name');
    assert(html.includes('SALES REPORT &amp; BUSINESS ANALYTICS') || html.includes('SALES REPORT'), 'Must contain title');
    assert(html.includes('The Laurel Collection Set'), 'Must contain product name');
    assert(html.includes('PKR 11,000'), 'Must contain formatted currency');
    assert(html.includes('@media print'), 'Must include print styling');
    assert(html.includes('window.print()'), 'Must include print trigger');
  });

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
