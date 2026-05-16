const express = require('express');
const { ProductService } = require('../services/productService');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/', catchAsync(async (req, res) => {
  const materials = await ProductService.getMaterials();
  res.json({ success: true, data: materials, message: 'Materials retrieved successfully' });
}));

module.exports = router;
