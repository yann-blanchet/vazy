import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useProfileStore } from './profile'

export const usePageSettingsStore = defineStore('pageSettings', () => {
  const pageSettings = ref(null)
  const loading = ref(false)
  const profileStore = useProfileStore()

  // Helper function to properly serialize data for IndexedDB
  function serializeForIndexedDB(data) {
    if (!data) return data
    try {
      // Deep clone and ensure all nested objects/arrays are serializable
      const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
        // Handle undefined values
        if (value === undefined) return null
        // Ensure arrays are properly serialized
        if (Array.isArray(value)) {
          return value.map(item => {
            if (typeof item === 'object' && item !== null) {
              return JSON.parse(JSON.stringify(item))
            }
            return item
          })
        }
        return value
      }))
      return serialized
    } catch (error) {
      console.error('Serialization error:', error)
      // Fallback: create a clean object with only serializable fields
      return {
        profile_id: data.profile_id,
        title: data.title || null,
        description: data.description || null,
        photos: Array.isArray(data.photos) ? [...data.photos] : [],
        instagram: data.instagram || null,
        phone: data.phone || null,
        opening_hours: data.opening_hours ? JSON.parse(JSON.stringify(data.opening_hours)) : null,
        is_published: data.is_published !== false,
        updated_at: data.updated_at || new Date().toISOString()
      }
    }
  }

  async function loadPageSettings() {
    loading.value = true
    try {
      if (!profileStore.profile) return

      // Try Supabase first
      const { data, error } = await supabase
        .from('page_settings')
        .select('*')
        .eq('profile_id', profileStore.profile.id)
        .single()

      if (data) {
        pageSettings.value = data
        const serializedData = serializeForIndexedDB(data)
        await db.page_settings.put(serializedData)
      } else if (error && error.code !== 'PGRST116') {
        // Try local DB
        const local = await db.page_settings
          .where('profile_id')
          .equals(profileStore.profile.id)
          .first()
        if (local) {
          pageSettings.value = local
        }
      }
    } catch (error) {
      console.error('Load page settings error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createPageSettings(settingsData) {
    loading.value = true
    try {
      if (!profileStore.profile) throw new Error('No profile loaded')

      // Ensure opening_hours is properly serialized if present
      let openingHours = null
      if (settingsData.opening_hours) {
        try {
          openingHours = JSON.parse(JSON.stringify(settingsData.opening_hours))
        } catch (error) {
          console.error('Error serializing opening_hours:', error)
          openingHours = null
        }
      }

      const newSettings = {
        profile_id: profileStore.profile.id,
        title: settingsData.title || null,
        description: settingsData.description || null,
        photos: Array.isArray(settingsData.photos) ? [...settingsData.photos] : [],
        instagram: settingsData.instagram || null,
        phone: settingsData.phone || null,
        opening_hours: openingHours,
        is_published: settingsData.is_published !== false,
        updated_at: new Date().toISOString()
      }

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('page_settings')
          .insert(newSettings)
          .select()
          .single()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }

        if (data) {
          pageSettings.value = data
          const serializedData = serializeForIndexedDB(data)
          await db.page_settings.put(serializedData)
          return { data, error: null }
        }
      } catch (error) {
        console.error('Supabase error:', error)
        // Store locally for offline sync
        const serializedNewSettings = serializeForIndexedDB(newSettings)
        await db.page_settings.add(serializedNewSettings)
        pageSettings.value = newSettings
        return { data: newSettings, error }
      }

      return { data: newSettings, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updatePageSettings(updates) {
    loading.value = true
    try {
      if (!pageSettings.value) throw new Error('No page settings loaded')

      const updated = {
        ...pageSettings.value,
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update locally
      const serializedUpdated = serializeForIndexedDB(updated)
      await db.page_settings.update(pageSettings.value.profile_id, serializedUpdated)
      pageSettings.value = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('page_settings')
          .update(updates)
          .eq('profile_id', pageSettings.value.profile_id)
          .select()
          .single()

        if (data) {
          pageSettings.value = data
          const serializedData = serializeForIndexedDB(data)
          await db.page_settings.update(pageSettings.value.profile_id, serializedData)
        }
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { data: updated, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  return {
    pageSettings,
    loading,
    loadPageSettings,
    createPageSettings,
    updatePageSettings
  }
})



