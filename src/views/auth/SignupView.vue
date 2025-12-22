<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card flat bordered class="q-pa-md" style="min-width: 360px">
      <q-card-section class="q-pb-sm">
        <div class="text-h6 text-center">Créer un compte</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleSignup" class="q-gutter-sm">
          <q-input v-model="email" label="Email" type="email" :rules="[val => !!val || 'Email requis']" outlined dense />

          <q-input v-model="password" label="Mot de passe" type="password" :rules="[
            val => !!val || 'Mot de passe requis',
            val => val.length >= 6 || 'Minimum 6 caractères'
          ]" outlined dense />

          <q-input v-model="confirmPassword" label="Confirmer le mot de passe" type="password" :rules="[
            val => !!val || 'Confirmation requise',
            val => val === password || 'Les mots de passe ne correspondent pas'
          ]" outlined dense />

          <div class="text-center q-mt-md">
            <q-btn type="submit" label="Créer un compte" color="primary" :loading="authStore.loading" flat
              class="full-width" dense />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-sm">
        <div class="text-body2 text-grey-7">
          Déjà un compte ?
          <router-link to="/login" class="text-primary">Se connecter</router-link>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const { showNotification } = useNotifications()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

async function handleSignup() {
  const { error, data } = await authStore.signUp(email.value, password.value)

  if (error) {
    console.error('Signup error:', error)
    showNotification({
      type: 'error',
      message: error.message || 'Erreur lors de la création du compte. Vérifiez vos informations.'
    })
  } else {
    // Vérifier si l'email nécessite une confirmation
    if (data?.user && !data.session) {
      showNotification({
        type: 'info',
        message: 'Compte créé ! Veuillez vérifier votre email pour confirmer votre compte.',
        timeout: 5000
      })
      router.push('/login')
    } else {
      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Vérifier que l'utilisateur est bien authentifié avant de rediriger
      if (authStore.isAuthenticated) {
        showNotification({
          type: 'success',
          message: 'Compte créé avec succès !'
        })
        router.push('/onboarding')
      } else {
        // Si pas authentifié, essayer de réinitialiser
        await authStore.init()
        if (authStore.isAuthenticated) {
          showNotification({
            type: 'success',
            message: 'Compte créé avec succès !'
          })
          router.push('/onboarding')
        } else {
          showNotification({
            type: 'warning',
            message: 'Compte créé. Veuillez vous connecter.',
            timeout: 5000
          })
          router.push('/login')
        }
      }
    }
  }
}
</script>
