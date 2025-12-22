<template>
  <q-page class="flex flex-center">
    <div class="text-center q-pa-lg">
      <div class="text-h3 q-mb-md">{{ businessName }}</div>
      <div class="text-h6 text-grey-7 q-mb-md">Système de réservation en ligne</div>
      <div class="text-h6 text-grey-7 q-mb-lg">
        Pour coiffeurs, barbiers et esthéticiens
      </div>
      <div class="q-gutter-sm">
        <q-btn label="Se connecter" color="primary" to="/login" flat dense />
        <q-btn label="Créer un compte" color="primary" outline to="/signup" dense />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useProfileStore } from '../stores/profile'
import { usePageSettingsStore } from '../stores/pageSettings'

const profileStore = useProfileStore()
const pageSettingsStore = usePageSettingsStore()

onMounted(async () => {
  await profileStore.loadProfile()
  if (profileStore.profile) {
    await pageSettingsStore.loadPageSettings()
  }
})

const businessName = computed(() => pageSettingsStore.pageSettings?.title || profileStore.profile?.name || 'Vazy')
</script>
