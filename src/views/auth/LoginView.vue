<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card flat bordered class="q-pa-md" style="min-width: 360px">
      <q-card-section class="q-pb-sm">
        <div class="text-h6 text-center">Connexion</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleLogin" class="q-gutter-sm">
          <q-input v-model="email" label="Email" type="email" :rules="[val => !!val || 'Email requis']" outlined dense />

          <q-input v-model="password" label="Mot de passe" type="password"
            :rules="[val => !!val || 'Mot de passe requis']" outlined dense />

          <div class="text-center q-mt-md">
            <q-btn type="submit" label="Se connecter" color="primary" :loading="authStore.loading" flat
              class="full-width" dense />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-sm">
        <div class="text-body2 text-grey-7">
          Pas encore de compte ?
          <router-link to="/signup" class="text-primary">Créer un compte</router-link>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { showNotification } = useNotifications()

const email = ref('')
const password = ref('')

async function handleLogin() {
  const { error } = await authStore.signIn(email.value, password.value)

  if (error) {
    console.error('Login error:', error)
    showNotification({
      type: 'error',
      message: error.message || 'Erreur de connexion. Vérifiez vos identifiants.'
    })
  } else {
    const redirect = route.query.redirect || '/appointments'
    router.push(redirect)
  }
}
</script>
