import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useProfileStore } from './profile'

export const useServicesStore = defineStore('services', () => {
  const services = ref([])
  const loading = ref(false)
  const profileStore = useProfileStore()

  async function loadServices() {
    loading.value = true
    try {
      if (!profileStore.profile) return

      // Try Supabase first
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('profile_id', profileStore.profile.id)
        .eq('is_active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (data) {
        // Transform to include price and duration for compatibility
        const transformed = data.map(service => ({
          ...service,
          price: service.price_cents / 100, // Convert cents to decimal
          duration: service.duration_minutes,
          visible: service.is_active,
          business_id: service.profile_id // For backward compatibility
        }))
        
        services.value = transformed
        await db.services.bulkPut(data) // Store original format
      } else {
        // Try local DB
        const local = await db.services
          .where('profile_id')
          .equals(profileStore.profile.id)
          .and(service => service.is_active === true)
          .toArray()
        
        // Transform for compatibility
        const transformed = local.map(service => ({
          ...service,
          price: service.price_cents / 100,
          duration: service.duration_minutes,
          visible: service.is_active,
          business_id: service.profile_id
        }))
        
        services.value = transformed
      }
    } catch (error) {
      console.error('Load services error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createService(serviceData) {
    loading.value = true
    try {
      if (!profileStore.profile) throw new Error('No profile loaded')

      // Get max position for ordering
      const maxPosition = services.value.length > 0
        ? Math.max(...services.value.map(s => s.position || 0))
        : -1

      const newService = {
        id: crypto.randomUUID(),
        profile_id: profileStore.profile.id,
        category: serviceData.category || null,
        name: serviceData.name,
        duration_minutes: serviceData.duration || serviceData.duration_minutes || 60,
        price_cents: Math.round((serviceData.price || 0) * 100), // Convert to cents
        is_active: serviceData.visible !== false,
        position: maxPosition + 1,
        created_at: new Date().toISOString()
      }

      // Store locally first
      await db.services.add(newService)
      
      // Add to services array with transformation
      const transformed = {
        ...newService,
        price: newService.price_cents / 100,
        duration: newService.duration_minutes,
        visible: newService.is_active,
        business_id: newService.profile_id
      }
      services.value.push(transformed)

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('services')
          .insert(newService)
          .select()
          .single()

        if (data) {
          const index = services.value.findIndex(s => s.id === newService.id)
          if (index !== -1) {
            services.value[index] = data
            await db.services.update(newService.id, data)
          }
        }
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { data: newService, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updateService(serviceId, updates) {
    loading.value = true
    try {
      const index = services.value.findIndex(s => s.id === serviceId)
      if (index === -1) throw new Error('Service not found')

      // Transform updates to new format
      const eventUpdates = {}
      if (updates.name !== undefined) eventUpdates.name = updates.name
      if (updates.category !== undefined) eventUpdates.category = updates.category || null
      if (updates.duration !== undefined) eventUpdates.duration_minutes = updates.duration
      if (updates.price !== undefined) eventUpdates.price_cents = Math.round(updates.price * 100)
      if (updates.visible !== undefined) eventUpdates.is_active = updates.visible

      // Update locally
      const localService = await db.services.get(serviceId)
      if (localService) {
        const updatedLocal = { ...localService, ...eventUpdates }
        await db.services.update(serviceId, updatedLocal)
      }

      // Update transformed services array
      const updated = {
        ...services.value[index],
        ...updates
      }
      services.value[index] = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('services')
          .update(eventUpdates)
          .eq('id', serviceId)
          .select()
          .single()

        if (data) {
          await db.services.update(serviceId, data)
          
          // Update transformed array
          const transformed = {
            ...data,
            price: data.price_cents / 100,
            duration: data.duration_minutes,
            visible: data.is_active,
            business_id: data.profile_id
          }
          services.value[index] = transformed
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

  async function deleteService(serviceId) {
    loading.value = true
    try {
      // Remove locally
      await db.services.delete(serviceId)
      services.value = services.value.filter(s => s.id !== serviceId)

      // Sync to Supabase
      try {
        await supabase
          .from('services')
          .delete()
          .eq('id', serviceId)
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      loading.value = false
    }
  }

  const visibleServices = computed(() => {
    return services.value.filter(s => s.visible)
  })

  return {
    services,
    visibleServices,
    loading,
    loadServices,
    createService,
    updateService,
    deleteService
  }
})

