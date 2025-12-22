import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(null)
  const loading = ref(false)

  const hasProfile = computed(() => !!profile.value)
  const profileSlug = computed(() => profile.value?.slug || null)

  async function loadProfile() {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try Supabase first
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        profile.value = data
        // Deep clone for Dexie storage
        const serializedData = JSON.parse(JSON.stringify(data))
        await db.profiles.put(serializedData)
      } else if (error && error.code !== 'PGRST116') {
        // Try local DB
        const local = await db.profiles
          .where('id')
          .equals(user.id)
          .first()
        if (local) {
          profile.value = local
        }
      }
    } catch (error) {
      console.error('Load profile error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createProfile(profileData) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Vous devez être connecté pour créer un profil.')
      }

      const newProfile = {
        id: user.id,
        name: profileData.name,
        slug: profileData.slug,
        profile_type: profileData.profile_type || 'tattoo',
        timezone: profileData.timezone || 'Europe/Paris',
        is_active: true,
        created_at: new Date().toISOString()
      }

      // Sync to Supabase first
      try {
        const { data, error } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }

        if (data) {
          profile.value = data
          const serializedData = JSON.parse(JSON.stringify(data))
          await db.profiles.put(serializedData)
          return { data, error: null }
        }
      } catch (error) {
        console.error('Supabase error:', error)
        // Store locally for offline sync
        await db.profiles.add(newProfile)
        profile.value = newProfile
        return { data: newProfile, error }
      }

      return { data: newProfile, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(updates) {
    loading.value = true
    try {
      if (!profile.value) throw new Error('No profile loaded')

      const updated = {
        ...profile.value,
        ...updates
      }

      // Update locally
      await db.profiles.update(profile.value.id, updated)
      profile.value = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.value.id)
          .select()
          .single()

        if (data) {
          profile.value = data
          const serializedData = JSON.parse(JSON.stringify(data))
          await db.profiles.update(profile.value.id, serializedData)
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

  function clearProfile() {
    profile.value = null
  }

  return {
    profile,
    hasProfile,
    profileSlug,
    loading,
    loadProfile,
    createProfile,
    updateProfile,
    clearProfile
  }
})

