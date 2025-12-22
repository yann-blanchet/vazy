-- ============================================================================
-- MIGRATION: Create calendar_events table and migrate from appointments
-- ============================================================================

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'blocked')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Only for appointments
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT, -- Added for appointments
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'confirmed', -- Added for appointments: confirmed, completed, cancelled, no-show
  service_name TEXT, -- Denormalized for history
  service_price DECIMAL(10,2),
  service_duration INTEGER,
  notes TEXT,
  cancellation_token TEXT UNIQUE, -- For cancellation links
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_calendar_events_profile_id ON calendar_events(profile_id);
CREATE INDEX idx_calendar_events_type ON calendar_events(type);
CREATE INDEX idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_end_at ON calendar_events(end_at);
CREATE INDEX idx_calendar_events_date_range ON calendar_events USING GIST (tstzrange(start_at, end_at));
CREATE INDEX idx_calendar_events_client_email ON calendar_events(client_email);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own calendar events
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own calendar events
CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own calendar events
CREATE POLICY "Users can update their own calendar events"
  ON calendar_events
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own calendar events
CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Public can create appointments (for booking) - NO AUTH REQUIRED
CREATE POLICY "Public can create appointments"
  ON calendar_events
  FOR INSERT
  WITH CHECK (type = 'appointment');

-- Public can read appointment by cancellation token (for cancellation page)
CREATE POLICY "Public can read appointment by token"
  ON calendar_events
  FOR SELECT
  USING (type = 'appointment' AND cancellation_token IS NOT NULL);

-- Public can cancel via token
CREATE POLICY "Public can cancel via token"
  ON calendar_events
  FOR UPDATE
  USING (type = 'appointment' AND cancellation_token IS NOT NULL)
  WITH CHECK (type = 'appointment' AND status = 'cancelled');

-- Migrate existing appointments to calendar_events
INSERT INTO calendar_events (
  id,
  profile_id,
  type,
  start_at,
  end_at,
  client_name,
  client_phone,
  client_email,
  service_id,
  status,
  service_name,
  service_price,
  service_duration,
  notes,
  cancellation_token,
  created_at,
  updated_at
)
SELECT 
  a.id,
  b.owner_id as profile_id,
  'appointment' as type,
  a.appointment_date as start_at,
  a.appointment_date + (COALESCE(a.service_duration, 60) || ' minutes')::INTERVAL as end_at,
  a.customer_name as client_name,
  a.customer_phone as client_phone,
  a.customer_email as client_email,
  a.service_id,
  a.status,
  a.service_name,
  a.service_price,
  a.service_duration,
  a.notes,
  a.cancellation_token,
  a.created_at,
  a.updated_at
FROM appointments a
INNER JOIN businesses b ON a.business_id = b.id
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

