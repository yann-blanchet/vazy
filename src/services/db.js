import Dexie from 'dexie'

export const db = new Dexie('VazyDB')

db.version(1).stores({
  businesses: 'id, slug, owner_id',
  services: 'id, business_id, category_id, [business_id+visible]',
  service_categories: 'id, business_id, [business_id+display_order]',
  appointments: 'id, business_id, customer_email, appointment_date, [business_id+appointment_date]',
  availability: 'id, business_id, date, [business_id+date]',
  customers: 'id, business_id, email, [business_id+email]',
  syncQueue: '++id, table_name, record_id, action, synced'
})

export default db

