import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { syncEngine } from '../services/sync'

export const useBusinessStore = defineStore('business', () => {
  const business = ref(null)
  const loading = ref(false)

  const hasBusiness = computed(() => !!business.value)
  const businessSlug = computed(() => business.value?.slug || null)

  async function loadBusiness() {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try Supabase first
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (data) {
        business.value = data
        // Deep clone for Dexie storage
        const serializedData = JSON.parse(JSON.stringify(data))
        await db.businesses.put(serializedData)
      } else if (error && error.code !== 'PGRST116') {
        // Try local DB
        const local = await db.businesses
          .where('owner_id')
          .equals(user.id)
          .first()
        if (local) {
          business.value = local
        }
      }
    } catch (error) {
      console.error('Load business error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createBusiness(businessData) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate ID if not provided
      const businessId = businessData.id || crypto.randomUUID()

      const newBusiness = {
        id: businessId,
        owner_id: user.id,
        business_name: businessData.business_name,
        slug: businessData.slug,
        address: businessData.address,
        city: businessData.city,
        description: businessData.description || null,
        logo_url: businessData.logo_url || null,
        opening_hours: JSON.parse(JSON.stringify(businessData.opening_hours)), // Deep clone
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Sync to Supabase first
      try {
        const { data, error } = await supabase
          .from('businesses')
          .insert(newBusiness)
          .select()
          .single()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }

        if (data) {
          business.value = data
          // Store locally after successful Supabase insert
          try {
            // Deep clone for Dexie storage
            const serializedData = JSON.parse(JSON.stringify(data))
            await db.businesses.put(serializedData)
          } catch (dbError) {
            console.warn('Local storage error:', dbError)
            // Continue even if local storage fails
          }
        }
      } catch (error) {
        console.error('Supabase error:', error)
        // Store locally for offline support
        try {
          // Deep clone for Dexie storage
          const serializedBusiness = JSON.parse(JSON.stringify(newBusiness))
          await db.businesses.put(serializedBusiness)
          business.value = newBusiness
        } catch (dbError) {
          console.error('Local storage error:', dbError)
        }
        throw error
      }

      return { data: business.value, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updateBusiness(updates) {
    loading.value = true
    try {
      if (!business.value) throw new Error('No business loaded')

      // Deep clone opening_hours if present to ensure it's serializable
      const serializedUpdates = { ...updates }
      if (updates.opening_hours) {
        serializedUpdates.opening_hours = JSON.parse(JSON.stringify(updates.opening_hours))
      }

      const updated = {
        ...business.value,
        ...serializedUpdates,
        updated_at: new Date().toISOString()
      }

      // Deep clone the entire object for Dexie storage
      const serializedForDexie = JSON.parse(JSON.stringify(updated))

      // Update locally
      await db.businesses.update(business.value.id, serializedForDexie)
      business.value = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('businesses')
          .update(updates)
          .eq('id', business.value.id)
          .select()
          .single()

        if (data) {
          business.value = data
          // Deep clone for Dexie storage
          const serializedData = JSON.parse(JSON.stringify(data))
          await db.businesses.update(business.value.id, serializedData)
        }
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { data: business.value, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  function clearBusiness() {
    business.value = null
  }

  return {
    business,
    loading,
    hasBusiness,
    businessSlug,
    loadBusiness,
    createBusiness,
    updateBusiness,
    clearBusiness
  }
})

