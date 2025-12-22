<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col-auto">
        <q-btn flat icon="arrow_back" dense @click="goBack" />
      </div>
      <div class="col">
        <div class="text-h6">Bloquer une date</div>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <q-form ref="blockDateFormRef" @submit.prevent="saveBlockDate" class="q-gutter-sm">
          <!-- Date -->
          <q-input v-model="blockForm.date" label="Date *" type="date" outlined dense
            :rules="[val => !!val || 'Date requise']" :min="minDate" />

          <!-- Time Range (optional) -->
          <q-toggle v-model="blockForm.hasTimeRange" label="Plage horaire spécifique" dense />

          <template v-if="blockForm.hasTimeRange">
            <div class="row q-gutter-sm">
              <div class="col">
                <q-input v-model="blockForm.start_time" label="Heure de début" type="time" outlined dense />
              </div>
              <div class="col">
                <q-input v-model="blockForm.end_time" label="Heure de fin" type="time" outlined dense />
              </div>
            </div>
          </template>

          <!-- Reason -->
          <q-input v-model="blockForm.reason" label="Raison (optionnel)" type="textarea" outlined dense rows="3" />

          <div class="row justify-end q-mt-md">
            <q-btn flat label="Annuler" @click="goBack" dense />
            <q-btn type="submit" label="Bloquer" color="primary" :loading="availabilityStore.loading" flat dense />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAvailabilityStore } from '../../stores/availability'
import { useNotifications } from '../../composables/useNotifications'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

const router = useRouter()
const availabilityStore = useAvailabilityStore()
const { showNotification } = useNotifications()

const blockDateFormRef = ref(null)

const blockForm = reactive({
  date: '',
  hasTimeRange: false,
  start_time: '',
  end_time: '',
  reason: ''
})

const minDate = computed(() => {
  return dayjs().format('YYYY-MM-DD')
})

async function saveBlockDate() {
  if (blockDateFormRef.value) {
    const valid = await blockDateFormRef.value.validate()
    if (!valid) {
      return
    }
  }

  try {
    const blockData = {
      date: blockForm.date,
      start_time: blockForm.hasTimeRange && blockForm.start_time ? blockForm.start_time : null,
      end_time: blockForm.hasTimeRange && blockForm.end_time ? blockForm.end_time : null,
      reason: blockForm.reason || null
    }

    const { error } = await availabilityStore.blockDate(blockData)

    if (error) {
      showNotification({
        type: 'error',
        message: error.message || 'Erreur lors du blocage de la date'
      })
      return
    }

    showNotification({
      type: 'success',
      message: 'Date bloquée avec succès'
    })

    router.push('/appointments')
  } catch (error) {
    console.error('Save block date error:', error)
    showNotification({
      type: 'error',
      message: 'Une erreur est survenue'
    })
  }
}

function goBack() {
  router.push('/appointments')
}
</script>

