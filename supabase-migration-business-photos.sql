-- Migration: Add business_photos table for multiple photos (max 4)
-- The first photo in the list becomes the cover/hero photo
-- Run this in your Supabase SQL editor

-- Create business_photos table
CREATE TABLE IF NOT EXISTS business_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, display_order)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_photos_business_id ON business_photos(business_id);
CREATE INDEX IF NOT EXISTS idx_business_photos_display_order ON business_photos(business_id, display_order);

-- Add constraint to limit photos to 4 per business
CREATE OR REPLACE FUNCTION check_photo_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM business_photos WHERE business_id = NEW.business_id) >= 4 THEN
    RAISE EXCEPTION 'A business cannot have more than 4 photos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_photo_limit_trigger
BEFORE INSERT ON business_photos
FOR EACH ROW
EXECUTE FUNCTION check_photo_limit();

-- Enable RLS
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Business owners can manage their photos
CREATE POLICY "Business owners can manage their photos"
  ON business_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- RLS Policy: Public can view photos
CREATE POLICY "Public can view business photos"
  ON business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id
      AND businesses.is_public_enabled = true
    )
  );

-- Migrate existing cover_photo_url to business_photos if it exists
INSERT INTO business_photos (business_id, photo_url, display_order)
SELECT id, cover_photo_url, 0
FROM businesses
WHERE cover_photo_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM business_photos
  WHERE business_photos.business_id = businesses.id
  AND business_photos.display_order = 0
)
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE business_photos IS 'Stores up to 4 photos per business. The first photo (display_order = 0) is the cover/hero photo.';
COMMENT ON COLUMN business_photos.display_order IS 'Order of the photo. 0 = cover/hero photo, 1-3 = additional photos';

