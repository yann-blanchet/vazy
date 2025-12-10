<template>
  <Transition name="slide-fade">
    <div v-if="visible" :class="['modern-notification', `notification-${type}`]" :style="notificationStyle">
      <div class="notification-content">
        <q-icon :name="icon" class="notification-icon" />
        <div class="notification-message">{{ message }}</div>
        <q-btn flat dense round icon="close" size="sm" class="notification-close" @click="close" />
      </div>
      <div v-if="showProgress" class="notification-progress">
        <div class="notification-progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  icon: {
    type: String,
    default: 'check_circle'
  },
  timeout: {
    type: Number,
    default: 3000
  },
  showProgress: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

const visible = ref(true)
const progress = ref(100)
let progressInterval = null
let timeoutId = null

const typeConfig = {
  success: {
    borderColor: '#21ba45',
    textColor: '#21ba45',
    icon: 'check_circle'
  },
  error: {
    borderColor: '#c10015',
    textColor: '#c10015',
    icon: 'error'
  },
  warning: {
    borderColor: '#f2c037',
    textColor: '#f2c037',
    icon: 'warning'
  },
  info: {
    borderColor: '#31ccec',
    textColor: '#31ccec',
    icon: 'info'
  }
}

const config = computed(() => typeConfig[props.type] || typeConfig.success)

const notificationStyle = computed(() => ({
  borderLeftColor: config.value.borderColor,
  color: config.value.textColor
}))

function close() {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

onMounted(() => {
  if (props.showProgress && props.timeout > 0) {
    const startTime = Date.now()
    const duration = props.timeout

    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      progress.value = Math.max(0, 100 - (elapsed / duration) * 100)

      if (progress.value <= 0) {
        clearInterval(progressInterval)
        close()
      }
    }, 50)
  }

  if (props.timeout > 0) {
    timeoutId = setTimeout(() => {
      close()
    }, props.timeout)
  }
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>

<style scoped>
.modern-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 500px;
  background: white;
  border-left: 4px solid;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow: hidden;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.notification-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.notification-close {
  flex-shrink: 0;
  opacity: 0.6;
}

.notification-close:hover {
  opacity: 1;
}

.notification-progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.notification-progress-bar {
  height: 100%;
  background: currentColor;
  transition: width 0.05s linear;
  opacity: 0.3;
}

/* Animations */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>



