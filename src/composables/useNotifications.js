import { ref } from 'vue'

// Global state for notifications
const notifications = ref([])
let notificationIdCounter = 0

export function useNotifications() {
  function showNotification(options) {
    const id = ++notificationIdCounter
    const mappedType = mapQuasarTypeToModernType(options.type) || options.type || 'success'
    const notification = {
      id,
      message: options.message || 'Notification',
      type: mappedType,
      icon: options.icon || getDefaultIcon(mappedType),
      timeout: options.timeout !== undefined ? options.timeout : 3000,
      showProgress: options.showProgress !== undefined ? options.showProgress : true
    }

    notifications.value.push(notification)

    // Auto-remove after timeout
    if (notification.timeout > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.timeout)
    }

    return id
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function mapQuasarTypeToModernType(quasarType) {
    if (!quasarType) return 'success'
    const typeMap = {
      'positive': 'success',
      'negative': 'error',
      'warning': 'warning',
      'info': 'info',
      'success': 'success',
      'error': 'error'
    }
    // If already a modern type, return as is
    if (['success', 'error', 'warning', 'info'].includes(quasarType)) {
      return quasarType
    }
    return typeMap[quasarType] || 'success'
  }

  function getDefaultIcon(type) {
    const iconMap = {
      'success': 'check_circle',
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
    }
    return iconMap[type] || 'check_circle'
  }

  // Convenience methods
  function success(message, options = {}) {
    return showNotification({ ...options, message, type: 'success' })
  }

  function error(message, options = {}) {
    return showNotification({ ...options, message, type: 'error' })
  }

  function warning(message, options = {}) {
    return showNotification({ ...options, message, type: 'warning' })
  }

  function info(message, options = {}) {
    return showNotification({ ...options, message, type: 'info' })
  }

  return {
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  }
}

