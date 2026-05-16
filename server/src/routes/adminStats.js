const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

router.get('/', catchAsync(async (req, res) => {
  const { rows: [orders24h] } = await pool.query("SELECT COUNT(*) AS total_24h FROM orders WHERE order_date >= NOW() - INTERVAL '24 HOURS'");
  const { rows: [customers] } = await pool.query('SELECT COUNT(*) AS total FROM customer');
  const { rows: [products] } = await pool.query('SELECT COUNT(*) AS total FROM product');
  const { rows: [revenue] } = await pool.query("SELECT SUM(total_amount) AS month_revenue FROM orders WHERE order_date >= NOW() - INTERVAL '1 MONTH' AND order_status = 'Delivered'");

  res.json({
    success: true,
    data: {
      orders24h: orders24h.total_24h,
      totalCustomers: customers.total,
      totalProducts: products.total,
      monthRevenue: revenue.month_revenue || 0
    }
  });
}));

module.exports = router;
