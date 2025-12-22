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
      // Vérifier l'authentification avec plusieurs méthodes
      let user = null
      
      // Essayer d'abord avec getSession (plus rapide)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user = session.user
      } else {
        // Si pas de session, essayer getUser
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error('Get user error:', userError)
          throw new Error('Vous devez être connecté pour créer un commerce. Veuillez vous connecter.')
        }
        user = userData
      }
      
      if (!user) {
        throw new Error('Vous devez être connecté pour créer un commerce. Veuillez vous connecter.')
      }

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

  async function loadBusinessPhotos() {
    if (!business.value) return []
    try {
      const { data, error } = await supabase
        .from('business_photos')
        .select('*')
        .eq('business_id', business.value.id)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Load photos error:', error)
      return []
    }
  }

  async function addBusinessPhoto(photoUrl) {
    if (!business.value) throw new Error('No business loaded')
    
    try {
      // Get current photos count
      const { count } = await supabase
        .from('business_photos')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.value.id)

      if (count >= 4) {
        throw new Error('Maximum 4 photos allowed')
      }

      const newPhoto = {
        business_id: business.value.id,
        photo_url: photoUrl,
        display_order: count || 0
      }

      const { data, error } = await supabase
        .from('business_photos')
        .insert(newPhoto)
        .select()
        .single()

      if (error) throw error

      // Update cover_photo_url if this is the first photo
      if (count === 0) {
        await updateBusiness({ cover_photo_url: photoUrl })
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function deleteBusinessPhoto(photoId) {
    if (!business.value) throw new Error('No business loaded')
    
    try {
      // Get photo to delete
      const { data: photo } = await supabase
        .from('business_photos')
        .select('*')
        .eq('id', photoId)
        .single()

      if (!photo) throw new Error('Photo not found')

      // Delete photo
      const { error } = await supabase
        .from('business_photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      // Reorder remaining photos
      const { data: remainingPhotos } = await supabase
        .from('business_photos')
        .select('*')
        .eq('business_id', business.value.id)
        .order('display_order', { ascending: true })

      // Update display_order for remaining photos
      if (remainingPhotos && remainingPhotos.length > 0) {
        for (let i = 0; i < remainingPhotos.length; i++) {
          await supabase
            .from('business_photos')
            .update({ display_order: i })
            .eq('id', remainingPhotos[i].id)
        }

        // Update cover_photo_url to first photo
        await updateBusiness({ cover_photo_url: remainingPhotos[0].photo_url })
      } else {
        // No photos left, clear cover_photo_url
        await updateBusiness({ cover_photo_url: null })
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function reorderBusinessPhotos(photoIds) {
    if (!business.value) throw new Error('No business loaded')
    
    try {
      // Update display_order for each photo
      for (let i = 0; i < photoIds.length; i++) {
        const { error } = await supabase
          .from('business_photos')
          .update({ display_order: i })
          .eq('id', photoIds[i])

        if (error) throw error
      }

      // Update cover_photo_url to first photo
      const { data: firstPhoto } = await supabase
        .from('business_photos')
        .select('photo_url')
        .eq('business_id', business.value.id)
        .eq('display_order', 0)
        .single()

      if (firstPhoto) {
        await updateBusiness({ cover_photo_url: firstPhoto.photo_url })
      }

      return { error: null }
    } catch (error) {
      return { error }
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
    clearBusiness,
    loadBusinessPhotos,
    addBusinessPhoto,
    deleteBusinessPhoto,
    reorderBusinessPhotos
  }
})

