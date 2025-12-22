<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <router-link to="/" class="text-white" style="text-decoration: none">
            {{ businessName }}
          </router-link>
        </q-toolbar-title>

        <q-space />

        <template v-if="authStore.isAuthenticated">
          <q-btn flat dense icon="logout" label="Déconnexion" @click="handleLogout" />
        </template>

        <q-btn v-else flat dense icon="login" label="Connexion" to="/login" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer v-if="authStore.isAuthenticated" elevated class="bg-white text-primary">
      <div class="row items-center justify-center relative-position" style="height: 56px;">
        <q-tabs v-model="activeTab" class="text-grey-7 absolute-full" active-color="primary" indicator-color="primary"
          align="justify" narrow-indicator dense>
          <q-route-tab to="/appointments" name="appointments" icon="event"
            :label="$q.screen.gt.xs ? 'Rendez-vous' : ''" />
            <q-route-tab to="/services" name="services" icon="content_cut" :label="$q.screen.gt.xs ? 'Services' : ''" />
            <q-route-tab to="/page" name="page" icon="public" :label="$q.screen.gt.xs ? 'Page' : ''" />
        </q-tabs>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBusinessStore } from '../stores/business'
import { useNotifications } from '../composables/useNotifications'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const businessName = computed(() => businessStore.business?.business_name || 'Vazy')

// Determine active tab based on current route
const activeTab = computed(() => {
  const routeName = route.name
  if (routeName === 'services') return 'services'
  if (routeName === 'appointments') return 'appointments'
  if (routeName === 'page') return 'page'
  return 'appointments'
})

async function handleLogout() {
  try {
    await authStore.signOut()
    router.push('/')
    showNotification({
      type: 'success',
      message: 'Déconnecté avec succès'
    })
  } catch (error) {
    showNotification({
      type: 'error',
      message: 'Erreur lors de la déconnexion'
    })
  }
}
</script>
