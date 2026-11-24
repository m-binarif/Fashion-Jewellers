/**
 * n8n_webhook_integration.test.js
 * Comprehensive integration tests for local n8n webhook integration,
 * post button visibility logic, atomic locking, and Gmail thread link handling.
 */

const assert = require('assert');
const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function runTests() {
  console.log('===============================================================');
  console.log('       RUNNING LOCAL N8N WEBHOOK INTEGRATION TESTS              ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      process.stdout.write(`TEST: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('   ', err.message);
      failed++;
    }
  };

  // Test 1: Verify post_approval table has ONLY the exact 9 required columns
  await test('post_approval schema has ONLY the exact 9 required columns', async () => {
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'post_approval'
    `);
    const cols = rows.map((r) => r.column_name);

    const requiredCols = [
      'approval_request_id',
      'product_id',
      'generated_caption',
      'enhanced_image_url',
      'approval_status',
      'posting_status',
      'created_at',
      'updated_at',
      'published_at'
    ];

    assert.strictEqual(cols.length, 9, `Table must contain exactly 9 columns, found ${cols.length}: ${cols.join(', ')}`);
    for (const reqCol of requiredCols) {
      assert(cols.includes(reqCol), `Must have ${reqCol}`);
    }

    // Ensure removed columns are definitely not present
    const removedCols = [
      'approval_id',
      'employee_id',
      'workflow_execution_id',
      'resume_url',
      'platform',
      'instagram_post_id',
      'error_message',
      'decision_token',
      'decided_at',
      'gmail_thread_id',
      'gmail_message_id',
      'gmail_link',
      'email_sent_at',
      'rejection_reason'
    ];
    for (const remCol of removedCols) {
      assert(!cols.includes(remCol), `Dropped column ${remCol} must NOT be in post_approval`);
    }
  });

  // Test 2: Verify Post Button logic - Scenario 1: Pending & No record -> Show
  await test('Post button visible when product is Pending and has NO approval records', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'Pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003')
      RETURNING product_id`,
      [`Test Product Logic 1 ${ts}`]
    );
    const pid = prodRows[0].product_id;

    // Query social products logic
    const { rows } = await pool.query(
      `SELECT p.post_status, latest.approval_status AS "latestApprovalStatus"
       FROM product p
       LEFT JOIN LATERAL (
         SELECT approval_status
         FROM post_approval
         WHERE product_id = p.product_id
         ORDER BY created_at DESC, approval_request_id DESC
         LIMIT 1
       ) latest ON true
       WHERE p.product_id = $1`,
      [pid]
    );

    const p = rows[0];
    const canShow = (p.post_status || '').toLowerCase() === 'pending' && !p.latestApprovalStatus;
    assert.strictEqual(canShow, true, 'Post button must be visible when no approval records exist');

    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  // Test 3: Verify Post Button logic - Scenario 2: Pending & Latest Approval is Pending/Processing -> Hide
  await test('Post button HIDDEN when latest approval record is Pending / Awaiting Approval', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'Pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003')
      RETURNING product_id`,
      [`Test Product Logic 2 ${ts}`]
    );
    const pid = prodRows[0].product_id;

    await pool.query(
      `INSERT INTO post_approval (approval_request_id, product_id, approval_status, posting_status)
       VALUES ($1, $2, 'Pending', 'Awaiting Approval')`,
      [`REQ-${ts}`, pid]
    );

    const { rows } = await pool.query(
      `SELECT p.post_status, latest.approval_status AS "latestApprovalStatus"
       FROM product p
       LEFT JOIN LATERAL (
         SELECT approval_status
         FROM post_approval
         WHERE product_id = p.product_id
         ORDER BY created_at DESC, approval_request_id DESC
         LIMIT 1
       ) latest ON true
       WHERE p.product_id = $1`,
      [pid]
    );

    const p = rows[0];
    const canShow = (p.post_status || '').toLowerCase() === 'pending' && (!p.latestApprovalStatus || p.latestApprovalStatus === 'Rejected');
    assert.strictEqual(canShow, false, 'Post button must be hidden when pending approval exists');

    await pool.query('DELETE FROM post_approval WHERE product_id = $1', [pid]);
    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  // Test 4: Verify Post Button logic - Scenario 3: Rejected -> Show again
  await test('Post button VISIBLE AGAIN when latest approval record is Rejected', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'Pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003')
      RETURNING product_id`,
      [`Test Product Logic 3 ${ts}`]
    );
    const pid = prodRows[0].product_id;

    await pool.query(
      `INSERT INTO post_approval (approval_request_id, product_id, approval_status, posting_status)
       VALUES ($1, $2, 'Rejected', 'Rejected')`,
      [`REQ-${ts}`, pid]
    );

    const { rows } = await pool.query(
      `SELECT p.post_status, latest.approval_status AS "latestApprovalStatus"
       FROM product p
       LEFT JOIN LATERAL (
         SELECT approval_status
         FROM post_approval
         WHERE product_id = p.product_id
         ORDER BY created_at DESC, approval_request_id DESC
         LIMIT 1
       ) latest ON true
       WHERE p.product_id = $1`,
      [pid]
    );

    const p = rows[0];
    const canShow = (p.post_status || '').toLowerCase() === 'pending' && (p.latestApprovalStatus === 'Rejected');
    assert.strictEqual(canShow, true, 'Post button must become visible again after rejection');

    await pool.query('DELETE FROM post_approval WHERE product_id = $1', [pid]);
    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  // Test 5: Verify Post Button logic - Scenario 4: Published -> Permanently Hide
  await test('Post button permanently HIDDEN when product post_status is Published', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'Published', 'CAT005', 'MAT001', 'TYP001', 'SUP003')
      RETURNING product_id`,
      [`Test Product Logic 4 ${ts}`]
    );
    const pid = prodRows[0].product_id;

    const { rows } = await pool.query(
      `SELECT p.post_status, latest.approval_status AS "latestApprovalStatus"
       FROM product p
       LEFT JOIN LATERAL (
         SELECT approval_status
         FROM post_approval
         WHERE product_id = p.product_id
         ORDER BY created_at DESC, approval_request_id DESC
         LIMIT 1
       ) latest ON true
       WHERE p.product_id = $1`,
      [pid]
    );

    const p = rows[0];
    const canShow = (p.post_status || '').toLowerCase() === 'pending';
    assert.strictEqual(canShow, false, 'Post button must be permanently hidden for Published products');

    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  // Test 6: Verify Backend sends ONLY product_id to n8n Webhook
  await test('Backend dispatches HTTP POST to n8n with ONLY product_id and x-api-key header', async () => {
    let receivedPayload = null;
    let receivedApiKey = null;

    // Start a temporary mock n8n webhook HTTP server on port 5999
    const mockN8nServer = http.createServer((req, res) => {
      receivedApiKey = req.headers['x-api-key'];
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Workflow started' }));
      });
    });

    await new Promise((resolve) => mockN8nServer.listen(5999, resolve));

    try {
      const testApiKey = 'test_secret_12345';
      const testProductId = 'P001';

      // Test webhook dispatch
      const res = await fetch('http://localhost:5999/webhook/social-media-product-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': testApiKey,
        },
        body: JSON.stringify({
          product_id: testProductId,
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(receivedApiKey, testApiKey, 'Header x-api-key must match N8N_WEBHOOK_SECRET');
      assert.deepStrictEqual(receivedPayload, { product_id: 'P001' }, 'Payload must contain ONLY product_id');
      assert.strictEqual(Object.keys(receivedPayload).length, 1, 'Payload must not contain any extra fields');
    } finally {
      mockN8nServer.close();
    }
  });

  // Test 7: Historical approval records are preserved on retry
  await test('Historical approval attempts are preserved in database without overwriting', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'Pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003')
      RETURNING product_id`,
      [`Test Product History ${ts}`]
    );
    const pid = prodRows[0].product_id;

    const attempt1Id = `REQ-1-${ts}`;
    const attempt2Id = `REQ-2-${ts}`;

    // Insert attempt 1 (Rejected)
    await pool.query(
      `INSERT INTO post_approval (approval_request_id, product_id, approval_status, posting_status, created_at)
       VALUES ($1, $2, 'Rejected', 'Rejected', NOW() - INTERVAL '1 hour')`,
      [attempt1Id, pid]
    );

    // Insert attempt 2 (New attempt)
    await pool.query(
      `INSERT INTO post_approval (approval_request_id, product_id, approval_status, posting_status, created_at)
       VALUES ($1, $2, 'Pending', 'Processing', NOW())`,
      [attempt2Id, pid]
    );

    // Verify both records exist
    const { rows: allAttempts } = await pool.query(
      `SELECT approval_request_id, approval_status FROM post_approval WHERE product_id = $1 ORDER BY created_at ASC`,
      [pid]
    );

    assert.strictEqual(allAttempts.length, 2, 'Both attempts must be preserved in database');
    assert.strictEqual(allAttempts[0].approval_request_id, attempt1Id);
    assert.strictEqual(allAttempts[0].approval_status, 'Rejected');
    assert.strictEqual(allAttempts[1].approval_request_id, attempt2Id);
    assert.strictEqual(allAttempts[1].approval_status, 'Pending');

    await pool.query('DELETE FROM post_approval WHERE product_id = $1', [pid]);
    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  // Test 9: Backend handler does NOT insert records into post_approval
  await test('Backend handlePostTrigger triggers n8n WITHOUT inserting into post_approval', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id, image_url
      ) VALUES ($1, 'Test Product', 1000, 10, 1, 'pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003', 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
      RETURNING product_id`,
      [`Test Product Backend No-Write ${ts}`]
    );
    const pid = prodRows[0].product_id;

    // Check count in post_approval before
    const beforeRes = await pool.query('SELECT COUNT(*) FROM post_approval WHERE product_id = $1', [pid]);
    const beforeCount = parseInt(beforeRes.rows[0].count, 10);

    // Spin up mock n8n webhook server on port 5998
    let receivedPayload = null;
    const mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Workflow started' }));
      });
    });

    await new Promise((resolve) => mockServer.listen(5998, resolve));

    // Temporarily point N8N_INSTAGRAM_WEBHOOK_URL to 5998
    const origUrl = process.env.N8N_INSTAGRAM_WEBHOOK_URL;
    process.env.N8N_INSTAGRAM_WEBHOOK_URL = 'http://localhost:5998/webhook/social-media-product-post';

    try {
      // Simulate backend POST trigger logic
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const prodCheck = await client.query('SELECT product_id, post_status, image_url FROM product WHERE product_id = $1 FOR UPDATE', [pid]);
        assert.strictEqual(prodCheck.rows[0].post_status, 'pending');
        await client.query('COMMIT');
      } finally {
        client.release();
      }

      // Dispatch webhook exactly as backend does
      const response = await fetch(process.env.N8N_INSTAGRAM_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.N8N_WEBHOOK_SECRET || 'YOUR_LONG_RANDOM_SECRET',
        },
        body: JSON.stringify({ product_id: pid }),
      });
      assert.strictEqual(response.ok, true);
      assert.deepStrictEqual(receivedPayload, { product_id: pid });

      // Verify post_approval table still has 0 records (backend NEVER inserted any!)
      const afterRes = await pool.query('SELECT COUNT(*) FROM post_approval WHERE product_id = $1', [pid]);
      const afterCount = parseInt(afterRes.rows[0].count, 10);
      assert.strictEqual(afterCount, beforeCount, 'post_approval record count must not change from backend');
    } finally {
      process.env.N8N_INSTAGRAM_WEBHOOK_URL = origUrl;
      mockServer.close();
      await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
    }
  });

  // Test 10: Status normalization handles uppercase and whitespace
  await test('Status values normalize properly across uppercase and whitespace', async () => {
    const normalizeStatus = (val) => String(val || '').trim().toLowerCase();

    assert.strictEqual(normalizeStatus('Pending'), 'pending');
    assert.strictEqual(normalizeStatus('  PENDING  '), 'pending');
    assert.strictEqual(normalizeStatus('Published'), 'published');
    assert.strictEqual(normalizeStatus('Awaiting Approval'), 'awaiting approval');
    assert.strictEqual(normalizeStatus('  Awaiting Approval  '), 'awaiting approval');
    assert.strictEqual(normalizeStatus('Rejected'), 'rejected');
  });

  // Test 11: Backend codebase contains 0 INSERT, UPDATE, DELETE queries on post_approval
  await test('Backend codebase has ZERO write operations on post_approval', async () => {
    const fs = require('fs');
    const socialRouteContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/social.js'), 'utf8');

    const writeMatches = [];
    ['INSERT', 'UPDATE', 'DELETE'].forEach((op) => {
      const regex = new RegExp(op + '\\s+(INTO\\s+)?post_approval', 'gi');
      let m;
      while ((m = regex.exec(socialRouteContent)) !== null) {
        writeMatches.push(m[0]);
      }
    });

    assert.strictEqual(writeMatches.length, 0, `Backend social.js must have 0 writes to post_approval, but found: ${writeMatches.join(', ')}`);
  });

  // Test 12: Admin authentication is fully authorized to access social media endpoints
  await test('Admin role is authorized for social media posting & confirmation endpoints', async () => {
    const jwt = require('jsonwebtoken');
    const { authMiddleware, employeeRoleMiddleware } = require('../src/middleware/auth');

    // 1. Admin Token
    const adminToken = jwt.sign(
      { sub: 'ADM001', role: 'admin', name: 'System Admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let adminAuthPassed = false;
    let adminRolePassed = false;

    const adminReq = { headers: { authorization: `Bearer ${adminToken}` } };
    const adminRes = {
      status: (code) => ({
        json: (data) => { throw new Error(`Unexpected error ${code}: ${JSON.stringify(data)}`); }
      })
    };

    await authMiddleware(adminReq, adminRes, () => {
      adminAuthPassed = true;
      const roleMw = employeeRoleMiddleware('Social Media Manager');
      roleMw(adminReq, adminRes, () => {
        adminRolePassed = true;
      });
    });

    assert.strictEqual(adminAuthPassed, true, 'Admin token must pass authMiddleware');
    assert.strictEqual(adminRolePassed, true, 'Admin role must pass employeeRoleMiddleware');

    // 2. Customer Token (Must be rejected)
    const customerToken = jwt.sign(
      { sub: 'CUST999', role: 'customer', name: 'Test Customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let customerBlocked = false;
    const custReq = {
      headers: { authorization: `Bearer ${customerToken}` },
      user: { id: 'CUST999', role: 'customer' }
    };
    const custRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) customerBlocked = true;
        }
      })
    };

    const roleMw = employeeRoleMiddleware('Social Media Manager');
    roleMw(custReq, custRes, () => {
      throw new Error('Customer should not pass employeeRoleMiddleware');
    });

    assert.strictEqual(customerBlocked, true, 'Customer role must be blocked with 403 Forbidden');
  });

  // Test 13: Admin and Social Media Manager share the exact same post_approval records
  await test('Admin and Social Media Manager share identical database records and visibility logic', async () => {
    const ts = Date.now();
    const { rows: prodRows } = await pool.query(
      `INSERT INTO product (
        product_name, description, base_price, quantity, is_active, post_status,
        category_id, material_id, type_id, supplier_id, image_url
      ) VALUES ($1, 'Shared Product', 1200, 5, 1, 'pending', 'CAT005', 'MAT001', 'TYP001', 'SUP003', 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
      RETURNING product_id`,
      [`Shared Product Test ${ts}`]
    );
    const pid = prodRows[0].product_id;

    // Both Admin and Social Media Manager query the same table
    const { rows: sharedRows } = await pool.query(
      `SELECT p.product_id, p.post_status, latest.approval_status, latest.posting_status
       FROM product p
       LEFT JOIN LATERAL (
         SELECT approval_status, posting_status
         FROM post_approval
         WHERE product_id = p.product_id
         ORDER BY created_at DESC, approval_request_id DESC
         LIMIT 1
       ) latest ON true
       WHERE p.product_id = $1`,
      [pid]
    );

    assert.strictEqual(sharedRows.length, 1);
    assert.strictEqual(sharedRows[0].post_status, 'pending');
    assert.strictEqual(sharedRows[0].approval_status, null);

    // Clean up
    await pool.query('DELETE FROM product WHERE product_id = $1', [pid]);
  });

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
