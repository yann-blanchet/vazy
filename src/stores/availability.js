import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useBusinessStore } from './business'

export const useAvailabilityStore = defineStore('availability', () => {
  const blockedDates = ref([])
  const loading = ref(false)
  const businessStore = useBusinessStore()

  async function blockDate(blockData) {
    loading.value = true
    try {
      if (!businessStore.business) {
        throw new Error('Aucun commerce trouvé')
      }

      const { data, error } = await supabase
        .from('availability')
        .insert({
          business_id: businessStore.business.id,
          date: blockData.date,
          start_time: blockData.start_time || null,
          end_time: blockData.end_time || null,
          is_available: false,
          reason: blockData.reason || null
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        blockedDates.value.push(data)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Block date error:', error)
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function loadBlockedDates(filters = {}) {
    loading.value = true
    try {
      if (!businessStore.business) return

      let query = supabase
        .from('availability')
        .select('*')
        .eq('business_id', businessStore.business.id)
        .eq('is_available', false)

      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      query = query.order('date', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      if (data) {
        blockedDates.value = data
      }

      return { data, error: null }
    } catch (error) {
      console.error('Load blocked dates error:', error)
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function unblockDate(id) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', id)

      if (error) throw error

      blockedDates.value = blockedDates.value.filter(bd => bd.id !== id)

      return { error: null }
    } catch (error) {
      console.error('Unblock date error:', error)
      return { error }
    } finally {
      loading.value = false
    }
  }

  return {
    blockedDates,
    loading,
    blockDate,
    loadBlockedDates,
    unblockDate
  }
})

