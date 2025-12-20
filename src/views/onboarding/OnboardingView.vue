<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="text-h4 q-mb-sm">Configuration de votre commerce</div>
      <div class="text-grey-7">Remplissez les informations pour commencer</div>
    </div>

    <q-stepper v-model="step" color="primary" animated class="q-mt-md">
      <q-step :name="1" title="Informations de base" icon="business" :done="step > 1">
        <q-form @submit="nextStep" class="q-gutter-md q-mt-md">
          <q-input v-model="form.business_name" label="Nom du commerce *" :rules="[val => !!val || 'Requis']"
            outlined />

          <q-input v-model="form.address" label="Adresse *" :rules="[val => !!val || 'Requis']" outlined />

          <q-input v-model="form.city" label="Ville *" :rules="[val => !!val || 'Requis']" outlined />

          <q-input v-model="form.slug" label="URL publique *" hint="Ex: barber-elite" prefix="https://yourapp.com/"
            :rules="[
              val => !!val || 'Requis',
              val => /^[a-z0-9-]+$/.test(val) || 'Seulement lettres minuscules, chiffres et tirets'
            ]" outlined>
            <template v-slot:prepend>
              <q-icon name="link" />
            </template>
          </q-input>

          <div class="row justify-end q-mt-lg">
            <q-btn type="submit" label="Suivant" color="primary" unelevated />
          </div>
        </q-form>
      </q-step>

      <q-step :name="2" title="Horaires d'ouverture" icon="schedule" :done="step > 2">
        <div class="q-gutter-md q-mt-md">
          <div v-for="day in days" :key="day.value" class="row items-center q-mb-md">
            <div class="col-3">
              <q-checkbox v-model="form.opening_hours[day.value].open" :label="day.label" />
            </div>
            <div v-if="form.opening_hours[day.value].open" class="col-9 row q-gutter-sm">
              <q-time v-model="form.opening_hours[day.value].start" format24h label="Ouverture"
                style="max-width: 200px" />
              <q-time v-model="form.opening_hours[day.value].end" format24h label="Fermeture"
                style="max-width: 200px" />
            </div>
          </div>

          <div class="row justify-between q-mt-lg">
            <q-btn flat label="Précédent" @click="step = 1" />
            <q-btn label="Suivant" color="primary" @click="nextStep" unelevated />
          </div>
        </div>
      </q-step>

      <q-step :name="3" title="Confirmation" icon="check">
        <div class="q-mt-md">
          <div class="text-h6 q-mb-md">Récapitulatif</div>

          <q-list bordered>
            <q-item>
              <q-item-section>
                <q-item-label>Nom</q-item-label>
                <q-item-label caption>{{ form.business_name }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>Adresse</q-item-label>
                <q-item-label caption>{{ form.address }}, {{ form.city }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>URL</q-item-label>
                <q-item-label caption>https://yourapp.com/{{ form.slug }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="row justify-between q-mt-lg">
            <q-btn flat label="Précédent" @click="step = 2" />
            <q-btn label="Créer mon commerce" color="primary" :loading="businessStore.loading" @click="createBusiness"
              unelevated />
          </div>
        </div>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const step = ref(1)

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
      router.push('/dashboard')
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
