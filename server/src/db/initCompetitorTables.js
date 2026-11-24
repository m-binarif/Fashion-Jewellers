/**
 * initCompetitorTables.js
 * Automatically verifies and initializes public.competitors and public.competitor_reports
 * tables on server startup so no manual database migration is required.
 */

const pool = require('./pool');

async function initCompetitorTables() {
  const query = `
    CREATE TABLE IF NOT EXISTS public.competitors (
      competitor_id SERIAL PRIMARY KEY,
      brand_name VARCHAR(100) NOT NULL,
      url TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.competitor_reports (
      report_id VARCHAR(50) PRIMARY KEY,
      analyzed_brands JSONB NOT NULL,
      new_products JSONB NOT NULL,
      trending_hashtags JSONB NOT NULL,
      caption_ideas JSONB NOT NULL,
      trending_angles JSONB NOT NULL,
      executive_summary TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_competitors_active ON public.competitors(is_active, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_competitor_reports_created_at ON public.competitor_reports(created_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('Competitor analysis tables verified in database.');
  } catch (err) {
    console.warn('Note: Competitor tables verification skipped or failed:', err.message);
  }
}

module.exports = { initCompetitorTables };
