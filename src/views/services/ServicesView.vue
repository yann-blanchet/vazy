<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-md items-center">
      <div class="col">
        <div class="text-h5">Services</div>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn label="Gérer les catégories" color="secondary" icon="category" @click="showCategoryDialog = true"
          outline />
        <q-btn label="Ajouter un service" color="primary" icon="add" @click="showServiceDialog = true" unelevated />
      </div>
    </div>

    <div v-if="servicesStore.services && servicesStore.services.length > 0">
      <div v-for="category in groupedServices"
        :key="`category-${category.id || 'no-category'}-${category.services.length}`" class="q-mb-lg">
        <div class="row items-center q-mb-md q-px-sm">
          <div class="col">
            <div class="text-h6">{{ category.name || 'Sans catégorie' }}</div>
          </div>
          <div v-if="category.id" class="col-auto">
            <q-btn flat dense icon="edit" size="sm" @click="editCategory(category)" />
            <q-btn flat dense icon="delete" size="sm" color="negative" @click="deleteCategory(category.id)" />
          </div>
        </div>
        <q-list bordered>
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

    <q-card v-else class="q-pa-lg text-center">
      <div class="text-grey-7">
        Aucun service pour le moment. Ajoutez-en un pour commencer.
      </div>
    </q-card>

    <!-- Service Dialog -->
    <q-dialog v-model="showServiceDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingService ? 'Modifier' : 'Nouveau' }} service</div>
        </q-card-section>

        <q-card-section>
          <q-form ref="serviceFormRef" @submit.prevent="saveService" class="q-gutter-md">
            <q-input v-model="serviceForm.name" label="Nom du service *" :rules="[val => !!val || 'Requis']" outlined />

            <q-input v-model="serviceForm.description" label="Description" type="textarea" outlined />

            <div class="row q-gutter-md">
              <q-input v-model.number="serviceForm.duration" label="Durée (minutes) *" type="number"
                :rules="[val => !!val && val > 0 || 'Requis']" outlined class="col" />

              <q-input v-model.number="serviceForm.price" label="Prix (€) *" type="number" step="0.01"
                :rules="[val => !!val && val >= 0 || 'Requis']" outlined class="col" />
            </div>

            <q-select v-model="serviceForm.category_id" :options="categoryOptions" option-value="id" option-label="name"
              emit-value map-options label="Catégorie" outlined clearable hint="Sélectionnez une catégorie">
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    Aucune catégorie disponible. Créez-en une d'abord.
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-toggle v-model="serviceForm.visible" label="Visible sur la page publique" />

            <div class="row justify-end q-mt-lg">
              <q-btn flat label="Annuler" @click="closeDialog" />
              <q-btn type="submit" label="Enregistrer" color="primary" :loading="servicesStore.loading" unelevated />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Category Management Dialog -->
    <q-dialog v-model="showCategoryDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Gérer les catégories</div>
        </q-card-section>

        <q-card-section>
          <q-list bordered separator>
            <q-item v-for="category in categoriesStore.categories" :key="category.id">
              <q-item-section>
                <q-item-label>{{ category.name }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense icon="edit" @click="editCategory(category)" />
                <q-btn flat dense icon="delete" color="negative" @click="deleteCategory(category.id)" />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="q-mt-md">
            <q-btn label="Ajouter une catégorie" color="primary" icon="add" @click="showNewCategoryDialog = true" />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Fermer" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- New/Edit Category Dialog -->
    <q-dialog v-model="showNewCategoryDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">{{ editingCategory ? 'Modifier' : 'Nouvelle' }} catégorie</div>
        </q-card-section>

        <q-card-section>
          <q-form ref="categoryFormRef" @submit.prevent="saveCategory" class="q-gutter-md">
            <q-input v-model="categoryForm.name" label="Nom de la catégorie *" :rules="[val => !!val || 'Requis']"
              outlined />

            <div class="row justify-end q-mt-lg">
              <q-btn flat label="Annuler" @click="closeCategoryDialog" />
              <q-btn type="submit" label="Enregistrer" color="primary" :loading="categoriesStore.loading" unelevated />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useServicesStore } from '../../stores/services'
import { useCategoriesStore } from '../../stores/categories'
import { useQuasar } from 'quasar'
import { useNotifications } from '../../composables/useNotifications'

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

const showServiceDialog = ref(false)
const showCategoryDialog = ref(false)
const showNewCategoryDialog = ref(false)
const editingService = ref(null)
const editingCategory = ref(null)
const serviceFormRef = ref(null)
const categoryFormRef = ref(null)

const serviceForm = reactive({
  name: '',
  description: '',
  duration: 30,
  price: 0,
  visible: true,
  category_id: null
})

const categoryForm = reactive({
  name: ''
})

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

// Category options for service select
const categoryOptions = computed(() => {
  return categoriesStore.categories.map(cat => ({
    id: cat.id,
    name: cat.name
  }))
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

function editService(service) {
  editingService.value = service
  Object.assign(serviceForm, {
    name: service.name,
    description: service.description || '',
    duration: service.duration,
    price: service.price,
    visible: service.visible,
    category_id: service.category_id || null
  })
  showServiceDialog.value = true
}

function closeDialog() {
  showServiceDialog.value = false
  editingService.value = null
  Object.assign(serviceForm, {
    name: '',
    description: '',
    duration: 30,
    price: 0,
    visible: true,
    category_id: null
  })
}

async function saveService() {
  // Validate form first
  if (serviceFormRef.value) {
    const valid = await serviceFormRef.value.validate()
    if (!valid) {
      return
    }
  }

  try {
    const serviceData = {
      name: serviceForm.name,
      description: serviceForm.description,
      duration: serviceForm.duration,
      price: serviceForm.price,
      visible: serviceForm.visible,
      category_id: serviceForm.category_id || null
    }

    if (editingService.value) {
      const { error } = await servicesStore.updateService(
        editingService.value.id,
        serviceData
      )
      if (error) {
        notify({
          type: 'negative',
          message: error.message || 'Erreur lors de la mise à jour'
        })
        return
      }
      notify({
        type: 'positive',
        message: 'Service mis à jour'
      })
    } else {
      const result = await servicesStore.createService(serviceData)
      if (result.error) {
        notify({
          type: 'negative',
          message: result.error.message || 'Erreur lors de la création'
        })
        return
      }
      notify({
        type: 'positive',
        message: 'Service créé'
      })
    }
    // Close dialog after successful save
    closeDialog()
  } catch (error) {
    console.error('Save service error:', error)
    notify({
      type: 'negative',
      message: 'Une erreur est survenue'
    })
  }
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
function editCategory(category) {
  editingCategory.value = category
  categoryForm.name = category.name
  showNewCategoryDialog.value = true
}

function closeCategoryDialog() {
  showNewCategoryDialog.value = false
  editingCategory.value = null
  categoryForm.name = ''
}

async function saveCategory() {
  if (categoryFormRef.value) {
    const valid = await categoryFormRef.value.validate()
    if (!valid) {
      return
    }
  }

  try {
    if (editingCategory.value) {
      const { error } = await categoriesStore.updateCategory(editingCategory.value.id, {
        name: categoryForm.name
      })
      if (error) {
        notify({
          type: 'negative',
          message: error.message || 'Erreur lors de la mise à jour'
        })
        return
      }
      notify({
        type: 'positive',
        message: 'Catégorie mise à jour'
      })
    } else {
      const result = await categoriesStore.createCategory({
        name: categoryForm.name
      })
      if (result.error) {
        notify({
          type: 'negative',
          message: result.error.message || 'Erreur lors de la création'
        })
        return
      }
      notify({
        type: 'positive',
        message: 'Catégorie créée'
      })
    }
    closeCategoryDialog()
  } catch (error) {
    console.error('Save category error:', error)
    notify({
      type: 'negative',
      message: 'Une erreur est survenue'
    })
  }
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
