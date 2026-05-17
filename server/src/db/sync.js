const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function runWithRetry() {
  const clientConfig = {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000, // 30 seconds connection timeout
  };

  const client = new Client(clientConfig);

  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`Connecting to Neon Cloud database (attempts left: ${retries})...`);
      await client.connect();
      console.log('Connected successfully!');
      break;
    } catch (err) {
      retries--;
      console.error(`Connection failed: ${err.message}`);
      if (retries === 0) {
        throw err;
      }
      console.log('Waiting 5 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  try {
    console.log('Fetching all existing tables in the public schema for a clean wipe...');
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const { rows: tableRows } = await client.query(tableQuery);

    if (tableRows.length > 0) {
      const tablesToDrop = tableRows.map(row => `"${row.table_name}"`).join(', ');
      console.log(`Force dropping all existing tables: ${tablesToDrop}...`);
      await client.query(`DROP TABLE IF EXISTS ${tablesToDrop} CASCADE;`);
      console.log('All existing tables dropped successfully.');
    } else {
      console.log('No existing tables found to drop.');
    }

    // Also dynamic drop views to be absolutely thorough
    const viewQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'VIEW'
    `;
    const { rows: viewRows } = await client.query(viewQuery);
    if (viewRows.length > 0) {
      const viewsToDrop = viewRows.map(row => `"${row.table_name}"`).join(', ');
      console.log(`Force dropping all existing views: ${viewsToDrop}...`);
      await client.query(`DROP VIEW IF EXISTS ${viewsToDrop} CASCADE;`);
      console.log('All existing views dropped successfully.');
    }


    const sqlPath = path.join(__dirname, '..', '..', '..', 'db', 'setup_postgres.sql');
    console.log(`Reading SQL script from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing latest setup_postgres.sql on Neon Cloud...');
    await client.query(sql);
    console.log('Neon Cloud database synchronized and seeded successfully!');
  } finally {
    await client.end();
  }
}

runWithRetry()
  .catch((err) => {
    console.error('Error during database synchronization:', err);
    process.exit(1);
  });
