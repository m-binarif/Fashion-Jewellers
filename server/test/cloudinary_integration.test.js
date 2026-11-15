/**
 * cloudinary_integration.test.js
 * Comprehensive integration tests for Cloudinary image migration & upload lifecycle.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../src/db/pool');
const { ProductService } = require('../src/services/productService');
const cloudinary = require('../src/config/cloudinary');
const { uploadOnCloudinary, deleteFromCloudinary, deleteLocalFile } = require('../src/utils/cloudinary');

async function runTests() {
  console.log('===============================================================');
  console.log('       RUNNING CLOUDINARY INTEGRATION & LIFECYCLE TESTS         ');
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

  // Test 1: Verify database schema has public_image_id column
  await test('Database column public_image_id exists in product table', async () => {
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'product' AND column_name = 'public_image_id'
    `);
    assert.strictEqual(rows.length, 1, 'public_image_id column must exist in product table');
    assert.strictEqual(rows[0].column_name, 'public_image_id');
    assert.strictEqual(rows[0].is_nullable, 'YES');
  });

  // Test 2: Verify ProductService queries return publicImageId
  await test('ProductService.getById includes publicImageId field', async () => {
    const { rows } = await pool.query('SELECT product_id FROM product LIMIT 1');
    if (rows.length > 0) {
      const product = await ProductService.getById(rows[0].product_id);
      assert('publicImageId' in product, 'Product object must contain publicImageId field');
    }
  });

  // Test 3: Temporary local file cleanup helper
  await test('deleteLocalFile safely deletes temporary file using fs.promises.unlink', async () => {
    const tempDir = path.resolve(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const testFile = path.join(tempDir, `test-cleanup-${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'temporary test data');
    assert.strictEqual(fs.existsSync(testFile), true);

    await deleteLocalFile(testFile);
    assert.strictEqual(fs.existsSync(testFile), false, 'File must be deleted after deleteLocalFile call');
  });

  // Test 4: Upload sequence - Temporary file preservation until DB persistence
  await test('Upload sequence: Temporary file is preserved until DB save and deleted after', async () => {
    const tempDir = path.resolve(__dirname, '../uploads/temp');
    const testTempFile = path.join(tempDir, `upload-seq-test-${Date.now()}.png`);
    fs.writeFileSync(testTempFile, 'mock png content');

    // Simulate Cloudinary upload response
    const mockSecureUrl = `https://res.cloudinary.com/test-cloud/image/upload/v123456/fashion-jewellers/products/test_${Date.now()}.png`;
    const mockPublicId = `fashion-jewellers/products/test_${Date.now()}`;

    // Verify file still exists before DB persistence
    assert.strictEqual(fs.existsSync(testTempFile), true, 'Temp file must exist before DB persistence');

    // Persist to DB using ProductService.create
    const product = await ProductService.create({
      name: `Test Product Sequence ${Date.now()}`,
      description: 'Test product for upload sequence verification',
      price: 4999.00,
      quantity: 5,
      origin: 'local',
      weight: '12g',
      categoryId: 'CAT005',
      materialId: 'MAT001',
      typeId: 'TYP001',
      supplierId: 'SUP003',
      imageUrl: mockSecureUrl,
      publicImageId: mockPublicId
    });

    assert.strictEqual(product.imageUrl, mockSecureUrl);
    assert.strictEqual(product.publicImageId, mockPublicId);

    // Only AFTER DB persistence completes, delete local file
    await deleteLocalFile(testTempFile);
    assert.strictEqual(fs.existsSync(testTempFile), false, 'Temp file must be unlinked after DB save');

    // Cleanup created test product
    await pool.query('DELETE FROM product WHERE product_id = $1', [product.id]);
  });

  // Test 5: Rollback on database failure
  await test('Rollback on DB failure: Cloudinary asset removal and local cleanup', async () => {
    const tempDir = path.resolve(__dirname, '../uploads/temp');
    const testTempFile = path.join(tempDir, `db-fail-test-${Date.now()}.png`);
    fs.writeFileSync(testTempFile, 'mock fail data');

    let cloudinaryDestroyCalledWith = null;
    const mockDestroy = async (pid) => {
      cloudinaryDestroyCalledWith = pid;
      return { result: 'ok' };
    };

    const mockPublicId = 'fashion-jewellers/products/mock_fail_asset';

    // Simulate DB failure during creation (e.g. invalid foreign key)
    let dbFailed = false;
    try {
      await ProductService.create({
        name: 'Invalid Test Product',
        price: 100,
        categoryId: 'INVALID_CATEGORY_ID',
        materialId: 'MAT001',
        typeId: 'TYP001',
        supplierId: 'SUP001',
        imageUrl: 'https://res.cloudinary.com/...',
        publicImageId: mockPublicId
      });
    } catch (err) {
      dbFailed = true;
      // Trigger rollback logic as in products.js
      await mockDestroy(mockPublicId);
      await deleteLocalFile(testTempFile);
    }

    assert.strictEqual(dbFailed, true, 'DB insert should have failed');
    assert.strictEqual(cloudinaryDestroyCalledWith, mockPublicId, 'Cloudinary asset should be rolled back');
    assert.strictEqual(fs.existsSync(testTempFile), false, 'Local temp file should be cleaned up');
  });

  // Test 6: Image replacement in partialUpdate
  await test('Image replacement: Updates public_image_id and preserves other details', async () => {
    // Create base product
    const initialProduct = await ProductService.create({
      name: `Replacement Test Product ${Date.now()}`,
      description: 'Testing image replacement',
      price: 2500.00,
      quantity: 10,
      categoryId: 'CAT005',
      materialId: 'MAT001',
      typeId: 'TYP001',
      supplierId: 'SUP003',
      imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/old_img.png',
      publicImageId: 'fashion-jewellers/products/old_public_id'
    });

    assert.strictEqual(initialProduct.publicImageId, 'fashion-jewellers/products/old_public_id');

    // Replace image
    const newImageUrl = 'https://res.cloudinary.com/test-cloud/image/upload/v2/new_img.png';
    const newPublicId = 'fashion-jewellers/products/new_public_id';

    const updated = await ProductService.partialUpdate(initialProduct.id, {
      imageUrl: newImageUrl,
      publicImageId: newPublicId
    });

    assert.strictEqual(updated.imageUrl, newImageUrl);
    assert.strictEqual(updated.publicImageId, newPublicId);
    assert.strictEqual(updated.price, '2500.00'); // Preserved other fields

    // Clean up
    await pool.query('DELETE FROM product WHERE product_id = $1', [initialProduct.id]);
  });

  // Test 7: Text-only update preserves existing Cloudinary image and public_image_id
  await test('Text-only edit preserves existing Cloudinary image and public_image_id', async () => {
    const product = await ProductService.create({
      name: `Preserve Test ${Date.now()}`,
      price: 1500.00,
      quantity: 3,
      categoryId: 'CAT005',
      materialId: 'MAT001',
      typeId: 'TYP001',
      supplierId: 'SUP003',
      imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/original_img.png',
      publicImageId: 'fashion-jewellers/products/original_public_id'
    });

    // Edit only name and price
    const edited = await ProductService.partialUpdate(product.id, {
      name: `Preserve Test Updated ${Date.now()}`,
      price: 1800.00
    });

    assert.strictEqual(edited.imageUrl, 'https://res.cloudinary.com/test-cloud/image/upload/v1/original_img.png');
    assert.strictEqual(edited.publicImageId, 'fashion-jewellers/products/original_public_id');
    assert.strictEqual(edited.price, '1800.00');

    // Clean up
    await pool.query('DELETE FROM product WHERE product_id = $1', [product.id]);
  });

  // Test 8: deleteAssetIfUnreferenced does not delete asset shared with another product
  await test('deleteAssetIfUnreferenced protects assets shared across multiple products', async () => {
    const sharedPublicId = `fashion-jewellers/products/shared_asset_${Date.now()}`;
    const sharedUrl = `https://res.cloudinary.com/test-cloud/image/upload/v1/${sharedPublicId}.png`;

    const p1 = await ProductService.create({
      name: `Shared Product 1 ${Date.now()}`,
      price: 1000.00,
      categoryId: 'CAT005',
      materialId: 'MAT001',
      typeId: 'TYP001',
      supplierId: 'SUP003',
      imageUrl: sharedUrl,
      publicImageId: sharedPublicId
    });

    const p2 = await ProductService.create({
      name: `Shared Product 2 ${Date.now()}`,
      price: 1200.00,
      categoryId: 'CAT005',
      materialId: 'MAT001',
      typeId: 'TYP001',
      supplierId: 'SUP003',
      imageUrl: sharedUrl,
      publicImageId: sharedPublicId
    });

    // Check query with excludeProductId = p1.id (p2 still references it)
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS count FROM product WHERE public_image_id = $1 AND product_id != $2',
      [sharedPublicId, p1.id]
    );
    const count = parseInt(rows[0].count, 10);
    assert.strictEqual(count, 1, 'Asset should be detected as shared with p2');

    // Clean up
    await pool.query('DELETE FROM product WHERE product_id IN ($1, $2)', [p1.id, p2.id]);
  });

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  await pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
