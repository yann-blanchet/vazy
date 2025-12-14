<template>
  <q-page class="flex flex-center">
    <div class="text-center q-pa-lg">
      <div class="text-h3 q-mb-md">{{ businessName }}</div>
      <div class="text-h6 text-grey-7 q-mb-md">Système de réservation en ligne</div>
      <div class="text-h6 text-grey-7 q-mb-lg">
        Pour coiffeurs, barbiers et esthéticiens
      </div>
      <div class="q-gutter-md">
        <q-btn label="Se connecter" color="primary" size="lg" to="/login" unelevated />
        <q-btn label="Créer un compte" color="primary" outline size="lg" to="/signup" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useBusinessStore } from '../stores/business'

const businessStore = useBusinessStore()
const businessName = computed(() => businessStore.business?.business_name || 'Vazy')
</script>
