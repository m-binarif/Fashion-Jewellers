const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Only logged-in admin or employee users can view statistics
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

// GET /api/v1/admin/stats
// Returns key dashboard figures: orders in the last 24h, customer counts, product counts, and recent month revenue
router.get('/', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err); // Send database errors or other failures to the global error middleware
  }
});

module.exports = router;
