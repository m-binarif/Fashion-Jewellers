const express = require('express');
const pool = require('../db/pool');
const { ProductService } = require('../services/productService');
const { authMiddleware, roleMiddleware, employeeRoleMiddleware } = require('../middleware/auth');
const { broadcast } = require('../utils/eventHub');
const upload = require('../middleware/upload');
const { uploadOnCloudinary, deleteFromCloudinary, deleteLocalFile } = require('../utils/cloudinary');

const router = express.Router();

// Middleware to gracefully handle multer errors with JSON responses
const handleImageUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, data: null, message: 'File size exceeds 5MB limit.' });
      }
      return res.status(err.statusCode || 400).json({ success: false, data: null, message: err.message });
    }
    next();
  });
};

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
// Administrative route to create a product catalog item (Admin or Inventory Manager only)
// Sequence: Multer temp file -> Cloudinary upload -> DB save -> Delete local temp file
router.post('/', authMiddleware, employeeRoleMiddleware('Inventory Manager'), handleImageUpload, async (req, res, next) => {
  const tempFilePath = req.file ? req.file.path : null;
  let cloudinaryResult = null;

  try {
    let imageUrl = req.body.imageUrl || null;
    let publicImageId = req.body.publicImageId || null;

    if (tempFilePath) {
      // Step 1: Upload to Cloudinary
      try {
        cloudinaryResult = await uploadOnCloudinary(tempFilePath, {
          folder: 'fashion-jewellers/products',
          cleanupOnError: true
        });
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          data: null,
          message: `Cloudinary upload failed: ${uploadErr.message}`
        });
      }

      imageUrl = cloudinaryResult.secure_url;
      publicImageId = cloudinaryResult.public_id;
    }

    // Step 2: Save to database
    let product;
    try {
      product = await ProductService.create({
        ...req.body,
        imageUrl,
        publicImageId
      });
    } catch (dbErr) {
      // Step 3 (Failure): If DB fails after successful Cloudinary upload, remove asset and delete temp file
      if (cloudinaryResult && publicImageId) {
        try {
          await deleteFromCloudinary(publicImageId);
        } catch (cleanupErr) {
          console.error('[Product Create Rollback] Failed to delete orphaned Cloudinary asset:', publicImageId, cleanupErr.message);
        }
      }
      if (tempFilePath) {
        await deleteLocalFile(tempFilePath);
      }
      return next(dbErr);
    }

    // Step 3 (Success): ONLY after DB save completes, delete temporary local file
    if (tempFilePath) {
      await deleteLocalFile(tempFilePath);
    }

    broadcast('products:changed', { action: 'created', product });
    return res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (err) {
    if (tempFilePath) {
      await deleteLocalFile(tempFilePath);
    }
    next(err);
  }
});

// PATCH /api/v1/products/:id
// Administrative route to modify selective attributes of a product item (Admin or Inventory Manager only)
// Sequence for image replacement: Multer temp file -> Cloudinary upload -> DB update -> Delete temp file -> Delete old Cloudinary asset
router.patch('/:id', authMiddleware, employeeRoleMiddleware('Inventory Manager'), handleImageUpload, async (req, res, next) => {
  const tempFilePath = req.file ? req.file.path : null;
  let newCloudinaryResult = null;

  try {
    const existingProduct = await ProductService.getById(req.params.id);
    let updatePayload = { ...req.body };

    if (tempFilePath) {
      // User is replacing the product image
      try {
        newCloudinaryResult = await uploadOnCloudinary(tempFilePath, {
          folder: 'fashion-jewellers/products',
          cleanupOnError: true
        });
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          data: null,
          message: `Failed to upload replacement image to Cloudinary: ${uploadErr.message}`
        });
      }

      updatePayload.imageUrl = newCloudinaryResult.secure_url;
      updatePayload.publicImageId = newCloudinaryResult.public_id;
    }

    // Update database record
    let updatedProduct;
    try {
      updatedProduct = await ProductService.partialUpdate(req.params.id, updatePayload);
    } catch (dbErr) {
      // If DB update fails, remove new Cloudinary asset and delete temp file
      if (newCloudinaryResult && newCloudinaryResult.public_id) {
        try {
          await deleteFromCloudinary(newCloudinaryResult.public_id);
        } catch (cleanupErr) {
          console.error('[Product Update Rollback] Failed to delete new Cloudinary asset:', newCloudinaryResult.public_id, cleanupErr.message);
        }
      }
      if (tempFilePath) {
        await deleteLocalFile(tempFilePath);
      }
      return next(dbErr);
    }

    // Database update succeeded:
    // 1. Delete the local temporary file
    if (tempFilePath) {
      await deleteLocalFile(tempFilePath);
    }

    // 2. Safely destroy the previous Cloudinary image if it changed
    if (newCloudinaryResult && existingProduct.publicImageId && existingProduct.publicImageId !== newCloudinaryResult.public_id) {
      await ProductService.deleteAssetIfUnreferenced(existingProduct.publicImageId, req.params.id);
    }

    broadcast('products:changed', { action: 'updated', product: updatedProduct });
    return res.json({ success: true, data: updatedProduct, message: 'Product updated successfully' });
  } catch (err) {
    if (tempFilePath) {
      await deleteLocalFile(tempFilePath);
    }
    next(err);
  }
});

// DELETE /api/v1/products/:id
// Administrative route to delete or deactivate a product item (Admin or Inventory Manager only)
router.delete('/:id', authMiddleware, employeeRoleMiddleware('Inventory Manager'), async (req, res, next) => {
  try {
    const existing = await ProductService.getById(req.params.id);
    const product = await ProductService.softDelete(req.params.id);

    // If permanent deletion is explicitly requested (?permanent=true)
    if (req.query.permanent === 'true') {
      await pool.query('DELETE FROM product WHERE product_id = $1', [req.params.id]);
      if (existing.publicImageId) {
        await ProductService.deleteAssetIfUnreferenced(existing.publicImageId, req.params.id);
      }
    }

    broadcast('products:changed', { action: 'deleted', id: req.params.id });
    res.json({ success: true, data: product, message: 'Product deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
