<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col-auto">
        <q-btn flat icon="arrow_back" dense @click="goBack" />
      </div>
      <div class="col">
        <div class="text-h6">{{ isEdit ? 'Modifier' : 'Nouveau' }} rendez-vous</div>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <q-form ref="appointmentFormRef" @submit.prevent="saveAppointment" class="q-gutter-sm">
          <!-- Service Selection -->
          <q-select v-model="appointmentForm.service_id" :options="serviceOptions" option-value="id"
            option-label="name" emit-value map-options label="Service *" outlined dense
            :rules="[val => !!val || 'Service requis']" :disable="isEdit">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>{{ formatPrice(scope.opt.price) }} - {{ scope.opt.duration }}
                    min</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Date and Time -->
          <div class="row q-gutter-sm">
            <div class="col">
              <q-input v-model="appointmentForm.date" label="Date *" type="date" outlined dense
                :rules="[val => !!val || 'Date requise']" :min="minDate" />
            </div>
            <div class="col">
              <q-input v-model="appointmentForm.time" label="Heure *" type="time" outlined dense
                :rules="[val => !!val || 'Heure requise']" />
            </div>
          </div>

          <!-- Customer Information -->
          <q-separator class="q-my-sm" />
          <div class="text-caption text-grey-7 q-mb-xs">Informations client</div>

          <q-input v-model="appointmentForm.customer_name" label="Nom complet *" outlined dense
            :rules="[val => !!val || 'Nom requis']" />

          <div class="row q-gutter-sm">
            <div class="col">
              <q-input v-model="appointmentForm.customer_email" label="Email *" type="email" outlined dense
                :rules="[val => !!val || 'Email requis', val => /.+@.+\..+/.test(val) || 'Email invalide']" />
            </div>
            <div class="col">
              <q-input v-model="appointmentForm.customer_phone" label="Téléphone" outlined dense />
            </div>
          </div>

          <!-- Notes -->
          <q-input v-model="appointmentForm.notes" label="Notes (optionnel)" type="textarea" outlined dense rows="3" />

          <!-- Status (only for editing) -->
          <q-select v-if="isEdit" v-model="appointmentForm.status" :options="statusOptions" label="Statut"
            outlined dense />

          <div class="row justify-end q-mt-md">
            <q-btn flat label="Annuler" @click="goBack" dense />
            <q-btn type="submit" label="Enregistrer" color="primary" :loading="appointmentsStore.loading"
              flat dense />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppointmentsStore } from '../../stores/appointments'
import { useServicesStore } from '../../stores/services'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const appointmentsStore = useAppointmentsStore()
const servicesStore = useServicesStore()
const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const appointmentFormRef = ref(null)
const appointmentId = computed(() => route.params.id)
const isEdit = computed(() => !!appointmentId.value)

const appointmentForm = reactive({
  service_id: null,
  date: '',
  time: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  notes: '',
  status: 'confirmed'
})

const statusOptions = [
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'cancelled' },
  { label: 'Absent', value: 'no-show' }
]

const minDate = computed(() => {
  return dayjs().format('YYYY-MM-DD')
})

const serviceOptions = computed(() => {
  return servicesStore.services.map(service => ({
    id: service.id,
    name: service.name,
    price: service.price,
    duration: service.duration,
    description: service.description
  }))
})

onMounted(async () => {
  await servicesStore.loadServices()
  
  // Si on édite, charger les données du rendez-vous
  if (isEdit.value && appointmentId.value) {
    // S'assurer que les rendez-vous sont chargés
    if (appointmentsStore.appointments.length === 0) {
      await appointmentsStore.loadAppointments()
    }
    await loadAppointment()
  } else {
    // Si création, pré-remplir avec les paramètres de la route si disponibles
    if (route.query.date) {
      appointmentForm.date = route.query.date
    }
    if (route.query.time) {
      appointmentForm.time = route.query.time
    }
  }
})

async function loadAppointment() {
  const appointment = appointmentsStore.appointments.find(apt => apt.id === appointmentId.value)
  
  if (!appointment) {
    // Si le rendez-vous n'est pas dans le store, le charger
    await appointmentsStore.loadAppointments()
    const loadedAppointment = appointmentsStore.appointments.find(apt => apt.id === appointmentId.value)
    
    if (!loadedAppointment) {
      showNotification({
        type: 'error',
        message: 'Rendez-vous introuvable'
      })
      goBack()
      return
    }
    
    populateForm(loadedAppointment)
  } else {
    populateForm(appointment)
  }
}

function populateForm(apt) {
  const appointmentDate = dayjs(apt.appointment_date)
  
  Object.assign(appointmentForm, {
    service_id: apt.service_id || null,
    date: appointmentDate.format('YYYY-MM-DD'),
    time: appointmentDate.format('HH:mm'),
    customer_name: apt.customer_name || '',
    customer_email: apt.customer_email || '',
    customer_phone: apt.customer_phone || '',
    notes: apt.notes || '',
    status: apt.status || 'confirmed'
  })
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

function goBack() {
  router.push('/appointments')
}

async function saveAppointment() {
  // Validate form
  if (appointmentFormRef.value) {
    const valid = await appointmentFormRef.value.validate()
    if (!valid) {
      return
    }
  }

  try {
    if (!businessStore.business) {
      showNotification({
        type: 'error',
        message: 'Aucun commerce trouvé'
      })
      return
    }

    // Get selected service details
    const selectedService = servicesStore.services.find(s => s.id === appointmentForm.service_id)
    if (!selectedService) {
      showNotification({
        type: 'error',
        message: 'Service introuvable'
      })
      return
    }

    // Combine date and time into ISO string
    const appointmentDate = dayjs(`${appointmentForm.date} ${appointmentForm.time}`).toISOString()

    if (isEdit.value && appointmentId.value) {
      // Update existing appointment
      const updates = {
        service_id: appointmentForm.service_id,
        appointment_date: appointmentDate,
        customer_name: appointmentForm.customer_name,
        customer_email: appointmentForm.customer_email,
        customer_phone: appointmentForm.customer_phone || null,
        notes: appointmentForm.notes || null,
        status: appointmentForm.status,
        service_name: selectedService.name,
        service_price: selectedService.price,
        service_duration: selectedService.duration
      }

      const { error } = await appointmentsStore.updateAppointment(appointmentId.value, updates)

      if (error) {
        showNotification({
          type: 'error',
          message: error.message || 'Erreur lors de la mise à jour'
        })
        return
      }

      showNotification({
        type: 'success',
        message: 'Rendez-vous mis à jour'
      })
    } else {
      // Create new appointment
      const appointmentData = {
        business_id: businessStore.business.id,
        service_id: appointmentForm.service_id,
        customer_name: appointmentForm.customer_name,
        customer_email: appointmentForm.customer_email,
        customer_phone: appointmentForm.customer_phone || null,
        appointment_date: appointmentDate,
        service_name: selectedService.name,
        service_price: selectedService.price,
        service_duration: selectedService.duration,
        notes: appointmentForm.notes || null
      }

      const { data, error } = await appointmentsStore.createAppointment(appointmentData)

      if (error) {
        showNotification({
          type: 'error',
          message: error.message || 'Erreur lors de la création'
        })
        return
      }

      showNotification({
        type: 'success',
        message: 'Rendez-vous créé avec succès'
      })
    }

    // Reload appointments
    await appointmentsStore.loadAppointments()

    // Go back to appointments list
    goBack()
  } catch (error) {
    console.error('Save appointment error:', error)
    showNotification({
      type: 'error',
      message: 'Une erreur est survenue'
    })
  }
}
</script>

