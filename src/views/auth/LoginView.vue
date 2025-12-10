<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card class="q-pa-md" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">Connexion</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleLogin" class="q-gutter-md">
          <q-input v-model="email" label="Email" type="email" :rules="[val => !!val || 'Email requis']" outlined />

          <q-input v-model="password" label="Mot de passe" type="password"
            :rules="[val => !!val || 'Mot de passe requis']" outlined />

          <div class="text-center">
            <q-btn type="submit" label="Se connecter" color="primary" :loading="authStore.loading" unelevated
              class="full-width" />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        <div>
          Pas encore de compte ?
          <router-link to="/signup">Créer un compte</router-link>
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
    showNotification({
      type: 'error',
      message: error.message || 'Erreur de connexion'
    })
  } else {
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  }
}
</script>
