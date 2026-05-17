const express = require('express');
const { SupplierService } = require('../services/supplierService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

router.get('/', catchAsync(async (req, res) => {
  const result = await SupplierService.getAdminSuppliers();
  res.json({ success: true, data: result, message: 'Suppliers retrieved successfully' });
}));

router.post('/', catchAsync(async (req, res) => {
  const supplier = await SupplierService.createSupplier(req.body);
  res.status(201).json({ success: true, data: supplier, message: 'Supplier created successfully' });
}));

router.delete('/:id', catchAsync(async (req, res) => {
  await SupplierService.deleteSupplier(req.params.id);
  res.json({ success: true, data: null, message: 'Supplier deleted successfully' });
}));

router.put('/:id', catchAsync(async (req, res) => {
  const supplier = await SupplierService.updateSupplier(req.params.id, req.body);
  res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
}));

router.patch('/:id/status', catchAsync(async (req, res) => {
  const { isActive } = req.body;
  await SupplierService.updateStatus(req.params.id, isActive);
  res.json({ success: true, data: null, message: 'Supplier status updated successfully' });
}));

module.exports = router;
