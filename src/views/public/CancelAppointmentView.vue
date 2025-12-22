<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <q-card class="q-pa-md" style="min-width: 400px; max-width: 500px">
          <q-card-section class="text-center">
            <q-icon name="cancel" size="60px" :color="appointment ? 'negative' : 'grey'" class="q-mb-md" />
            <div class="text-h5 q-mb-sm">
              {{ appointment ? 'Annuler le rendez-vous' : 'Rendez-vous introuvable' }}
            </div>
          </q-card-section>

          <q-card-section v-if="appointment">
            <div class="q-mb-md">
              <div class="text-subtitle2 text-grey-7">Détails du rendez-vous</div>
              <q-list bordered>
                <q-item>
                  <q-item-section>
                    <q-item-label>Service</q-item-label>
                    <q-item-label caption>{{ appointment.service_name }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label>Date et heure</q-item-label>
                    <q-item-label caption>
                      {{ formatDate(appointment.appointment_date) }} à {{ formatTime(appointment.appointment_date) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label>Client</q-item-label>
                    <q-item-label caption>{{ appointment.customer_name }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <q-btn v-if="appointment.status === 'confirmed'" label="Annuler ce rendez-vous" color="negative"
              :loading="cancelling" @click="cancelAppointment" unelevated class="full-width" />
            <div v-else class="text-center text-grey-7">
              Ce rendez-vous est déjà {{ appointment.status === 'cancelled' ? 'annulé' : 'terminé' }}
            </div>
          </q-card-section>

          <q-card-section v-else class="text-center text-grey-7">
            Le lien d'annulation est invalide ou a expiré.
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'

const route = useRoute()
const { showNotification } = useNotifications()

const appointment = ref(null)
const cancelling = ref(false)

onMounted(async () => {
  const token = route.params.token
  if (token) {
    await loadAppointment(token)
  }
})

async function loadAppointment(token) {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('cancellation_token', token)
      .eq('type', 'appointment')
      .single()

    if (data) {
      // Transform calendar_events to appointments format for compatibility
      appointment.value = {
        id: data.id,
        service_name: data.service_name,
        appointment_date: data.start_at,
        customer_name: data.client_name,
        status: data.status,
        cancellation_token: data.cancellation_token
      }
    }
  } catch (error) {
    console.error('Load appointment error:', error)
  }
}

async function cancelAppointment() {
  if (!appointment.value) return

  cancelling.value = true
  try {
    // Use cancellation_token for security (no auth required)
    const { error } = await supabase
      .from('calendar_events')
      .update({ status: 'cancelled' })
      .eq('cancellation_token', appointment.value.cancellation_token)
      .eq('type', 'appointment')

    if (error) throw error

    appointment.value.status = 'cancelled'

    showNotification({
      type: 'success',
      message: 'Rendez-vous annulé avec succès'
    })
  } catch (error) {
    console.error('Cancel error:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de l\'annulation'
    })
  } finally {
    cancelling.value = false
  }
}

function formatDate(date) {
  return dayjs(date).format('dddd D MMMM YYYY')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}
</script>
