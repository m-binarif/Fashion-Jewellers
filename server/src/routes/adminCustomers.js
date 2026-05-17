const express = require('express');
const { CustomerService } = require('../services/customerService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Only logged-in admin users can access these customer management routes
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// GET /api/v1/admin/customers
// Fetch all customers with pagination and search filtering
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    const result = await CustomerService.getAdminCustomers({ page, pageSize, search });
    res.json({ success: true, data: result, message: 'Customers retrieved successfully' });
  } catch (err) {
    next(err); // Pass any errors to Express's global error handler
  }
});

// GET /api/v1/admin/customers/:id
// Get a specific customer's profile by their ID
router.get('/:id', async (req, res, next) => {
  try {
    const profile = await CustomerService.getProfile(req.params.id);
    res.json({ success: true, data: profile, message: 'Customer profile retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/customers/:id/status
// Enable or disable a customer account
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ success: false, data: null, message: 'isActive field is required' });
    }
    const profile = await CustomerService.updateStatus(req.params.id, isActive);
    res.json({ success: true, data: profile, message: 'Customer status updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
