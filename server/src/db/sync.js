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
    const dropQueries = `
      DROP TABLE IF EXISTS review CASCADE;
      DROP TABLE IF EXISTS shipment CASCADE;
      DROP TABLE IF EXISTS payment CASCADE;
      DROP TABLE IF EXISTS record_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS holds CASCADE;
      DROP TABLE IF EXISTS cart CASCADE;
      DROP TABLE IF EXISTS product CASCADE;
      DROP TABLE IF EXISTS employee CASCADE;
      DROP TABLE IF EXISTS supplier CASCADE;
      DROP TABLE IF EXISTS customer CASCADE;
      DROP TABLE IF EXISTS payment_method CASCADE;
      DROP TABLE IF EXISTS role_type CASCADE;
      DROP TABLE IF EXISTS type CASCADE;
      DROP TABLE IF EXISTS material CASCADE;
      DROP TABLE IF EXISTS category CASCADE;
    `;

    console.log('Force dropping existing tables (CASCADE)...');
    await client.query(dropQueries);
    console.log('All existing tables dropped successfully.');

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
