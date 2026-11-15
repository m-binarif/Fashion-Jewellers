/**
 * social.js — Social Media Manager API Routes.
 * Implements local n8n webhook integration for automated Instagram publishing.
 *
 * Architecture:
 * Social Media Manager -> Frontend Post Button -> Backend API -> n8n Webhook (localhost:5678)
 * Backend sends ONLY: { "product_id": productId }
 * n8n retrieves product details from PostgreSQL, enhances image, uploads to Cloudinary,
 * generates caption, and sends Gmail approval email.
 * Decision (Approve / Reject) occurs strictly inside Gmail.
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
// Retrieves catalog products along with their latest approval record
// Enables exact Post button visibility evaluation on the frontend.
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
        latest.approval_id AS "latestApprovalId",
        latest.approval_status AS "latestApprovalStatus",
        latest.posting_status AS "latestPostingStatus",
        latest.created_at AS "latestApprovalCreatedAt",
        latest.rejection_reason AS "latestRejectionReason"
      FROM product p
      LEFT JOIN category c ON p.category_id = c.category_id
      LEFT JOIN material m ON p.material_id = m.material_id
      LEFT JOIN LATERAL (
        SELECT approval_id, approval_status, posting_status, created_at, rejection_reason
        FROM post_approval
        WHERE product_id = p.product_id
        ORDER BY created_at DESC, approval_id DESC
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
      `SELECT approval_id, approval_status, posting_status
       FROM post_approval
       WHERE product_id = $1
       ORDER BY created_at DESC, approval_id DESC
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
    const approvalId = `REQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 5. Insert new persistent approval attempt record (preserving history)
    await client.query(
      `INSERT INTO post_approval (
        approval_id, product_id, employee_id, platform,
        approval_status, posting_status, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Instagram', 'Pending', 'Processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [approvalId, productId, req.user?.id || null]
    );

    await client.query('COMMIT');

    // Broadcast live event to update UI immediately
    broadcast('social:post-triggered', {
      approvalId,
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
      // Record error on the approval record
      await pool.query(
        `UPDATE post_approval
         SET error_message = $1, posting_status = 'Failed', updated_at = CURRENT_TIMESTAMP
         WHERE approval_id = $2`,
        [n8nError, approvalId]
      );
      return res.status(502).json({
        success: false,
        data: { approvalId, productId },
        message: n8nError,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        approvalId,
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
// Retrieves approval records from post_approval for the Post Confirmation page
// -----------------------------------------------------------------------------
router.get('/approvals', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        a.approval_id AS "approvalId",
        a.product_id AS "productId",
        a.employee_id AS "employeeId",
        a.workflow_execution_id AS "executionId",
        a.generated_caption AS "generatedCaption",
        a.generated_image_url AS "generatedImageUrl",
        a.platform,
        a.approval_status AS "approvalStatus",
        a.posting_status AS "postingStatus",
        a.instagram_post_id AS "instagramPostId",
        a.gmail_thread_id AS "gmailThreadId",
        a.gmail_message_id AS "gmailMessageId",
        a.gmail_link AS "gmailLink",
        a.email_sent_at AS "emailSentAt",
        a.rejection_reason AS "rejectionReason",
        a.error_message AS "errorMessage",
        a.decided_at AS "decidedAt",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        p.product_name AS "productName",
        p.base_price AS "price",
        p.image_url AS "productImageUrl",
        p.post_status AS "currentPostStatus",
        e.emp_name AS "employeeName"
      FROM post_approval a
      JOIN product p ON a.product_id = p.product_id
      LEFT JOIN employee e ON a.employee_id = e.employee_id
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
      approvalId,
      productId,
      approvalStatus,
      postingStatus,
      generatedCaption,
      generatedImageUrl,
      gmailThreadId,
      gmailMessageId,
      gmailLink,
      instagramPostId,
      rejectionReason,
      errorMessage,
      workflowExecutionId,
    } = req.body;

    if (!approvalId && !productId) {
      return res.status(400).json({ success: false, data: null, message: 'approvalId or productId is required' });
    }

    // Determine target approval record (latest for product if approvalId not supplied)
    let targetApprovalId = approvalId;
    if (!targetApprovalId && productId) {
      const findRes = await pool.query(
        `SELECT approval_id FROM post_approval WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [productId]
      );
      if (findRes.rows.length > 0) {
        targetApprovalId = findRes.rows[0].approval_id;
      }
    }

    if (!targetApprovalId) {
      return res.status(404).json({ success: false, data: null, message: 'No matching approval record found' });
    }

    // Construct Gmail link from thread ID if not explicitly provided
    let computedGmailLink = gmailLink;
    if (!computedGmailLink && gmailThreadId) {
      computedGmailLink = `https://mail.google.com/mail/u/0/#all/${gmailThreadId}`;
    }

    // Update post_approval table
    await pool.query(
      `UPDATE post_approval
       SET approval_status = COALESCE($1, approval_status),
           posting_status = COALESCE($2, posting_status),
           generated_caption = COALESCE($3, generated_caption),
           generated_image_url = COALESCE($4, generated_image_url),
           gmail_thread_id = COALESCE($5, gmail_thread_id),
           gmail_message_id = COALESCE($6, gmail_message_id),
           gmail_link = COALESCE($7, gmail_link),
           instagram_post_id = COALESCE($8, instagram_post_id),
           rejection_reason = COALESCE($9, rejection_reason),
           error_message = COALESCE($10, error_message),
           workflow_execution_id = COALESCE($11, workflow_execution_id),
           email_sent_at = CASE WHEN $5 IS NOT NULL AND email_sent_at IS NULL THEN CURRENT_TIMESTAMP ELSE email_sent_at END,
           decided_at = CASE WHEN $1 IN ('Approved', 'Rejected') AND decided_at IS NULL THEN CURRENT_TIMESTAMP ELSE decided_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE approval_id = $12`,
      [
        approvalStatus || null,
        postingStatus || null,
        generatedCaption || null,
        generatedImageUrl || null,
        gmailThreadId || null,
        gmailMessageId || null,
        computedGmailLink || null,
        instagramPostId || null,
        rejectionReason || null,
        errorMessage || null,
        workflowExecutionId || null,
        targetApprovalId,
      ]
    );

    // If Instagram publishing confirmed (postingStatus == 'Published' or 'Posted'):
    // Update original product table's post_status to Published!
    if (productId && (postingStatus === 'Published' || postingStatus === 'Posted' || approvalStatus === 'Approved' && instagramPostId)) {
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
      approvalId: targetApprovalId,
      productId,
      approvalStatus,
      postingStatus,
      instagramPostId,
    });

    res.json({ success: true, message: 'Status update recorded and broadcast successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
