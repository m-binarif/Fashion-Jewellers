/**
 * runMigration.js
 * Script to execute SQL migration files against the configured database pool.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../db/pool');

async function run() {
  const migrationPath = path.resolve(__dirname, '../../../db/migrations/002_cleanup_post_approval_columns.sql');
  console.log(`Running migration: ${migrationPath}`);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found at: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration executed successfully!');

    // Show updated schema
    const { rows } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'post_approval'
      ORDER BY ordinal_position
    `);
    console.log('\nCurrent columns in post_approval:');
    console.table(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
