/**
 * social.js — Social Media Manager API Routes.
 * Integrates with n8n workflow for automated Instagram post generation,
 * Gmail confirmation emails, approval / rejection actions, and real-time updates.
 */

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { authMiddleware, employeeRoleMiddleware } = require('../middleware/auth');
const { broadcast } = require('../utils/eventHub');
const AppError = require('../utils/AppError');

const router = express.Router();

const N8N_POST_WEBHOOK_URL = process.env.N8N_POST_WEBHOOK_URL || 'http://localhost:5678/webhook/generate-instagram-post';
const N8N_RESUME_WEBHOOK_URL = process.env.N8N_RESUME_WEBHOOK_URL || 'http://localhost:5678/webhook/resume-instagram-approval';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'n8n_sec_luxe_jewels_workflow_2024';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

/**
 * Helper to verify webhook secret from incoming n8n calls
 */
function verifyN8nWebhook(req, res, next) {
  const secretHeader = req.headers['x-webhook-secret'] || req.headers['X-Webhook-Secret'];
  const secretQuery = req.query.secret;
  const provided = secretHeader || secretQuery;

  if (!provided || provided !== N8N_WEBHOOK_SECRET) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Unauthorized: Invalid or missing n8n webhook secret',
    });
  }
  next();
}

// -----------------------------------------------------------------------------
// 1. POST /api/v1/social/trigger-post
// Initiates Instagram post generation in n8n for a product with Pending post_status
// -----------------------------------------------------------------------------
router.post('/trigger-post', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, data: null, message: 'productId is required' });
    }

    // 1. Verify product exists
    const prodRes = await pool.query(
      `SELECT p.product_id, p.product_name, p.description, p.base_price, p.quantity,
              p.is_active, p.post_status, p.image_url, c.category_name AS category, m.material
       FROM product p
       LEFT JOIN category c ON p.category_id = c.category_id
       LEFT JOIN material m ON p.material_id = m.material_id
       WHERE p.product_id = $1`,
      [productId]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Product not found' });
    }

    const product = prodRes.rows[0];

    // 2. Verify post_status is Pending
    const currentPostStatus = (product.post_status || '').toLowerCase().trim();
    if (currentPostStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Product cannot be posted. Current post status is '${product.post_status}'. Only products with 'Pending' status can be posted.`,
      });
    }

    // 3. Prevent duplicate concurrent executions
    const existingApproval = await pool.query(
      `SELECT approval_id, approval_status, posting_status
       FROM post_approval
       WHERE product_id = $1 AND approval_status = 'Pending' AND posting_status IN ('Processing', 'Awaiting Approval')`,
      [productId]
    );

    if (existingApproval.rows.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'A post generation or approval workflow is already in progress for this product.',
      });
    }

    // 4. Generate unique IDs and decision token
    const approvalId = `APV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const decisionToken = crypto.randomBytes(24).toString('hex');

    // 5. Create persistent approval record
    await pool.query(
      `INSERT INTO post_approval (
        approval_id, product_id, employee_id, platform,
        approval_status, posting_status, decision_token
      ) VALUES ($1, $2, $3, 'Instagram', 'Pending', 'Processing', $4)`,
      [approvalId, productId, req.user.id, decisionToken]
    );

    // 6. Update product post_status to Processing
    await pool.query(
      `UPDATE product SET post_status = 'Processing', updated_at = CURRENT_TIMESTAMP WHERE product_id = $1`,
      [productId]
    );

    // Broadcast real-time status update to all connected sessions
    broadcast('products:changed', { action: 'updated', id: productId, postStatus: 'Processing' });
    broadcast('social:post-triggered', { approvalId, productId, status: 'Processing' });

    // 7. Dispatch payload to n8n Webhook
    const imageUrl = product.image_url
      ? (product.image_url.startsWith('http') ? product.image_url : `${APP_BASE_URL}${product.image_url}`)
      : '';

    const n8nPayload = {
      requestId: approvalId,
      approvalId: approvalId,
      productId: product.product_id,
      productName: product.product_name,
      description: product.description || '',
      basePrice: product.base_price,
      category: product.category || 'Jewellery',
      material: product.material || 'Standard',
      imageUrl: imageUrl,
      employeeId: req.user.id,
      employeeName: req.user.name || 'Social Media Manager',
      decisionToken: decisionToken,
      callbackUrl: `${APP_BASE_URL}/api/v1/social/approval-request`,
      publishResultUrl: `${APP_BASE_URL}/api/v1/social/publish-result`,
      emailDecisionUrl: `${APP_BASE_URL}/api/v1/social/email-decision`,
    };

    let n8nTriggered = false;
    let n8nError = null;

    try {
      const response = await fetch(N8N_POST_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': N8N_WEBHOOK_SECRET,
        },
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        n8nTriggered = true;
      } else {
        const errorText = await response.text();
        n8nError = `n8n responded with status ${response.status}: ${errorText.slice(0, 200)}`;
      }
    } catch (err) {
      n8nError = `Could not reach n8n webhook at ${N8N_POST_WEBHOOK_URL}: ${err.message}`;
      console.warn('n8n Webhook dispatch warning:', n8nError);
    }

    if (!n8nTriggered && n8nError) {
      // Record error on approval request
      await pool.query(
        `UPDATE post_approval SET error_message = $1 WHERE approval_id = $2`,
        [n8nError, approvalId]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        approvalId,
        productId,
        n8nTriggered,
        note: n8nTriggered
          ? 'n8n workflow triggered successfully. Generating Instagram post and Gmail confirmation.'
          : `Workflow request registered. (n8n connection note: ${n8nError})`,
      },
      message: 'Post generation initiated successfully',
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 2. POST /api/v1/social/approval-request
// Webhook endpoint called by n8n after it generates the caption & post image
// -----------------------------------------------------------------------------
router.post('/approval-request', verifyN8nWebhook, async (req, res, next) => {
  try {
    const {
      approvalId,
      productId,
      executionId,
      resumeUrl,
      generatedCaption,
      generatedImageUrl,
      platform,
    } = req.body;

    if (!approvalId || !productId) {
      return res.status(400).json({ success: false, data: null, message: 'approvalId and productId are required' });
    }

    // Update approval record with generated content
    const result = await pool.query(
      `UPDATE post_approval
       SET workflow_execution_id = COALESCE($1, workflow_execution_id),
           resume_url = COALESCE($2, resume_url),
           generated_caption = COALESCE($3, generated_caption),
           generated_image_url = COALESCE($4, generated_image_url),
           platform = COALESCE($5, platform, 'Instagram'),
           posting_status = 'Awaiting Approval',
           approval_status = 'Pending',
           updated_at = CURRENT_TIMESTAMP
       WHERE approval_id = $6
       RETURNING *`,
      [executionId, resumeUrl, generatedCaption, generatedImageUrl, platform, approvalId]
    );

    if (result.rowCount === 0) {
      // If approval record was not pre-created, insert it
      await pool.query(
        `INSERT INTO post_approval (
          approval_id, product_id, workflow_execution_id, resume_url,
          generated_caption, generated_image_url, platform,
          approval_status, posting_status
        ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Instagram'), 'Pending', 'Awaiting Approval')`,
        [approvalId, productId, executionId, resumeUrl, generatedCaption, generatedImageUrl, platform]
      );
    }

    // Update product post_status
    await pool.query(
      `UPDATE product SET post_status = 'Awaiting Approval', updated_at = CURRENT_TIMESTAMP WHERE product_id = $1`,
      [productId]
    );

    // Broadcast live event to update dashboard Post Confirmation page immediately
    broadcast('social:approval-created', {
      approvalId,
      productId,
      generatedCaption,
      generatedImageUrl,
      postingStatus: 'Awaiting Approval',
    });
    broadcast('products:changed', { action: 'updated', id: productId, postStatus: 'Awaiting Approval' });

    res.status(200).json({
      success: true,
      data: { approvalId, productId, status: 'Awaiting Approval' },
      message: 'Generated post details saved. Awaiting employee approval.',
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/social/approvals
// Retrieves list of post approval requests for the Post Confirmation page
// -----------------------------------------------------------------------------
router.get('/approvals', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT a.approval_id AS "approvalId",
             a.product_id AS "productId",
             a.employee_id AS "employeeId",
             a.workflow_execution_id AS "executionId",
             a.resume_url AS "resumeUrl",
             a.generated_caption AS "generatedCaption",
             a.generated_image_url AS "generatedImageUrl",
             a.platform,
             a.approval_status AS "approvalStatus",
             a.posting_status AS "postingStatus",
             a.instagram_post_id AS "instagramPostId",
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
// 4. POST /api/v1/social/approvals/:id/decision
// Handles Approve / Reject decision made from the Dashboard
// -----------------------------------------------------------------------------
router.post('/approvals/:id/decision', authMiddleware, employeeRoleMiddleware('Social Media Manager'), async (req, res, next) => {
  try {
    const approvalId = req.params.id;
    const { decision, reason } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, data: null, message: "decision must be 'approve' or 'reject'" });
    }

    // Look up approval request
    const { rows } = await pool.query(
      `SELECT * FROM post_approval WHERE approval_id = $1`,
      [approvalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Approval request not found' });
    }

    const approval = rows[0];

    if (approval.approval_status !== 'Pending') {
      return res.status(400).json({
        success: false,
        data: null,
        message: `This post has already been decided (${approval.approval_status}).`,
      });
    }

    // Process decision
    const result = await processDecision({
      approval,
      decision,
      reason,
      decidedBy: req.user.name || 'Social Media Manager',
    });

    res.json({
      success: true,
      data: result,
      message: decision === 'approve'
        ? 'Approval confirmed. n8n workflow resumed for Instagram publishing.'
        : 'Post rejected. Instagram publishing cancelled.',
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 5. POST /api/v1/social/publish-result
// Callback endpoint called by n8n after it finishes Instagram publishing
// -----------------------------------------------------------------------------
router.post('/publish-result', verifyN8nWebhook, async (req, res, next) => {
  try {
    const {
      approvalId,
      productId,
      success,
      instagramPostId,
      errorMessage,
    } = req.body;

    if (!approvalId) {
      return res.status(400).json({ success: false, data: null, message: 'approvalId is required' });
    }

    if (success) {
      // Mark as Approved and Posted
      await pool.query(
        `UPDATE post_approval
         SET approval_status = 'Approved',
             posting_status = 'Posted',
             instagram_post_id = $1,
             decided_at = COALESCE(decided_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE approval_id = $2`,
        [instagramPostId || null, approvalId]
      );

      if (productId) {
        await pool.query(
          `UPDATE product SET post_status = 'Posted', updated_at = CURRENT_TIMESTAMP WHERE product_id = $1`,
          [productId]
        );
      }
    } else {
      // Publishing failed
      await pool.query(
        `UPDATE post_approval
         SET posting_status = 'Failed',
             error_message = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE approval_id = $2`,
        [errorMessage || 'Instagram publishing failed in n8n', approvalId]
      );

      if (productId) {
        await pool.query(
          `UPDATE product SET post_status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE product_id = $1`,
          [productId]
        );
      }
    }

    broadcast('social:status-updated', {
      approvalId,
      productId,
      status: success ? 'Posted' : 'Failed',
      instagramPostId,
    });
    if (productId) {
      broadcast('products:changed', { action: 'updated', id: productId, postStatus: success ? 'Posted' : 'Failed' });
    }

    res.json({ success: true, message: 'Instagram publication result recorded successfully' });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 6. GET /api/v1/social/email-decision
// One-click approval / rejection directly from Gmail confirmation emails
// -----------------------------------------------------------------------------
router.get('/email-decision', async (req, res) => {
  const { token, decision } = req.query;

  if (!token || !['approve', 'reject'].includes(decision)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Invalid Request</title><style>body{font-family:sans-serif;padding:3rem;text-align:center;background:#18181b;color:#f4f4f5}</style></head>
      <body>
        <h2>⚠️ Invalid Decision Link</h2>
        <p>The approval token or decision parameter is invalid or missing.</p>
      </body>
      </html>
    `);
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM post_approval WHERE decision_token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Request Not Found</title><style>body{font-family:sans-serif;padding:3rem;text-align:center;background:#18181b;color:#f4f4f5}</style></head>
        <body>
          <h2>❌ Approval Request Not Found</h2>
          <p>This approval link is invalid or has expired.</p>
        </body>
        </html>
      `);
    }

    const approval = rows[0];

    if (approval.approval_status !== 'Pending') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Already Decided</title><style>body{font-family:sans-serif;padding:3rem;text-align:center;background:#18181b;color:#f4f4f5}</style></head>
        <body>
          <h2>ℹ️ Already Processed</h2>
          <p>This post has already been <strong>${approval.approval_status}</strong> on ${new Date(approval.decided_at || approval.updated_at).toLocaleString()}.</p>
        </body>
        </html>
      `);
    }

    // Process decision
    await processDecision({
      approval,
      decision,
      decidedBy: 'Gmail Email Approver',
    });

    const isApprove = decision === 'approve';

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Recorded</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; border-radius: 12px; padding: 2.5rem; max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 700; font-size: 0.9rem; margin-bottom: 1rem; }
          .approved { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
          .rejected { background: rgba(239, 68, 68, 0.2); color: #f87171; }
          h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
          .meta { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #334155; font-size: 0.8rem; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge ${isApprove ? 'approved' : 'rejected'}">
            ${isApprove ? '✓ APPROVED' : '✕ REJECTED'}
          </div>
          <h1>${isApprove ? 'Instagram Post Approved!' : 'Instagram Post Rejected'}</h1>
          <p>
            ${isApprove
              ? 'Your approval has been communicated to the n8n workflow. The post is being published to Instagram.'
              : 'The post generation workflow has been terminated without publishing to Instagram.'}
          </p>
          <div class="meta">
            Request ID: ${approval.approval_id} | Product: ${approval.product_id}<br>
            FASHION JEWELLERS Automated Social Publishing
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`Server error: ${err.message}`);
  }
});

/**
 * Shared logic for handling Approve / Reject across Dashboard & Gmail
 */
async function processDecision({ approval, decision, reason, decidedBy }) {
  const isApprove = decision === 'approve';
  const newApprovalStatus = isApprove ? 'Approved' : 'Rejected';
  const newPostingStatus = isApprove ? 'Processing' : 'Rejected';
  const newProductStatus = isApprove ? 'Processing' : 'Rejected';

  // 1. Update database approval record
  await pool.query(
    `UPDATE post_approval
     SET approval_status = $1,
         posting_status = $2,
         decided_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE approval_id = $3`,
    [newApprovalStatus, newPostingStatus, approval.approval_id]
  );

  // 2. Update product post_status
  await pool.query(
    `UPDATE product SET post_status = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2`,
    [newProductStatus, approval.product_id]
  );

  // 3. Broadcast real-time event immediately
  broadcast('social:status-updated', {
    approvalId: approval.approval_id,
    productId: approval.product_id,
    approvalStatus: newApprovalStatus,
    postingStatus: newPostingStatus,
  });
  broadcast('products:changed', {
    action: 'updated',
    id: approval.product_id,
    postStatus: newProductStatus,
  });

  // 4. Resume paused n8n workflow (Wait node webhook callback)
  const resumeUrl = approval.resume_url || N8N_RESUME_WEBHOOK_URL;
  let resumeSucceeded = false;
  let resumeError = null;

  try {
    const resumeResponse = await fetch(resumeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        approvalId: approval.approval_id,
        productId: approval.product_id,
        decision,
        reason: reason || '',
        decidedBy,
        decidedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (resumeResponse.ok) {
      resumeSucceeded = true;
      // If n8n returns Instagram post ID synchronously:
      try {
        const json = await resumeResponse.json();
        if (json.instagramPostId) {
          await pool.query(
            `UPDATE post_approval SET instagram_post_id = $1, posting_status = 'Posted' WHERE approval_id = $2`,
            [json.instagramPostId, approval.approval_id]
          );
          await pool.query(
            `UPDATE product SET post_status = 'Posted' WHERE product_id = $1`,
            [approval.product_id]
          );
          broadcast('social:status-updated', {
            approvalId: approval.approval_id,
            productId: approval.product_id,
            postingStatus: 'Posted',
            instagramPostId: json.instagramPostId,
          });
          broadcast('products:changed', { action: 'updated', id: approval.product_id, postStatus: 'Posted' });
        }
      } catch (_) {}
    } else {
      resumeError = `n8n resume returned status ${resumeResponse.status}`;
    }
  } catch (err) {
    resumeError = `Could not reach n8n resume webhook: ${err.message}`;
    console.warn('n8n resume dispatch warning:', resumeError);
  }

  return {
    approvalId: approval.approval_id,
    decision,
    newApprovalStatus,
    resumeSucceeded,
    resumeError,
  };
}

module.exports = router;
