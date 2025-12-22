<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-sm">Paramètres</div>

    <q-card flat bordered class="q-mb-sm">
      <q-card-section class="q-pa-md">
        <div class="text-subtitle1 q-mb-sm">Informations du commerce</div>
        <q-form @submit="updateBusiness" class="q-gutter-sm">
          <q-input v-model="businessForm.business_name" label="Nom du commerce" outlined dense />

          <q-input v-model="businessForm.address" label="Adresse" outlined dense />

          <q-input v-model="businessForm.city" label="Ville" outlined dense />

          <q-input v-model="businessForm.description" label="Description" type="textarea" outlined dense rows="3" />

          <q-btn type="submit" label="Enregistrer" color="primary" :loading="businessStore.loading" flat dense />
        </q-form>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <div class="text-subtitle1 q-mb-sm">Horaires d'ouverture</div>
        <q-form @submit="updateHours" class="q-gutter-sm">
          <div v-for="day in days" :key="day.value" class="q-mb-sm">
            <div class="row items-center q-mb-xs">
              <div class="col-12 col-sm-3">
                <q-checkbox v-model="hoursForm[day.value].open" :label="day.label" dense />
              </div>
              <div v-if="hoursForm[day.value].open" class="col-12 col-sm-9">
                <div class="row items-center q-gutter-xs">
                  <q-input v-model="hoursForm[day.value].start" label="Ouverture" mask="##:##" placeholder="09:00"
                    outlined dense style="max-width: 110px"
                    :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
                  <span class="self-center text-grey-7">-</span>
                  <q-input v-model="hoursForm[day.value].end" label="Fermeture" mask="##:##" placeholder="18:00"
                    outlined dense style="max-width: 110px"
                    :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
                </div>
              </div>
              <div v-else class="col-12 col-sm-9 text-grey-7 text-caption">
                Fermé
              </div>
            </div>
            <div v-if="hoursForm[day.value].open" class="row items-center q-ml-md q-mt-xs">
              <div class="col-12 col-sm-3">
                <q-checkbox v-model="hoursForm[day.value].hasBreak" label="Pause" dense />
              </div>
              <div v-if="hoursForm[day.value].hasBreak" class="col-12 col-sm-9 row items-center q-gutter-xs">
                <q-input v-model="hoursForm[day.value].breakStart" label="Début" mask="##:##" placeholder="12:00"
                  outlined dense style="max-width: 110px"
                  :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
                <span class="self-center text-grey-7">-</span>
                <q-input v-model="hoursForm[day.value].breakEnd" label="Fin" mask="##:##" placeholder="14:00"
                  outlined dense style="max-width: 110px"
                  :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
              </div>
            </div>
          </div>
          <div class="q-mt-sm">
            <q-btn type="submit" label="Enregistrer les horaires" color="primary" :loading="businessStore.loading"
              unelevated dense />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'

const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const businessForm = reactive({
  business_name: '',
  address: '',
  city: '',
  description: ''
})

const hoursForm = reactive({
  monday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  tuesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  wednesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  thursday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  friday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  saturday: { open: false, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' },
  sunday: { open: false, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '14:00' }
})

const days = [
  { label: 'Lundi', value: 'monday' },
  { label: 'Mardi', value: 'tuesday' },
  { label: 'Mercredi', value: 'wednesday' },
  { label: 'Jeudi', value: 'thursday' },
  { label: 'Vendredi', value: 'friday' },
  { label: 'Samedi', value: 'saturday' },
  { label: 'Dimanche', value: 'sunday' }
]


onMounted(() => {
  if (businessStore.business) {
    Object.assign(businessForm, {
      business_name: businessStore.business.business_name || '',
      address: businessStore.business.address || '',
      city: businessStore.business.city || '',
      description: businessStore.business.description || ''
    })
    if (businessStore.business.opening_hours) {
      // Merge existing hours with defaults to ensure all fields are present
      const existingHours = businessStore.business.opening_hours
      for (const day of days) {
        if (existingHours[day.value]) {
          hoursForm[day.value] = {
            open: existingHours[day.value].open ?? true,
            start: existingHours[day.value].start || '09:00',
            end: existingHours[day.value].end || '18:00',
            hasBreak: existingHours[day.value].hasBreak ?? false,
            breakStart: existingHours[day.value].breakStart || '12:00',
            breakEnd: existingHours[day.value].breakEnd || '14:00'
          }
        }
      }
    }
  }
})

async function updateBusiness() {
  const { error } = await businessStore.updateBusiness(businessForm)
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: 'Informations mises à jour avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  }
}

async function updateHours() {
  // Validate all open days have valid times
  for (const day of days) {
    if (hoursForm[day.value].open) {
      if (!hoursForm[day.value].start || !hoursForm[day.value].end) {
        showNotification({
          message: `Veuillez remplir les horaires pour ${day.label}`,
          type: 'warning',
          icon: 'warning',
          timeout: 3500
        })
        return
      }
      // Validate break times if break is enabled
      if (hoursForm[day.value].hasBreak) {
        if (!hoursForm[day.value].breakStart || !hoursForm[day.value].breakEnd) {
          showNotification({
            message: `Veuillez remplir les horaires de pause pour ${day.label}`,
            type: 'warning',
            icon: 'warning',
            timeout: 3500
          })
          return
        }
      }
    }
  }

  const { error } = await businessStore.updateBusiness({
    opening_hours: hoursForm
  })
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: 'Horaires mis à jour avec succès',
      type: 'success',
      icon: 'schedule',
      timeout: 3000
    })
  }
}

</script>

<style scoped>
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.notifications-container>* {
  pointer-events: auto;
}
</style>
