<template>
  <q-page class="q-pa-md">
    <div class="q-mb-sm">
      <div class="text-h6 q-mb-xs">Configuration de votre commerce</div>
    </div>

    <q-stepper v-model="step" color="primary" animated flat bordered>
      <q-step :name="1" title="Informations de base" :done="step > 1">
        <q-form @submit="nextStep" class="q-gutter-sm q-mt-sm">
          <q-input v-model="form.business_name" label="Nom du commerce *" :rules="[val => !!val || 'Requis']"
            outlined dense />

          <q-input v-model="form.address" label="Adresse *" :rules="[val => !!val || 'Requis']" outlined dense />

          <q-input v-model="form.city" label="Ville *" :rules="[val => !!val || 'Requis']" outlined dense />

          <q-input v-model="form.slug" label="URL publique *"
            :rules="[
              val => !!val || 'Requis',
              val => /^[a-z0-9-]+$/.test(val) || 'Seulement lettres minuscules, chiffres et tirets'
            ]" outlined dense>
            <template v-slot:prepend>
              <div class="text-grey-7 text-caption">{{ baseUrl }}/</div>
            </template>
          </q-input>

          <div class="row justify-end q-mt-md">
            <q-btn type="submit" label="Suivant" color="primary" flat dense />
          </div>
        </q-form>
      </q-step>

      <q-step :name="2" title="Horaires d'ouverture" :done="step > 2">
        <div class="q-gutter-sm q-mt-sm">
          <div v-for="day in days" :key="day.value" class="row items-center q-mb-sm">
            <div class="col-12 col-sm-3">
              <q-checkbox v-model="form.opening_hours[day.value].open" :label="day.label" dense />
            </div>
            <div v-if="form.opening_hours[day.value].open" class="col-12 col-sm-9 row q-gutter-xs">
              <q-input v-model="form.opening_hours[day.value].start" label="Ouverture" mask="##:##" placeholder="09:00"
                outlined dense style="max-width: 110px"
                :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
              <span class="self-center text-grey-7">-</span>
              <q-input v-model="form.opening_hours[day.value].end" label="Fermeture" mask="##:##" placeholder="18:00"
                outlined dense style="max-width: 110px"
                :rules="[val => !val || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(val) || 'Format HH:mm']" />
            </div>
          </div>

          <div class="row justify-between q-mt-md">
            <q-btn flat label="Précédent" @click="step = 1" dense />
            <q-btn label="Suivant" color="primary" @click="nextStep" flat dense />
          </div>
        </div>
      </q-step>

      <q-step :name="3" title="Confirmation">
        <div class="q-mt-sm">
          <div class="text-subtitle1 q-mb-sm">Récapitulatif</div>

          <q-list bordered flat>
            <q-item>
              <q-item-section>
                <q-item-label class="text-caption text-grey-7">Nom</q-item-label>
                <q-item-label>{{ form.business_name }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="text-caption text-grey-7">Adresse</q-item-label>
                <q-item-label>{{ form.address }}, {{ form.city }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="text-caption text-grey-7">URL</q-item-label>
                <q-item-label>{{ baseUrl }}/{{ form.slug }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="row justify-between q-mt-md">
            <q-btn flat label="Précédent" @click="step = 2" dense />
            <q-btn label="Créer mon commerce" color="primary" :loading="businessStore.loading" @click="createBusiness"
              flat dense />
          </div>
        </div>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const step = ref(1)
const baseUrl = computed(() => window.location.origin)

const form = reactive({
  business_name: '',
  address: '',
  city: '',
  slug: '',
  opening_hours: {
    monday: { open: true, start: '09:00', end: '18:00' },
    tuesday: { open: true, start: '09:00', end: '18:00' },
    wednesday: { open: true, start: '09:00', end: '18:00' },
    thursday: { open: true, start: '09:00', end: '18:00' },
    friday: { open: true, start: '09:00', end: '18:00' },
    saturday: { open: false, start: '09:00', end: '18:00' },
    sunday: { open: false, start: '09:00', end: '18:00' }
  }
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

function nextStep() {
  if (step.value < 3) {
    step.value++
  }
}

// Vérifier l'authentification au montage du composant
onMounted(async () => {
  // S'assurer que l'auth est initialisée
  if (!authStore.isAuthenticated) {
    await authStore.init()
  }
  
  // Si toujours pas authentifié, rediriger vers login
  if (!authStore.isAuthenticated) {
    showNotification({
      type: 'error',
      message: 'Vous devez être connecté pour créer un commerce.',
      timeout: 3000
    })
    router.push('/login')
  }
})

async function createBusiness() {
  try {
    const { error } = await businessStore.createBusiness(form)

    if (error) {
      console.error('Create business error:', error)
      // Message d'erreur plus détaillé
      let errorMessage = error.message || 'Erreur lors de la création du commerce'
      
      // Si l'erreur indique un problème d'authentification, suggérer de se reconnecter
      if (error.message && (error.message.includes('authenticated') || error.message.includes('connecté'))) {
        errorMessage = 'Vous n\'êtes pas connecté. Veuillez vous reconnecter.'
        // Rediriger vers la page de connexion après un court délai
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
      
      showNotification({
        type: 'error',
        message: errorMessage,
        timeout: 5000
      })
    } else {
      showNotification({
        type: 'success',
        message: 'Commerce créé avec succès !'
      })
      router.push('/appointments')
    }
  } catch (err) {
    console.error('Create business exception:', err)
    showNotification({
      type: 'error',
      message: err.message || 'Une erreur est survenue lors de la création du commerce'
    })
  }
}
</script>
