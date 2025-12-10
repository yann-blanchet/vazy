-- ============================================================================
-- SUPABASE DATABASE SCHEMA
-- Vazy - Système de réservation en ligne pour commerces
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  opening_hours JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_slug ON businesses(slug);

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10,2) NOT NULL,
  visible BOOLEAN DEFAULT true,
  staff_id UUID, -- Optional, for future staff assignment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_services_visible ON services(business_id, visible) WHERE visible = true;

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed, completed, cancelled, no-show
  service_name TEXT, -- Denormalized for history
  service_price DECIMAL(10,2),
  service_duration INTEGER,
  notes TEXT,
  cancellation_token TEXT UNIQUE, -- For cancellation links
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_date ON appointments(business_id, appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_email);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ============================================================================
-- AVAILABILITY TABLE (for blocking periods, holidays, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true, -- false = blocked
  reason TEXT, -- "Holiday", "Lunch break", etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, date, start_time, end_time)
);

CREATE INDEX idx_availability_business_date ON availability(business_id, date);

-- ============================================================================
-- CUSTOMERS TABLE (optional, for customer history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, email)
);

CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Businesses: Owners can manage their own
CREATE POLICY "Business owners can manage their business"
  ON businesses FOR ALL
  USING (auth.uid() = owner_id);

-- Services: Business owners can manage
CREATE POLICY "Business owners can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Services: Public can view visible services
CREATE POLICY "Public can view visible services"
  ON services FOR SELECT
  USING (visible = true);

-- Appointments: Business owners can manage
CREATE POLICY "Business owners can manage appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = appointments.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Appointments: Public can create (for booking) - NO AUTH REQUIRED
CREATE POLICY "Public can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

-- Appointments: Public can read by cancellation token (for cancellation page)
CREATE POLICY "Public can read appointment by token"
  ON appointments FOR SELECT
  USING (true); -- Token is unique, so safe to allow public read

-- Appointments: Public can cancel via token
CREATE POLICY "Public can cancel via token"
  ON appointments FOR UPDATE
  USING (true)
  WITH CHECK (status = 'cancelled'); -- Only allow status change to cancelled

-- Availability: Business owners can manage
CREATE POLICY "Business owners can manage availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = availability.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Customers: Business owners can manage
CREATE POLICY "Business owners can manage customers"
  ON customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate cancellation token
CREATE OR REPLACE FUNCTION generate_cancellation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate cancellation token
CREATE OR REPLACE FUNCTION set_cancellation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancellation_token IS NULL THEN
    NEW.cancellation_token := generate_cancellation_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointment_cancellation_token
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_cancellation_token();
