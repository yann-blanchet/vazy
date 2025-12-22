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
                <div v-for="category in groupedServices" :key="category.name || 'no-category'" class="q-mb-lg">
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
const loading = ref(true)

const visibleServices = computed(() => {
  return services.value.filter(s => s.visible)
})

// Group services by category (TEXT field)
const groupedServices = computed(() => {
  if (!visibleServices.value || visibleServices.value.length === 0) {
    return []
  }

  const groups = {}

  // Group services by category
  visibleServices.value.forEach(service => {
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
  const slug = route.params.slug
  await loadBusiness(slug)
})

async function loadBusiness(slug) {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (profileData) {
      // Load page_settings
      const { data: pageData } = await supabase
        .from('page_settings')
        .select('*')
        .eq('profile_id', profileData.id)
        .eq('is_published', true)
        .single()

      business.value = {
        ...profileData,
        business_name: pageData?.title || profileData.name,
        description: pageData?.description || null,
        cover_photo_url: pageData?.photos?.[0] || null
      }

      await loadServices(profileData.id)
    }
  } catch (error) {
    console.error('Load business error:', error)
  } finally {
    loading.value = false
  }
}

async function loadServices(profileId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (data) {
      // Transform for compatibility
      services.value = data.map(service => ({
        ...service,
        price: service.price_cents / 100,
        duration: service.duration_minutes,
        visible: service.is_active,
        business_id: service.profile_id
      }))
    }
  } catch (error) {
    console.error('Load services error:', error)
  }
}

// Categories are now directly in services.category (TEXT field)
// No need for separate loadCategories function

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
