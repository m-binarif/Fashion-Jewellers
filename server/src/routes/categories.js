const express = require('express');
const { ProductService } = require('../services/productService');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/', catchAsync(async (req, res) => {
  const categories = await ProductService.getCategories();
  res.json({ success: true, data: categories, message: 'Categories retrieved successfully' });
}));

module.exports = router;
