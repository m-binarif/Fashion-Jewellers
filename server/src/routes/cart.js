/**
 * cart.js — Cart routes (customer only).
 */

const express = require('express');
const { CartService } = require('../services/cartService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('customer'));

router.get('/', catchAsync(async (req, res) => {
  const cart = await CartService.getCart(req.user.id);
  res.json({ success: true, data: cart, message: 'Cart retrieved successfully' });
}));

router.post('/items', catchAsync(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ success: false, data: null, message: 'Product ID is required' });
  const cart = await CartService.addItem(req.user.id, productId, quantity || 1);
  res.json({ success: true, data: cart, message: 'Item added to cart successfully' });
}));

router.patch('/items/:productId', catchAsync(async (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined) return res.status(400).json({ success: false, data: null, message: 'Quantity is required' });
  const cart = await CartService.updateQuantity(req.user.id, req.params.productId, quantity);
  res.json({ success: true, data: cart, message: 'Cart updated successfully' });
}));

router.delete('/items/:productId', catchAsync(async (req, res) => {
  const cart = await CartService.removeItem(req.user.id, req.params.productId);
  res.json({ success: true, data: cart, message: 'Item removed from cart successfully' });
}));

router.delete('/', catchAsync(async (req, res) => {
  const cart = await CartService.clearCart(req.user.id);
  res.json({ success: true, data: cart, message: 'Cart cleared successfully' });
}));

module.exports = router;
