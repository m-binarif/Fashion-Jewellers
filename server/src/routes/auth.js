const express = require('express');
const { AuthService } = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/auth/login
// Unified user login endpoint for customers, employees, and admins
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, data: null, message: 'Email and password are required' });
    }
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result, message: 'Login successful' });
  } catch (err) {
    next(err); // Let global middleware send back the correct error message and status code
  }
});

// POST /api/v1/auth/logout
// Safe logout endpoint
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await AuthService.logout();
    res.json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/register
// Customer account self-registration
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, phone, country, address } = req.body;
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, data: null, message: 'Email, password, fullName, and phone are required' });
    }
    const result = await AuthService.register({ email, password, fullName, phone, country, address });
    res.status(201).json({ success: true, data: result, message: 'Registration successful' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
