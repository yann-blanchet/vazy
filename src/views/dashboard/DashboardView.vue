<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-lg">
      <div class="col">
        <div class="text-h4">Tableau de bord</div>
        <div class="text-grey-7">{{ businessStore.business?.business_name }}</div>
      </div>
    </div>

    <div class="row q-gutter-md">
      <!-- Stats Cards -->
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Aujourd'hui</div>
            <div class="text-h4 text-primary">
              {{ todayAppointments.length }}
            </div>
            <div class="text-caption text-grey">Rendez-vous</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Cette semaine</div>
            <div class="text-h4 text-primary">
              {{ weekAppointments.length }}
            </div>
            <div class="text-caption text-grey">Rendez-vous</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card clickable @click="$router.push('/services')">
          <q-card-section>
            <div class="text-h6">Services</div>
            <div class="text-h4 text-primary">
              {{ servicesStore.services.length }}
            </div>
            <div class="text-caption text-grey">Actifs</div>
            <q-btn
              flat
              dense
              size="sm"
              label="Gérer"
              icon="arrow_forward"
              class="q-mt-sm"
              @click.stop="$router.push('/services')"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">À venir</div>
            <div class="text-h4 text-primary">
              {{ appointmentsStore.upcomingAppointments.length }}
            </div>
            <div class="text-caption text-grey">Prochains</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

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
import { onMounted, computed } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useServicesStore } from '../../stores/services'
import { useAppointmentsStore } from '../../stores/appointments'
import dayjs from 'dayjs'

const businessStore = useBusinessStore()
const servicesStore = useServicesStore()
const appointmentsStore = useAppointmentsStore()

const today = dayjs().startOf('day')
const weekStart = dayjs().startOf('week')

const todayAppointments = computed(() => {
  return appointmentsStore.appointments.filter(apt => {
    const aptDate = dayjs(apt.appointment_date).startOf('day')
    return aptDate.isSame(today)
  })
})

const weekAppointments = computed(() => {
  return appointmentsStore.appointments.filter(apt => {
    const aptDate = dayjs(apt.appointment_date)
    return aptDate.isAfter(weekStart.subtract(1, 'day'))
  })
})

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

