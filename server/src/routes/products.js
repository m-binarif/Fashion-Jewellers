const express = require('express');
const pool = require('../db/pool');
const { ProductService } = require('../services/productService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/products/featured
// Public route to fetch featured items for the landing page
router.get('/featured', async (req, res, next) => {
  try {
    const products = await ProductService.getFeatured();
    res.json({ success: true, data: products, message: 'Featured products retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/new-arrivals
// Public route to fetch newly created items
router.get('/new-arrivals', async (req, res, next) => {
  try {
    const products = await ProductService.getNewArrivals();
    res.json({ success: true, data: products, message: 'New arrivals retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products
// Public route to filter, search, and list products
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, categoryId, category, materialId, isActive, search, minPrice, maxPrice } = req.query;
    let isActiveFilter;
    if (isActive !== undefined && isActive !== '') {
      isActiveFilter = isActive === 'true' || isActive === '1';
    }
    const result = await ProductService.list({ page, pageSize, categoryId, category, materialId, isActive: isActiveFilter, search, minPrice, maxPrice });
    res.json({ success: true, data: result, message: 'Products retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id
// Get a single product profile and all of its technical attributes
router.get('/:id', async (req, res, next) => {
  try {
    const product = await ProductService.getById(req.params.id);
    res.json({ success: true, data: product, message: 'Product retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id/reviews
// Retrieve customer reviews written for a specific product
router.get('/:id/reviews', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/products
// Administrative route to create a product catalog item
router.post('/', authMiddleware, roleMiddleware('admin', 'employee'), async (req, res, next) => {
  try {
    const product = await ProductService.create(req.body);
    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/products/:id
// Administrative route to modify selective attributes of a product item (e.g. price, description, images)
router.patch('/:id', authMiddleware, roleMiddleware('admin', 'employee'), async (req, res, next) => {
  try {
    const product = await ProductService.partialUpdate(req.params.id, req.body);
    res.json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/products/:id
// Administrative route to delete a product item from the catalog (soft delete)
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'employee'), async (req, res, next) => {
  try {
    const product = await ProductService.softDelete(req.params.id);
    res.json({ success: true, data: product, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
