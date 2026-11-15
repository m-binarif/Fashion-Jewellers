/**
 * initSocialTable.js — Ensures the post_approval table exists in PostgreSQL.
 * Automatically runs on server startup so no manual DB migration is required.
 */

const pool = require('./pool');

async function initSocialTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS post_approval (
      approval_id            VARCHAR(30) PRIMARY KEY,
      product_id             VARCHAR(10) NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
      employee_id            VARCHAR(10) REFERENCES employee(employee_id) ON DELETE SET NULL,
      workflow_execution_id  VARCHAR(100),
      resume_url             TEXT,
      generated_caption      TEXT,
      generated_image_url    TEXT,
      platform               VARCHAR(50) NOT NULL DEFAULT 'Instagram',
      approval_status        VARCHAR(30) NOT NULL DEFAULT 'Pending',
      posting_status         VARCHAR(30) NOT NULL DEFAULT 'Awaiting Approval',
      instagram_post_id      VARCHAR(100),
      error_message          TEXT,
      decision_token         VARCHAR(100) UNIQUE,
      decided_at             TIMESTAMP,
      created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_post_approval_product ON post_approval(product_id);
    CREATE INDEX IF NOT EXISTS idx_post_approval_status ON post_approval(approval_status);
  `;

  try {
    await pool.query(query);
    console.log('Post approval table verified in database.');
  } catch (err) {
    console.warn('Note: post_approval table verification skipped or failed:', err.message);
  }
}

module.exports = { initSocialTable };
