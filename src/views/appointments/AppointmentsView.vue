<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-md items-center">
      <div class="col">
        <div class="text-h5">Rendez-vous</div>
      </div>
      <div class="col-auto">
        <q-btn label="Ajouter" color="primary" icon="add" @click="openNewAppointmentDialog" unelevated />
      </div>
    </div>

    <q-list v-if="appointmentsStore.appointments.length > 0" bordered>
      <q-item v-for="apt in appointmentsStore.appointments" :key="apt.id" clickable @click="viewAppointment(apt)">
        <q-item-section avatar>
          <q-icon name="event" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ apt.customer_name }}</q-item-label>
          <q-item-label caption>
            {{ apt.service_name }} - {{ formatDate(apt.appointment_date) }} à {{ formatTime(apt.appointment_date) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge :color="getStatusColor(apt.status)">
            {{ getStatusLabel(apt.status) }}
          </q-badge>
        </q-item-section>
        <q-item-section side>
          <q-btn flat icon="more_vert" @click.stop>
            <q-menu>
              <q-list>
                <q-item clickable v-close-popup @click="editAppointment(apt)">
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Modifier</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="markCompleted(apt)" v-if="apt.status === 'confirmed'">
                  <q-item-section avatar>
                    <q-icon name="check" />
                  </q-item-section>
                  <q-item-section>Marquer comme terminé</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="markNoShow(apt)" v-if="apt.status === 'confirmed'">
                  <q-item-section avatar>
                    <q-icon name="cancel" />
                  </q-item-section>
                  <q-item-section>Absent</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="deleteAppointment(apt.id)">
                  <q-item-section avatar>
                    <q-icon name="delete" color="negative" />
                  </q-item-section>
                  <q-item-section>Supprimer</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <q-card v-else class="q-pa-lg text-center">
      <div class="text-grey-7">
        Aucun rendez-vous pour le moment.
      </div>
    </q-card>

    <!-- Appointment Dialog -->
    <q-dialog v-model="showAppointmentDialog">
      <q-card style="min-width: 500px; max-width: 700px">
        <q-card-section>
          <div class="text-h6">{{ editingAppointment ? 'Modifier' : 'Nouveau' }} rendez-vous</div>
        </q-card-section>

        <q-card-section>
          <q-form ref="appointmentFormRef" @submit.prevent="saveAppointment" class="q-gutter-md">
            <!-- Service Selection -->
            <q-select v-model="appointmentForm.service_id" :options="serviceOptions" option-value="id"
              option-label="name" emit-value map-options label="Service *" outlined
              :rules="[val => !!val || 'Service requis']" :disable="editingAppointment !== null">
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
            <div class="row q-gutter-md">
              <div class="col">
                <q-input v-model="appointmentForm.date" label="Date *" type="date" outlined
                  :rules="[val => !!val || 'Date requise']" :min="minDate" />
              </div>
              <div class="col">
                <q-input v-model="appointmentForm.time" label="Heure *" type="time" outlined
                  :rules="[val => !!val || 'Heure requise']" />
              </div>
            </div>

            <!-- Customer Information -->
            <q-separator class="q-my-md" />
            <div class="text-subtitle2 q-mb-sm">Informations client</div>

            <q-input v-model="appointmentForm.customer_name" label="Nom complet *" outlined
              :rules="[val => !!val || 'Nom requis']" />

            <div class="row q-gutter-md">
              <div class="col">
                <q-input v-model="appointmentForm.customer_email" label="Email *" type="email" outlined
                  :rules="[val => !!val || 'Email requis', val => /.+@.+\..+/.test(val) || 'Email invalide']" />
              </div>
              <div class="col">
                <q-input v-model="appointmentForm.customer_phone" label="Téléphone" outlined />
              </div>
            </div>

            <!-- Notes -->
            <q-input v-model="appointmentForm.notes" label="Notes (optionnel)" type="textarea" outlined rows="3" />

            <!-- Status (only for editing) -->
            <q-select v-if="editingAppointment" v-model="appointmentForm.status" :options="statusOptions" label="Statut"
              outlined />

            <div class="row justify-end q-mt-lg">
              <q-btn flat label="Annuler" @click="closeDialog" />
              <q-btn type="submit" label="Enregistrer" color="primary" :loading="appointmentsStore.loading"
                unelevated />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppointmentsStore } from '../../stores/appointments'
import { useServicesStore } from '../../stores/services'
import { useBusinessStore } from '../../stores/business'
import { useQuasar } from 'quasar'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'

const appointmentsStore = useAppointmentsStore()
const servicesStore = useServicesStore()
const businessStore = useBusinessStore()
const $q = useQuasar()
const { showNotification } = useNotifications()

const showAppointmentDialog = ref(false)
const editingAppointment = ref(null)
const appointmentFormRef = ref(null)

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
  await appointmentsStore.loadAppointments()
  await servicesStore.loadServices()
})

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
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
  editingAppointment.value = null
  resetForm()
  showAppointmentDialog.value = true
}

function viewAppointment(apt) {
  editAppointment(apt)
}

function editAppointment(apt) {
  editingAppointment.value = apt

  // Find the service to get its details
  const service = servicesStore.services.find(s => s.id === apt.service_id)

  // Format date and time from ISO string
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

  showAppointmentDialog.value = true
}

function resetForm() {
  Object.assign(appointmentForm, {
    service_id: null,
    date: '',
    time: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
    status: 'confirmed'
  })
}

function closeDialog() {
  showAppointmentDialog.value = false
  editingAppointment.value = null
  resetForm()
  if (appointmentFormRef.value) {
    appointmentFormRef.value.resetValidation()
  }
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

    if (editingAppointment.value) {
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

      const { error } = await appointmentsStore.updateAppointment(editingAppointment.value.id, updates)

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

    // Close dialog
    closeDialog()
  } catch (error) {
    console.error('Save appointment error:', error)
    showNotification({
      type: 'error',
      message: 'Une erreur est survenue'
    })
  }
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
