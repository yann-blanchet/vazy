import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useBusinessStore } from './business'
import dayjs from 'dayjs'

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref([])
  const loading = ref(false)
  const businessStore = useBusinessStore()

  async function loadAppointments(filters = {}) {
    loading.value = true
    try {
      if (!businessStore.business) return

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessStore.business.id)

      if (filters.startDate) {
        query = query.gte('appointment_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('appointment_date', filters.endDate)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      query = query.order('appointment_date', { ascending: true })

      const { data, error } = await query

      if (data) {
        appointments.value = data
        await db.appointments.bulkPut(data)
      } else {
        // Try local DB
        let localQuery = db.appointments
          .where('business_id')
          .equals(businessStore.business.id)

        if (filters.startDate) {
          localQuery = localQuery.filter(a =>
            dayjs(a.appointment_date).isAfter(dayjs(filters.startDate).subtract(1, 'day'))
          )
        }

        const local = await localQuery.toArray()
        appointments.value = local
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
      // Generate cancellation token for easy cancellation
      const cancellationToken = crypto.randomUUID().replace(/-/g, '')

      const newAppointment = {
        id: crypto.randomUUID(),
        business_id: appointmentData.business_id,
        service_id: appointmentData.service_id || null,
        customer_name: appointmentData.customer_name,
        customer_email: appointmentData.customer_email,
        customer_phone: appointmentData.customer_phone || null,
        appointment_date: appointmentData.appointment_date,
        status: 'confirmed',
        service_name: appointmentData.service_name || null,
        service_price: appointmentData.service_price || null,
        service_duration: appointmentData.service_duration || null,
        cancellation_token: cancellationToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insert directly to Supabase (no auth required for public booking)
      // This uses the anon key which has permission via RLS policy
      const { data, error } = await supabase
        .from('appointments')
        .insert(newAppointment)
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      if (data) {
        // Store locally for offline access (if user is business owner)
        try {
          await db.appointments.put(data)
        } catch (dbError) {
          // Ignore local storage errors for public bookings
          console.warn('Local storage error (expected for public):', dbError)
        }

        return { data, error: null }
      }

      return { data: newAppointment, error: null }
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

      const updated = {
        ...appointments.value[index],
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update locally
      await db.appointments.update(appointmentId, updated)
      appointments.value[index] = updated

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('appointments')
          .update(updates)
          .eq('id', appointmentId)
          .select()
          .single()

        if (data) {
          appointments.value[index] = data
          await db.appointments.update(appointmentId, data)
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
      await db.appointments.delete(appointmentId)
      appointments.value = appointments.value.filter(a => a.id !== appointmentId)

      // Sync to Supabase
      try {
        await supabase
          .from('appointments')
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

