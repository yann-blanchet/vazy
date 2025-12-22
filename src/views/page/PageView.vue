<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6">Page publique</div>
      </div>
      <div class="col-auto">
        <q-btn
          icon="open_in_new"
          flat
          dense
          round
          size="sm"
          color="primary"
          @click="openPublicPage"
          :disable="!profileStore.profile || !pageForm.is_published"
        />
      </div>
    </div>

    <div class="q-gutter-sm">
      <!-- Lien de la page -->
      <q-card flat bordered>
        <q-card-section class="q-pa-md">
          <div class="text-subtitle2 text-grey-7 q-mb-xs">URL publique</div>
          <div class="row items-center no-wrap">
            <div class="text-body2 text-weight-medium">{{ publicUrl || 'Non configuré' }}</div>
            <q-btn
              icon="content_copy"
              flat
              dense
              round
              size="sm"
              color="primary"
              @click="copyUrl"
              :disable="!publicUrl"
              class="q-ml-xs"
            />
            <q-space />
            <q-btn
              icon="edit"
              flat
              dense
              round
              size="sm"
              color="primary"
              @click="openEditUrlSheet"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Activer / Désactiver la page -->
      <q-card flat bordered>
        <q-card-section class="q-pa-md">
          <div class="row items-center">
            <div class="col">
              <div class="text-body2 text-weight-medium">
                {{ pageForm.is_published ? 'Page publique activée' : 'Page publique désactivée' }}
              </div>
            </div>
            <div class="col-auto">
              <q-toggle
                v-model="pageForm.is_published"
                color="primary"
                @update:model-value="togglePublicPage"
                :loading="pageSettingsStore.loading"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Nom affiché -->
      <q-card flat bordered>
        <q-card-section class="q-pa-md">
          <div class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey-7 q-mb-xs">Nom affiché</div>
              <div class="text-body2 text-weight-medium">
                {{ pageForm.title || 'Non défini' }}
              </div>
            </div>
            <div class="col-auto">
              <q-btn
                icon="edit"
                flat
                dense
                round
                size="sm"
                color="primary"
                @click="openEditNameSheet"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Description -->
      <q-card flat bordered>
        <q-card-section class="q-pa-md">
          <div class="row items-start">
            <div class="col">
              <div class="text-subtitle2 text-grey-7 q-mb-xs">Description</div>
              <div class="text-body2">
                {{ pageForm.description || 'Aucune description' }}
              </div>
            </div>
            <div class="col-auto">
              <q-btn
                icon="edit"
                flat
                dense
                round
                size="sm"
                color="primary"
                @click="openEditDescriptionSheet"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Photos (max 4, première = couverture) -->
      <q-card flat bordered>
        <q-card-section class="q-pa-md">
          <div class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-grey-7 q-mb-sm">
                Photos
                <q-badge v-if="businessPhotos.length > 0" color="primary" class="q-ml-xs" rounded>
                  {{ businessPhotos.length }}/4
                </q-badge>
              </div>
            </div>
            <div class="col-auto">
              <q-btn
                icon="edit"
                flat
                dense
                round
                size="sm"
                color="primary"
                @click="goToPhotosView"
              />
            </div>
          </div>

          <!-- Aperçu des photos -->
          <div v-if="businessPhotos.length > 0" class="q-mt-sm">
            <div class="row q-gutter-xs">
              <div
                v-for="(photo, index) in businessPhotos"
                :key="photo.id"
                class="col-6 col-sm-3"
              >
                <q-img
                  :src="photo.photo_url"
                  :alt="`Photo ${index + 1}`"
                  style="height: 80px"
                  @error="handleImageError"
                  class="rounded-borders"
                >
                  <div class="absolute-top-right q-pa-xs">
                    <q-badge
                      v-if="index === 0"
                      color="primary"
                      label="1"
                      rounded
                      dense
                    />
                  </div>
                </q-img>
              </div>
            </div>
          </div>
          <div v-else class="text-caption text-grey-7 q-mt-xs">
            Aucune photo
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Bottom Sheet pour éditer l'URL -->
    <q-dialog v-model="showEditUrlSheet" position="bottom">
      <q-card class="bottom-sheet-card">
        <q-card-section class="row items-center q-pb-md border-bottom">
          <div class="text-subtitle1 text-weight-medium">Modifier l'URL</div>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" @click="showEditUrlSheet = false" />
        </q-card-section>

        <q-card-section class="q-pt-md q-pb-md">
          <q-form @submit.prevent="handleUpdateUrl" class="q-gutter-md">
            <!-- Preview URL -->
            <div class="q-mb-md">
              <div class="text-caption text-grey-7 q-mb-xs">Aperçu</div>
              <div class="q-pa-sm bg-grey-1 rounded-borders">
                <div class="text-body2 text-grey-7">{{ baseUrl }}/</div>
                <div class="text-body1 text-weight-medium text-primary" style="word-break: break-all;">
                  {{ editUrlForm.slug || 'votre-url' }}
                </div>
              </div>
            </div>

            <!-- Input -->
            <q-input
              v-model="editUrlForm.slug"
              label="URL personnalisée"
              hint="Seulement lettres minuscules, chiffres et tirets"
              outlined
              dense
              :rules="[
                val => !!val || 'Requis',
                val => /^[a-z0-9-]+$/.test(val) || 'Seulement lettres minuscules, chiffres et tirets'
              ]"
              autofocus
              class="q-mb-sm"
            >
              <template v-slot:prepend>
                <div class="text-grey-7 text-body2">{{ baseUrl }}/</div>
              </template>
            </q-input>

            <q-card-actions align="right" class="q-mt-lg q-pa-none">
              <q-btn 
                flat 
                label="Annuler" 
                color="grey" 
                @click="showEditUrlSheet = false" 
                dense 
                class="q-mr-sm"
              />
              <q-btn
                type="submit"
                label="Enregistrer"
                color="primary"
                :loading="profileStore.loading"
                unelevated
                dense
              />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Bottom Sheet pour éditer le nom -->
    <q-dialog v-model="showEditNameSheet" position="bottom">
      <q-card class="bottom-sheet-card">
        <q-card-section class="row items-center q-pb-sm border-bottom">
          <div class="text-subtitle1">Nom affiché</div>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" @click="showEditNameSheet = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-form @submit.prevent="saveName" class="q-gutter-sm">
            <q-input
              v-model="editNameForm.title"
              label="Nom affiché *"
              outlined
              dense
              :rules="[val => !!val || 'Requis']"
              autofocus
            />

            <q-card-actions align="right" class="q-mt-md q-pa-none">
              <q-btn flat label="Annuler" color="grey" @click="showEditNameSheet = false" dense />
              <q-btn
                type="submit"
                label="Enregistrer"
                color="primary"
                :loading="pageSettingsStore.loading"
                unelevated
                dense
              />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Bottom Sheet pour éditer la description -->
    <q-dialog v-model="showEditDescriptionSheet" position="bottom">
      <q-card class="bottom-sheet-card">
        <q-card-section class="row items-center q-pb-sm border-bottom">
          <div class="text-subtitle1">Description</div>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" @click="showEditDescriptionSheet = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-form @submit.prevent="saveDescription" class="q-gutter-sm">
            <q-input
              v-model="editDescriptionForm.description"
              label="Description"
              type="textarea"
              outlined
              dense
              rows="4"
              autofocus
            />

            <q-card-actions align="right" class="q-mt-md q-pa-none">
              <q-btn flat label="Annuler" color="grey" @click="showEditDescriptionSheet = false" dense />
              <q-btn
                type="submit"
                label="Enregistrer"
                color="primary"
                :loading="pageSettingsStore.loading"
                unelevated
                dense
              />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../../stores/profile'
import { usePageSettingsStore } from '../../stores/pageSettings'
import { useNotifications } from '../../composables/useNotifications'

const router = useRouter()
const profileStore = useProfileStore()
const pageSettingsStore = usePageSettingsStore()
const { showNotification } = useNotifications()

const businessPhotos = ref([])
const showEditUrlSheet = ref(false)
const showEditNameSheet = ref(false)
const showEditDescriptionSheet = ref(false)
const editNameForm = reactive({
  title: ''
})
const editDescriptionForm = reactive({
  description: ''
})
const editUrlForm = reactive({
  slug: ''
})

const pageForm = reactive({
  title: '',
  description: '',
  is_published: true
})

const baseUrl = computed(() => {
  return window.location.origin
})

const publicUrl = computed(() => {
  if (!profileStore.profile) return ''
  return `${baseUrl.value}/${profileStore.profile.slug}`
})

onMounted(async () => {
  await profileStore.loadProfile()
  if (profileStore.profile) {
    await pageSettingsStore.loadPageSettings()
    loadPageData()
  }
})

// Watch for profile and page settings changes
watch(() => [profileStore.profile, pageSettingsStore.pageSettings], () => {
  if (profileStore.profile) {
    loadPageData()
  }
}, { deep: true })

async function loadPageData() {
  const profile = profileStore.profile
  const settings = pageSettingsStore.pageSettings
  
  if (settings) {
    Object.assign(pageForm, {
      title: settings.title || profile?.name || '',
      description: settings.description || '',
      is_published: settings.is_published !== false // Default to true if not set
    })
  } else {
    Object.assign(pageForm, {
      title: profile?.name || '',
      description: '',
      is_published: true
    })
  }
  
  // Initialize edit forms
  editNameForm.title = pageForm.title
  editDescriptionForm.description = pageForm.description
  editUrlForm.slug = profile?.slug || ''
  
  // Load photos from page_settings
  if (settings?.photos) {
    businessPhotos.value = settings.photos.map((url, index) => ({
      id: `photo-${index}`,
      photo_url: url,
      display_order: index
    }))
  } else {
    businessPhotos.value = []
  }
}

function openEditNameSheet() {
  editNameForm.title = pageForm.title
  showEditNameSheet.value = true
}

function openEditDescriptionSheet() {
  editDescriptionForm.description = pageForm.description
  showEditDescriptionSheet.value = true
}

function openEditUrlSheet() {
  editUrlForm.slug = profileStore.profile?.slug || ''
  showEditUrlSheet.value = true
}

async function handleUpdateUrl() {
  const success = await updateSlug()
  if (success) {
    showEditUrlSheet.value = false
  }
}

async function saveName() {
  if (!editNameForm.title || editNameForm.title.trim() === '') {
    showNotification({
      message: 'Le nom est requis',
      type: 'error',
      icon: 'error',
      timeout: 3000
    })
    return
  }

  const updates = {
    title: editNameForm.title.trim()
  }

  // Create page_settings if it doesn't exist
  if (!pageSettingsStore.pageSettings) {
    await pageSettingsStore.createPageSettings(updates)
  } else {
    const { error } = await pageSettingsStore.updatePageSettings(updates)
    if (error) {
      showNotification({
        message: error.message || 'Erreur lors de la mise à jour',
        type: 'error',
        icon: 'error',
        timeout: 4000
      })
      return
    }
  }
  
  pageForm.title = editNameForm.title.trim()
  showEditNameSheet.value = false
  showNotification({
    message: 'Nom mis à jour avec succès',
    type: 'success',
    icon: 'check_circle',
    timeout: 3000
  })
}

async function saveDescription() {
  const updates = {
    description: editDescriptionForm.description.trim() || null
  }

  // Create page_settings if it doesn't exist
  if (!pageSettingsStore.pageSettings) {
    await pageSettingsStore.createPageSettings(updates)
  } else {
    const { error } = await pageSettingsStore.updatePageSettings(updates)
    if (error) {
      showNotification({
        message: error.message || 'Erreur lors de la mise à jour',
        type: 'error',
        icon: 'error',
        timeout: 4000
      })
      return
    }
  }
  
  pageForm.description = editDescriptionForm.description.trim() || ''
  showEditDescriptionSheet.value = false
  showNotification({
    message: 'Description mise à jour avec succès',
    type: 'success',
    icon: 'check_circle',
    timeout: 3000
  })
}

async function updateSlug() {
  if (!editUrlForm.slug || !/^[a-z0-9-]+$/.test(editUrlForm.slug)) {
    showNotification({
      message: 'URL invalide. Utilisez seulement des lettres minuscules, chiffres et tirets.',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    return false
  }

  const { error } = await profileStore.updateProfile({ slug: editUrlForm.slug })
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour de l\'URL',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    return false
  } else {
    showNotification({
      message: 'URL mise à jour avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
    return true
  }
}

async function togglePublicPage() {
  const updates = {
    is_published: pageForm.is_published
  }

  // Create page_settings if it doesn't exist
  if (!pageSettingsStore.pageSettings) {
    await pageSettingsStore.createPageSettings(updates)
  } else {
    const { error } = await pageSettingsStore.updatePageSettings(updates)
    if (error) {
      // Revert toggle on error
      pageForm.is_published = !pageForm.is_published
      showNotification({
        message: error.message || 'Erreur lors de la mise à jour',
        type: 'error',
        icon: 'error',
        timeout: 4000
      })
      return
    }
  }
  
  showNotification({
    message: pageForm.is_published
      ? 'Page publique activée'
      : 'Page publique désactivée',
    type: 'success',
    icon: 'check_circle',
    timeout: 3000
  })
}

function copyUrl() {
  navigator.clipboard.writeText(publicUrl.value).then(() => {
    showNotification({
      message: 'URL copiée dans le presse-papiers',
      type: 'success',
      icon: 'content_copy',
      timeout: 2000
    })
  }).catch(() => {
    showNotification({
      message: 'Erreur lors de la copie',
      type: 'error',
      icon: 'error',
      timeout: 2000
    })
  })
}

function openPublicPage() {
  if (profileStore.profile && pageForm.is_published) {
    window.open(publicUrl.value, '_blank')
  }
}

function handleImageError(event) {
  const img = event.target
  img.style.opacity = '0.3'
}

function goToPhotosView() {
  router.push('/page/photos')
}
</script>

<style scoped>
.bottom-sheet-card {
  width: 100%;
  max-width: 100vw;
  border-radius: 16px 16px 0 0;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
