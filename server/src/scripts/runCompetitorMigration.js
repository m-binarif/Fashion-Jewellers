/**
 * runCompetitorMigration.js
 * Script to execute the 004_create_competitor_analysis_tables.sql migration
 * against the configured PostgreSQL database pool.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../db/pool');

async function run() {
  const migrationPath = path.resolve(__dirname, '../../../db/migrations/004_create_competitor_analysis_tables.sql');
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
    console.log('✅ Competitor analysis migration executed successfully!');

    // Show created tables
    const { rows: compCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'competitors'
      ORDER BY ordinal_position
    `);
    console.log('\nColumns in public.competitors:');
    console.table(compCols);

    const { rows: repCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'competitor_reports'
      ORDER BY ordinal_position
    `);
    console.log('\nColumns in public.competitor_reports:');
    console.table(repCols);
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
