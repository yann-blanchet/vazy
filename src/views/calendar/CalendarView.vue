<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-md items-center">
      <div class="col">
        <div class="text-h5">Calendrier</div>
      </div>
      <div class="col-auto">
        <q-btn-toggle
          v-model="viewMode"
          :options="[
            { label: 'Jour', value: 'day' },
            { label: 'Semaine', value: 'week' }
          ]"
          color="primary"
        />
      </div>
    </div>

    <q-card>
      <q-card-section>
        <div v-if="viewMode === 'day'">
          <q-date
            v-model="selectedDate"
            :events="dateEvents"
            event-color="primary"
            minimal
            class="q-mb-md"
          />
          <div class="text-h6 q-mb-md">
            {{ formatDate(selectedDate) }}
          </div>
          <q-list>
            <q-item
              v-for="apt in dayAppointments"
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
                  {{ apt.service_name }} - {{ formatTime(apt.appointment_date) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="getStatusColor(apt.status)">
                  {{ apt.status }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div v-else>
          <div class="row q-mb-md">
            <q-btn
              flat
              icon="chevron_left"
              @click="previousWeek"
            />
            <div class="col text-center text-h6">
              Semaine du {{ formatWeekRange() }}
            </div>
            <q-btn
              flat
              icon="chevron_right"
              @click="nextWeek"
            />
          </div>
          <q-calendar-week
            v-model="selectedDate"
            :events="weekEvents"
            event-color="primary"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppointmentsStore } from '../../stores/appointments'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
dayjs.locale('fr')

const appointmentsStore = useAppointmentsStore()
const viewMode = ref('day')
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))

const dayAppointments = computed(() => {
  return appointmentsStore.appointments.filter(apt => {
    return dayjs(apt.appointment_date).format('YYYY-MM-DD') === selectedDate.value
  }).sort((a, b) => 
    new Date(a.appointment_date) - new Date(b.appointment_date)
  )
})

const dateEvents = computed(() => {
  const dates = new Set()
  appointmentsStore.appointments.forEach(apt => {
    dates.add(dayjs(apt.appointment_date).format('YYYY/MM/DD'))
  })
  return Array.from(dates)
})

const weekEvents = computed(() => {
  return appointmentsStore.appointments.map(apt => ({
    date: dayjs(apt.appointment_date).format('YYYY-MM-DD'),
    time: dayjs(apt.appointment_date).format('HH:mm'),
    title: `${apt.customer_name} - ${apt.service_name}`
  }))
})

onMounted(async () => {
  await appointmentsStore.loadAppointments()
})

function formatDate(date) {
  return dayjs(date).format('dddd D MMMM YYYY')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function formatWeekRange() {
  const start = dayjs(selectedDate.value).startOf('isoWeek')
  const end = dayjs(selectedDate.value).endOf('isoWeek')
  return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`
}

function previousWeek() {
  selectedDate.value = dayjs(selectedDate.value).subtract(1, 'week').format('YYYY-MM-DD')
}

function nextWeek() {
  selectedDate.value = dayjs(selectedDate.value).add(1, 'week').format('YYYY-MM-DD')
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
  console.log('View appointment:', apt)
}
</script>

