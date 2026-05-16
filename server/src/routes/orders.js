/**
 * orders.js — Customer order routes + invoice download.
 */

const express = require('express');
const { OrderService } = require('../services/orderService');
const { InvoiceService } = require('../services/invoiceService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);

router.post('/', roleMiddleware('customer'), catchAsync(async (req, res) => {
  const { shippingInfo, paymentMethodId } = req.body;
  if (!shippingInfo || !paymentMethodId) return res.status(400).json({ success: false, data: null, message: 'shippingInfo and paymentMethodId are required' });
  const order = await OrderService.checkout(req.user.id, shippingInfo, paymentMethodId);
  res.status(201).json({ success: true, data: order, message: 'Checkout successful' });
}));

router.get('/', roleMiddleware('customer'), catchAsync(async (req, res) => {
  const orders = await OrderService.getOrdersByCustomer(req.user.id);
  res.json({ success: true, data: orders, message: 'Orders retrieved successfully' });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const customerId = req.user.role === 'customer' ? req.user.id : null;
  const order = await OrderService.getOrderById(req.params.id, customerId);
  res.json({ success: true, data: order, message: 'Order retrieved successfully' });
}));

router.get('/:id/invoice', catchAsync(async (req, res) => {
  const customerId = req.user.role === 'customer' ? req.user.id : null;
  const html = await InvoiceService.generateInvoice(req.params.id, customerId);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

router.patch('/:id/status', roleMiddleware('admin'), catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, data: null, message: 'Status is required' });
  const order = await OrderService.updateStatus(req.params.id, status);
  res.json({ success: true, data: order, message: 'Order status updated successfully' });
}));

module.exports = router;
