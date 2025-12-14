<template>
  <!-- Global Modern Notifications -->
  <div class="notifications-container">
    <ModernNotification v-for="notification in notifications" :key="notification.id" :message="notification.message"
      :type="notification.type" :icon="notification.icon" :timeout="notification.timeout"
      :show-progress="notification.showProgress" @close="removeNotification(notification.id)" />
  </div>

  <router-view />
</template>

<script setup>
import { watch, computed } from 'vue'
import { useNotifications } from './composables/useNotifications'
import { useBusinessStore } from './stores/business'
import ModernNotification from './components/ModernNotification.vue'

const { notifications, removeNotification } = useNotifications()
const businessStore = useBusinessStore()

const businessName = computed(() => businessStore.business?.business_name || 'Vazy')

// Update document title when business name changes
watch(businessName, (newName) => {
  document.title = `${newName} - Réservation en ligne`
}, { immediate: true })

// Auth initialization is handled in router guard
// This ensures it happens before navigation
</script>

<style>
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.notifications-container>* {
  pointer-events: auto;
}
</style>
