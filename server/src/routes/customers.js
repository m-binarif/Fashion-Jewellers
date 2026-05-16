/**
 * customers.js — Customer self-service routes.
 */

const express = require('express');
const { CustomerService } = require('../services/customerService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/me', authMiddleware, roleMiddleware('customer'), catchAsync(async (req, res) => {
  const profile = await CustomerService.getProfile(req.user.id);
  res.json({ success: true, data: profile, message: 'Profile retrieved successfully' });
}));

router.patch('/me', authMiddleware, roleMiddleware('customer'), catchAsync(async (req, res) => {
  const profile = await CustomerService.updateProfile(req.user.id, req.body);
  res.json({ success: true, data: profile, message: 'Profile updated successfully' });
}));

router.post('/me/change-password', authMiddleware, roleMiddleware('customer'), catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, data: null, message: 'Current and new passwords are required' });
  await CustomerService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ success: true, data: null, message: 'Password changed successfully' });
}));

module.exports = router;
