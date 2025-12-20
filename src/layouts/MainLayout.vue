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
          <q-route-tab to="/dashboard" name="dashboard" icon="dashboard"
            :label="$q.screen.gt.xs ? 'Tableau de bord' : ''" />
          <q-route-tab to="/appointments" name="appointments" icon="event"
            :label="$q.screen.gt.xs ? 'Rendez-vous' : ''" />
            <q-route-tab to="/services" name="services" icon="content_cut" :label="$q.screen.gt.xs ? 'Services' : ''" />
            <q-route-tab to="/page" name="page" icon="public" :label="$q.screen.gt.xs ? 'Page' : ''" />
        </q-tabs>
        <q-btn fab icon="add" color="primary" class="absolute-center" @click="showQuickActionModal = true"
          style="z-index: 1;" />
      </div>
    </q-footer>

    <!-- Quick Action Modal -->
    <q-dialog v-model="showQuickActionModal">
      <q-card style="width: 90vw; max-width: 400px; min-width: 300px;">
        <q-card-section>
          <div class="text-h6">Actions rapides</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list>
            <q-item clickable v-ripple @click="goToNewAppointment">
              <q-item-section avatar>
                <q-icon name="event" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Nouveau rendez-vous</q-item-label>
                <q-item-label caption>Créer un nouveau rendez-vous</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="goToNewService">
              <q-item-section avatar>
                <q-icon name="content_cut" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Nouveau service</q-item-label>
                <q-item-label caption>Ajouter un nouveau service</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="goToBlockDate">
              <q-item-section avatar>
                <q-icon name="block" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Bloquer une date</q-item-label>
                <q-item-label caption>Rendre une date indisponible</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Fermer" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
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
const showQuickActionModal = ref(false)

// Determine active tab based on current route
const activeTab = computed(() => {
  const routeName = route.name
  if (routeName === 'dashboard') return 'dashboard'
  if (routeName === 'services') return 'services'
  if (routeName === 'appointments') return 'appointments'
  if (routeName === 'page') return 'page'
  return 'dashboard'
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

function goToNewAppointment() {
  showQuickActionModal.value = false
  router.push('/appointments/new')
}

function goToNewService() {
  showQuickActionModal.value = false
  router.push('/services/new')
}

function goToBlockDate() {
  showQuickActionModal.value = false
  router.push('/availability/block')
}
</script>
