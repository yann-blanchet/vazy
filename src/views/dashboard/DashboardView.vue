<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-lg">
      <div class="col">
        <div class="text-h4">Tableau de bord</div>
        <div class="text-grey-7">{{ businessStore.business?.business_name }}</div>
      </div>
    </div>

    <!-- Calendrier horaire : aujourd'hui et prochains jours -->
    <div class="row q-mt-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">Planning des créneaux</div>
                <div class="text-caption text-grey">
                  Créneaux horaires ouverts pour aujourd'hui et les prochains jours
                </div>
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <!-- Colonnes par jour avec créneaux horaires -->
              <div
                v-for="day in timeGridDays"
                :key="day.date"
                class="col-12 col-md-4"
              >
                <div class="text-subtitle2 q-mb-xs">
                  {{ day.label }}
                </div>
                <div v-if="day.slots.length">
                  <q-list dense bordered class="rounded-borders">
                    <q-item
                      v-for="slot in day.slots"
                      :key="slot.time"
                      :class="{ 'bg-grey-2': slot.hasAppointments }"
                      clickable
                      v-ripple
                      @click="handleSlotClick(day, slot)"
                    >
                      <q-item-section side top>
                        <q-item-label>{{ slot.time }}</q-item-label>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label v-if="slot.appointments.length">
                          {{ slot.appointments[0].customer_name }}
                        </q-item-label>
                        <q-item-label v-if="slot.appointments.length" caption>
                          {{ slot.appointments[0].service_name }}
                        </q-item-label>
                        <q-item-label v-else caption class="text-grey-6">
                          Libre
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="slot.appointments.length">
                        <q-badge :color="getStatusColor(slot.appointments[0].status)" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
                <div v-else class="text-grey-6 text-caption q-mt-sm">
                  Fermé
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog prise / édition de rendez-vous -->
    <q-dialog v-model="appointmentDialog.visible" persistent>
      <q-card style="max-width: 500px; width: 100%">
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
    <div class="row q-mt-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Prochains rendez-vous</div>
            
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
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useServicesStore } from '../../stores/services'
import { useAppointmentsStore } from '../../stores/appointments'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
dayjs.locale('fr')

const businessStore = useBusinessStore()
const servicesStore = useServicesStore()
const appointmentsStore = useAppointmentsStore()

// Nombre de jours affichés : aujourd'hui + les 6 prochains (semaine glissante)
const DAYS_AHEAD = 7

const dayKeyMap = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday'
}

function getOpeningForDate(date) {
  const isoDay = date.isoWeekday()
  const key = dayKeyMap[isoDay]
  return businessStore.business?.opening_hours?.[key] || null
}

function buildHourSlotsForDate(date) {
  const opening = getOpeningForDate(date)
  if (!opening || !opening.open || !opening.start || !opening.end) {
    return []
  }

  const slots = []
  const baseDate = date.format('YYYY-MM-DD')

  let current = dayjs(`${baseDate} ${opening.start}`)
  const end = dayjs(`${baseDate} ${opening.end}`)

  let breakStart = null
  let breakEnd = null
  if (opening.hasBreak && opening.breakStart && opening.breakEnd) {
    breakStart = dayjs(`${baseDate} ${opening.breakStart}`)
    breakEnd = dayjs(`${baseDate} ${opening.breakEnd}`)
  }

  while (current.isBefore(end)) {
    // Sauter la pause déjeuner
    if (
      breakStart &&
      breakEnd &&
      (current.isAfter(breakStart) || current.isSame(breakStart)) &&
      current.isBefore(breakEnd)
    ) {
      current = breakEnd
      continue
    }

    const slotAppointments = appointmentsStore.appointments
      .filter(apt =>
        dayjs(apt.appointment_date).isSame(current, 'hour')
      )
      .sort(
        (a, b) =>
          new Date(a.appointment_date) - new Date(b.appointment_date)
      )

    slots.push({
      time: current.format('HH:mm'),
      appointments: slotAppointments,
      hasAppointments: slotAppointments.length > 0
    })

    current = current.add(1, 'hour')
  }

  return slots
}

const timeGridDays = computed(() => {
  const start = dayjs().startOf('day')

  return Array.from({ length: DAYS_AHEAD }).map((_, index) => {
    const date = start.add(index, 'day')
    const slots = buildHourSlotsForDate(date)
    const isToday = index === 0

    return {
      date: date.format('YYYY-MM-DD'),
      label: isToday
        ? `Aujourd'hui - ${date.format('dddd D/MM')}`
        : date.format('dddd D/MM'),
      slots
    }
  })
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
  service_id: null
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
}

function openCreateDialog(day, slot) {
  appointmentDialog.visible = true
  appointmentDialog.isEdit = false
  appointmentDialog.appointmentId = null
  appointmentDialog.date = day.date
  appointmentDialog.time = slot.time
  appointmentDialog.displayDate = day.label
  appointmentDialog.displayTime = slot.time
  resetAppointmentForm()
}

function openEditDialog(appointment) {
  appointmentDialog.visible = true
  appointmentDialog.isEdit = true
  appointmentDialog.appointmentId = appointment.id
  appointmentDialog.date = dayjs(appointment.appointment_date).format('YYYY-MM-DD')
  appointmentDialog.time = dayjs(appointment.appointment_date).format('HH:mm')
  appointmentDialog.displayDate = dayjs(appointment.appointment_date).format('dddd D/MM')
  appointmentDialog.displayTime = appointmentDialog.time

  appointmentForm.customer_name = appointment.customer_name
  appointmentForm.customer_email = appointment.customer_email
  appointmentForm.customer_phone = appointment.customer_phone
  appointmentForm.service_id = appointment.service_id || null
}

function handleSlotClick(day, slot) {
  if (slot.appointments.length) {
    openEditDialog(slot.appointments[0])
  } else {
    openCreateDialog(day, slot)
  }
}

async function submitAppointment() {
  if (!businessStore.business) return

  const dateTime = dayjs(`${appointmentDialog.date} ${appointmentDialog.time}`).toISOString()

   // Récupérer les infos du service sélectionné pour garder le nom / prix / durée à jour
  const selectedService = servicesStore.services.find(
    s => s.id === appointmentForm.service_id
  )

  const servicePayload = selectedService
    ? {
        service_id: selectedService.id,
        service_name: selectedService.name,
        service_price: selectedService.price ?? null,
        service_duration: selectedService.duration ?? null
      }
    : {
        service_id: appointmentForm.service_id,
        service_name: null,
        service_price: null,
        service_duration: null
      }

  if (appointmentDialog.isEdit && appointmentDialog.appointmentId) {
    await appointmentsStore.updateAppointment(appointmentDialog.appointmentId, {
      customer_name: appointmentForm.customer_name,
      customer_email: appointmentForm.customer_email,
      customer_phone: appointmentForm.customer_phone,
      appointment_date: dateTime,
      ...servicePayload
    })
  } else {
    await appointmentsStore.createAppointment({
      business_id: businessStore.business.id,
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
</script>

