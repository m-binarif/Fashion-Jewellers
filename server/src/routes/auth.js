/**
 * auth.js — POST /login, POST /logout, POST /register
 */

const express = require('express');
const { AuthService } = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.post('/login', catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, data: null, message: 'Email and password are required' });
  const result = await AuthService.login(email, password);
  res.json({ success: true, data: result, message: 'Login successful' });
}));

router.post('/logout', authMiddleware, catchAsync(async (req, res, next) => {
  await AuthService.logout();
  res.json({ success: true, data: null, message: 'Logged out successfully' });
}));

router.post('/register', catchAsync(async (req, res, next) => {
  const { email, password, fullName, phone, country, address } = req.body;
  if (!email || !password || !fullName || !phone) return res.status(400).json({ success: false, data: null, message: 'Email, password, fullName, and phone are required' });
  const result = await AuthService.register({ email, password, fullName, phone, country, address });
  res.status(201).json({ success: true, data: result, message: 'Registration successful' });
}));

module.exports = router;
