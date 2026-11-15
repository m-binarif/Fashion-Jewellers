/**
 * social.js — Social Media Manager API Routes.
 * Implements local n8n webhook integration for automated Instagram publishing.
 *
 * ARCHITECTURAL RULE:
 * - The backend is responsible ONLY for authentication, authorization, read operations,
 *   eligibility validation, and triggering the n8n webhook with { "product_id": productId }.
 * - The backend NEVER performs INSERT, UPDATE, or DELETE on post_approval.
 * - The backend NEVER updates product.post_status for Instagram posting.
 * - n8n is the SOLE system responsible for creating and updating post_approval records,
 *   and updating product.post_status to 'published' after successful Instagram publishing.
 */

const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, employeeRoleMiddleware } = require('../middleware/auth');
const { broadcast } = require('../utils/eventHub');

const router = express.Router();

const N8N_INSTAGRAM_WEBHOOK_URL = process.env.N8N_INSTAGRAM_WEBHOOK_URL || 'http://localhost:5678/webhook/social-media-product-post';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'YOUR_LONG_RANDOM_SECRET';

/**
 * Standard status normalizer: trims and converts to lowercase.
 */
const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

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
        LOWER(TRIM(p.post_status)) AS "post_status",
        p.image_url AS "imageUrl",
        p.public_image_id AS "publicImageId",
        p.created_at AS "createdAt",
        c.category_name AS "categoryName",
        m.material AS "materialName",
        latest.approval_request_id AS "latestApprovalRequestId",
        LOWER(TRIM(latest.approval_status)) AS "latestApprovalStatus",
        LOWER(TRIM(latest.posting_status)) AS "latestPostingStatus",
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
// The backend NEVER writes to post_approval or updates product.post_status here.
// -----------------------------------------------------------------------------
const handlePostTrigger = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const productId = req.params.productId || req.body.productId;
    if (!productId) {
      return res.status(400).json({ success: false, data: null, message: 'productId is required' });
    }

    // Atomic transaction for concurrency safety and eligibility validation
    await client.query('BEGIN');

    // 1. Lock and verify the product record
    const prodRes = await client.query(
      `SELECT product_id, product_name, post_status, image_url
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
    const postStatus = normalizeStatus(product.post_status);

    // 2. Business Rule: product has a valid original image URL
    if (!product.image_url || !product.image_url.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Product does not have a valid original image URL to post.',
      });
    }

    // 3. Business Rule: post_status must be 'pending' (never 'published')
    if (postStatus === 'published') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Product is already published and cannot be re-posted.',
      });
    }

    if (postStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        message: `Only products with 'pending' post status can be posted. Current status: '${product.post_status}'.`,
      });
    }

    // 4. Business Rule: Check latest approval attempt for this product
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
      const appStatus = normalizeStatus(latestApproval.approval_status);
      const postState = normalizeStatus(latestApproval.posting_status);

      // Block if active workflow is in progress or already approved/publishing
      if (
        appStatus === 'pending' ||
        postState === 'processing' ||
        postState === 'awaiting approval' ||
        postState === 'publishing'
      ) {
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
          message: 'This product has already been approved / published.',
        });
      }

      // If status is 'rejected' or 'failed', allow new attempt!
    }

    // Release database lock — NO backend writes to post_approval or product table!
    await client.query('COMMIT');

    // 5. Trigger n8n Webhook: Send ONLY product_id
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
      return res.status(502).json({
        success: false,
        data: { productId },
        message: n8nError,
      });
    }

    // Broadcast event that post trigger was sent so frontend can refresh/poll
    broadcast('social:post-triggered', {
      productId,
      status: 'processing',
    });

    res.status(200).json({
      success: true,
      data: {
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
        LOWER(TRIM(a.approval_status)) AS "approvalStatus",
        LOWER(TRIM(a.posting_status)) AS "postingStatus",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        a.published_at AS "publishedAt",
        p.product_name AS "productName",
        p.base_price AS "price",
        p.image_url AS "productImageUrl",
        LOWER(TRIM(p.post_status)) AS "currentPostStatus"
      FROM post_approval a
      JOIN product p ON a.product_id = p.product_id
    `;

    const params = [];
    if (status && status !== 'all') {
      params.push(normalizeStatus(status));
      query += ` WHERE LOWER(TRIM(a.approval_status)) = $1`;
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
// Optional notification callback from n8n to broadcast real-time SSE updates.
// The backend NEVER writes to post_approval or product from here. n8n directly
// executes SQL UPDATE on post_approval and product in PostgreSQL.
// This endpoint only broadcasts real-time SSE events to connected browsers.
// -----------------------------------------------------------------------------
router.post('/webhook/status-update', verifyN8nApiKey, async (req, res, next) => {
  try {
    const {
      approvalRequestId,
      approvalId,
      productId,
      approvalStatus,
      postingStatus,
    } = req.body;

    const finalRequestId = approvalRequestId || approvalId;
    const normApproval = approvalStatus ? normalizeStatus(approvalStatus) : undefined;
    const normPosting = postingStatus ? normalizeStatus(postingStatus) : undefined;

    // Broadcast SSE live update to connected clients
    broadcast('social:status-updated', {
      approvalRequestId: finalRequestId,
      productId,
      approvalStatus: normApproval,
      postingStatus: normPosting,
    });

    if (productId) {
      broadcast('products:changed', { action: 'updated', id: productId });
    }

    res.json({
      success: true,
      message: 'SSE status update broadcast successfully (database was updated directly by n8n)',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
