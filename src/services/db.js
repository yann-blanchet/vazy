import Dexie from 'dexie'

export const db = new Dexie('VazyDB')

// Version 1: Initial schema (deprecated - kept for migration)
db.version(1).stores({
  businesses: 'id, slug, owner_id',
  services: 'id, business_id, category_id, [business_id+visible]',
  service_categories: 'id, business_id, [business_id+display_order]',
  appointments: 'id, business_id, customer_email, appointment_date, [business_id+appointment_date]',
  availability: 'id, business_id, date, [business_id+date]',
  customers: 'id, business_id, email, [business_id+email]',
  syncQueue: '++id, table_name, record_id, action, synced'
})

// Version 2: Add calendar_events (deprecated - kept for migration)
db.version(2).stores({
  businesses: 'id, slug, owner_id',
  services: 'id, business_id, category_id, [business_id+visible]',
  service_categories: 'id, business_id, [business_id+display_order]',
  appointments: 'id, business_id, customer_email, appointment_date, [business_id+appointment_date]',
  calendar_events: 'id, profile_id, type, start_at, [profile_id+type], [profile_id+start_at]',
  availability: 'id, business_id, date, [business_id+date]',
  customers: 'id, business_id, email, [business_id+email]',
  syncQueue: '++id, table_name, record_id, action, synced'
})

// Version 3: New schema with profiles, page_settings, category as TEXT
db.version(3).stores({
  profiles: 'id, slug, profile_type, is_active',
  services: 'id, profile_id, category, is_active, position, [profile_id+is_active]',
  calendar_events: 'id, profile_id, type, start_at, [profile_id+type], [profile_id+start_at]',
  page_settings: 'profile_id',
  syncQueue: '++id, table_name, record_id, action, synced'
})

export default db

