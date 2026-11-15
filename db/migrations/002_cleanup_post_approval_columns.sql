-- =============================================================================
-- Migration: 002_cleanup_post_approval_columns.sql
-- Description: Clean up post_approval table to retain ONLY 9 essential business columns:
--   1. approval_request_id (VARCHAR(50), PRIMARY KEY)
--   2. product_id (VARCHAR(10), FOREIGN KEY to product)
--   3. generated_caption (TEXT)
--   4. enhanced_image_url (TEXT)
--   5. approval_status (VARCHAR(30))
--   6. posting_status (VARCHAR(30))
--   7. created_at (TIMESTAMP)
--   8. updated_at (TIMESTAMP)
--   9. published_at (TIMESTAMP NULL)
-- =============================================================================

DO $$
BEGIN
  -- 1. Rename approval_id to approval_request_id if still named approval_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'post_approval' AND column_name = 'approval_id'
  ) THEN
    ALTER TABLE post_approval RENAME COLUMN approval_id TO approval_request_id;
  END IF;

  -- 2. Rename generated_image_url to enhanced_image_url if still named generated_image_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'post_approval' AND column_name = 'generated_image_url'
  ) THEN
    ALTER TABLE post_approval RENAME COLUMN generated_image_url TO enhanced_image_url;
  END IF;
END $$;

-- 3. Add published_at column if not exists
ALTER TABLE post_approval ADD COLUMN IF NOT EXISTS published_at TIMESTAMP NULL;

-- 4. Drop any constraints referencing columns to be dropped
ALTER TABLE post_approval DROP CONSTRAINT IF EXISTS post_approval_decision_token_key;
ALTER TABLE post_approval DROP CONSTRAINT IF EXISTS post_approval_employee_id_fkey;

-- 5. Drop all columns other than the 9 required business columns
ALTER TABLE post_approval
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS workflow_execution_id,
  DROP COLUMN IF EXISTS resume_url,
  DROP COLUMN IF EXISTS platform,
  DROP COLUMN IF EXISTS instagram_post_id,
  DROP COLUMN IF EXISTS error_message,
  DROP COLUMN IF EXISTS decision_token,
  DROP COLUMN IF EXISTS decided_at,
  DROP COLUMN IF EXISTS gmail_thread_id,
  DROP COLUMN IF EXISTS gmail_message_id,
  DROP COLUMN IF EXISTS gmail_link,
  DROP COLUMN IF EXISTS email_sent_at,
  DROP COLUMN IF EXISTS rejection_reason;
