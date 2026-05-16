/**
 * payments.js — Admin payment routes.
 */

const express = require('express');
const { PaymentService } = require('../services/paymentService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

router.get('/', catchAsync(async (req, res) => {
  const { page, pageSize, search, status, method } = req.query;
  const result = await PaymentService.getAdminPayments({ page, pageSize, search, status, method });
  res.json({ success: true, data: result, message: 'Payments retrieved successfully' });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const payment = await PaymentService.getPaymentById(req.params.id);
  res.json({ success: true, data: payment, message: 'Payment retrieved successfully' });
}));

router.patch('/:id/status', catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, data: null, message: 'Status is required' });
  const payment = await PaymentService.updateStatus(req.params.id, status);
  res.json({ success: true, data: payment, message: 'Payment status updated successfully' });
}));

module.exports = router;
