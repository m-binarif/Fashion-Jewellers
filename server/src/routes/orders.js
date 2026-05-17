const express = require('express');
const { OrderService } = require('../services/orderService');
const { InvoiceService } = require('../services/invoiceService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/v1/orders
// Checkout and convert shopping cart items into a formal order, generating invoice and payment record
router.post('/', roleMiddleware('customer'), async (req, res, next) => {
  try {
    const { shippingInfo, paymentMethodId } = req.body;
    if (!shippingInfo || !paymentMethodId) {
      return res.status(400).json({ success: false, data: null, message: 'shippingInfo and paymentMethodId are required' });
    }
    const order = await OrderService.checkout(req.user.id, shippingInfo, paymentMethodId);
    res.status(201).json({ success: true, data: order, message: 'Checkout successful' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders
// Fetch all orders associated with the logged-in customer
router.get('/', roleMiddleware('customer'), async (req, res, next) => {
  try {
    const orders = await OrderService.getOrdersByCustomer(req.user.id);
    res.json({ success: true, data: orders, message: 'Orders retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id
// Get details of a single order (secured so customers can only view their own orders)
router.get('/:id', async (req, res, next) => {
  try {
    const customerId = req.user.role === 'customer' ? req.user.id : null;
    const order = await OrderService.getOrderById(req.params.id, customerId);
    res.json({ success: true, data: order, message: 'Order retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id/invoice
// Generate and serve HTML invoice page for download/printing
router.get('/:id/invoice', async (req, res, next) => {
  try {
    const customerId = req.user.role === 'customer' ? req.user.id : null;
    const html = await InvoiceService.generateInvoice(req.params.id, customerId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/orders/:id/status
// Administrative route to update the status of an order (e.g. Processing, Shipped, Delivered)
router.patch('/:id/status', roleMiddleware('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, data: null, message: 'Status is required' });
    }
    const order = await OrderService.updateStatus(req.params.id, status);
    res.json({ success: true, data: order, message: 'Order status updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
