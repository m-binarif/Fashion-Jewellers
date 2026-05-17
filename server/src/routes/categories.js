const express = require('express');
const { ProductService } = require('../services/productService');

const router = express.Router();

// GET /api/v1/categories
// Fetch all product categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await ProductService.getCategories();
    res.json({ success: true, data: categories, message: 'Categories retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
