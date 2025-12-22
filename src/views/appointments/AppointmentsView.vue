<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col">
        <div class="text-h6">Rendez-vous</div>
      </div>
      <div class="col-auto">
        <q-btn label="Ajouter" color="primary" icon="add" @click="openNewAppointmentDialog" flat dense />
      </div>
    </div>

    <!-- Calendar View -->
    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <div class="row justify-center q-mb-sm">
          <div class="col-auto">
            <q-btn-toggle
              v-model="calendarViewMode"
              :options="[
                { label: 'Créneaux', value: 'hours', icon: 'schedule' },
                { label: 'Semaine', value: 'week', icon: 'view_week' }
              ]"
              dense
              unelevated
              rounded
              color="primary"
            />
          </div>
        </div>

        <!-- Vue créneaux (heures sur plusieurs jours) -->
        <div v-if="calendarViewMode === 'hours'" class="row q-col-gutter-sm">
          <!-- Colonnes par jour avec créneaux horaires -->
          <div
            v-for="day in timeGridDays"
            :key="day.date"
            class="col-12 col-md-4"
          >
            <div class="text-caption text-weight-medium q-mb-xs">
              {{ day.label }}
            </div>
            <div v-if="day.slots.length">
              <q-list dense bordered flat class="rounded-borders">
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

        <!-- Vue semaine (rendez-vous groupés par jour de la semaine en cours) -->
        <div v-else class="row q-col-gutter-sm">
          <div
            v-for="day in weekDays"
            :key="day.date"
            class="col-12 col-sm-6 col-md-3"
          >
            <div class="text-caption text-weight-medium q-mb-xs">
              {{ day.label }}
            </div>
            <div class="text-caption text-grey-7 q-mb-xs">
              {{ day.appointments.length }} rendez-vous
            </div>

            <q-list v-if="day.appointments.length" dense bordered flat class="rounded-borders">
              <q-item
                v-for="apt in day.appointments"
                :key="apt.id"
                clickable
                v-ripple
                @click="editAppointment(apt)"
              >
                <q-item-section>
                  <q-item-label>{{ apt.customer_name }}</q-item-label>
                  <q-item-label caption>
                    {{ formatTime(apt.appointment_date) }} • {{ apt.service_name }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="getStatusColor(apt.status)" />
                </q-item-section>
              </q-item>
            </q-list>

            <div v-else class="text-grey-6 text-caption q-mt-sm">
              Aucun rendez-vous
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppointmentsStore } from '../../stores/appointments'
import { useServicesStore } from '../../stores/services'
import { useBusinessStore } from '../../stores/business'
import { useQuasar } from 'quasar'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
dayjs.locale('fr')

const router = useRouter()
const appointmentsStore = useAppointmentsStore()
const servicesStore = useServicesStore()
const businessStore = useBusinessStore()
const $q = useQuasar()
const { showNotification } = useNotifications()

const calendarViewMode = ref('hours')
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))

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


// Calendar computed properties
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

    const slotStart = current
    const slotEnd = current.add(1, 'hour')

    const slotAppointments = appointmentsStore.appointments
      .filter(apt => {
        const aptStart = dayjs(apt.appointment_date)
        const durationMinutes = apt.service_duration || 60
        const aptEnd = aptStart.add(durationMinutes, 'minute')
        // Chevauchement entre [aptStart, aptEnd[ et [slotStart, slotEnd[
        return aptStart.isBefore(slotEnd) && aptEnd.isAfter(slotStart)
      })
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

// Vue semaine : rendez-vous groupés par jour de la semaine en cours
const currentWeekStart = computed(() => dayjs().startOf('isoWeek'))

const weekDays = computed(() => {
  const start = currentWeekStart.value

  return Array.from({ length: 7 }).map((_, index) => {
    const date = start.add(index, 'day')
    const dateStr = date.format('YYYY-MM-DD')

    const dayAppointments = appointmentsStore.appointments
      .filter(apt =>
        dayjs(apt.appointment_date).format('YYYY-MM-DD') === dateStr
      )
      .sort(
        (a, b) =>
          new Date(a.appointment_date) - new Date(b.appointment_date)
      )

    return {
      date: dateStr,
      label: date.format('dddd D/MM'),
      appointments: dayAppointments
    }
  })
})

onMounted(async () => {
  await appointmentsStore.loadAppointments()
  await servicesStore.loadServices()
})

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function handleSlotClick(day, slot) {
  if (slot.appointments.length) {
    editAppointment(slot.appointments[0])
  } else {
    // Rediriger vers la nouvelle vue avec la date et l'heure pré-remplies
    router.push({
      name: 'appointment-new',
      query: {
        date: day.date,
        time: slot.time
      }
    })
  }
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

function getStatusLabel(status) {
  const labels = {
    confirmed: 'Confirmé',
    completed: 'Terminé',
    cancelled: 'Annulé',
    'no-show': 'Absent'
  }
  return labels[status] || status
}

function openNewAppointmentDialog() {
  router.push({ name: 'appointment-new' })
}

function editAppointment(apt) {
  router.push({ name: 'appointment-edit', params: { id: apt.id } })
}

async function markCompleted(apt) {
  await appointmentsStore.updateAppointment(apt.id, { status: 'completed' })
  showNotification({
    type: 'success',
    message: 'Rendez-vous marqué comme terminé'
  })
}

async function markNoShow(apt) {
  await appointmentsStore.updateAppointment(apt.id, { status: 'no-show' })
  showNotification({
    type: 'warning',
    message: 'Rendez-vous marqué comme absent'
  })
}

async function deleteAppointment(aptId) {
  $q.dialog({
    title: 'Confirmer',
    message: 'Êtes-vous sûr de vouloir supprimer ce rendez-vous ?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const { error } = await appointmentsStore.deleteAppointment(aptId)
    if (error) {
      showNotification({
        type: 'error',
        message: error.message || 'Erreur lors de la suppression'
      })
    } else {
      showNotification({
        type: 'success',
        message: 'Rendez-vous supprimé'
      })
    }
  })
}
</script>
