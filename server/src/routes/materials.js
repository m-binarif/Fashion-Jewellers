const express = require('express');
const { ProductService } = require('../services/productService');

const router = express.Router();

// GET /api/v1/materials
// Fetch all materials used in products (e.g. Gold, Silver, Platinum)
router.get('/', async (req, res, next) => {
  try {
    const materials = await ProductService.getMaterials();
    res.json({ success: true, data: materials, message: 'Materials retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
