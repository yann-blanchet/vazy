<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col-auto">
        <q-btn flat icon="arrow_back" dense @click="goBack" />
      </div>
      <div class="col">
        <div class="text-h6">{{ isEdit ? 'Modifier' : 'Nouveau' }} service</div>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <q-form ref="serviceFormRef" @submit.prevent="saveService" class="q-gutter-sm">
          <q-input v-model="serviceForm.name" label="Nom du service *" :rules="[val => !!val || 'Requis']" outlined dense />

          <q-input v-model="serviceForm.description" label="Description" type="textarea" outlined dense rows="3" />

          <div class="row q-gutter-sm">
            <q-input v-model.number="serviceForm.duration" label="Durée (minutes) *" type="number"
              :rules="[val => !!val && val > 0 || 'Requis']" outlined dense class="col" />

            <q-input v-model.number="serviceForm.price" label="Prix (€) *" type="number" step="0.01"
              :rules="[val => !!val && val >= 0 || 'Requis']" outlined dense class="col" />
          </div>

          <q-select 
            v-model="serviceForm.category_id" 
            :options="categoryOptions" 
            option-value="id" 
            option-label="name"
            emit-value 
            map-options 
            label="Catégorie" 
            outlined 
            dense
            clearable 
            use-input
            input-debounce="0"
            new-value-mode="add"
            @new-value="createCategoryFromSelect">
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  Tapez pour créer une nouvelle catégorie
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-toggle v-model="serviceForm.visible" label="Visible sur la page publique" dense />

          <div class="row justify-end q-mt-md">
            <q-btn flat label="Annuler" @click="goBack" dense />
            <q-btn type="submit" label="Enregistrer" color="primary" :loading="servicesStore.loading" flat dense />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useServicesStore } from '../../stores/services'
import { useCategoriesStore } from '../../stores/categories'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const route = useRoute()
const servicesStore = useServicesStore()
const categoriesStore = useCategoriesStore()
const { showNotification } = useNotifications()

const serviceFormRef = ref(null)
const serviceId = computed(() => route.params.id)
const isEdit = computed(() => !!serviceId.value)

const serviceForm = reactive({
  name: '',
  description: '',
  duration: 30,
  price: 0,
  visible: true,
  category_id: null
})

// Helper function for notifications
function notify(options) {
  showNotification({
    message: options.message,
    type: options.type === 'positive' ? 'success' : options.type === 'negative' ? 'error' : options.type || 'success',
    timeout: options.timeout || 3000
  })
}

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
  
  // Si on édite, charger les données du service
  if (isEdit.value && serviceId.value) {
    await loadService()
  }
})

async function loadService() {
  const service = servicesStore.services.find(s => s.id === serviceId.value)
  
  if (!service) {
    // Si le service n'est pas dans le store, le charger
    await servicesStore.loadServices()
    const loadedService = servicesStore.services.find(s => s.id === serviceId.value)
    
    if (!loadedService) {
      notify({
        type: 'negative',
        message: 'Service introuvable'
      })
      goBack()
      return
    }
    
    populateForm(loadedService)
  } else {
    populateForm(service)
  }
}

function populateForm(service) {
  Object.assign(serviceForm, {
    name: service.name || '',
    description: service.description || '',
    duration: service.duration || 30,
    price: service.price || 0,
    visible: service.visible !== undefined ? service.visible : true,
    category_id: service.category_id || null
  })
}

async function createCategoryFromSelect(val, done) {
  if (!val || val.trim() === '') {
    done()
    return
  }

  // Check if category already exists
  const existingCategory = categoriesStore.categories.find(
    cat => cat.name.toLowerCase() === val.trim().toLowerCase()
  )

  if (existingCategory) {
    // If exists, select it
    serviceForm.category_id = existingCategory.id
    done()
    return
  }

  // Create new category
  try {
    const result = await categoriesStore.createCategory({
      name: val.trim()
    })

    if (result.error) {
      notify({
        type: 'negative',
        message: result.error.message || 'Erreur lors de la création de la catégorie'
      })
      done()
      return
    }

    // Wait for loading to finish
    while (categoriesStore.loading) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Select the newly created category
    if (result.data) {
      serviceForm.category_id = result.data.id
      notify({
        type: 'positive',
        message: 'Catégorie créée'
      })
      // Return the new option for the select
      done({ id: result.data.id, name: result.data.name }, 'add')
    } else {
      done()
    }
  } catch (error) {
    console.error('Create category error:', error)
    notify({
      type: 'negative',
      message: 'Erreur lors de la création de la catégorie'
    })
    done()
  }
}

function goBack() {
  router.push('/services')
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

    if (isEdit.value && serviceId.value) {
      const { error } = await servicesStore.updateService(
        serviceId.value,
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

    // Wait for loading to finish before closing
    while (servicesStore.loading) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Go back to services list
    goBack()
  } catch (error) {
    console.error('Save service error:', error)
    notify({
      type: 'negative',
      message: 'Une erreur est survenue'
    })
  }
}
</script>

