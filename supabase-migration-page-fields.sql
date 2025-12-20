-- Migration: Add page customization fields to businesses table
-- Run this in your Supabase SQL editor

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1976d2',
ADD COLUMN IF NOT EXISTS is_public_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN businesses.cover_photo_url IS 'URL of the cover photo for the public page';
COMMENT ON COLUMN businesses.primary_color IS 'Primary color (hex) for the public page theme';
COMMENT ON COLUMN businesses.is_public_enabled IS 'Whether the public page is enabled and accessible';

