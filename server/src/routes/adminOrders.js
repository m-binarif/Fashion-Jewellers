const express = require('express');
const { OrderService } = require('../services/orderService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

router.get('/', catchAsync(async (req, res) => {
  const { page, pageSize, search, status } = req.query;
  const result = await OrderService.getAdminOrders({ page, pageSize, search, status });
  res.json({ success: true, data: result, message: 'Orders retrieved successfully' });
}));

module.exports = router;
