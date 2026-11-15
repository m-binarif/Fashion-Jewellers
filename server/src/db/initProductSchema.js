const pool = require('./pool');

async function initProductSchema() {
  try {
    await pool.query(`
      ALTER TABLE product
      ADD COLUMN IF NOT EXISTS public_image_id VARCHAR(255) NULL;
    `);
    console.log('Product schema verified: public_image_id column present.');
  } catch (err) {
    console.error('Failed to verify product schema:', err.message);
  }
}

module.exports = { initProductSchema };
