const express = require('express');
const { OrderService } = require('../services/orderService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Only logged-in admin or employee users can manage orders
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

// GET /api/v1/admin/orders
// Fetch all customer orders with pagination, search, and status filtering
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, search, status } = req.query;
    const result = await OrderService.getAdminOrders({ page, pageSize, search, status });
    res.json({ success: true, data: result, message: 'Orders retrieved successfully' });
  } catch (err) {
    next(err); // Hand over any errors to Express's global error handler
  }
});

module.exports = router;
