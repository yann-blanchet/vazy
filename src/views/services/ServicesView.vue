<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col">
        <div class="text-h6">Services</div>
      </div>
      <div class="col-auto">
        <q-btn label="Ajouter" color="primary" icon="add" @click="openNewServiceDialog" flat dense />
      </div>
    </div>

    <div v-if="servicesStore.services && servicesStore.services.length > 0">
      <div v-for="category in groupedServices"
        :key="`category-${category.name || 'no-category'}-${category.services.length}`" class="q-mb-md">
        <div class="row items-center q-mb-sm q-px-sm">
          <div class="col">
            <div class="text-subtitle1">{{ category.name || 'Sans catégorie' }}</div>
          </div>
        </div>
        <q-list bordered flat>
          <q-item v-for="service in category.services" :key="service.id" clickable @click="editService(service)">
            <q-item-section>
              <q-item-label>{{ service.name }}</q-item-label>
              <q-item-label caption>{{ service.description }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="text-h6">{{ formatPrice(service.price) }}</div>
              <div class="text-caption">{{ service.duration }} min</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle :model-value="service.visible" @update:model-value="toggleVisibility(service)"
                label="Visible" />
            </q-item-section>
            <q-item-section side>
              <q-btn flat icon="delete" color="negative" @click.stop="deleteService(service.id)" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>

    <q-card v-else flat bordered class="q-pa-md text-center">
      <div class="text-body2 text-grey-7">
        Aucun service pour le moment
      </div>
    </q-card>


  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServicesStore } from '../../stores/services'
import { useQuasar } from 'quasar'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const servicesStore = useServicesStore()
const $q = useQuasar()
const { showNotification } = useNotifications()

// Helper function for notifications (maps Quasar types to ModernNotification types)
function notify(options) {
  showNotification({
    message: options.message,
    type: options.type === 'positive' ? 'success' : options.type === 'negative' ? 'error' : options.type || 'success',
    timeout: options.timeout || 3000
  })
}


// Group services by category (TEXT field)
const groupedServices = computed(() => {
  if (!servicesStore.services || servicesStore.services.length === 0) {
    return []
  }

  const groups = {}

  // Group services by category
  servicesStore.services.forEach(service => {
    const categoryName = service.category || null
    const key = categoryName || 'no-category'
    
    if (!groups[key]) {
      groups[key] = {
        name: categoryName,
        services: []
      }
    }
    groups[key].services.push(service)
  })

  // Convert to array and sort by category name
  const result = Object.values(groups)
    .filter(group => group.services.length > 0)
    .sort((a, b) => {
      if (!a.name && b.name) return 1
      if (a.name && !b.name) return -1
      return (a.name || '').localeCompare(b.name || '')
    })

  return result
})

onMounted(async () => {
  await servicesStore.loadServices()
})

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

function openNewServiceDialog() {
  router.push({ name: 'service-new' })
}

function editService(service) {
  router.push({ name: 'service-edit', params: { id: service.id } })
}

async function toggleVisibility(service) {
  await servicesStore.updateService(service.id, {
    visible: !service.visible
  })
}

async function deleteService(serviceId) {
  if ($q && $q.dialog) {
    $q.dialog({
      title: 'Confirmer',
      message: 'Êtes-vous sûr de vouloir supprimer ce service ?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      await performDelete(serviceId)
    })
  } else {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      await performDelete(serviceId)
    }
  }
}

async function performDelete(serviceId) {
  const { error } = await servicesStore.deleteService(serviceId)
  if (error) {
    notify({
      type: 'negative',
      message: error.message || 'Erreur lors de la suppression'
    })
  } else {
    notify({
      type: 'positive',
      message: 'Service supprimé'
    })
  }
}

</script>
