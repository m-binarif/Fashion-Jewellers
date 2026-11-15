/**
 * social.js — Social Media Manager API Routes.
 * Implements local n8n webhook integration for automated Instagram publishing.
 *
 * Uses the simplified Post Approval table with ONLY 9 essential columns:
 * 1. approval_request_id (VARCHAR(50), PRIMARY KEY)
 * 2. product_id (VARCHAR(10), REFERENCES product)
 * 3. generated_caption (TEXT)
 * 4. enhanced_image_url (TEXT)
 * 5. approval_status (VARCHAR(30))
 * 6. posting_status (VARCHAR(30))
 * 7. created_at (TIMESTAMP)
 * 8. updated_at (TIMESTAMP)
 * 9. published_at (TIMESTAMP)
 */

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { authMiddleware, employeeRoleMiddleware } = require('../middleware/auth');
const { broadcast } = require('../utils/eventHub');

const router = express.Router();

const N8N_INSTAGRAM_WEBHOOK_URL = process.env.N8N_INSTAGRAM_WEBHOOK_URL || 'http://localhost:5678/webhook/social-media-product-post';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'YOUR_LONG_RANDOM_SECRET';

/**
 * Middleware to verify x-api-key header for incoming n8n webhook calls
 */
function verifyN8nApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.query.apiKey;
  if (!apiKey || apiKey !== N8N_WEBHOOK_SECRET) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Unauthorized: Invalid or missing x-api-key header',
    });
  }
  next();
}

// -----------------------------------------------------------------------------
// 1. GET /api/v1/social/products (and /api/social-media/products)
// Retrieves catalog products along with their latest approval record.
// -----------------------------------------------------------------------------
router.get('/products', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const query = `
      SELECT
        p.product_id AS id,
        p.product_name AS name,
        p.description,
        p.base_price AS price,
        p.quantity,
        (p.is_active = 1) AS "isActive",
        p.post_status AS "post_status",
        p.image_url AS "imageUrl",
        p.public_image_id AS "publicImageId",
        p.created_at AS "createdAt",
        c.category_name AS "categoryName",
        m.material AS "materialName",
        latest.approval_request_id AS "latestApprovalRequestId",
        latest.approval_status AS "latestApprovalStatus",
        latest.posting_status AS "latestPostingStatus",
        latest.created_at AS "latestApprovalCreatedAt",
        latest.published_at AS "latestPublishedAt"
      FROM product p
      LEFT JOIN category c ON p.category_id = c.category_id
      LEFT JOIN material m ON p.material_id = m.material_id
      LEFT JOIN LATERAL (
        SELECT approval_request_id, approval_status, posting_status, created_at, published_at
        FROM post_approval
        WHERE product_id = p.product_id
        ORDER BY created_at DESC, approval_request_id DESC
        LIMIT 1
      ) latest ON true
      ORDER BY p.created_at DESC
    `;

    const { rows } = await pool.query(query);
    res.json({ success: true, data: rows, message: 'Products for social media retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 2. POST /api/social-media/products/:productId/post
//    (also supports POST /products/:productId/post and legacy POST /trigger-post)
// Initiates the posting workflow by dispatching ONLY product_id to local n8n.
// -----------------------------------------------------------------------------
const handlePostTrigger = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const productId = req.params.productId || req.body.productId;
    if (!productId) {
      return res.status(400).json({ success: false, data: null, message: 'productId is required' });
    }

    // Atomic transaction for concurrency safety
    await client.query('BEGIN');

    // 1. Lock and verify the product record
    const prodRes = await client.query(
      `SELECT product_id, product_name, post_status
       FROM product
       WHERE product_id = $1
       FOR UPDATE`,
      [productId]
    );

    if (prodRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, data: null, message: `Product '${productId}' not found` });
    }

    const product = prodRes.rows[0];
    const postStatus = (product.post_status || '').toLowerCase().trim();

    // 2. Business Rule: post_status must be 'Pending' (never 'Published')
    if (postStatus === 'published') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        message: `Product is already Published and cannot be re-posted.`,
      });
    }

    if (postStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        message: `Only products with 'Pending' post status can be posted. Current status: '${product.post_status}'.`,
      });
    }

    // 3. Business Rule: Check latest approval attempt for this product
    const latestApprovalRes = await client.query(
      `SELECT approval_request_id, approval_status, posting_status
       FROM post_approval
       WHERE product_id = $1
       ORDER BY created_at DESC, approval_request_id DESC
       LIMIT 1
       FOR UPDATE`,
      [productId]
    );

    const latestApproval = latestApprovalRes.rows[0];
    if (latestApproval) {
      const appStatus = (latestApproval.approval_status || '').toLowerCase().trim();
      const postState = (latestApproval.posting_status || '').toLowerCase().trim();

      // Block if active workflow is in progress or already approved
      if (appStatus === 'pending' || postState === 'processing' || postState === 'awaiting approval') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          data: null,
          message: `A posting workflow is already active for this product (Approval: ${latestApproval.approval_status}, Posting: ${latestApproval.posting_status}).`,
        });
      }

      if (appStatus === 'approved' || postState === 'published') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          data: null,
          message: `This product has already been approved / published.`,
        });
      }

      // If status is 'rejected', allow new attempt! Historical record is preserved.
    }

    // 4. Generate unique approval request ID for this attempt
    const approvalRequestId = `REQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 5. Insert new persistent approval attempt record (preserving history)
    await client.query(
      `INSERT INTO post_approval (
        approval_request_id, product_id, approval_status, posting_status, created_at, updated_at
      ) VALUES ($1, $2, 'Pending', 'Processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [approvalRequestId, productId]
    );

    await client.query('COMMIT');

    // Broadcast live event to update UI immediately
    broadcast('social:post-triggered', {
      approvalRequestId,
      productId,
      status: 'Processing',
    });
    broadcast('products:changed', { action: 'updated', id: productId });

    // 6. Trigger n8n Webhook: Send ONLY product_id
    const n8nUrl = N8N_INSTAGRAM_WEBHOOK_URL;
    let n8nTriggered = false;
    let n8nError = null;

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': N8N_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          product_id: productId,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        n8nTriggered = true;
      } else {
        const text = await response.text();
        n8nError = `n8n responded with status ${response.status}: ${text.slice(0, 200)}`;
      }
    } catch (err) {
      n8nError = `Could not reach n8n webhook at ${n8nUrl} (${err.message}). Ensure n8n Docker container is running and port 5678 is published.`;
      console.warn('[n8n Webhook Warning]:', n8nError);
    }

    if (!n8nTriggered && n8nError) {
      // Record failure on the approval record
      await pool.query(
        `UPDATE post_approval
         SET posting_status = 'Failed', updated_at = CURRENT_TIMESTAMP
         WHERE approval_request_id = $1`,
        [approvalRequestId]
      );
      return res.status(502).json({
        success: false,
        data: { approvalRequestId, productId },
        message: n8nError,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        approvalRequestId,
        productId,
        n8nTriggered: true,
      },
      message: 'n8n workflow triggered successfully. The workflow is retrieving product details from PostgreSQL to generate the post and send the Gmail confirmation.',
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};

router.post('/products/:productId/post', authMiddleware, employeeRoleMiddleware('Social Media Manager'), handlePostTrigger);
router.post('/trigger-post', authMiddleware, employeeRoleMiddleware('Social Media Manager'), handlePostTrigger);

// -----------------------------------------------------------------------------
// 3. GET /api/v1/social/approvals (and /api/social-media/approvals)
// Retrieves approval records from post_approval joined with the product table.
// Product name, price, original image are dynamically retrieved from product.
// -----------------------------------------------------------------------------
router.get('/approvals', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        a.approval_request_id AS "approvalRequestId",
        a.product_id AS "productId",
        a.generated_caption AS "generatedCaption",
        a.enhanced_image_url AS "enhancedImageUrl",
        a.approval_status AS "approvalStatus",
        a.posting_status AS "postingStatus",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        a.published_at AS "publishedAt",
        p.product_name AS "productName",
        p.base_price AS "price",
        p.image_url AS "productImageUrl",
        p.post_status AS "currentPostStatus"
      FROM post_approval a
      JOIN product p ON a.product_id = p.product_id
    `;

    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      query += ` WHERE a.approval_status = $1`;
    }

    query += ` ORDER BY a.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows, message: 'Approvals retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 4. POST /api/v1/social/webhook/status-update
// Secure callback endpoint allowing n8n to notify the application of status
// changes (e.g. Gmail sent, approved, rejected, Instagram published)
// -----------------------------------------------------------------------------
router.post('/webhook/status-update', verifyN8nApiKey, async (req, res, next) => {
  try {
    const {
      approvalRequestId,
      approvalId,
      productId,
      approvalStatus,
      postingStatus,
      generatedCaption,
      enhancedImageUrl,
      generatedImageUrl,
      publishedAt,
    } = req.body;

    const targetId = approvalRequestId || approvalId;

    if (!targetId && !productId) {
      return res.status(400).json({ success: false, data: null, message: 'approvalRequestId or productId is required' });
    }

    // Determine target approval record (latest for product if approvalRequestId not supplied)
    let finalRequestId = targetId;
    if (!finalRequestId && productId) {
      const findRes = await pool.query(
        `SELECT approval_request_id FROM post_approval WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [productId]
      );
      if (findRes.rows.length > 0) {
        finalRequestId = findRes.rows[0].approval_request_id;
      }
    }

    if (!finalRequestId) {
      return res.status(404).json({ success: false, data: null, message: 'No matching approval record found' });
    }

    const enhancedImg = enhancedImageUrl || generatedImageUrl || null;

    // Update post_approval table
    await pool.query(
      `UPDATE post_approval
       SET approval_status = COALESCE($1, approval_status),
           posting_status = COALESCE($2, posting_status),
           generated_caption = COALESCE($3, generated_caption),
           enhanced_image_url = COALESCE($4, enhanced_image_url),
           published_at = CASE
             WHEN $2 IN ('Published', 'Posted') AND published_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE COALESCE($5, published_at)
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE approval_request_id = $6`,
      [
        approvalStatus || null,
        postingStatus || null,
        generatedCaption || null,
        enhancedImg,
        publishedAt || null,
        finalRequestId,
      ]
    );

    // If Instagram publishing confirmed (postingStatus == 'Published' or 'Posted'):
    // Update original product table's post_status to Published!
    if (productId && (postingStatus === 'Published' || postingStatus === 'Posted' || approvalStatus === 'Approved')) {
      await pool.query(
        `UPDATE product
         SET post_status = 'Published', updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $1`,
        [productId]
      );
      broadcast('products:changed', { action: 'updated', id: productId, postStatus: 'Published' });
    } else if (productId && approvalStatus === 'Rejected') {
      // If rejected, keep product's post_status as 'Pending'
      await pool.query(
        `UPDATE product
         SET post_status = 'Pending', updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $1`,
        [productId]
      );
      broadcast('products:changed', { action: 'updated', id: productId, postStatus: 'Pending' });
    }

    // Broadcast SSE live update
    broadcast('social:status-updated', {
      approvalRequestId: finalRequestId,
      productId,
      approvalStatus,
      postingStatus,
    });

    res.json({ success: true, message: 'Status update recorded and broadcast successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
