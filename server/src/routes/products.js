/**
 * products.js — Product CRUD routes, categories, materials.
 */

const express = require('express');
const pool = require('../db/pool');
const { ProductService } = require('../services/productService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Public
router.get('/featured', catchAsync(async (req, res) => {
  const products = await ProductService.getFeatured();
  res.json({ success: true, data: products, message: 'Featured products retrieved successfully' });
}));

router.get('/new-arrivals', catchAsync(async (req, res) => {
  const products = await ProductService.getNewArrivals();
  res.json({ success: true, data: products, message: 'New arrivals retrieved successfully' });
}));

router.get('/', catchAsync(async (req, res) => {
  const { page, pageSize, categoryId, category, materialId, isActive, search, minPrice, maxPrice } = req.query;
  let isActiveFilter;
  if (isActive !== undefined && isActive !== '') isActiveFilter = isActive === 'true' || isActive === '1';
  const result = await ProductService.list({ page, pageSize, categoryId, category, materialId, isActive: isActiveFilter, search, minPrice, maxPrice });
  res.json({ success: true, data: result, message: 'Products retrieved successfully' });
}));

router.get('/:id', catchAsync(async (req, res) => {
  const product = await ProductService.getById(req.params.id);
  res.json({ success: true, data: product, message: 'Product retrieved successfully' });
}));

router.get('/:id/reviews', catchAsync(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.review_id AS id, r.rating, r.comment, r.review_date AS "reviewDate",
            r.customer_id AS "customerId", c.full_name AS "customerName"
     FROM review r
     JOIN customer c ON r.customer_id = c.customer_id
     WHERE r.product_id = $1
     ORDER BY r.review_date DESC`,
    [req.params.id]
  );
  res.json({ success: true, data: rows, message: 'Reviews retrieved successfully' });
}));

// Admin/Employee
router.post('/', authMiddleware, roleMiddleware('admin', 'employee'), catchAsync(async (req, res) => {
  const product = await ProductService.create(req.body);
  res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
}));

router.patch('/:id', authMiddleware, roleMiddleware('admin', 'employee'), catchAsync(async (req, res) => {
  const product = await ProductService.partialUpdate(req.params.id, req.body);
  res.json({ success: true, data: product, message: 'Product updated successfully' });
}));

router.delete('/:id', authMiddleware, roleMiddleware('admin', 'employee'), catchAsync(async (req, res) => {
  const product = await ProductService.softDelete(req.params.id);
  res.json({ success: true, data: product, message: 'Product deleted successfully' });
}));

module.exports = router;
