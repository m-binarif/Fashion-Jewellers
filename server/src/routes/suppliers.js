/**
 * suppliers.js — Supplier self-service routes.
 */

const express = require('express');
const { SupplierService } = require('../services/supplierService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('supplier'));

router.get('/materials', catchAsync(async (req, res) => {
  const materials = await SupplierService.getMaterials(req.user.sub);
  res.json({ success: true, data: materials, message: 'Materials retrieved successfully' });
}));

router.post('/materials', catchAsync(async (req, res) => {
  const material = await SupplierService.addMaterial(req.user.sub, req.body);
  res.status(201).json({ success: true, data: material, message: 'Material added successfully' });
}));

router.patch('/materials/:id', catchAsync(async (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined) return res.status(400).json({ success: false, data: null, message: 'Quantity is required' });
  await SupplierService.updateMaterialQuantity(req.user.sub, req.params.id, quantity);
  res.json({ success: true, data: null, message: 'Material quantity updated successfully' });
}));

router.delete('/materials/:id', catchAsync(async (req, res) => {
  await SupplierService.deleteMaterial(req.user.sub, req.params.id);
  res.json({ success: true, data: null, message: 'Material deleted successfully' });
}));

router.patch('/products/:id/stock', catchAsync(async (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined) return res.status(400).json({ success: false, data: null, message: 'Quantity is required' });
  await SupplierService.updateProductStock(req.user.sub, req.params.id, quantity);
  res.json({ success: true, data: null, message: 'Product stock updated successfully' });
}));

module.exports = router;
