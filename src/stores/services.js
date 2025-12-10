import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useBusinessStore } from './business'

export const useServicesStore = defineStore('services', () => {
  const services = ref([])
  const loading = ref(false)
  const businessStore = useBusinessStore()

  async function loadServices() {
    loading.value = true
    try {
      if (!businessStore.business) return

      // Try Supabase first - join with categories for ordering
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          service_categories (
            id,
            name,
            display_order
          )
        `)
        .eq('business_id', businessStore.business.id)
        .order('created_at', { ascending: false })

      if (data) {
        // Flatten the data structure
        const flattened = data.map(service => ({
          ...service,
          category_name: service.service_categories?.name || null,
          category_display_order: service.service_categories?.display_order || null
        }))
        // Remove nested category object
        flattened.forEach(service => {
          delete service.service_categories
        })

        services.value = flattened
        await db.services.bulkPut(flattened)
      } else {
        // Try local DB
        const local = await db.services
          .where('business_id')
          .equals(businessStore.business.id)
          .toArray()
        services.value = local
      }
    } catch (error) {
      console.error('Load services error:', error)
      // Fallback: try without join
      try {
        const { data } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessStore.business.id)
          .order('created_at', { ascending: false })
        if (data) {
          services.value = data
          await db.services.bulkPut(data)
        }
      } catch (fallbackError) {
        console.error('Fallback load error:', fallbackError)
      }
    } finally {
      loading.value = false
    }
  }

  async function createService(serviceData) {
    loading.value = true
    try {
      if (!businessStore.business) throw new Error('No business loaded')

      const newService = {
        ...serviceData,
        business_id: businessStore.business.id,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store locally first
      await db.services.add(newService)
      services.value.push(newService)

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

      const updated = {
        ...services.value[index],
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update locally
      await db.services.update(serviceId, updated)
      services.value[index] = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('services')
          .update(updates)
          .eq('id', serviceId)
          .select()
          .single()

        if (data) {
          services.value[index] = data
          await db.services.update(serviceId, data)
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

