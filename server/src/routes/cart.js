const express = require('express');
const { CartService } = require('../services/cartService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Only logged-in customer accounts can manage their shopping carts
router.use(authMiddleware);
router.use(roleMiddleware('customer'));

// GET /api/v1/cart
// View current items inside customer's cart
router.get('/', async (req, res, next) => {
  try {
    const cart = await CartService.getCart(req.user.id);
    res.json({ success: true, data: cart, message: 'Cart retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cart/items
// Add a product or increase its quantity in the cart
router.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, data: null, message: 'Product ID is required' });
    }
    const cart = await CartService.addItem(req.user.id, productId, quantity || 1);
    res.json({ success: true, data: cart, message: 'Item added to cart successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/cart/items/:productId
// Explicitly update the quantity of a specific item in the cart
router.patch('/items/:productId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ success: false, data: null, message: 'Quantity is required' });
    }
    const cart = await CartService.updateQuantity(req.user.id, req.params.productId, quantity);
    res.json({ success: true, data: cart, message: 'Cart updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/cart/items/:productId
// Remove a specific product completely from the cart
router.delete('/items/:productId', async (req, res, next) => {
  try {
    const cart = await CartService.removeItem(req.user.id, req.params.productId);
    res.json({ success: true, data: cart, message: 'Item removed from cart successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/cart
// Clear all items inside the cart
router.delete('/', async (req, res, next) => {
  try {
    const cart = await CartService.clearCart(req.user.id);
    res.json({ success: true, data: cart, message: 'Cart cleared successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
