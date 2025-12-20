<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-lg">
      <div class="col">
        <div class="text-h4">Tableau de bord</div>
      </div>
    </div>

    <!-- Public URL -->
    <div class="row q-mt-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="col">
                <div class="text-h6">URL publique</div>
                <div class="text-caption text-grey-7">Partagez ce lien avec vos clients pour qu'ils puissent réserver</div>
              </div>
            </div>
            <q-input :model-value="publicUrl" readonly outlined class="q-mt-md">
              <template v-slot:append>
                <q-btn icon="content_copy" flat @click="copyUrl" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Upcoming Appointments (on top) -->
    <div class="row q-mt-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="col">
                <div class="text-h6">Prochains rendez-vous</div>
              </div>
            </div>

            <q-list v-if="appointmentsStore.upcomingAppointments.length > 0">
              <q-item
                v-for="apt in appointmentsStore.upcomingAppointments.slice(0, 5)"
                :key="apt.id"
                clickable
                @click="viewAppointment(apt)"
              >
                <q-item-section avatar>
                  <q-icon name="event" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ apt.customer_name }}</q-item-label>
                  <q-item-label caption>
                    {{ formatDate(apt.appointment_date) }} à {{ formatTime(apt.appointment_date) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="getStatusColor(apt.status)">
                    {{ apt.status }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="text-center q-pa-md text-grey">
              Aucun rendez-vous à venir
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog prise / édition de rendez-vous -->
    <q-dialog v-model="appointmentDialog.visible" persistent>
      <q-card style="max-width: 500px; width: 90vw">
        <q-card-section>
          <div class="text-h6">
            {{ appointmentDialog.isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ dialogDisplayDate }} <span v-if="dialogDisplayTime">à {{ dialogDisplayTime }}</span>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="submitAppointment">
            <q-input
              v-model="appointmentForm.customer_name"
              label="Nom du client"
              dense
              outlined
              class="q-mb-sm"
              :rules="[val => !!val || 'Requis']"
            />
            <q-input
              v-model="appointmentForm.customer_email"
              label="Email"
              type="email"
              dense
              outlined
              class="q-mb-sm"
            />
            <q-input
              v-model="appointmentForm.customer_phone"
              label="Téléphone"
              dense
              outlined
              class="q-mb-sm"
            />
            <q-select
              v-model="appointmentForm.service_id"
              :options="serviceOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Service"
              dense
              outlined
              class="q-mb-sm"
            />
            <q-input
              v-model.number="appointmentForm.duration"
              type="number"
              label="Durée (minutes)"
              dense
              outlined
              class="q-mb-sm"
              :min="5"
              :step="5"
            />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="appointmentDialog.date"
                  label="Date"
                  type="date"
                  dense
                  outlined
                  class="q-mb-sm"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="appointmentDialog.time"
                  label="Heure"
                  type="time"
                  dense
                  outlined
                  class="q-mb-sm"
                />
              </div>
            </div>
            <div class="row justify-end q-gmt-md q-gutter-sm">
              <q-btn flat label="Annuler" color="primary" v-close-popup />
              <q-btn
                unelevated
                color="primary"
                :label="appointmentDialog.isEdit ? 'Enregistrer' : 'Créer'"
                type="submit"
                :loading="appointmentsStore.loading"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Upcoming Appointments -->
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useServicesStore } from '../../stores/services'
import { useAppointmentsStore } from '../../stores/appointments'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
dayjs.locale('fr')

const businessStore = useBusinessStore()
const servicesStore = useServicesStore()
const appointmentsStore = useAppointmentsStore()
const { showNotification } = useNotifications()

const publicUrl = computed(() => {
  if (businessStore.business?.slug) {
    return `${window.location.origin}/${businessStore.business.slug}`
  }
  return ''
})

const appointmentDialog = reactive({
  visible: false,
  isEdit: false,
  date: null,
  time: null,
  appointmentId: null,
  displayDate: '',
  displayTime: ''
})

const appointmentForm = reactive({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  service_id: null,
  duration: null // en minutes
})

const serviceOptions = computed(() =>
  servicesStore.services.map(s => ({
    id: s.id,
    name: s.name
  }))
)

const dialogDisplayDate = computed(() =>
  appointmentDialog.date
    ? dayjs(appointmentDialog.date).format('DD/MM/YYYY')
    : ''
)

const dialogDisplayTime = computed(() => appointmentDialog.time || '')

function resetAppointmentForm() {
  appointmentForm.customer_name = ''
  appointmentForm.customer_email = ''
  appointmentForm.customer_phone = ''
  appointmentForm.service_id = null
  appointmentForm.duration = null
}

function openEditDialog(appointment) {
  appointmentDialog.visible = true
  appointmentDialog.isEdit = true
  appointmentDialog.appointmentId = appointment.id
  appointmentDialog.date = dayjs(appointment.appointment_date).format('YYYY-MM-DD')
  appointmentDialog.time = dayjs(appointment.appointment_date).format('HH:mm')

  appointmentForm.customer_name = appointment.customer_name
  appointmentForm.customer_email = appointment.customer_email
  appointmentForm.customer_phone = appointment.customer_phone
  appointmentForm.service_id = appointment.service_id || null
  appointmentForm.duration = appointment.service_duration || null
}

async function submitAppointment() {
  if (!businessStore.business) return

  const dateTime = dayjs(`${appointmentDialog.date} ${appointmentDialog.time}`).toISOString()

  // Récupérer les infos du service sélectionné pour garder le nom / prix / durée à jour
  const selectedService = servicesStore.services.find(
    s => s.id === appointmentForm.service_id
  )

  const effectiveDuration =
    appointmentForm.duration ||
    selectedService?.duration ||
    60

  const servicePayload = selectedService
    ? {
        service_id: selectedService.id,
        service_name: selectedService.name,
        service_price: selectedService.price ?? null,
        service_duration: effectiveDuration
      }
    : {
        service_id: appointmentForm.service_id,
        service_name: null,
        service_price: null,
        service_duration: effectiveDuration
      }

  if (appointmentDialog.isEdit && appointmentDialog.appointmentId) {
    await appointmentsStore.updateAppointment(appointmentDialog.appointmentId, {
      customer_name: appointmentForm.customer_name,
      customer_email: appointmentForm.customer_email,
      customer_phone: appointmentForm.customer_phone,
      appointment_date: dateTime,
      ...servicePayload
    })
  }

  appointmentDialog.visible = false
  // Recharger les rendez-vous pour mettre à jour la grille
  await appointmentsStore.loadAppointments()
}

onMounted(async () => {
  await servicesStore.loadServices()
  await appointmentsStore.loadAppointments()
})

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function getStatusColor(status) {
  const colors = {
    confirmed: 'primary',
    completed: 'positive',
    cancelled: 'negative',
    'no-show': 'warning'
  }
  return colors[status] || 'grey'
}

function viewAppointment(apt) {
  // Navigate to appointment details
  console.log('View appointment:', apt)
}

function copyUrl() {
  if (publicUrl.value) {
    navigator.clipboard.writeText(publicUrl.value)
    showNotification({
      message: 'URL copiée dans le presse-papiers',
      type: 'success',
      timeout: 2500
    })
  }
}
</script>

