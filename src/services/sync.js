import { supabase } from './supabase'
import db from './db'

class SyncEngine {
  async syncToSupabase(table, record) {
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(record)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // Queue for retry
      await db.syncQueue.add({
        table_name: table,
        record_id: record.id,
        action: 'upsert',
        data: record,
        synced: false,
        created_at: new Date()
      })
      throw error
    }
  }

  async syncFromSupabase(table, filters = {}) {
    try {
      let query = supabase.from(table).select('*')

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const { data, error } = await error
      if (error) throw error

      // Store locally
      if (data && data.length > 0) {
        await db[table].bulkPut(data)
      }

      return data
    } catch (error) {
      console.error(`Sync error for ${table}:`, error)
      return []
    }
  }

  async retryFailedSyncs() {
    const failed = await db.syncQueue
      .where('synced')
      .equals(false)
      .toArray()

    for (const item of failed) {
      try {
        await this.syncToSupabase(item.table_name, item.data)
        await db.syncQueue.update(item.id, { synced: true })
      } catch (error) {
        console.error('Retry failed:', error)
      }
    }
  }
}

export const syncEngine = new SyncEngine()

