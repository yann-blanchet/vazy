import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useProfileStore } from './profile'

export const useAvailabilityStore = defineStore('availability', () => {
  const blockedDates = ref([])
  const loading = ref(false)
  const profileStore = useProfileStore()

  async function blockDate(blockData) {
    loading.value = true
    try {
      if (!profileStore.profile) {
        throw new Error('Aucun profil trouvé')
      }

      // Convert date/time to timestamptz for calendar_events
      const startAt = blockData.start_time 
        ? `${blockData.date}T${blockData.start_time}:00`
        : `${blockData.date}T00:00:00`
      const endAt = blockData.end_time
        ? `${blockData.date}T${blockData.end_time}:00`
        : `${blockData.date}T23:59:59`

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          profile_id: profileStore.profile.id,
          type: 'blocked',
          start_at: startAt,
          end_at: endAt
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
      if (!profileStore.profile) return

      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', profileStore.profile.id)
        .eq('type', 'blocked')

      if (filters.startDate) {
        query = query.gte('start_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('end_at', filters.endDate)
      }

      query = query.order('start_at', { ascending: true })

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
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('type', 'blocked')

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

