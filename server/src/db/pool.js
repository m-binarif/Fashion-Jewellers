const { Pool } = require('pg');
require('dotenv').config();

// Construct connection config
const poolConfig = {
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false },
  max:      20, // Slightly more connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // This is critical to prevent the app from crashing on unexpected connection loss
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
