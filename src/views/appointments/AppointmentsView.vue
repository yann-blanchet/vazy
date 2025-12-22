<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col">
        <div class="text-h6">Rendez-vous</div>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="add" @click="openNewAppointmentDialog" flat dense />
      </div>
    </div>

    <!-- Date Selector -->
    <q-card flat bordered class="q-mb-sm">
      <q-card-section class="q-pa-sm">
        <div class="row items-center justify-center">
          <q-btn
            icon="chevron_left"
            flat
            dense
            round
            size="sm"
            @click="previousDay"
            :disable="isToday"
            style="width: 32px; min-width: 32px"
          />
          <q-btn
            flat
            dense
            no-caps
            class="text-body2 q-mx-sm"
            @click="showDatePicker = true"
            style="min-width: 180px; max-width: 180px"
          >
            {{ formatSelectedDate() }}
          </q-btn>
          <q-btn
            icon="chevron_right"
            flat
            dense
            round
            size="sm"
            @click="nextDay"
            style="width: 32px; min-width: 32px"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Time Slots -->
    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <div v-if="daySlots.length > 0">
          <div class="text-caption text-grey-7 q-mb-sm">
            {{ dayAppointments.length }} rendez-vous
          </div>
          <q-list dense bordered flat class="rounded-borders">
            <q-item
              v-for="slot in daySlots"
              :key="slot.time"
              :class="{ 'bg-grey-2': slot.hasAppointments }"
              clickable
              v-ripple
              @click="handleSlotClick(slot)"
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
                  <span v-if="slot.appointments[0].service_duration" class="q-ml-xs">
                    ({{ slot.appointments[0].service_duration }} min)
                  </span>
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
        <div v-else class="text-center q-pa-lg">
          <div class="text-body2 text-grey-7">Fermé ce jour</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Date Picker Dialog -->
    <q-dialog v-model="showDatePicker">
      <q-card style="min-width: 300px">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">Sélectionner une date</div>
        </q-card-section>
        <q-card-section>
          <q-date
            v-model="selectedDate"
            :min="minDate"
            today-btn
            @update:model-value="showDatePicker = false"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Bottom Sheet: Add Options -->
    <q-dialog v-model="showAddOptionsSheet" position="bottom">
      <q-card class="bottom-sheet-card">
        <q-card-section class="row items-center q-pb-sm border-bottom">
          <div class="text-subtitle1">Ajouter</div>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" @click="showAddOptionsSheet = false" />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <q-list>
            <q-item clickable v-ripple @click="openAddAppointment">
              <q-item-section avatar>
                <q-icon name="event" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Rendez-vous</q-item-label>
                <q-item-label caption>Ajouter un nouveau rendez-vous</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="openAddBlockEvent">
              <q-item-section avatar>
                <q-icon name="block" color="grey-7" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Bloquer un créneau</q-item-label>
                <q-item-label caption>Rendre un créneau indisponible</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppointmentsStore } from '../../stores/appointments'
import { useServicesStore } from '../../stores/services'
import { useProfileStore } from '../../stores/profile'
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
const profileStore = useProfileStore()
const $q = useQuasar()
const { showNotification } = useNotifications()

// Default opening hours (can be stored in page_settings later)
const defaultOpeningHours = {
  monday: { open: true, start: '09:00', end: '18:00' },
  tuesday: { open: true, start: '09:00', end: '18:00' },
  wednesday: { open: true, start: '09:00', end: '18:00' },
  thursday: { open: true, start: '09:00', end: '18:00' },
  friday: { open: true, start: '09:00', end: '18:00' },
  saturday: { open: false, start: '09:00', end: '18:00' },
  sunday: { open: false, start: '09:00', end: '18:00' }
}

const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const showDatePicker = ref(false)
const showAddOptionsSheet = ref(false)

const minDate = computed(() => {
  return dayjs().format('YYYY-MM-DD')
})

const isToday = computed(() => {
  return selectedDate.value === dayjs().format('YYYY-MM-DD')
})

const isTomorrow = computed(() => {
  return selectedDate.value === dayjs().add(1, 'day').format('YYYY-MM-DD')
})

const isCustomDate = computed(() => {
  return !isToday.value && !isTomorrow.value
})

const dayAppointments = computed(() => {
  const dateStr = selectedDate.value
  return appointmentsStore.appointments
    .filter(apt =>
      dayjs(apt.appointment_date).format('YYYY-MM-DD') === dateStr
    )
    .sort(
      (a, b) =>
        new Date(a.appointment_date) - new Date(b.appointment_date)
    )
})

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
  // For now, use default opening hours (can be stored in page_settings later)
  return defaultOpeningHours[key] || null
}

const daySlots = computed(() => {
  const date = dayjs(selectedDate.value)
  const opening = getOpeningForDate(date)
  
  if (!opening || !opening.open || !opening.start || !opening.end) {
    return []
  }

  const slots = []
  const baseDate = selectedDate.value

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
    const slotEnd = current.add(15, 'minute')

    const slotAppointments = dayAppointments.value
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

    current = current.add(15, 'minute')
  }

  return slots
})

onMounted(async () => {
  await appointmentsStore.loadAppointments()
  await servicesStore.loadServices()
  
  // S'assurer que la date sélectionnée n'est pas dans le passé
  const today = dayjs().format('YYYY-MM-DD')
  if (dayjs(selectedDate.value).isBefore(today)) {
    selectedDate.value = today
  }
})

function selectToday() {
  selectedDate.value = dayjs().format('YYYY-MM-DD')
}

function selectTomorrow() {
  selectedDate.value = dayjs().add(1, 'day').format('YYYY-MM-DD')
}

function previousDay() {
  const previous = dayjs(selectedDate.value).subtract(1, 'day')
  const today = dayjs().startOf('day')
  
  // Ne pas permettre d'aller dans le passé
  if (previous.isBefore(today)) {
    return
  }
  
  selectedDate.value = previous.format('YYYY-MM-DD')
}

function nextDay() {
  selectedDate.value = dayjs(selectedDate.value).add(1, 'day').format('YYYY-MM-DD')
}

function formatSelectedDate() {
  const date = dayjs(selectedDate.value)
  if (isToday.value) {
    return date.format('dddd D MMMM')
  } else if (isTomorrow.value) {
    return date.format('dddd D MMMM')
  } else {
    return date.format('dddd D MMMM')
  }
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function handleSlotClick(slot) {
  if (slot.appointments.length) {
    editAppointment(slot.appointments[0])
  } else {
    // Rediriger vers la nouvelle vue avec la date et l'heure pré-remplies
    router.push({
      name: 'appointment-new',
      query: {
        date: selectedDate.value,
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
  showAddOptionsSheet.value = true
}

function openAddAppointment() {
  showAddOptionsSheet.value = false
  router.push({ name: 'appointment-new' })
}

function openAddBlockEvent() {
  showAddOptionsSheet.value = false
  router.push({ 
    name: 'block-date',
    query: { date: selectedDate.value }
  })
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

<style scoped>
.bottom-sheet-card {
  width: 100%;
  max-width: 100vw;
  border-radius: 16px 16px 0 0;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
