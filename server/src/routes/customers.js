const express = require('express');
const { CustomerService } = require('../services/customerService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/customers/me
// Get logged-in customer's own profile info
router.get('/me', authMiddleware, roleMiddleware('customer'), async (req, res, next) => {
  try {
    const profile = await CustomerService.getProfile(req.user.id);
    res.json({ success: true, data: profile, message: 'Profile retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/customers/me
// Update logged-in customer's own profile details
router.patch('/me', authMiddleware, roleMiddleware('customer'), async (req, res, next) => {
  try {
    const profile = await CustomerService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/customers/me/change-password
// Change logged-in customer's password
router.post('/me/change-password', authMiddleware, roleMiddleware('customer'), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, data: null, message: 'Current and new passwords are required' });
    }
    await CustomerService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, data: null, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
