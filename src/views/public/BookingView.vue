<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="q-pa-md">
        <div v-if="loading" class="flex flex-center" style="min-height: 400px">
          <q-spinner size="50px" color="primary" />
        </div>

        <div v-else-if="business" class="max-width-800 q-mx-auto">
          <!-- Business Header -->
          <div class="text-center q-mb-lg">
            <div class="text-h4 q-mb-sm">{{ business.business_name }}</div>
            <div class="text-grey-7">{{ business.address }}, {{ business.city }}</div>
          </div>

          <!-- Booking Steps -->
          <q-stepper v-model="step" color="primary" animated class="q-mt-md">
            <!-- Step 1: Service Selection -->
            <q-step :name="1" title="Choisir un service" icon="spa" :done="step > 1">
              <q-list>
                <q-item v-for="service in visibleServices" :key="service.id" clickable @click="selectService(service)"
                  :class="{ 'bg-primary-1': selectedService?.id === service.id }">
                  <q-item-section>
                    <q-item-label>{{ service.name }}</q-item-label>
                    <q-item-label caption>{{ service.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="text-h6">{{ formatPrice(service.price) }}</div>
                    <div class="text-caption">{{ service.duration }} min</div>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="row justify-end q-mt-lg">
                <q-btn label="Suivant" color="primary" :disable="!selectedService" @click="step = 2" unelevated />
              </div>
            </q-step>

            <!-- Step 2: Date & Time -->
            <q-step :name="2" title="Choisir date et heure" icon="event" :done="step > 2">
              <div class="date-time-selection">
                <!-- Week Navigation -->
                <div class="row items-center justify-center q-mb-md">
                  <q-btn flat dense icon="chevron_left" @click="previousWeek" />
                  <div class="text-subtitle2 q-mx-md">
                    {{ weekStart.format('DD MMM') }} - {{ weekEnd.format('DD MMM YYYY') }}
                  </div>
                  <q-btn flat dense icon="chevron_right" @click="nextWeek" />
                </div>

                <!-- Desktop: Days Grid -->
                <div class="days-grid gt-xs">
                  <div v-for="day in weekDays" :key="day.date" class="day-column"
                    :class="{ 'day-disabled': !isDayAvailable(day.date) }">
                    <div class="day-header">
                      <div class="day-name">{{ day.dayName }}</div>
                      <div class="day-date">{{ day.dateLabel }}</div>
                    </div>
                    <div class="time-slots">
                      <q-btn v-for="slot in getAvailableSlotsForDay(day.date)" :key="slot" :label="slot"
                        :color="isSlotSelected(day.date, slot) ? 'primary' : 'grey-4'"
                        :text-color="isSlotSelected(day.date, slot) ? 'white' : 'dark'" size="sm" unelevated
                        class="time-slot-btn" @click="selectTimeSlot(day.date, slot)" />
                      <div v-if="getAvailableSlotsForDay(day.date).length === 0"
                        class="no-slots text-grey-6 text-caption">
                        Aucun créneau
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Mobile: Accordion List -->
                <div class="days-accordion xs">
                  <q-list bordered>
                    <q-expansion-item v-for="day in weekDays" :key="day.date"
                      :label="`${day.dayName} ${day.fullDateLabel}`" :disable="!isDayAvailable(day.date)"
                      :default-opened="getAvailableSlotsForDay(day.date).length > 0 && isDayAvailable(day.date)"
                      header-class="day-accordion-header" expand-icon-class="day-accordion-icon"
                      :class="{ 'day-disabled-accordion': !isDayAvailable(day.date) }">
                      <template v-slot:header>
                        <q-item-section>
                          <q-item-label>
                            {{ capitalizeFirst(day.dayName) }} {{ day.fullDateLabel }}
                          </q-item-label>
                        </q-item-section>
                        <q-item-section side v-if="getAvailableSlotsForDay(day.date).length > 0">
                          <q-badge :label="getAvailableSlotsForDay(day.date).length" color="primary" />
                        </q-item-section>
                      </template>

                      <q-card>
                        <q-card-section class="q-pa-sm">
                          <div v-if="getAvailableSlotsForDay(day.date).length > 0" class="time-slots-mobile">
                            <q-btn v-for="slot in getAvailableSlotsForDay(day.date)" :key="slot" :label="slot"
                              :color="isSlotSelected(day.date, slot) ? 'primary' : 'grey-4'"
                              :text-color="isSlotSelected(day.date, slot) ? 'white' : 'dark'" size="sm" unelevated
                              class="time-slot-btn-mobile q-mr-xs q-mb-xs" @click="selectTimeSlot(day.date, slot)" />
                          </div>
                          <div v-else class="text-center text-grey-6 q-pa-md">
                            Aucun créneau disponible
                          </div>
                        </q-card-section>
                      </q-card>
                    </q-expansion-item>
                  </q-list>
                </div>
              </div>

              <div class="row justify-between q-mt-lg">
                <q-btn flat label="Précédent" @click="step = 1" />
                <q-btn label="Suivant" color="primary" :disable="!selectedDate || !selectedTime" @click="step = 3"
                  unelevated />
              </div>
            </q-step>

            <!-- Step 3: Customer Info -->
            <q-step :name="3" title="Vos informations" icon="person" :done="step > 3">
              <q-form @submit="confirmBooking" class="q-gutter-md q-mt-md">
                <q-input v-model="customerForm.name" label="Nom complet *" :rules="[val => !!val || 'Requis']"
                  outlined />

                <q-input v-model="customerForm.email" label="Email *" type="email" :rules="[val => !!val || 'Requis']"
                  outlined />

                <q-input v-model="customerForm.phone" label="Téléphone *" :rules="[val => !!val || 'Requis']"
                  outlined />

                <div class="row justify-between q-mt-lg">
                  <q-btn flat label="Précédent" @click="step = 2" />
                  <q-btn type="submit" label="Confirmer" color="primary" :loading="bookingLoading" unelevated />
                </div>
              </q-form>
            </q-step>

            <!-- Step 4: Confirmation -->
            <q-step :name="4" title="Confirmation" icon="check_circle">
              <div class="text-center q-pa-lg">
                <q-icon name="check_circle" size="80px" color="positive" />
                <div class="text-h5 q-mt-md">Rendez-vous confirmé !</div>
                <div class="text-grey-7 q-mt-sm q-mb-md">
                  Un email de confirmation a été envoyé à {{ customerForm.email }}
                </div>
                <div class="text-caption text-grey-6 q-mt-md">
                  Vous pouvez annuler votre rendez-vous via le lien dans l'email de confirmation.
                </div>
                <div v-if="appointmentData?.cancellation_token" class="q-mt-md">
                  <q-separator class="q-mb-md" />
                  <div class="text-caption text-grey-7">
                    Lien d'annulation direct :
                  </div>
                  <q-input :model-value="cancelUrl" readonly outlined dense class="q-mt-xs">
                    <template v-slot:append>
                      <q-btn icon="content_copy" flat dense @click="copyCancelUrl" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-step>
          </q-stepper>
        </div>

        <div v-else class="text-center q-pa-lg">
          <q-icon name="error" size="60px" color="negative" />
          <div class="text-h6 q-mt-md">Commerce introuvable</div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useAppointmentsStore } from '../../stores/appointments'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.locale('fr')
dayjs.extend(customParseFormat)

const route = useRoute()
const appointmentsStore = useAppointmentsStore()
const { showNotification } = useNotifications()

const business = ref(null)
const services = ref([])
const loading = ref(true)
const step = ref(1)
const selectedService = ref(null)
const selectedDate = ref(null)
const selectedTime = ref(null)
const bookingLoading = ref(false)
const appointmentData = ref(null)
const currentWeekStart = ref(dayjs().startOf('week').add(1, 'day')) // Start from Monday

const customerForm = ref({
  name: '',
  email: '',
  phone: ''
})

const cancelUrl = computed(() => {
  if (appointmentData.value?.cancellation_token) {
    return `${window.location.origin}/cancel/${appointmentData.value.cancellation_token}`
  }
  return ''
})

function copyCancelUrl() {
  navigator.clipboard.writeText(cancelUrl.value)
  showNotification({
    type: 'success',
    message: 'Lien copié dans le presse-papiers'
  })
}

const visibleServices = computed(() => {
  return services.value.filter(s => s.visible)
})

onMounted(async () => {
  const slug = route.params.slug
  await loadBusiness(slug)
})

async function loadBusiness(slug) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .single()

    if (data) {
      business.value = data
      await loadServices(data.id)
    }
  } catch (error) {
    console.error('Load business error:', error)
  } finally {
    loading.value = false
  }
}

async function loadServices(businessId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('visible', true)

    if (data) {
      services.value = data
    }
  } catch (error) {
    console.error('Load services error:', error)
  }
}

function selectService(service) {
  selectedService.value = service
}

// Week navigation
const weekStart = computed(() => currentWeekStart.value)
const weekEnd = computed(() => currentWeekStart.value.add(6, 'days'))

const weekDays = computed(() => {
  const days = []

  for (let i = 0; i < 7; i++) {
    const date = weekStart.value.add(i, 'days')
    days.push({
      date: date.format('YYYY-MM-DD'),
      dayName: date.format('dddd'), // Will be in French due to locale (capitalize first letter)
      dateLabel: date.format('D MMM'),
      fullDateLabel: date.format('D MMMM') // Full date for mobile accordion (e.g., "16 décembre")
    })
  }

  return days
})


function previousWeek() {
  currentWeekStart.value = currentWeekStart.value.subtract(7, 'days')
}

function nextWeek() {
  currentWeekStart.value = currentWeekStart.value.add(7, 'days')
}

function isDayAvailable(date) {
  const today = dayjs()
  const checkDate = dayjs(date)
  return checkDate.isAfter(today.subtract(1, 'day'))
}

function getAvailableSlotsForDay(date) {
  if (!business.value || !isDayAvailable(date)) {
    return []
  }

  // Map French day names to English keys
  const dayNameMap = {
    'lundi': 'monday',
    'mardi': 'tuesday',
    'mercredi': 'wednesday',
    'jeudi': 'thursday',
    'vendredi': 'friday',
    'samedi': 'saturday',
    'dimanche': 'sunday'
  }

  const frenchDayName = dayjs(date).format('dddd').toLowerCase()
  const dayOfWeek = dayNameMap[frenchDayName] || frenchDayName
  const dayHours = business.value.opening_hours?.[dayOfWeek]

  // Debug log
  if (!dayHours) {
    console.log(`No hours for ${dayOfWeek} (${frenchDayName})`, business.value.opening_hours)
    return []
  }

  if (!dayHours.open) {
    return []
  }

  if (!dayHours.start || !dayHours.end) {
    console.log(`Missing start/end for ${dayOfWeek}`, dayHours)
    return []
  }

  // Parse opening hours
  const [startHour, startMin] = dayHours.start.split(':').map(Number)
  const [endHour, endMin] = dayHours.end.split(':').map(Number)

  const slots = []
  let currentHour = startHour
  let currentMin = startMin

  // Check for lunch break
  const hasBreak = dayHours.hasBreak
  let breakStart = null
  let breakEnd = null

  if (hasBreak && dayHours.breakStart && dayHours.breakEnd) {
    const [breakStartHour, breakStartMin] = dayHours.breakStart.split(':').map(Number)
    const [breakEndHour, breakEndMin] = dayHours.breakEnd.split(':').map(Number)
    breakStart = breakStartHour * 60 + breakStartMin
    breakEnd = breakEndHour * 60 + breakEndMin
  }

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Generate 30-minute slots
  let currentMinutes = startMinutes
  while (currentMinutes < endMinutes) {
    // Skip if in lunch break
    if (hasBreak && breakStart && breakEnd) {
      if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
        currentMinutes += 30
        continue
      }
    }

    const hour = Math.floor(currentMinutes / 60)
    const min = currentMinutes % 60
    slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)

    currentMinutes += 30
  }

  return slots
}

function selectTimeSlot(date, time) {
  selectedDate.value = date
  selectedTime.value = time
}

function isSlotSelected(date, time) {
  return selectedDate.value === date && selectedTime.value === time
}

function capitalizeFirst(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

async function confirmBooking() {
  bookingLoading.value = true
  try {
    const appointmentDate = dayjs(`${selectedDate.value} ${selectedTime.value}`).toISOString()

    const { data, error } = await appointmentsStore.createAppointment({
      business_id: business.value.id,
      service_id: selectedService.value.id,
      customer_name: customerForm.value.name,
      customer_email: customerForm.value.email,
      customer_phone: customerForm.value.phone,
      appointment_date: appointmentDate,
      service_name: selectedService.value.name,
      service_price: selectedService.value.price,
      service_duration: selectedService.value.duration
    })

    if (error) {
      showNotification({
        type: 'error',
        message: error.message || 'Erreur lors de la réservation'
      })
    } else {
      // Store appointment data for display
      appointmentData.value = data
      step.value = 4
      // TODO: Send confirmation email with cancellation link
    }
  } catch (error) {
    console.error('Booking error:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de la réservation'
    })
  } finally {
    bookingLoading.value = false
  }
}
</script>

<style scoped>
.max-width-800 {
  max-width: 800px;
}

.date-time-selection {
  padding: 16px 0;
}

/* Desktop Grid View */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  overflow-x: auto;
  padding: 8px 0;
}

.day-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.day-disabled {
  opacity: 0.5;
}

.day-header {
  text-align: center;
  padding: 8px 4px;
  margin-bottom: 8px;
}

.day-name {
  font-weight: 600;
  font-size: 14px;
  color: #424242;
  margin-bottom: 2px;
}

.day-date {
  font-size: 12px;
  color: #757575;
}

.time-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100px;
}

.time-slot-btn {
  width: 100%;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 4px;
}

.no-slots {
  text-align: center;
  padding: 8px;
  font-size: 11px;
}

/* Mobile Accordion View */
.days-accordion {
  display: none;
}

.days-accordion.xs {
  display: block;
}

.days-grid.gt-xs {
  display: grid;
}

.days-grid.xs {
  display: none;
}

.day-accordion-header {
  font-weight: 500;
  padding: 12px 16px;
}

.day-accordion-icon {
  color: #757575;
}

.day-disabled-accordion {
  opacity: 0.5;
}

.time-slots-mobile {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.time-slot-btn-mobile {
  min-width: 70px;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
}

@media (max-width: 600px) {
  .days-grid.gt-xs {
    display: none;
  }

  .days-accordion.xs {
    display: block;
  }
}
</style>
