-- ============================================================================
-- MIGRATION: New simplified schema with profiles, services, calendar_events, page_settings
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  profile_type TEXT NOT NULL, -- tattoo / barber / nails
  timezone TEXT DEFAULT 'Europe/Paris',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_type ON profiles(profile_type);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public can view active profiles
CREATE POLICY "Public can view active profiles"
  ON profiles FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- 2. SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_profile_id ON services(profile_id);
CREATE INDEX idx_services_active ON services(profile_id, is_active) WHERE is_active = true;
CREATE INDEX idx_services_position ON services(profile_id, position);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Users can manage their own services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = services.profile_id
      AND profiles.id = auth.uid()
    )
  );

-- Public can view active services
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- 3. CALENDAR_EVENTS TABLE (update existing)
-- ============================================================================

-- Check if calendar_events exists and handle migration
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    CREATE TABLE calendar_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('appointment', 'blocked')),
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      
      -- Only for appointments
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      client_name TEXT,
      client_phone TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Table exists, check if it needs to be altered
    -- Drop foreign key constraint if it references auth.users
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'calendar_events' 
      AND constraint_name LIKE '%profile_id%'
      AND constraint_type = 'FOREIGN KEY'
    ) THEN
      -- Drop the old foreign key constraint
      ALTER TABLE calendar_events 
      DROP CONSTRAINT IF EXISTS calendar_events_profile_id_fkey;
    END IF;
    
    -- Check if profile_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'calendar_events' 
      AND column_name = 'profile_id'
    ) THEN
      -- Add profile_id column if it doesn't exist
      ALTER TABLE calendar_events ADD COLUMN profile_id UUID;
    END IF;
    
    -- Remove columns that don't exist in new schema
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS business_id;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS client_email;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS status;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS service_name;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS service_price;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS service_duration;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS notes;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS cancellation_token;
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS updated_at;
  END IF;
END $$;

-- Create indexes (only if profile_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' 
    AND column_name = 'profile_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_calendar_events_profile_id ON calendar_events(profile_id);
  END IF;
  
  CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON calendar_events(start_at);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_end_at ON calendar_events(end_at);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_service_id ON calendar_events(service_id);
END $$;

-- Add GIST index for date range (if extension is available)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events USING GIST (tstzrange(start_at, end_at));
EXCEPTION WHEN OTHERS THEN
  -- GIST index might fail if btree_gist extension is not available, skip it
  NULL;
END $$;

-- Now add foreign key constraint to profiles (after profiles table is created)
-- Also migrate business_id to profile_id if needed
DO $$
BEGIN
  -- Migrate business_id to profile_id if business_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' 
    AND column_name = 'business_id'
  ) THEN
    UPDATE calendar_events ce
    SET profile_id = b.owner_id
    FROM businesses b
    WHERE ce.business_id = b.id
    AND (ce.profile_id IS NULL OR ce.profile_id != b.owner_id);
  END IF;
  
  -- Ensure profile_id is NOT NULL (only if all rows have profile_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' 
    AND column_name = 'profile_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Check if there are any NULL values
    IF NOT EXISTS (SELECT 1 FROM calendar_events WHERE profile_id IS NULL) THEN
      ALTER TABLE calendar_events ALTER COLUMN profile_id SET NOT NULL;
    END IF;
  END IF;
  
  -- Add foreign key to profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'calendar_events'
    AND kcu.column_name = 'profile_id'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%profiles%'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_profile_id_fkey 
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Public can create appointments" ON calendar_events;
DROP POLICY IF EXISTS "Public can read appointment by token" ON calendar_events;
DROP POLICY IF EXISTS "Public can cancel via token" ON calendar_events;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = profile_id);

-- Public can create appointments (for booking)
CREATE POLICY "Public can create appointments"
  ON calendar_events FOR INSERT
  WITH CHECK (type = 'appointment');

-- ============================================================================
-- 4. PAGE_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS page_settings (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  photos TEXT[], -- première = cover
  instagram TEXT,
  phone TEXT,
  is_published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_settings_published ON page_settings(is_published) WHERE is_published = true;

-- Enable Row Level Security
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_settings
CREATE POLICY "Users can manage their own page settings"
  ON page_settings FOR ALL
  USING (auth.uid() = profile_id);

-- Public can view published page settings
CREATE POLICY "Public can view published page settings"
  ON page_settings FOR SELECT
  USING (is_published = true);

-- ============================================================================
-- MIGRATION: Migrate data from old tables
-- ============================================================================

-- Migrate businesses to profiles
INSERT INTO profiles (id, name, slug, profile_type, timezone, is_active, created_at)
SELECT 
  owner_id as id,
  business_name as name,
  slug,
  'tattoo' as profile_type, -- Default, can be updated later
  'Europe/Paris' as timezone,
  true as is_active,
  created_at
FROM businesses
ON CONFLICT (id) DO NOTHING;

-- Migrate services
INSERT INTO services (id, profile_id, name, duration_minutes, price_cents, is_active, position, created_at)
SELECT 
  s.id,
  b.owner_id as profile_id,
  s.name,
  s.duration as duration_minutes,
  (s.price * 100)::INTEGER as price_cents, -- Convert decimal to cents
  s.visible as is_active,
  ROW_NUMBER() OVER (PARTITION BY s.business_id ORDER BY s.created_at) - 1 as position,
  s.created_at
FROM services s
INNER JOIN businesses b ON s.business_id = b.id
ON CONFLICT (id) DO NOTHING;

-- Migrate appointments to calendar_events (if appointments table exists and calendar_events is empty)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') 
     AND NOT EXISTS (SELECT 1 FROM calendar_events LIMIT 1) THEN
    INSERT INTO calendar_events (
      id, profile_id, type, start_at, end_at, service_id, client_name, client_phone, created_at
    )
    SELECT 
      a.id,
      b.owner_id as profile_id,
      'appointment' as type,
      a.appointment_date as start_at,
      a.appointment_date + (COALESCE(a.service_duration, 60) || ' minutes')::INTERVAL as end_at,
      a.service_id,
      a.customer_name as client_name,
      a.customer_phone as client_phone,
      a.created_at
    FROM appointments a
    INNER JOIN businesses b ON a.business_id = b.id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Migrate page settings from businesses
INSERT INTO page_settings (profile_id, title, description, photos, is_published, updated_at)
SELECT 
  owner_id as profile_id,
  business_name as title,
  description,
  CASE 
    WHEN cover_photo_url IS NOT NULL THEN ARRAY[cover_photo_url]
    ELSE ARRAY[]::TEXT[]
  END as photos,
  true as is_published,
  updated_at
FROM businesses
ON CONFLICT (profile_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for page_settings updated_at
CREATE TRIGGER update_page_settings_updated_at
  BEFORE UPDATE ON page_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES
-- ============================================================================

-- Old tables (businesses, appointments, availability, customers) can be dropped
-- after verifying the migration is successful.
-- 
-- To drop old tables (run after verification):
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS availability CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS businesses CASCADE;

