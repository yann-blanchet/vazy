import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useProfileStore } from './profile'

export const usePageSettingsStore = defineStore('pageSettings', () => {
  const pageSettings = ref(null)
  const loading = ref(false)
  const profileStore = useProfileStore()

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
        const serializedData = JSON.parse(JSON.stringify(data))
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

      const newSettings = {
        profile_id: profileStore.profile.id,
        title: settingsData.title || null,
        description: settingsData.description || null,
        photos: settingsData.photos || [],
        instagram: settingsData.instagram || null,
        phone: settingsData.phone || null,
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
          const serializedData = JSON.parse(JSON.stringify(data))
          await db.page_settings.put(serializedData)
          return { data, error: null }
        }
      } catch (error) {
        console.error('Supabase error:', error)
        // Store locally for offline sync
        await db.page_settings.add(newSettings)
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
      await db.page_settings.update(pageSettings.value.profile_id, updated)
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
          const serializedData = JSON.parse(JSON.stringify(data))
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

