<template>
  <q-page class="q-pa-md">
    <div class="q-mb-sm">
      <div class="text-h6 q-mb-xs">Configuration de votre commerce</div>
    </div>

    <q-stepper v-model="step" color="primary" animated flat bordered>
      <q-step :name="1" title="Informations de base" :done="step > 1">
        <q-form @submit="nextStep" class="q-gutter-sm q-mt-sm">
          <q-input v-model="form.name" label="Nom *" :rules="[val => !!val || 'Requis']"
            outlined dense />

          <q-select v-model="form.profile_type" :options="profileTypeOptions" label="Type de profil *"
            :rules="[val => !!val || 'Requis']" outlined dense />

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
            <q-btn type="submit" label="Créer mon profil" color="primary" :loading="profileStore.loading" flat dense />
          </div>
        </q-form>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { usePageSettingsStore } from '../../stores/pageSettings'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const pageSettingsStore = usePageSettingsStore()
const { showNotification } = useNotifications()

const step = ref(1)
const baseUrl = computed(() => window.location.origin)

const form = reactive({
  name: '',
  slug: '',
  profile_type: 'tattoo'
})

const profileTypeOptions = [
  { label: 'Tatoueur', value: 'tattoo' },
  { label: 'Barbier', value: 'barber' },
  { label: 'Nail Artist', value: 'nails' }
]

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
      message: 'Vous devez être connecté pour créer un profil.',
      timeout: 3000
    })
    router.push('/login')
  }
})

function nextStep() {
  if (step.value === 1) {
    createProfile()
  }
}

async function createProfile() {
  try {
    const { error } = await profileStore.createProfile(form)

    if (error) {
      console.error('Create profile error:', error)
      let errorMessage = error.message || 'Erreur lors de la création du profil'
      
      if (error.message && (error.message.includes('authenticated') || error.message.includes('connecté'))) {
        errorMessage = 'Vous n\'êtes pas connecté. Veuillez vous reconnecter.'
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
      // Create default page_settings
      await pageSettingsStore.createPageSettings({
        title: form.name,
        is_published: true
      })
      
      showNotification({
        type: 'success',
        message: 'Profil créé avec succès !'
      })
      router.push('/appointments')
    }
  } catch (err) {
    console.error('Create profile exception:', err)
    showNotification({
      type: 'error',
      message: err.message || 'Une erreur est survenue lors de la création du profil'
    })
  }
}
</script>
