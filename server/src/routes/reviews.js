const express = require('express');
const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/reviews and /api/reviews
// Save a customer review for a product
router.post('/', authMiddleware, roleMiddleware('customer'), async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const customerId = req.user.id;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    if (comment && comment.length > 300) {
      return res.status(400).json({ success: false, message: 'Comment cannot exceed 300 characters' });
    }

    // Verify if product exists
    const prodCheck = await pool.query('SELECT product_id FROM product WHERE product_id = $1', [productId]);
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Insert review
    const { rows } = await pool.query(
      `INSERT INTO review (rating, comment, customer_id, product_id, review_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING review_id AS id, rating, comment, review_date AS "reviewDate", customer_id AS "customerId"`,
      [ratingVal, comment || '', customerId, productId]
    );

    // Fetch the customer name to return alongside the review
    const custCheck = await pool.query('SELECT full_name FROM customer WHERE customer_id = $1', [customerId]);
    const customerName = custCheck.rows[0]?.full_name || 'User';

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        customerName
      },
      message: 'Review submitted successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
