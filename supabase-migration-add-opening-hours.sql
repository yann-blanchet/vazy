-- ============================================================================
-- MIGRATION: Add opening_hours column to page_settings
-- ============================================================================
-- This migration adds an opening_hours JSONB column to store business hours
-- for each day of the week.
-- ============================================================================

-- Add opening_hours column to page_settings table
ALTER TABLE page_settings 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN page_settings.opening_hours IS 'Business opening hours stored as JSONB. Format: {"monday": {"open": true, "start": "09:00", "end": "18:00"}, ...}';

