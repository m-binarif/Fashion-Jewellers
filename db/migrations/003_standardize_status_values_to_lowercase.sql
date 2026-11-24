-- =============================================================================
-- Migration: 003_standardize_status_values_to_lowercase.sql
-- Description: Standardize all status values to lowercase across database tables
-- and update column DEFAULT definitions to lowercase.
-- =============================================================================

-- 1. Standardize post_status in product table
UPDATE public.product
SET post_status = LOWER(TRIM(post_status))
WHERE post_status IS NOT NULL;

ALTER TABLE public.product 
  ALTER COLUMN post_status SET DEFAULT 'pending';

-- 2. Standardize approval_status and posting_status in post_approval table
UPDATE public.post_approval
SET approval_status = LOWER(TRIM(approval_status))
WHERE approval_status IS NOT NULL;

UPDATE public.post_approval
SET posting_status = LOWER(TRIM(posting_status))
WHERE posting_status IS NOT NULL;

ALTER TABLE public.post_approval 
  ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.post_approval 
  ALTER COLUMN posting_status SET DEFAULT 'processing';
