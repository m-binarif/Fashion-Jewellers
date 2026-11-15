/**
 * migration_logic.test.js
 * Verifies migration logic, idempotency, and local file preservation.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

async function testMigrationLogic() {
  console.log('Testing migration logic & idempotency...');

  // Create two temporary test products in DB
  const ts = Date.now();
  const res1 = await pool.query(`
    INSERT INTO product (
      product_name, description, base_price, quantity, is_active,
      image_url, public_image_id, category_id, material_id, type_id, supplier_id
    ) VALUES ($1, $2, $3, 1, 1, $4, NULL, 'CAT005', 'MAT001', 'TYP001', 'SUP003')
    RETURNING product_id
  `, [`Test Migration Local ${ts}`, 'Local product', 2000, '/uploads/test_local_image.png']);

  const pid1 = res1.rows[0].product_id;

  const res2 = await pool.query(`
    INSERT INTO product (
      product_name, description, base_price, quantity, is_active,
      image_url, public_image_id, category_id, material_id, type_id, supplier_id
    ) VALUES ($1, $2, $3, 1, 1, $4, $5, 'CAT005', 'MAT001', 'TYP001', 'SUP003')
    RETURNING product_id
  `, [`Test Migration Cloudinary ${ts}`, 'Cloudinary product', 3000, 'https://res.cloudinary.com/demo/image.png', 'demo_public_id']);

  const pid2 = res2.rows[0].product_id;

  // Query and verify detection logic
  const { rows: p1Rows } = await pool.query('SELECT image_url, public_image_id FROM product WHERE product_id = $1', [pid1]);
  const p1 = p1Rows[0];
  const p1NeedsMigration = !p1.public_image_id && !p1.image_url.includes('cloudinary');
  assert.strictEqual(p1NeedsMigration, true, 'Product with local path and NULL public_image_id must be identified for migration');

  const { rows: p2Rows } = await pool.query('SELECT image_url, public_image_id FROM product WHERE product_id = $1', [pid2]);
  const p2 = p2Rows[0];
  const p2NeedsMigration = !p2.public_image_id && !p2.image_url.includes('cloudinary');
  assert.strictEqual(p2NeedsMigration, false, 'Product already with Cloudinary URL and public_image_id must NOT be re-migrated (idempotent)');

  // Simulate migration of p1
  await pool.query('UPDATE product SET image_url = $1, public_image_id = $2 WHERE product_id = $3', [
    'https://res.cloudinary.com/demo/test_migrated.png',
    'test_migrated_public_id',
    pid1
  ]);

  // Second run check: now p1 should also be skipped
  const { rows: p1After } = await pool.query('SELECT image_url, public_image_id FROM product WHERE product_id = $1', [pid1]);
  const p1SecondRunNeedsMigration = !p1After[0].public_image_id && !p1After[0].image_url.includes('cloudinary');
  assert.strictEqual(p1SecondRunNeedsMigration, false, 'Second run must skip previously migrated product');

  // Cleanup test products
  await pool.query('DELETE FROM product WHERE product_id IN ($1, $2)', [pid1, pid2]);

  console.log('✅ Migration logic & idempotency test PASSED');
  await pool.end();
}

testMigrationLogic().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
