/**
 * initSocialTable.js — Ensures the post_approval table exists with the exact 9 essential columns.
 * Automatically runs on server startup so no manual DB migration is required.
 */

const pool = require('./pool');

async function initSocialTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS post_approval (
      approval_request_id    VARCHAR(50) PRIMARY KEY,
      product_id             VARCHAR(10) NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
      generated_caption      TEXT,
      enhanced_image_url     TEXT,
      approval_status        VARCHAR(30) NOT NULL DEFAULT 'Pending',
      posting_status         VARCHAR(30) NOT NULL DEFAULT 'Awaiting Approval',
      created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at           TIMESTAMP NULL
    );

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_approval' AND column_name = 'approval_id') THEN
        ALTER TABLE post_approval RENAME COLUMN approval_id TO approval_request_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_approval' AND column_name = 'generated_image_url') THEN
        ALTER TABLE post_approval RENAME COLUMN generated_image_url TO enhanced_image_url;
      END IF;
    END $$;

    ALTER TABLE post_approval ADD COLUMN IF NOT EXISTS published_at TIMESTAMP NULL;

    CREATE INDEX IF NOT EXISTS idx_post_approval_product ON post_approval(product_id);
    CREATE INDEX IF NOT EXISTS idx_post_approval_status ON post_approval(approval_status);
    CREATE INDEX IF NOT EXISTS idx_post_approval_created_at ON post_approval(created_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('Post approval table verified in database (9 essential columns).');
  } catch (err) {
    console.warn('Note: post_approval table verification skipped or failed:', err.message);
  }
}

module.exports = { initSocialTable };
