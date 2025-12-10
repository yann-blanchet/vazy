-- ============================================================================
-- SERVICE CATEGORIES TABLE
-- Create a dedicated table for service categories to allow better management
-- ============================================================================

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE INDEX idx_service_categories_business_id ON service_categories(business_id);
CREATE INDEX idx_service_categories_order ON service_categories(business_id, display_order);

COMMENT ON TABLE service_categories IS 'Categories for organizing services (e.g., "Coupes", "Couleurs", "Soins")';
COMMENT ON COLUMN service_categories.display_order IS 'Order for displaying categories';

-- ============================================================================
-- MIGRATION: Convert existing category TEXT to category_id
-- ============================================================================

-- Step 1: Add category_id column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- Step 2: Create categories from existing category names
-- This will create a category for each unique category name per business
INSERT INTO service_categories (business_id, name, display_order)
SELECT DISTINCT 
  s.business_id,
  s.category,
  ROW_NUMBER() OVER (PARTITION BY s.business_id ORDER BY s.category) - 1 as display_order
FROM services s
WHERE s.category IS NOT NULL 
  AND s.category != ''
  AND NOT EXISTS (
    SELECT 1 FROM service_categories sc 
    WHERE sc.business_id = s.business_id 
      AND sc.name = s.category
  )
ON CONFLICT (business_id, name) DO NOTHING;

-- Step 3: Update services to use category_id
UPDATE services s
SET category_id = sc.id
FROM service_categories sc
WHERE s.business_id = sc.business_id
  AND s.category = sc.name
  AND s.category IS NOT NULL
  AND s.category != '';

-- Step 4: Drop the old category column (optional - comment out if you want to keep it for backup)
-- ALTER TABLE services DROP COLUMN IF EXISTS category;

-- Keep the category column for now as a backup, but add a comment
COMMENT ON COLUMN services.category IS 'DEPRECATED: Use category_id instead. This column will be removed in a future migration.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own categories
CREATE POLICY "Business owners can view their categories"
  ON service_categories FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert their categories"
  ON service_categories FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their categories"
  ON service_categories FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their categories"
  ON service_categories FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Public can view categories for visible businesses
CREATE POLICY "Public can view categories for visible businesses"
  ON service_categories FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE slug IS NOT NULL
    )
  );



