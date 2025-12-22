-- ============================================================================
-- SUPABASE SCHEMA - FROM SCRATCH
-- Vazy - Système de réservation pour pros (tatoueurs, barbers, nail artists)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CLEANUP: Drop all tables if they exist (for fresh start)
-- ============================================================================

-- Drop tables in reverse dependency order to avoid foreign key constraint errors
DROP TABLE IF EXISTS page_settings CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old/legacy tables that might exist
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS business_photos CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ============================================================================
-- 1. PROFILES TABLE
-- Le pro (tatoueur, barber, nail artist…)
-- ============================================================================

CREATE TABLE profiles (
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
-- Ce que le client peut réserver
-- ============================================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_profile_id ON services(profile_id);
CREATE INDEX idx_services_category ON services(profile_id, category);
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
-- 3. CALENDAR_EVENTS TABLE
-- Planning unifié (RDV + créneaux bloqués)
-- ============================================================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'blocked')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Seulement pour appointment
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_profile_id ON calendar_events(profile_id);
CREATE INDEX idx_calendar_events_type ON calendar_events(type);
CREATE INDEX idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_end_at ON calendar_events(end_at);
CREATE INDEX idx_calendar_events_service_id ON calendar_events(service_id);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

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
-- Infos visibles sur la page publique
-- ============================================================================

CREATE TABLE page_settings (
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
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for page_settings updated_at
CREATE TRIGGER update_page_settings_updated_at
  BEFORE UPDATE ON page_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES
-- ============================================================================

-- Structure des tables :
-- 
-- 1. profiles : Le pro (id = auth.users.id)
--    - name, slug, profile_type, timezone, is_active
--
-- 2. services : Ce que le client peut réserver
--    - profile_id, category (TEXT), name, duration_minutes, price_cents, is_active, position
--
-- 3. calendar_events : Planning unifié (RDV + créneaux bloqués)
--    - profile_id, type ('appointment' | 'blocked'), start_at, end_at
--    - Pour appointments : service_id, client_name, client_phone
--
-- 4. page_settings : Infos visibles sur la page publique
--    - profile_id, title, description, photos[], instagram, phone, is_published

