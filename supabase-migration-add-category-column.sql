-- ============================================================================
-- MIGRATION: Add category column and remove category_id
-- ============================================================================
-- This migration:
-- 1. Adds a 'category' TEXT column to services table
-- 2. Migrates existing category names from service_categories to services.category
-- 3. Removes the category_id column from services
-- 4. Optionally drops the service_categories table (commented out by default)
-- ============================================================================

-- Step 1: Add category column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 2: Migrate existing category names from service_categories to services.category
-- This will populate the category column with the category name for services that have a category_id
UPDATE services s
SET category = sc.name
FROM service_categories sc
WHERE s.category_id = sc.id
  AND s.category IS NULL;

-- Step 3: Drop the foreign key constraint on category_id (if it exists)
DO $$ 
BEGIN
  -- Try to drop the foreign key constraint
  ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_id_fkey;
EXCEPTION
  WHEN OTHERS THEN
    -- Constraint might not exist or have a different name
    NULL;
END $$;

-- Step 4: Drop the index on category_id (if it exists)
DROP INDEX IF EXISTS idx_services_category_id;

-- Step 5: Remove the category_id column
ALTER TABLE services 
DROP COLUMN IF EXISTS category_id;

-- Step 6: Add index on category for better query performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(profile_id, category);

-- ============================================================================
-- OPTIONAL: Drop service_categories table
-- ============================================================================
-- Uncomment the following lines if you want to completely remove the service_categories table
-- WARNING: This will permanently delete all category data. Make sure you've migrated everything first!

-- Drop RLS policies on service_categories
-- DROP POLICY IF EXISTS "Users can manage their own service categories" ON service_categories;
-- DROP POLICY IF EXISTS "Public can view service categories" ON service_categories;

-- Drop trigger on service_categories
-- DROP TRIGGER IF EXISTS update_service_categories_updated_at ON service_categories;

-- Drop the service_categories table
-- DROP TABLE IF EXISTS service_categories CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration:

-- Check that category column exists and has data
-- SELECT id, name, category, category_id FROM services LIMIT 10;

-- Check for any services that still have category_id (should be none after migration)
-- SELECT COUNT(*) as services_with_category_id FROM services WHERE category_id IS NOT NULL;

-- Check category distribution
-- SELECT category, COUNT(*) as count FROM services WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC;

