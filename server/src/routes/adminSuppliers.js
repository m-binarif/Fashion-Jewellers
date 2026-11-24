const express = require('express');
const { SupplierService } = require('../services/supplierService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { broadcast } = require('../utils/eventHub');

const router = express.Router();

// Only logged-in admin or employee users can manage suppliers
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'employee'));

// GET /api/v1/admin/suppliers
// Fetch all suppliers in the system
router.get('/', async (req, res, next) => {
  try {
    const result = await SupplierService.getAdminSuppliers();
    res.json({ success: true, data: result, message: 'Suppliers retrieved successfully' });
  } catch (err) {
    next(err); // Forward the error to the global Express handler
  }
});

// POST /api/v1/admin/suppliers
// Create a new supplier profile
router.post('/', async (req, res, next) => {
  try {
    const supplier = await SupplierService.createSupplier(req.body);
    broadcast('suppliers:changed', { action: 'created', supplier });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier created successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/suppliers/:id
// Remove a supplier from the database
router.delete('/:id', async (req, res, next) => {
  try {
    await SupplierService.deleteSupplier(req.params.id);
    broadcast('suppliers:changed', { action: 'deleted', id: req.params.id });
    res.json({ success: true, data: null, message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/suppliers/:id
// Fully update a supplier's information
router.put('/:id', async (req, res, next) => {
  try {
    const supplier = await SupplierService.updateSupplier(req.params.id, req.body);
    broadcast('suppliers:changed', { action: 'updated', supplier });
    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/suppliers/:id/status
// Toggle a supplier's active/inactive status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    await SupplierService.updateStatus(req.params.id, isActive);
    broadcast('suppliers:changed', { action: 'status_changed', id: req.params.id, isActive });
    res.json({ success: true, data: null, message: 'Supplier status updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
