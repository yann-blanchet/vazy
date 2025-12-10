-- Add category column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_services_category ON services(business_id, category);

-- Update existing services to have a default category (optional)
-- UPDATE services SET category = 'Autre' WHERE category IS NULL;

COMMENT ON COLUMN services.category IS 'Category name for grouping services (e.g., "Coupes", "Couleurs", "Soins")';



