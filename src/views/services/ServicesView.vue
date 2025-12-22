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
        :key="`category-${category.id || 'no-category'}-${category.services.length}`" class="q-mb-md">
        <div class="row items-center q-mb-sm q-px-sm">
          <div class="col">
            <div class="text-subtitle1">{{ category.name || 'Sans catégorie' }}</div>
          </div>
          <div v-if="category.id" class="col-auto">
            <q-btn flat dense round icon="edit" size="sm" @click="editCategory(category)" />
            <q-btn flat dense round icon="delete" size="sm" color="negative" @click="deleteCategory(category.id)" />
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
import { useCategoriesStore } from '../../stores/categories'
import { useQuasar } from 'quasar'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const servicesStore = useServicesStore()
const categoriesStore = useCategoriesStore()
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


// Group services by category using category_id
const groupedServices = computed(() => {
  if (!servicesStore.services || servicesStore.services.length === 0) {
    return []
  }

  const groups = {}

  // First, add all categories
  categoriesStore.categories.forEach(category => {
    groups[category.id] = {
      id: category.id,
      name: category.name,
      display_order: category.display_order || 0,
      services: []
    }
  })

  // Add services to their categories
  servicesStore.services.forEach(service => {
    const categoryId = service.category_id
    if (categoryId && groups[categoryId]) {
      groups[categoryId].services.push(service)
    } else {
      // Services without category
      if (!groups['no-category']) {
        groups['no-category'] = {
          id: null,
          name: null,
          display_order: 9999,
          services: []
        }
      }
      groups['no-category'].services.push(service)
    }
  })

  // Convert to array and sort by display_order, then name
  const result = Object.values(groups)
    .filter(group => group.services.length > 0)
    .sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order
      }
      if (!a.name && b.name) return 1
      if (a.name && !b.name) return -1
      return (a.name || '').localeCompare(b.name || '')
    })

  return result
})

onMounted(async () => {
  await Promise.all([
    categoriesStore.loadCategories(),
    servicesStore.loadServices()
  ])
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

// Category management functions
async function editCategory(category) {
  $q.dialog({
    title: 'Modifier la catégorie',
    message: 'Entrez le nouveau nom de la catégorie',
    prompt: {
      model: category.name,
      type: 'text'
    },
    cancel: true,
    persistent: true
  }).onOk(async (newName) => {
    if (!newName || newName.trim() === '') {
      notify({
        type: 'negative',
        message: 'Le nom de la catégorie ne peut pas être vide'
      })
      return
    }

    const { error } = await categoriesStore.updateCategory(category.id, {
      name: newName.trim()
    })

    if (error) {
      notify({
        type: 'negative',
        message: error.message || 'Erreur lors de la mise à jour'
      })
    } else {
      notify({
        type: 'positive',
        message: 'Catégorie mise à jour'
      })
    }
  })
}

async function deleteCategory(categoryId) {
  if ($q && $q.dialog) {
    $q.dialog({
      title: 'Confirmer',
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      await performDeleteCategory(categoryId)
    })
  } else {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      await performDeleteCategory(categoryId)
    }
  }
}

async function performDeleteCategory(categoryId) {
  const { error } = await categoriesStore.deleteCategory(categoryId)
  if (error) {
    notify({
      type: 'negative',
      message: error.message || 'Erreur lors de la suppression'
    })
  } else {
    notify({
      type: 'positive',
      message: 'Catégorie supprimée'
    })
  }
}
</script>
