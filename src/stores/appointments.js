import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useProfileStore } from './profile'
import dayjs from 'dayjs'

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref([])
  const loading = ref(false)
  const profileStore = useProfileStore()

  async function loadAppointments(filters = {}) {
    loading.value = true
    try {
      if (!profileStore.profile) return

      // Get the profile_id
      const profileId = profileStore.profile.id

      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', profileId)
        .eq('type', 'appointment')

      if (filters.startDate) {
        query = query.gte('start_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('start_at', filters.endDate)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      query = query.order('start_at', { ascending: true })

      const { data, error } = await query

      if (data) {
        // Transform calendar_events to appointments format for compatibility
        const transformedData = data.map(event => ({
          id: event.id,
          business_id: event.profile_id, // For backward compatibility
          service_id: event.service_id,
          customer_name: event.client_name,
          customer_email: null, // Not in new schema
          customer_phone: event.client_phone,
          appointment_date: event.start_at,
          status: 'confirmed', // Not in new schema, default to confirmed
          service_name: null, // Not in new schema
          service_price: null, // Not in new schema
          service_duration: null, // Not in new schema, will be fetched from service
          notes: null, // Not in new schema
          cancellation_token: null, // Not in new schema
          created_at: event.created_at,
          updated_at: null
        }))
        
        appointments.value = transformedData
        await db.calendar_events.bulkPut(data)
      } else {
        // Try local DB
        let localQuery = db.calendar_events
          .where('profile_id')
          .equals(profileId)
          .and(event => event.type === 'appointment')

        if (filters.startDate) {
          localQuery = localQuery.filter(a =>
            dayjs(a.start_at).isAfter(dayjs(filters.startDate).subtract(1, 'day'))
          )
        }

        const local = await localQuery.toArray()
        
        // Transform for compatibility
        const transformedLocal = local.map(event => ({
          id: event.id,
          business_id: event.profile_id, // For backward compatibility
          service_id: event.service_id,
          customer_name: event.client_name,
          customer_email: null,
          customer_phone: event.client_phone,
          appointment_date: event.start_at,
          status: 'confirmed',
          service_name: null,
          service_price: null,
          service_duration: null,
          notes: null,
          cancellation_token: null,
          created_at: event.created_at,
          updated_at: null
        }))
        
        appointments.value = transformedLocal
      }
    } catch (error) {
      console.error('Load appointments error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createAppointment(appointmentData) {
    loading.value = true
    try {
      if (!profileStore.profile) {
        throw new Error('Profile not found')
      }

      // Get the profile_id
      const profileId = profileStore.profile.id

      // Calculate end_at based on service duration
      const startAt = new Date(appointmentData.appointment_date)
      const durationMinutes = appointmentData.service_duration || 60
      const endAt = new Date(startAt.getTime() + durationMinutes * 60000)

      // Generate cancellation token for easy cancellation
      const cancellationToken = crypto.randomUUID().replace(/-/g, '')

      const newEvent = {
        id: crypto.randomUUID(),
        profile_id: profileId,
        type: 'appointment',
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        client_name: appointmentData.customer_name,
        client_phone: appointmentData.customer_phone || null,
        service_id: appointmentData.service_id || null,
        created_at: new Date().toISOString()
      }

      // Insert directly to Supabase (no auth required for public booking)
      // This uses the anon key which has permission via RLS policy
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(newEvent)
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      if (data) {
        // Store locally for offline access (if user is business owner)
        try {
          await db.calendar_events.put(data)
        } catch (dbError) {
          // Ignore local storage errors for public bookings
          console.warn('Local storage error (expected for public):', dbError)
        }

        // Transform to appointments format for compatibility
        const transformedData = {
          id: data.id,
          business_id: data.profile_id, // For backward compatibility
          service_id: data.service_id,
          customer_name: data.client_name,
          customer_email: null,
          customer_phone: data.client_phone,
          appointment_date: data.start_at,
          status: 'confirmed',
          service_name: null,
          service_price: null,
          service_duration: null,
          notes: null,
          cancellation_token: null,
          created_at: data.created_at,
          updated_at: null
        }

        return { data: transformedData, error: null }
      }

      return { data: null, error: new Error('No data returned') }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updateAppointment(appointmentId, updates) {
    loading.value = true
    try {
      const index = appointments.value.findIndex(a => a.id === appointmentId)
      if (index === -1) throw new Error('Appointment not found')

      // Transform updates to calendar_events format
      const eventUpdates = {}
      if (updates.appointment_date !== undefined) {
        eventUpdates.start_at = updates.appointment_date
        // Calculate end_at if duration is available (need to fetch from service)
        const duration = updates.service_duration || appointments.value[index].service_duration || 60
        const startAt = new Date(updates.appointment_date)
        eventUpdates.end_at = new Date(startAt.getTime() + duration * 60000).toISOString()
      }
      if (updates.customer_name !== undefined) eventUpdates.client_name = updates.customer_name
      if (updates.customer_phone !== undefined) eventUpdates.client_phone = updates.customer_phone
      if (updates.service_id !== undefined) eventUpdates.service_id = updates.service_id

      // Update locally
      const localEvent = await db.calendar_events.get(appointmentId)
      if (localEvent) {
        const updatedLocal = { ...localEvent, ...eventUpdates }
        await db.calendar_events.update(appointmentId, updatedLocal)
      }

      // Update transformed appointments array
      const updated = {
        ...appointments.value[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      appointments.value[index] = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .update(eventUpdates)
          .eq('id', appointmentId)
          .select()
          .single()

        if (data) {
          // Update local DB
          await db.calendar_events.update(appointmentId, data)
          
          // Update transformed appointments array
          const transformedData = {
            id: data.id,
            business_id: data.profile_id, // For backward compatibility
            service_id: data.service_id,
            customer_name: data.client_name,
            customer_email: null,
            customer_phone: data.client_phone,
            appointment_date: data.start_at,
            status: 'confirmed',
            service_name: null,
            service_price: null,
            service_duration: null,
            notes: null,
            cancellation_token: null,
            created_at: data.created_at,
            updated_at: null
          }
          appointments.value[index] = transformedData
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

  async function deleteAppointment(appointmentId) {
    loading.value = true
    try {
      // Remove locally
      await db.calendar_events.delete(appointmentId)
      appointments.value = appointments.value.filter(a => a.id !== appointmentId)

      // Sync to Supabase
      try {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', appointmentId)
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

  const upcomingAppointments = computed(() => {
    const now = new Date()
    return appointments.value
      .filter(a => new Date(a.appointment_date) >= now)
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
  })

  const appointmentsByDate = computed(() => {
    const grouped = {}
    appointments.value.forEach(apt => {
      const date = dayjs(apt.appointment_date).format('YYYY-MM-DD')
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(apt)
    })
    return grouped
  })

  return {
    appointments,
    upcomingAppointments,
    appointmentsByDate,
    loading,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  }
})

