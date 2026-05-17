const express = require('express');
const { PaymentService } = require('../services/paymentService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

// GET /api/v1/admin/payments
// Fetch all customer payments with search, pagination, and filter parameters (such as status or method)
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, search, status, method } = req.query;
    const result = await PaymentService.getAdminPayments({ page, pageSize, search, status, method });
    res.json({ success: true, data: result, message: 'Payments retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/payments/:id
// Get a specific payment record's details
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await PaymentService.getPaymentById(req.params.id);
    res.json({ success: true, data: payment, message: 'Payment retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/payments/:id/status
// Update a payment's status (such as Pending, Completed, Refunded)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, data: null, message: 'Status is required' });
    }
    const payment = await PaymentService.updateStatus(req.params.id, status);
    res.json({ success: true, data: payment, message: 'Payment status updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
