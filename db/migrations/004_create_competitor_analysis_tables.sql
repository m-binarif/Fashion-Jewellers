-- =============================================================================
-- Migration: 004_create_competitor_analysis_tables.sql
-- Description: Creates tables for Competitor Trend & Product Analyzer
--   1. public.competitors (stores monitored competitor brands and collection URLs)
--   2. public.competitor_reports (stores AI-generated market intelligence reports)
-- =============================================================================

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitors_active ON public.competitors(is_active, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_competitor_reports_created_at ON public.competitor_reports(created_at DESC);
