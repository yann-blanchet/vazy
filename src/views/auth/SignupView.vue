<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card class="q-pa-md" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">Créer un compte</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleSignup" class="q-gutter-md">
          <q-input v-model="email" label="Email" type="email" :rules="[val => !!val || 'Email requis']" outlined />

          <q-input v-model="password" label="Mot de passe" type="password" :rules="[
            val => !!val || 'Mot de passe requis',
            val => val.length >= 6 || 'Minimum 6 caractères'
          ]" outlined />

          <q-input v-model="confirmPassword" label="Confirmer le mot de passe" type="password" :rules="[
            val => !!val || 'Confirmation requise',
            val => val === password || 'Les mots de passe ne correspondent pas'
          ]" outlined />

          <div class="text-center">
            <q-btn type="submit" label="Créer un compte" color="primary" :loading="authStore.loading" unelevated
              class="full-width" />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        <div>
          Déjà un compte ?
          <router-link to="/login">Se connecter</router-link>
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
  const { error } = await authStore.signUp(email.value, password.value)

  if (error) {
    showNotification({
      type: 'error',
      message: error.message || 'Erreur lors de la création du compte'
    })
  } else {
    showNotification({
      type: 'success',
      message: 'Compte créé avec succès !'
    })
    router.push('/onboarding')
  }
}
</script>
