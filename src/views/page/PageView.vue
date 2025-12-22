<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Page publique</div>

    <q-tabs 
      v-model="activeTab" 
      class="q-mb-md" 
      active-color="primary" 
      indicator-color="primary"
      dense
    >
      <q-tab name="page" label="Page" />
      <q-tab name="settings" label="Paramètres" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- Page Tab -->
      <q-tab-panel name="page">
        <div class="q-gutter-sm">
          <!-- Lien de la page -->
          <q-card flat bordered>
            <q-card-section class="q-pa-md">
              <div class="text-subtitle2 text-grey-7 q-mb-xs">URL publique</div>
              <div class="row items-center">
                <div class="col">
                  <div class="text-body2 text-weight-medium">{{ publicUrl || 'Non configuré' }}</div>
                </div>
                <div class="col-auto q-gutter-xs">
                  <q-btn
                    icon="edit"
                    flat
                    dense
                    round
                    size="sm"
                    @click="showEditUrlModal = true"
                    color="primary"
                  />
                  <q-btn
                    icon="content_copy"
                    flat
                    dense
                    round
                    size="sm"
                    @click="copyUrl"
                    color="primary"
                    :disable="!publicUrl"
                  />
                </div>
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

          <!-- Ouvrir la page -->
          <q-btn
            :label="profileStore.profile && pageForm.is_published ? 'Ouvrir la page' : 'Page désactivée'"
            :disable="!profileStore.profile || !pageForm.is_published"
            color="primary"
            icon="open_in_new"
            @click="openPublicPage"
            flat
            class="full-width"
            dense
          />
        </div>
      </q-tab-panel>

      <!-- Paramètres Tab -->
      <q-tab-panel name="settings">
        <div class="q-gutter-sm">
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
              <div class="text-subtitle2 text-grey-7 q-mb-sm">
                Photos
                <q-badge v-if="businessPhotos.length > 0" color="primary" class="q-ml-xs" rounded>
                  {{ businessPhotos.length }}/4
                </q-badge>
              </div>

              <!-- Liste des photos existantes -->
              <div v-if="businessPhotos.length > 0" class="q-mb-sm">
                <div class="row q-gutter-xs">
                  <div
                    v-for="(photo, index) in businessPhotos"
                    :key="photo.id"
                    class="col-6 col-sm-3"
                  >
                    <div class="relative-position">
                      <q-img
                        :src="photo.photo_url"
                        :alt="`Photo ${index + 1}`"
                        style="height: 120px"
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
                        <div class="absolute-bottom-right q-pa-xs">
                          <q-btn
                            icon="close"
                            size="xs"
                            round
                            dense
                            color="white"
                            text-color="negative"
                            @click="removePhoto(photo.id)"
                            :disable="uploadingPhotos"
                          />
                        </div>
                      </q-img>
                      <div class="row q-gutter-xs justify-center q-mt-xs">
                        <q-btn
                          v-if="index > 0"
                          icon="keyboard_arrow_up"
                          size="xs"
                          flat
                          dense
                          round
                          @click="movePhotoUp(index)"
                          :disable="uploadingPhotos"
                        />
                        <q-btn
                          v-if="index < businessPhotos.length - 1"
                          icon="keyboard_arrow_down"
                          size="xs"
                          flat
                          dense
                          round
                          @click="movePhotoDown(index)"
                          :disable="uploadingPhotos"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Upload de nouvelle photo -->
              <div v-if="businessPhotos.length < 4">
                <q-file
                  v-model="photoFile"
                  label="Ajouter une photo"
                  accept="image/*"
                  outlined
                  dense
                  @update:model-value="handlePhotoFileSelect"
                  :loading="uploadingPhotos"
                  :disable="uploadingPhotos || businessPhotos.length >= 4"
                >
                  <template v-slot:prepend>
                    <q-icon name="add" />
                  </template>
                </q-file>
                <div v-if="uploadingPhotos" class="q-mt-xs">
                  <q-linear-progress :value="photoProgress / 100" color="primary" />
                </div>
              </div>
              <div v-else class="text-caption text-grey-7 q-mt-xs">
                Maximum atteint
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Modal pour éditer l'URL -->
    <q-dialog v-model="showEditUrlModal">
      <q-card style="min-width: 400px">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">Modifier l'URL</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleUpdateSlug" class="q-gutter-sm">
            <q-input
              v-model="slugForm.slug"
              label="URL publique *"
              outlined
              dense
              :rules="[
                val => !!val || 'Requis',
                val => /^[a-z0-9-]+$/.test(val) || 'Seulement lettres minuscules, chiffres et tirets'
              ]"
            >
              <template v-slot:prepend>
                <div class="text-grey-7">{{ baseUrl }}/</div>
              </template>
            </q-input>

            <div class="text-body2 text-grey-7 q-mt-sm">
              {{ baseUrl }}/{{ slugForm.slug || '...' }}
            </div>

            <q-card-actions align="right" class="q-mt-md q-pa-none">
              <q-btn flat label="Annuler" color="grey" v-close-popup dense />
              <q-btn
                type="submit"
                label="Enregistrer"
                color="primary"
                :loading="profileStore.loading"
                flat
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
import { useProfileStore } from '../../stores/profile'
import { usePageSettingsStore } from '../../stores/pageSettings'
import { useNotifications } from '../../composables/useNotifications'
import { useImageUpload } from '../../composables/useImageUpload'

const profileStore = useProfileStore()
const pageSettingsStore = usePageSettingsStore()
const { showNotification } = useNotifications()
const { uploading: uploadingPhotos, uploadProgress: photoProgress, uploadImage: uploadPhotoImage, deleteImage } = useImageUpload()

const activeTab = ref('page')
const photoFile = ref(null)
const businessPhotos = ref([])
const showEditUrlModal = ref(false)
const showEditNameSheet = ref(false)
const showEditDescriptionSheet = ref(false)
const editNameForm = reactive({
  title: ''
})
const editDescriptionForm = reactive({
  description: ''
})

const pageForm = reactive({
  title: '',
  description: '',
  is_published: true
})

const slugForm = reactive({
  slug: ''
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
  
  slugForm.slug = profile?.slug || ''
  
  // Initialize edit forms
  editNameForm.title = pageForm.title
  editDescriptionForm.description = pageForm.description
  
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

async function handleUpdateSlug() {
  await updateSlug()
  // Modal will be closed by updateSlug on success
}

async function updateSlug() {
  if (!slugForm.slug || !/^[a-z0-9-]+$/.test(slugForm.slug)) {
    showNotification({
      message: 'URL invalide. Utilisez seulement des lettres minuscules, chiffres et tirets.',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    return
  }

  const { error } = await profileStore.updateProfile({ slug: slugForm.slug })
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour de l\'URL',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: 'URL mise à jour avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
    showEditUrlModal.value = false
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
  const src = img.src
  console.error(`❌ Error loading image:`, src)
  console.error('🔍 Image element:', img)
  console.error('🔍 Error event:', event)
  
  // Check if it's a preview URL (blob) or a Supabase URL
  if (src.startsWith('blob:')) {
    console.warn('⚠️ Preview URL failed - this is normal if file was cleared')
    return
  }
  
  // For Supabase URLs, test accessibility
  console.error('🔍 Testing Supabase URL accessibility...')
  fetch(src, { method: 'HEAD', mode: 'no-cors' })
    .then(() => {
      console.log('✅ URL is accessible (CORS might be blocking image display)')
      console.log('💡 Try opening the URL directly in a new tab:', src)
    })
    .catch((err) => {
      console.error('❌ URL fetch error:', err)
      console.error('💡 Possible issues:')
      console.error('   1. Bucket is not public')
      console.error('   2. RLS policies are blocking access')
      console.error('   3. CORS configuration issue')
      console.error('   4. URL format is incorrect')
    })
  
  // Don't hide the image - show error icon instead
  img.style.opacity = '0.3'
}

function handlePhotoFileSelect(file) {
  console.log('🖼️ handlePhotoFileSelect called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handlePhotoFileSelect')
    return
  }

  if (businessPhotos.value.length >= 4) {
    showNotification({
      message: 'Maximum de 4 photos atteint',
      type: 'error',
      icon: 'error',
      timeout: 3000
    })
    photoFile.value = null
    return
  }

  // Start upload
  handlePhotoUpload(file)
}

async function handlePhotoUpload(file) {
  console.log('🖼️ handlePhotoUpload called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handlePhotoUpload')
    return
  }

  if (businessPhotos.value.length >= 4) {
    showNotification({
      message: 'Maximum de 4 photos atteint',
      type: 'error',
      icon: 'error',
      timeout: 3000
    })
    photoFile.value = null
    return
  }

  try {
    console.log('📤 Starting photo upload...')
    const result = await uploadPhotoImage(file)
    console.log('✅ Photo upload result:', result)
    
    // Add photo to page_settings.photos array
    const currentPhotos = pageSettingsStore.pageSettings?.photos || []
    const newPhotos = [...currentPhotos, result.url]
    
    const updates = { photos: newPhotos }
    
    // Create page_settings if it doesn't exist
    if (!pageSettingsStore.pageSettings) {
      await pageSettingsStore.createPageSettings(updates)
    } else {
      const { error } = await pageSettingsStore.updatePageSettings(updates)
      if (error) {
        throw error
      }
    }
    
    // Reload page data to get updated photos
    await loadPageData()
    
    photoFile.value = null
    
    showNotification({
      message: 'Photo ajoutée avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    showNotification({
      message: error.message || 'Erreur lors du téléchargement de la photo',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    photoFile.value = null
  }
}

async function removePhoto(photoIndex) {
  try {
    // Get photo URL before deletion
    const photo = businessPhotos.value[photoIndex]
    if (!photo) return

    // Remove from photos array
    const currentPhotos = pageSettingsStore.pageSettings?.photos || []
    const newPhotos = currentPhotos.filter((_, index) => index !== photoIndex)
    
    const updates = { photos: newPhotos }
    const { error } = await pageSettingsStore.updatePageSettings(updates)
    
    if (error) {
      throw error
    }

    // Delete from storage
    if (photo.photo_url) {
      await deleteImage(photo.photo_url)
    }
    
    // Reload page data
    await loadPageData()
    
    showNotification({
      message: 'Photo supprimée',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    showNotification({
      message: error.message || 'Erreur lors de la suppression',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  }
}

async function movePhotoUp(index) {
  if (index === 0) return
  
  const currentPhotos = pageSettingsStore.pageSettings?.photos || []
  // Swap with previous
  const newPhotos = [...currentPhotos]
  [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]]
  
  const updates = { photos: newPhotos }
  const { error } = await pageSettingsStore.updatePageSettings(updates)
  
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors du réordonnancement',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    await loadPageData()
  }
}

async function movePhotoDown(index) {
  if (index >= businessPhotos.value.length - 1) return
  
  const currentPhotos = pageSettingsStore.pageSettings?.photos || []
  // Swap with next
  const newPhotos = [...currentPhotos]
  [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]]
  
  const updates = { photos: newPhotos }
  const { error } = await pageSettingsStore.updatePageSettings(updates)
  
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors du réordonnancement',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    await loadPageData()
  }
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
