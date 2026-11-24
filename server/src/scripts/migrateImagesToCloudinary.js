/**
 * migrateImagesToCloudinary.js
 * One-time standalone idempotent migration script to migrate existing local product images to Cloudinary.
 *
 * Requirements:
 * 1. Read existing products from PostgreSQL.
 * 2. Identify products with local image paths (/uploads/...).
 * 3. Locate corresponding local image files in server/uploads/.
 * 4. Upload to Cloudinary without deleting original local files.
 * 5. Update image_url and public_image_id in database.
 * 6. Idempotent: safe to run repeatedly without duplicate uploads.
 * 7. Generates a clear migration report.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
// Also load server/.env if run from server folder
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = require('../db/pool');
const { uploadOnCloudinary } = require('../utils/cloudinary');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

async function migrate() {
  console.log('===============================================================');
  console.log('       FASHION JEWELLERS — CLOUDINARY PRODUCT IMAGE MIGRATION   ');
  console.log('===============================================================\n');

  // Verify Cloudinary configuration
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || cloudName === 'YOUR_CLOUD_NAME' ||
      !apiKey || apiKey === 'YOUR_API_KEY' ||
      !apiSecret || apiSecret === 'YOUR_API_SECRET') {
    console.error('❌ CONFIGURATION ERROR: Cloudinary credentials are not set!');
    console.error('Please configure the following in server/.env:');
    console.error('  CLOUDINARY_CLOUD_NAME=your_actual_cloud_name');
    console.error('  CLOUDINARY_API_KEY=your_actual_api_key');
    console.error('  CLOUDINARY_API_SECRET=your_actual_api_secret\n');
    console.error('Aborting migration.');
    process.exit(1);
  }

  console.log(`✓ Cloudinary configured for cloud: ${cloudName}`);
  console.log(`✓ Scanning database for product records...\n`);

  const client = await pool.connect();
  const report = {
    total: 0,
    migrated: 0,
    alreadyCloudinary: 0,
    missingFile: 0,
    skippedExternal: 0,
    failed: 0,
    details: []
  };

  try {
    // 1. Ensure public_image_id column exists
    await client.query(`
      ALTER TABLE product
      ADD COLUMN IF NOT EXISTS public_image_id VARCHAR(255) NULL;
    `);

    // 2. Fetch all products
    const { rows: products } = await client.query(`
      SELECT product_id, product_name, image_url, public_image_id
      FROM product
      ORDER BY product_id ASC
    `);

    report.total = products.length;
    console.log(`Found ${products.length} product(s) in catalog.\n`);

    for (const p of products) {
      const pid = p.product_id;
      const name = p.product_name;
      const currentUrl = p.image_url || '';
      const currentPublicId = p.public_image_id;

      // Check if already migrated to Cloudinary
      const isCloudinaryUrl = currentUrl.includes('res.cloudinary.com') || currentUrl.includes('cloudinary');
      if (currentPublicId || isCloudinaryUrl) {
        report.alreadyCloudinary++;
        report.details.push({
          id: pid,
          name,
          status: 'ALREADY_MIGRATED',
          previous: currentUrl,
          newUrl: currentUrl,
          publicId: currentPublicId || '(existing)'
        });
        console.log(`⏩ [${pid}] "${name}" — Already on Cloudinary. Skipped.`);
        continue;
      }

      // Check if it's an external HTTP URL other than Cloudinary
      if (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) {
        report.skippedExternal++;
        report.details.push({
          id: pid,
          name,
          status: 'SKIPPED_EXTERNAL_URL',
          previous: currentUrl,
          newUrl: currentUrl,
          publicId: null
        });
        console.log(`ℹ️  [${pid}] "${name}" — External URL (${currentUrl}). Skipped.`);
        continue;
      }

      // If empty or null
      if (!currentUrl.trim()) {
        report.skippedExternal++;
        report.details.push({
          id: pid,
          name,
          status: 'NO_IMAGE',
          previous: 'none',
          newUrl: null,
          publicId: null
        });
        console.log(`⚠️  [${pid}] "${name}" — No image assigned.`);
        continue;
      }

      // Resolve local file path
      const cleanFileName = currentUrl.replace(/^\/?uploads\//, '').replace(/^\//, '');
      const localFilePath = path.join(UPLOADS_DIR, cleanFileName);

      if (!fs.existsSync(localFilePath)) {
        report.missingFile++;
        report.details.push({
          id: pid,
          name,
          status: 'MISSING_LOCAL_FILE',
          previous: currentUrl,
          newUrl: null,
          publicId: null
        });
        console.warn(`⚠️  [${pid}] "${name}" — Local file not found: ${localFilePath}`);
        continue;
      }

      // Upload to Cloudinary (DO NOT delete local file)
      console.log(`⏳ [${pid}] "${name}" — Uploading ${cleanFileName} to Cloudinary...`);
      try {
        const uploadRes = await uploadOnCloudinary(localFilePath, {
          folder: 'fashion-jewellers/products',
          cleanupOnError: false // PRESERVE local files
        });

        if (!uploadRes || !uploadRes.secure_url || !uploadRes.public_id) {
          throw new Error('Upload succeeded but no secure_url or public_id returned.');
        }

        // Update database record
        await client.query(`
          UPDATE product
          SET image_url = $1, public_image_id = $2
          WHERE product_id = $3
        `, [uploadRes.secure_url, uploadRes.public_id, pid]);

        report.migrated++;
        report.details.push({
          id: pid,
          name,
          status: 'SUCCESS',
          previous: currentUrl,
          newUrl: uploadRes.secure_url,
          publicId: uploadRes.public_id
        });

        console.log(`✅ [${pid}] "${name}" — Successfully migrated!`);
        console.log(`   URL: ${uploadRes.secure_url}`);
        console.log(`   Public ID: ${uploadRes.public_id}\n`);
      } catch (err) {
        report.failed++;
        report.details.push({
          id: pid,
          name,
          status: 'FAILED',
          previous: currentUrl,
          error: err.message
        });
        console.error(`❌ [${pid}] "${name}" — Failed to upload/update: ${err.message}\n`);
      }
    }

    // Print summary report
    console.log('\n===============================================================');
    console.log('                  MIGRATION SUMMARY REPORT                      ');
    console.log('===============================================================');
    console.log(`Total Products Inspected:     ${report.total}`);
    console.log(`Successfully Migrated:        ${report.migrated}`);
    console.log(`Already on Cloudinary:        ${report.alreadyCloudinary}`);
    console.log(`External / No Image (Skipped):${report.skippedExternal}`);
    console.log(`Missing Local Files:          ${report.missingFile}`);
    console.log(`Failed Migrations:            ${report.failed}`);
    console.log('===============================================================\n');

    if (report.migrated > 0) {
      console.log('📌 NOTE: All original local files in server/uploads/ have been');
      console.log('kept intact as required. You can manually delete them after');
      console.log('verifying that all images display properly from Cloudinary.\n');
    }
  } catch (err) {
    console.error('Fatal migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute migration
migrate().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected migration crash:', err);
  process.exit(1);
});
