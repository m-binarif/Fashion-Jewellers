const express = require('express');
const { CustomerService } = require('../services/customerService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

router.get('/', catchAsync(async (req, res) => {
  const { page, pageSize, search } = req.query;
  const result = await CustomerService.getAdminCustomers({ page, pageSize, search });
  res.json({ success: true, data: result, message: 'Customers retrieved successfully' });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const profile = await CustomerService.getProfile(req.params.id);
  res.json({ success: true, data: profile, message: 'Customer profile retrieved successfully' });
}));

router.patch('/:id/status', catchAsync(async (req, res) => {
  const { isActive } = req.body;
  if (isActive === undefined) return res.status(400).json({ success: false, data: null, message: 'isActive field is required' });
  const profile = await CustomerService.updateStatus(req.params.id, isActive);
  res.json({ success: true, data: profile, message: 'Customer status updated successfully' });
}));

module.exports = router;
