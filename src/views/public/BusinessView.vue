<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="q-pa-md">
        <div v-if="loading" class="flex flex-center" style="min-height: 400px">
          <q-spinner size="50px" color="primary" />
        </div>

        <div v-else-if="business" class="max-width-800 q-mx-auto">
          <!-- Business Header -->
          <div class="text-center q-mb-lg">
            <div class="text-h4 q-mb-sm">{{ business.business_name }}</div>
            <div class="text-grey-7 q-mb-md">{{ business.address }}, {{ business.city }}</div>
            <q-btn label="Réserver maintenant" color="primary" size="lg" :to="`/book/${business.slug}`" unelevated />
          </div>

          <!-- Services -->
          <q-card class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-md">Nos services</div>
              <div v-if="groupedServices.length > 0">
                <div v-for="category in groupedServices" :key="category.id || 'no-category'" class="q-mb-lg">
                  <div v-if="category.name" class="text-subtitle1 q-mb-sm q-px-sm text-weight-medium">
                    {{ category.name }}
                  </div>
                  <q-list>
                    <q-item v-for="service in category.services" :key="service.id">
                      <q-item-section>
                        <q-item-label>{{ service.name }}</q-item-label>
                        <q-item-label caption>{{ service.description }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <div class="text-h6">{{ formatPrice(service.price) }}</div>
                        <div class="text-caption">{{ service.duration }} min</div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
              <div v-else class="text-grey-7 text-center q-pa-md">
                Aucun service disponible pour le moment.
              </div>
            </q-card-section>
          </q-card>

          <!-- Opening Hours -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">Horaires d'ouverture</div>
              <q-list>
                <q-item v-for="(hours, day) in business.opening_hours" :key="day">
                  <q-item-section>
                    <q-item-label>{{ formatDay(day) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label>
                      {{ hours.open ? `${hours.start} - ${hours.end}` : 'Fermé' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <div v-else class="text-center q-pa-lg">
          <q-icon name="error" size="60px" color="negative" />
          <div class="text-h6 q-mt-md">Commerce introuvable</div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../../services/supabase'

const route = useRoute()
const business = ref(null)
const services = ref([])
const categories = ref([])
const loading = ref(true)

const visibleServices = computed(() => {
  return services.value.filter(s => s.visible)
})

// Group services by category
const groupedServices = computed(() => {
  if (!visibleServices.value || visibleServices.value.length === 0) {
    return []
  }

  const groups = {}

  // First, add all categories
  categories.value.forEach(category => {
    groups[category.id] = {
      id: category.id,
      name: category.name,
      display_order: category.display_order || 0,
      services: []
    }
  })

  // Add services to their categories
  visibleServices.value.forEach(service => {
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
  const slug = route.params.slug
  await loadBusiness(slug)
})

async function loadBusiness(slug) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .single()

    if (data) {
      business.value = data
      await Promise.all([
        loadServices(data.id),
        loadCategories(data.id)
      ])
    }
  } catch (error) {
    console.error('Load business error:', error)
  } finally {
    loading.value = false
  }
}

async function loadServices(businessId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('visible', true)

    if (data) {
      services.value = data
    }
  } catch (error) {
    console.error('Load services error:', error)
  }
}

async function loadCategories(businessId) {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('business_id', businessId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (data) {
      categories.value = data
    }
  } catch (error) {
    console.error('Load categories error:', error)
    // If categories table doesn't exist yet, continue without categories
    categories.value = []
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

function formatDay(day) {
  const days = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  }
  return days[day] || day
}
</script>

<style scoped>
.max-width-800 {
  max-width: 800px;
}
</style>
